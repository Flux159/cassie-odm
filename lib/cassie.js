'use strict';

var cql = require('node-cassandra-cql');
var async = require('async');

var Schema = require('./schema'),
		Model = require('./model'),
		Query = require('./query');

var Sync = require('./sync');

// var types = require('./types');

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
	
	Cassie.keyspace = config.keyspace;
	Cassie.hosts = config.hosts;
	Cassie.config = config;
	
	// Sync.check
	
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
}

exports.Schema = Schema;

// console.log(cql.types);

exports.consistencies = cql.types.consistencies;
exports.types = cql.types.dataTypes;

// exports.types = types;

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
	
	if(!schema) {
		var model = Cassie.models[modelName];
		if(model) {
			return model;
		} else {
			throw "cassie.model(String) error: Model " + modelName + " does not exist.";
		}
	}
	
	if(Cassie.schemas[modelName]) {
		throw "cassie.model(String, Schema) error: Model " + modelName + " already exists.";
	}
	// console.log(pluralize(modelName));
	
	Cassie.schemas[modelName] = schema;
	
	// Cassie.models[modelName] = Model.create(modelName, schema, (options.connection || Cassie.connection || null), options);
	
	var model = Model.create(modelName, schema, (options.connection || Cassie.connection || null), options);
	
	Cassie.models[modelName] = model;
	
	// console.log("Model._tableName");
	// console.log(model._tableName);
	Cassie.tableNames[model._tableName] = modelName;
	
	// Sync.syncTable(schema, model, (options.connection || Cassie.connection || null), Cassie.keyspace, Cassie.config, function() {
	//
	// });
	
	// console.log(Cassie.models[modelName]);
	
	// console.log(Cassie.models);
	
};

// exports.checkKeyspace = function(config, options, callback) {
	// Sync.checkKeyspaceExists(config.hosts, config.keyspace, config, options, callback);
// }

//Sync all tables and create keyspace(s)
exports.syncTables = function(config, options, callback) {
	if(typeof options === 'function') {
		callback = options;
		options = {};
	}
	
	Sync.checkKeyspaceExists(config.hosts, config.keyspace, config, options, function(err, results) {
		// console.log("Checked keyspace exists");

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
			if(options.prettyDebug) {
				logger.info("-----");
			}
		}
	
		connection.execute(describeTablesQuery, describeTablesArguments, function(err, results) {
			if(err) {
				console.log(err);
				throw "Cassie Error: There was an issue in obtaining table information when attempting to sync tables.";
			}
			
				var createTablesDictionary = {};
				var updateTablesDictionary = {};

				if(!results.rows) {
					//Every table key in Cassie.tableNames needs to be created w/ its appropriate schema
					for(var tableKey in Cassie.tableNames) {
						if(Cassie.schemas[Cassie.tableNames[tableKey]]._sync) {
							createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
						}
					}
				
				} else {
					results.rows.forEach(function(row) {
						if(Cassie.tableNames[row.columnfamily_name]) {
							//A schema exists for that row, update it w/ schema
							if(Cassie.schemas[Cassie.tableNames[row.columnfamily_name]]._sync) {
								updateTablesDictionary[row.columnfamily_name] = Cassie.schemas[Cassie.tableNames[row.columnfamily_name]];
							}
						}
					
						// updateTablesList.push(row.columnfamily_name);
					});
				
					//Need to find which table keys I didn't put into update now and put those into create
					for(var tableKey in Cassie.tableNames) {
						if(!updateTablesDictionary[tableKey]) {
							if(Cassie.schemas[Cassie.tableNames[tableKey]]._sync) {
								createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
							}
						}
					}
				}

				if(options.debug) {
					if(options.prettyDebug) {
						logger.info("-----");
					}
					
					logger.info("Cassie Info: Creating these schemas: ");
					logger.info(createTablesDictionary);
			
					logger.info("Cassie Info: Updating these schemas: ");
					logger.info(updateTablesDictionary);
					
					if(options.prettyDebug) {
						logger.info("-----");
					}
				}

				var seriesCalls = [];
				
				seriesCalls.push(function(cb) {
					Sync.createTables(createTablesDictionary, connection, options, cb);
				});
				
				seriesCalls.push(function(cb) {
					Sync.updateTables(updateTablesDictionary, connection, options, cb);
				});
				
				async.series(seriesCalls, callback);
				
				// for(var createTable in createTablesDictionary) {
// 					seriesCalls.push(function(cb) {
// 						Sync.createTables(createTablesDictionary, Cassie.keyspace, connection, options, cb);
// 					});
// 				}
//
// 				for(var updateTable in updateTablesDictionary) {
// 					seriesCalls.push(function(cb) {
// 						Sync.updateTables()
// 					});
// 				}
			

				// if(results.rows) {

					//If schema is not in describeTables, then need to CREATE, otherwise need to update (which results in a query to system.schema_columns)


					// results.rows.forEach(function(row) {
						// console.log(row.columnfamily_name);



						// if(!Cassie.tableNames[row.columnfamily_name]) {
							// console.log("Column family: " + )
						// }
					

						//Now for each of these, I will do a select * from system.schema_columns where keyspace_name='mykeyspace' and columnfamily_name='users';

						// var describeTableQuery = "SELECT * FROM system.schema_columns WHERE keyspace_name=? AND columnfamily_name=?";
						// var describeTableArguments = [keyspace, row.columnfamily_name];
						//
						// connection.execute(describeTableQuery, describeTableArguments, function(err, results) {
						// 	console.log(err);
						//
						// 	if(results.rows) {
						// 		results.rows.forEach(function(tableRow) {
						// 			console.log(tableRow.column_name);
						// 		})
						// 	}
						//
						// });

					// });
				// }

			// var seriesCalls = [];
			// for(var modelName in Cassie.models) {
			// 	seriesCalls.push(function(cb) {
			// 		if(Cassie.schemas[modelName]._sync) {
			// 						Sync.syncTable(Cassie.schemas[modelName], Cassie.models[modelName], connection, Cassie.keyspace, Cassie.config, options, cb);
			// 		} else {
			// 			cb();
			// 		}
			// 	});
			// }
			//
			// async.series(seriesCalls, callback);


	});
		
	
	// if(typeof options === 'function') {
	// 	callback = options;
	// 	options = {};
	// }
	
	// var describeTablesQuery = "SELECT * FROM system.schema_columnfamilies WHERE keyspace_name=?";
	// var describeTablesArguments = [Cassie.keyspace];
	//
	// var connection = (options.connection || Cassie.connection || null);
	//
	// if(!connection) {
	// 	throw "You must make a connection to the database first in order to sync tables. See documentation for Cassie.connect(config).";
	// }
	//
	// connection.execute(describeTablesQuery, describeTablesArguments, function(err, results) {
	//
	//
	//
	// 		console.log(err);
	// 		// console.log(results);
	// 		// console.log(results.rows);
	//
	// 		var createTablesDictionary = {};
	// 		var updateTablesDictionary = {};
	//
	// 		if(!results.rows) {
	// 			//Every table key in Cassie.tableNames needs to be created w/ its appropriate schema
	// 			for(var tableKey in Cassie.tableNames) {
	// 				createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
	// 			}
	//
	// 		} else {
	// 			results.rows.forEach(function(row) {
	// 				if(Cassie.tableNames[row.columnfamily_name]) {
	// 					//A schema exists for that row, update it w/ schema
	// 					updateTablesDictionary[row.columnfamily_name] = Cassie.schemas[Cassie.tableNames[row.columnfamily_name]];
	// 				}
	//
	// 				// updateTablesList.push(row.columnfamily_name);
	// 			});
	//
	// 			//Need to find which table keys I didn't put into update now and put those into create
	// 			for(var tableKey in Cassie.tableNames) {
	// 				if(!updateTablesDictionary[tableKey]) {
	// 					createTablesDictionary[tableKey] = Cassie.schemas[Cassie.tableNames[tableKey]];
	// 				}
	// 			}
	// 		}
	//
	// 		console.log("CREATE TABLES DICTIONARY: ");
	// 		console.log(createTablesDictionary);
	//
	// 		console.log("UPDATE TABLES DICTIONARY: ");
	// 		console.log(updateTablesDictionary);
	//
	//
	// 		// if(results.rows) {
	//
	// 			//If schema is not in describeTables, then need to CREATE, otherwise need to update (which results in a query to system.schema_columns)
	//
	//
	// 			// results.rows.forEach(function(row) {
	// 				// console.log(row.columnfamily_name);
	//
	//
	//
	// 				// if(!Cassie.tableNames[row.columnfamily_name]) {
	// 					// console.log("Column family: " + )
	// 				// }
	//
	//
	// 				//Now for each of these, I will do a select * from system.schema_columns where keyspace_name='mykeyspace' and columnfamily_name='users';
	//
	// 				// var describeTableQuery = "SELECT * FROM system.schema_columns WHERE keyspace_name=? AND columnfamily_name=?";
	// 				// var describeTableArguments = [keyspace, row.columnfamily_name];
	// 				//
	// 				// connection.execute(describeTableQuery, describeTableArguments, function(err, results) {
	// 				// 	console.log(err);
	// 				//
	// 				// 	if(results.rows) {
	// 				// 		results.rows.forEach(function(tableRow) {
	// 				// 			console.log(tableRow.column_name);
	// 				// 		})
	// 				// 	}
	// 				//
	// 				// });
	//
	// 			// });
	// 		// }
	//
	// 	var seriesCalls = [];
	// 	for(var modelName in Cassie.models) {
	// 		seriesCalls.push(function(cb) {
	// 			if(Cassie.schemas[modelName]._sync) {
	// 							Sync.syncTable(Cassie.schemas[modelName], Cassie.models[modelName], connection, Cassie.keyspace, Cassie.config, options, cb);
	// 			} else {
	// 				cb();
	// 			}
	// 		});
	// 	}
	//
	// 	async.series(seriesCalls, callback);
		
		
		
	});
	
	// var seriesCalls = [];
	// for(var modelName in Cassie.models) {
	// 	seriesCalls.push(function(cb) {
	// 		if(Cassie.schemas[modelName]._sync) {
	// 						Sync.syncTable(Cassie.schemas[modelName], Cassie.models[modelName], connection, Cassie.keyspace, Cassie.config, options, cb);
	// 		} else {
	// 			cb();
	// 		}
	// 	});
	// }
	//
	// async.series(seriesCalls, callback);
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
}
