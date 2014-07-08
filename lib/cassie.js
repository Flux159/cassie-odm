'use strict';

var cql = require('node-cassandra-cql');
var async = require('async');

var Schema = require('./schema'),
		Model = require('./model'),
		Query = require('./query');

var Sync = require('./sync');

var nullCallback = function() {};

var Cassie = {
	schemas: {},
	models: {},
	tableNames: {},
	connection: null,
	connections: [],
	keyspace: null,
	hosts: null,
	config: null
};

//Connect and store connection (also return to user if multiple connections wanted)
exports.connect = function(config) {
    if(!config.poolSize) {
        config.poolSize = 5; //Default pool of 5 if not specified
    }

	Cassie.keyspace = config.keyspace;
	Cassie.hosts = config.hosts;
	Cassie.config = config;
	
	var connection = new cql.Client(config);

	if(!Cassie.connection) {
		Cassie.connection = connection;
	}
	Cassie.connections.push(connection);
	return connection;
};

//Execute raw cql (directly from node-cassandra-cql)
exports.cql = function(query, args, callback) {
	if(!Cassie.connection) {
		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
	}
	
	if (typeof args === 'function'){
		callback = args;
		args = [];
	}
		
	Cassie.connection.execute(query, args, function(err, results, metadata) {
		(callback || nullCallback)(err, results);
	});
};

exports.Query = function(query, args) {
	return new Query(query, args, connection);
};

exports.batch = function(cassieQueries, options, callback) {
    Query.batch(cassieQueries, (options.connection || Cassie.connection || null), options, callback);
};

exports.Schema = Schema;

exports.consistencies = cql.types.consistencies;

//(These are all functions, ie if you pass it in {type: [function <function_name>]} or if you pass directly key: [function <function_name>])
//See schema for all the types
exports.types = {
    'String': String,
    'Number': Number,
    'Date': Date,
    'Buffer': Buffer,
    'Blob': Buffer,
    'Boolean': Boolean,
    'Mixed': Object,
    'Object': Object,
    'ObjectId': cql.types.uuid, //Node uuid (v4)
    'uuid': cql.types.uuid,
    'long': cql.types.Long, //Note this uses nodejs long
    'Long': cql.types.Long,
    'Int': Number, //Note no support for real ints
    'int': Number,
    'Timestamp': cql.types.timestamp,
    'timestamp': cql.types.timestamp,
    'Array': Array
};

/* Creates a model w/ modelName: Ex: Cassie.model('User', UserSchema)
 * Returns a Model object based on the schema it created: Ex: var User = Cassie.model('User')
 * Options: {connection: 'A connection returned from makeConnection() that will be passed to Model object'}
 * Model uses internal Cassie.connection if not specified (throws error if no connection has been made)	
 */
exports.model = function(modelName, schema, options) {
	if(!options) {
		options = {};
		options.pluralize = true;
		options.lowercase = true;
	}

    var model;

	if(!schema) {
		model = Cassie.models[modelName];
		if(model) {
			return model;
		} else {
			throw "cassie.model(String) error: Model " + modelName + " does not exist.";
		}
	}
	
	if(Cassie.schemas[modelName]) {
		throw "cassie.model(String, Schema) error: Model " + modelName + " already exists.";
	}
	
	Cassie.schemas[modelName] = schema;

    model = Model.create(modelName, schema, (options.connection || Cassie.connection || null), options);
	
	Cassie.models[modelName] = model;

	Cassie.tableNames[model._tableName] = modelName;
};

exports.checkKeyspace = function(config, options, callback) {
    var client = new cql.Client({hosts: config.hosts});
	Sync.checkKeyspaceExists(client, config.keyspace, config, options, function() {
        client.shutdown(callback);
    });
};

var internalSyncTables = function(config, options, callback) {

    var describeTablesQuery = "SELECT * FROM system.schema_columnfamilies WHERE keyspace_name=?";
    var describeTablesArguments = [Cassie.keyspace];

    var connection = (options.connection || Cassie.connection || null);

    if(!connection) {
        throw "Cassie Error: You must make a connection to the database first in order to sync tables. See documentation for Cassie.connect(config).";
    }

    var logger;
    if(options.logger) {
        logger = options.logger;
    } else {
        logger = console;
    }

    if(options.debug) {
        if(options.prettyDebug) {
            logger.info("-----");
        }
        logger.info("CQL Describe Keyspace Query: " + describeTablesQuery);
        logger.info("CQL Describe Keyspace Arguments: " + describeTablesArguments);
        if(options.prettyDebug) {
            logger.info("-----");
        }
    }

    connection.execute(describeTablesQuery, describeTablesArguments, function(err, results) {
        if (err) {
            console.log(err);
            throw "Cassie Error: There was an issue in obtaining table information when attempting to sync tables.";
        }

        var createTablesDictionary = {};
        var updateTablesDictionary = {};

        if (!results.rows) {
            //Every table key in Cassie.tableNames needs to be created w/ its appropriate schema
            for (var tableKey in Cassie.tableNames) {
                if (Cassie.schemas[Cassie.tableNames[tableKey]]._sync) {
                    createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
                }
            }

        } else {
            results.rows.forEach(function (row) {
                if (Cassie.tableNames[row.columnfamily_name]) {
                    //A schema exists for that row, update it w/ schema
                    if (Cassie.schemas[Cassie.tableNames[row.columnfamily_name]]._sync) {
                        updateTablesDictionary[row.columnfamily_name] = Cassie.schemas[Cassie.tableNames[row.columnfamily_name]];
                    }
                }

            });

            //Need to find which table keys I didn't put into update now and put those into create
            for (var tableKey in Cassie.tableNames) {
                if (!updateTablesDictionary[tableKey]) {
                    if (Cassie.schemas[Cassie.tableNames[tableKey]]._sync) {
                        createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
                    }
                }
            }
        }

        if (options.info) {
            if (options.prettyDebug) {
                logger.info("-----");
            }
            if (Object.keys(createTablesDictionary).length !== 0) {
                logger.info("Cassie Info: Creating these schemas: ");
                logger.info(createTablesDictionary);
            }
            if (options.prettyDebug) {
                logger.info("-----");
            }
        }

        var seriesCalls = [];

        seriesCalls.push(function (cb) {
            Sync.createTables(createTablesDictionary, connection, options, cb);
        });

        seriesCalls.push(function (cb) {
            Sync.updateTables(updateTablesDictionary, connection, options, cb);
        });

        async.series(seriesCalls, callback);
    });

};

//Sync all tables and create keyspace(s)
exports.syncTables = function(config, options, callback) {
	if(typeof options === 'function') {
		callback = options;
		options = {};
        options.keyspace_check = true; //Checks if keyspace exists by default - creates a separate connection using config.hosts & config.user/password if provided
        //If you don't want this, set to false in options & call checkKeyspace manually
        //This is more for security / multi-tenant operations, where a user is prohibited from doing a keyspace check, but can access their own keyspace
	}

    if(options.keyspace_check) {

        var client = new cql.Client({hosts: config.hosts});
        Sync.checkKeyspaceExists(client, config.keyspace, config, options, function() {
            internalSyncTables(config, options, callback);
//            client.shutdown(callback);
        });

//        Sync.checkKeyspaceExists(config.hosts, config.keyspace, config, options, function(err, results) {
//            internalSyncTables(config, options, callback);
//        });
    } else {
        internalSyncTables(config, options, callback);
    }

};

//Close connection
exports.close = function(callback) {
	var cb = (callback || nullCallback);
	Cassie.connection.shutdown(cb);
	Cassie.connections.splice(0,1);
	Cassie.connection = Cassie.connections[0] || null;
};

//Close all connections
exports.closeAll = function(callback) {
	var parallelClose = [];
	Cassie.connections.forEach(function(connection) {
		parallelClose.push(function(cb) {
			connection.shutdown(cb);
		});
	});
	async.parallel(parallelClose, function(err, results) {
		Cassie.connection = null;
		Cassie.connections = [];
		(callback || nullCallback)(err, results);
	});
};
