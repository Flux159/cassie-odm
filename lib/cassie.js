'use strict';

var async = require('async');
var cql = require('node-cassandra-cql');

//Cassie Dependencies:

//Node-Cassandra-CQL Dependencies (ie methods that need to be replicated if migrating to C++ official supported driver:
//6 Functions:
//var connection = cql.Client(config) - connect to cassandra server
//connection.execute(query, params, options (ie consistency), callback) - execute query
//connection.executeBatch(queryArray [{query: query, params: params}, ...], options, callback) - execute batches
//connection.executePrepared(query, params, options, callback) - execute prepared query
//connection.stream(query, params, consistency, callback).on('readable' | 'end' | 'err', callback) - readable stream
//connection.shutdown(callback) - closes connection

//In addition, the connection is handling type checking and type conversion for me at the moment, this would ideally be moved to a different module

//Type information: (already refactored, put into types.js - note that 2 things to look at when switching drivers is types & encoder)
//cql.types
//cql.types.uuid, cql.types.Long - these are from node-modules
//cql.types.timestamp - this is internal to node-cassandra-cql? Apparently its uuid v1 (uuid is uuid v4)
//cql.types.consistencies - the list of consistencies

//Async is required for syncing tables & keyspaces, not used elsewhere

//Long and Node-UUID handle creations of Long values and UUIDs respectively

//Pluralize is used to convert Model names to table names (ie standard is: lowercase + pluralized)

//Some notes: Converting to the official supporting driver might not be terribly difficult, would probably need the encoder
//for JS types, my own listing of types & consistencies (& direct dependencies on Long and node-uuid). The JS-to-C++ driver would
//just need to expose the 6 C++ methods to Javascript (Cassie will hold the object in memory via the 'require' of the native module)
//A bigger issue is that it might need JS to C++ types instead of JS to direct binary types.

var Schema = require('./schema'),
    Model = require('./model'),
    Query = require('./query'),
    Sync = require('./sync'),
    Types = require('./types');

var nullCallback = function () {
};

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

exports.types = Types.datatypes;

exports.consistencies = Types.consistencies;

exports.Schema = Schema;

//Connect and store connection (also return to user if multiple connections wanted)
exports.connect = function (config) {
    if (!config.poolSize) {
        config.poolSize = 3; //Default pool of 3 if not specified
    }

    Cassie.keyspace = config.keyspace;
    Cassie.hosts = config.hosts;
    Cassie.config = config;

    var connection = new cql.Client(config);

    if (!Cassie.connection) {
        Cassie.connection = connection;
    }
    Cassie.connections.push(connection);
    return connection;
};

//Execute raw cql (directly from node-cassandra-cql)
exports.cql = function (query, args, callback) {
    if (!Cassie.connection) {
        throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
    }

    if (typeof args === 'function') {
        callback = args;
        args = [];
    }

    Cassie.connection.execute(query, args, function (err, results, metadata) {
        (callback || nullCallback)(err, results);
    });
};

exports.Query = function (query, args) {
    return new Query(query, args, Cassie.connection);
};

exports.batch = function (cassieQueries, options, callback) {
    Query.batch(cassieQueries, (options.connection || Cassie.connection || null), options, callback);
};

/* Creates a model w/ modelName: Ex: Cassie.model('User', UserSchema)
 * Returns a Model object based on the schema it created: Ex: var User = Cassie.model('User')
 * Options: {connection: 'A connection returned from makeConnection() that will be passed to Model object'}
 * Model uses internal Cassie.connection if not specified (throws error if no connection has been made)
 */
exports.model = function (modelName, schema, options) {
    if (!options) {
        options = {};
        options.pluralize = true;
        options.lowercase = true;
    }

    var model;

    if (!schema) {
        model = Cassie.models[modelName];
        if (model) {
            return model;
        } else {
            throw "cassie.model(String) error: Model " + modelName + " does not exist.";
        }
    }

    //Don't do this because it pretty much makes testing Update impossible
//    if (Cassie.schemas[modelName]) {
//        throw "cassie.model(String, Schema) error: Model " + modelName + " already exists.";
//    }

    Cassie.schemas[modelName] = schema;

    model = Model.create(modelName, schema, (options.connection || Cassie.connection || null), options);

    Cassie.models[modelName] = model;

    Cassie.tableNames[model._tableName] = modelName;

    return model;
};

exports.checkKeyspace = function (config, options, callback) {
    var client = new cql.Client({hosts: config.hosts});
    Sync.checkKeyspaceExists(client, config.keyspace, config, options, function () {
        client.shutdown(callback);
    });
};

var internalSyncTables = function (config, options, callback) {

    var describeTablesQuery = "SELECT * FROM system.schema_columnfamilies WHERE keyspace_name=?";
    var describeTablesArguments = [Cassie.keyspace.toLowerCase()];

    var connection = (options.connection || Cassie.connection || null);

    if (!connection) {
        throw "Cassie Error: You must make a connection to the database first in order to sync tables. See documentation for Cassie.connect(config).";
    }

    if(options && options.debug) {
        options.debug_prefix = " Describe Keyspace ";
    }

    var query = new Query(describeTablesQuery, describeTablesArguments, connection ,options, null);

    query.exec(function (err, results) {
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

            Object.keys(Cassie.tableNames).forEach(function(tableKey) {
                if (!updateTablesDictionary[tableKey]) {
                    if (Cassie.schemas[Cassie.tableNames[tableKey]]._sync) {
                        createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
                    }
                }
            });
        }

        var logger;
        if(options.logger) {
            logger = options.logger;
        } else {
            logger = console;
        }

        if (options.debug) {
            if (options.prettyDebug) {
                logger.info("-----");
            }
            if (Object.keys(createTablesDictionary).length !== 0) {
                logger.info("Cassie Info: Creating these schemas: ");
                logger.info(createTablesDictionary);
            }
            if(Object.keys(updateTablesDictionary).length !== 0) {
                logger.info("Cassie Info: Updating these schemas: ");
                logger.info(updateTablesDictionary);
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
exports.syncTables = function (config, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
        options.keyspace_check = true; //Checks if keyspace exists by default - creates a separate connection using config.hosts & config.user/password if provided
        //If you don't want this, set to false in options & call checkKeyspace manually
        //This is more for security / multi-tenant operations, where a user is prohibited from doing a keyspace check, but can access their own keyspace
    }

    if (options.keyspace_check === false) {
        //Only when keyspace check is explicitly defined as false, don't do keyspace check
        internalSyncTables(config, options, callback);
    } else {
        //For null and true, do the keyspace check
        var client = new cql.Client({hosts: config.hosts});
        Sync.checkKeyspaceExists(client, config.keyspace, config, options, function () {
            internalSyncTables(config, options, callback);
        });
    }

};

/**
 * For testing use only (deleting the CassieODMTest keyspace). Highly recommended to never use this method
 * @param config (Required) - config options ex: {hosts: ['127.0.0.1:9042'], keyspace: 'CassieODMTest'}
 * @param options (Optional) - debug options ex: {debug: true, prettyDebug: true}
 * @param callback (Required)
 */
exports.deleteKeyspace = function(config, options, callback) {
    var client = new cql.Client({hosts: config.hosts});
    Sync.deleteKeyspace(client, config.keyspace, options, callback);
};

//Close connection
exports.close = function (callback) {
    var cb = (callback || nullCallback);
    Cassie.connection.shutdown(cb);
    Cassie.connections.splice(0, 1);
    Cassie.connection = Cassie.connections[0] || null;
};

//Close all connections
exports.closeAll = function (callback) {
    var parallelClose = [];
    Cassie.connections.forEach(function (connection) {
        parallelClose.push(function (cb) {
            connection.shutdown(cb);
        });
    });
    async.parallel(parallelClose, function (err, results) {
        Cassie.connection = null;
        Cassie.connections = [];
        (callback || nullCallback)(err, results);
    });
};
