var cql = require('node-cassandra-cql');
var async = require('async');

/**
 * function that creates a keyspace if it doesn't exist. Apparently only hosts is required to connect.
 *
 */
// exports.createKeyspace = function(connection, keyspace) {
// 	console.log("Creating keyspace: " + keyspace);
//
//
//
// }

/**
 * function that checks if a keyspace exists (connects using a separate node-cassandra-cql) and creates the keyspace if it doesn't exist (then closes its connection)
 *
 */
exports.checkKeyspaceExists = function(hosts, keyspace, options, cqlOptions, callback) {
	var client = new cql.Client({hosts: hosts});
	
	if(typeof cqlOptions === 'function') {
		callback = cqlOptions;
		cqlOptions = {};
	}
	
	//Default is Simple strategy with a default replication_factor of 1

	//Notes on NetworkTopologyStrategy:
	//RackInferringSnitch or PropertyFileSnitch - configured in cassandra.yml (located )
	
	// Notes on strategy_options (from http://www.datastax.com/docs/1.0/configuration/storage_configuration#strategy-options)
	//
	// Specifies configuration options for the chosen replication strategy.
	//
	// For SimpleStrategy, it specifies replication_factor in the format of replication_factor:number_of_replicas.
	//
	// For NetworkTopologyStrategy, it specifies the number of replicas per data center in a comma separated list of datacenter_name:number_of_replicas. Note that what you specify for datacenter_name depends on the cluster-configured snitch you are using. There is a correlation between the data center name defined in the keyspace strategy_options and the data center name as recognized by the snitch you are using. The nodetool ring command prints out data center names and rack locations of your nodes if you are not sure what they are.
	//
	// See Choosing Keyspace Replication Options for guidance on how to best configure replication strategy and strategy options for your cluster.
	//
	// Setting and updating strategy options with the Cassandra CLI requires a slightly different command syntax than other attributes; note the brackets and curly braces in this example:
	//
	// [default@unknown] CREATE KEYSPACE test
	// WITH placement_strategy = 'NetworkTopologyStrategy'
	// AND strategy_options={us-east:6,us-west:3};
	
	//NetworkTopologyStrategy using RackInferringSnitch for production default - assumes 10.ddd.rrr.nnn IP network (default of 10.0.0.0/16 vpc network when setting up EC2 VPC in a region, 10.0.x.0/24 for EC2 VPC subnet in a region), replication of 3 - can give property object containing name:DC1, name:DC2, etc.
	//NetworkTopologyStrategy using PropertyFileSnitch if topology is specified in JSON (ie, pass in JSON to use) - NOT IMPLEMENTED YET
	
	//NetworkTopologyStrategy requires that strategy_options is specified (and ignores replication_factor)
	
	var replicationStrategy = "";
	if(options.replication) {
		if(options.replication.strategy === 'SimpleStrategy') {
			if(options.replication.replication_factor) {
				// replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = " options.replication.replication_factor.toString();
				
				replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor': " + options.replication.replication_factor.toString() + "}";
			} else {
				// replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = 1";
				
				replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }";
			}
		} else if(options.replication.strategy === 'NetworkTopologyStrategy') {
			if(options.replication.strategy_options) {
				replicationStrategy = {'class': 'NetworkTopologyStrategy'};
				for(var key in options.replication.strategy_options) {
					replicationStrategy[key] = options.replication.strategy_options[key];
				}
				replicationStrategy = JSON.stringify(replicationStrategy);
			} else {
				throw "Replication Strategy 'NetworkTopologyStrategy' requires strategy_options object /dictionary containing <datacenter_name>:<replication_number> fields. See Cassandra docs on CREATE KEYSPACE / Keyspace Replication Options for more information.";
			}
		} else {
			throw "Config.options.strategy must be either 'SimpleStrategy' (recommended for development) or 'NetworkTopologyStrategy' (recommended for production). See Cassandra docs for CREATE KEYSPACE / Keyspace Replication Options more information.";
		}
		
	} else {
		replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }";
		// replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = 1";
	}
	
	var cqlQuery = "CREATE KEYSPACE IF NOT EXISTS " + keyspace + " WITH REPLICATION = " + replicationStrategy;
	
	var logger;
	if(cqlOptions.logger) {
		logger = cqlOptions.logger;
	} else {
		logger = console;
	}
	
	if(cqlOptions.debug) {
		if(cqlOptions.prettyDebug) {
			logger.info("-----");
		}
		logger.info("CQL Create Keyspace Query: " + cqlQuery);
		if(cqlOptions.prettyDebug) {
			logger.info("-----");
		}
	}
	
	client.execute(cqlQuery, function(err, result) {
		// if(err) {
			//Probably need to create keyspace
			// console.log(err);
			// exports.createKeyspace(client, keyspace);
		// } else {
			//Don't do anything, just return in callback
			// callback();
		// }
		
		// if(cqlOptions.debug) {
		// 	console.log(err);
		// 	console.log(result);
		// }
		
		client.shutdown(function() {
				callback(err, result);
		});
	});
};


// var types = {
// 	'String': String,
// 	'Number': Number, //Note that Number, Double, and Float are all the same
// 	'Double': Number,
// 	'Float': Number,
// 	'Date': Date,
// 	'Buffer': Buffer,
// 	'Blob': Buffer,
// 	'Boolean': Boolean,
// 	'Mixed': Object,
// 	'Object': Object,
// 	'ObjectId': cql.types.uuid, //Node uuid (v4)
// 	'uuid': cql.types.uuid,
// 	'long': cql.types.Long, //Note this uses nodejs long
// 	'Long': cql.types.Long,
// 	'Int': Number, //Note no support for real ints (I think I should use Long)
// 	'int': Number,
// 	'Timestamp': cql.types.timestamp,
// 	'timestamp': cql.types.timestamp,
// 	'Array': Array
// };

//Going from function (listed in cassie.types) to CQL type
var typeTranslationMap = {
	'String': 'text',
	'Number': 'double',
	'Date': 'timestamp',
	'Buffer': 'blob',
	'Boolean': 'boolean',
	'Object': 'map',
	'uuid': 'uuid',
	'Long': 'bigint',
	'timestamp': 'timestamp',
	'Array': 'list'
};

function determineKeyType(keyValue) {
	
	// console.log("Attempting to determine key type:");
	var keyType = null;
	var translatedKey = null;
	if(typeof keyValue === 'object') {		
		if(!keyValue.type) {
			throw "Error syncing tables. Schema.type must be specified. For arbitrary JSON Objects, you must use field_name: {type: Object}.";
		}
		// console.log(keyValue.type.name);
		keyType = keyValue.type.name;
	} else if(typeof keyValue === 'function') {
		// console.log(keyValue.name);
		keyType = keyValue.name;
		//Find out what type of object (String, Number, Boolean, Object, Array, Buffer, uuid, Date)
		
	} 
	if(keyType) {
			translatedKey = typeTranslationMap[keyType];
			if(!translatedKey) {
				throw "Error determing CQL Translation type for: " + keyType;
			}
	} else {
		throw "Error determining type of schema field.";
	}

	return translatedKey;
	
	// if(!keyType) {
		
	// }
	
	// else if(typeof keyValue === 'number') {
	// 	console.log(typeof keyValue);
	// 	console.log(keyValue);
	//
	// 	//This is a type defined by node-cassandra-cql... I don't think that I'm going to support this... (its annoying to translate)
	//
	// }

}

exports.createTables = function(createTablesDictionary, connection, options, callback) {
    var logger;
    if(options.logger) {
        logger = options.logger;
    } else {
        logger = console;
    }
    // console.log("IN Create tables sync");

    var seriesCalls = [];

    //For each table, CREATE it (already know that it doesn't exist)
//    for(var tableName in createTablesDictionary) {
    Object.keys(createTablesDictionary).forEach(function(tableName) {

        var createTableQuery = "CREATE TABLE " + tableName + " (";
        var primaryKeyString = "";

        var schema = createTablesDictionary[tableName];

        // for(var tableKey in schema) {
					Object.keys(schema._fields).forEach(function(tableKey) {
						
            if(!(tableKey === '_sync' || tableKey === '_primary')) {
                //For normal keys, add to list with "<keyName> <keyType>,"

                // console.log(schema[tableKey]);

                var keyType = determineKeyType(schema._fields[tableKey]);

                var keyString = tableKey + " " + keyType + ",";
                createTableQuery = createTableQuery + keyString;
            } else if(tableKey === '_primary') {
                //For primary key, create a temp key with "PRIMARY KEY (<keyName(s)>)"

                if(typeof schema._fields[tableKey] === 'string') {
                    primaryKeyString = "PRIMARY KEY (" + schema._fields[tableKey] + ")";
                } else if(typeof schema._fields[tableKey] === 'object') {
                    primaryKeyString = primaryKeyString + "PRIMARY KEY (";
                    //For each item inside the array, add to primary key string
                    schema._fields[tableKey].forEach(function(primary_key_item, index) {
                        if(index === 0) {
                            //First item can be composite key
                            if(typeof primary_key_item === 'object') {

                                primary_key_item.forEach(function(composite_key_item, index) {
                                    primaryKeyString = primaryKeyString + composite_key_item + ",";
                                });
                                primaryKeyString = primaryKeyString.slice(0, -1) + "),"; //Remove trailing comma, add '),'
                            } else {
                                primaryKeyString = primaryKeyString + primary_key_item + ",";
                            }
                        } else {
                            primaryKeyString = primaryKeyString + primary_key_item + ",";
                        }
                    });
                    primaryKeyString = primaryKeyString.slice(0, -1) + ")"; //Remove trailing comma, add ')'
                }
            }
					});
        // }
				
        createTableQuery = createTableQuery + primaryKeyString + ")";

        if(options.debug) {
            if(options.prettyDebug) {
                logger.log("-----");
            }
            logger.log("CQL Create Table Query: " + createTableQuery);
            if(options.prettyDebug) {
                logger.log("-----");
            }
        }
        // console.log(createTableQuery);

        seriesCalls.push(function(cb) {
            connection.execute(createTableQuery, [], function(err, results) {
                cb(err, results);
            });
        });

        //TODO: Execute & test these queries

        //NOTE: Currently doesn't support properties like compression, compaction, compact storage

    });
//    }

    async.series(seriesCalls, function() {
    	console.log("CREATE TABLES BE DONE!");
			callback();
    });

    //Also, write schema to file if options.schemaFile are passed - I don't know if this is absolutely necessary... I'm doing a check against the database for the columns, a file would just get outdated (and is a pain to handle...)

    // callback();
};

// function alterTables(connection, err, results, )


exports.updateTables = function(updateTablesDictionary, connection, options, callback) {
    var logger;
    if(options.logger) {
        logger = options.logger;
    } else {
        logger = console;
    }

    var describeSeriesCalls = [];

    var keyspace = connection.options.keyspace;
//    for(var tableName in updateTablesDictionary) {
    Object.keys(updateTablesDictionary).forEach(function(tableName) {
        // var seriesCalls = [];

        describeSeriesCalls.push(function(cb1) {

            var schema = updateTablesDictionary[tableName];

            if(schema._sync) {

                var describeTableQuery = "SELECT * FROM system.schema_columns WHERE keyspace_name=? AND columnfamily_name=?";
                var describeTableArguments = [keyspace, tableName];

                if (options.debug) {
                    if (options.prettyDebug) {
                        logger.info("-----");
                    }
                    logger.log("CQL Describe Table Query: " + describeTableQuery);
                    logger.log("CQL Describe Table Arguments: " + describeTableArguments);
                    if (options.prettyDebug) {
                        logger.info("-----");
                    }
                }

                connection.execute(describeTableQuery, describeTableArguments, function (err, results) {
                        if (err) {
                            console.log("Cassie Sync Error updating table: " + tableName + ". Allowing Cassie to continue.");
                            callback(err, null);
                        }

                        var fieldsToAdd = {};
                        var undefinedFields = {};

                        for (var field in schema._fields) {
                            fieldsToAdd[field] = schema._fields[field];
                            // undefinedFields[field] = schema[field];
                        }

                        // delete fieldsToAdd._primary;
                        // delete fieldsToAdd._sync;

                        if (results.rows) {
                            results.rows.forEach(function (tableRow) {

                                // console.log(tableRow.column_name);
                                // console.log(tableRow.validator);
                                //A few notes: If you change field types, Cassie can't handle that (that's why the below is commented out)
                                // && determineKeyType(fieldsToUpdate[tableRow.column_name]) === tableRow.SOMETHING

                                if (fieldsToAdd[tableRow.column_name]) {
                                    delete fieldsToAdd[tableRow.column_name];
                                } else {
                                    undefinedFields[tableRow.column_name] = true;
                                }

                            });
                        }

                        console.log("Fields to add: " + JSON.stringify(fieldsToAdd));
                        // console.log(fieldsToAdd);

                        var flatPrimaryList = [];
                        if (typeof schema._primary === 'object') {
                            schema._primary.forEach(function (primaryKey) {
                                if (typeof primaryKey === 'object') {
                                    primaryKey.forEach(function (compositeKey) {
                                        flatPrimaryList.push(compositeKey);
                                    })
                                } else {
                                    flatPrimaryList.push(primaryKey);
                                }
                            });
                        } else {
                            flatPrimaryList.push(schema._primary);
                        }

												console.log("Undefined fields: " + JSON.stringify(undefinedFields));
                        // console.log(undefinedFields);

                        for (var undefinedField in undefinedFields) {
                            if (options.warning) {
                                logger.log("-----");
                                logger.log("Cassie Sync Warning: Field '" + undefinedField + "' is not in Schema but is in database. Cassie does not drop columns in your database (nor does it update field types). If you wish to remove the field, run the following commands in cqlsh: ");
                                logger.log("USE " + keyspace + ";");
                                logger.log("ALTER TABLE " + tableName + " DROP " + undefinedField + ";");
                                logger.log("-----");
                            }
                        }

            						var seriesCalls = [];

                        // for (var addField in fieldsToAdd) {
													Object.keys(fieldsToAdd).forEach(function(addField) {
														
                            if (flatPrimaryList.indexOf(addField) > -1) {
                                logger.log("Cassie Sync Error adding: " + addField + " field to table: " + tableName + " . Allowing cassie to continue. The field was not added to the database.");
                                // continue; //Can't modify primary key or any portion of primary key
                            } else {
	                            var alterTableString = "ALTER TABLE " + tableName + " ADD " + addField + " " + determineKeyType(fieldsToAdd[addField]);

	                            if (options.debug) {
	                                if (options.prettyDebug) {
	                                    logger.log("-----");
	                                }
	                                logger.log("CQL Alter Table Query: " + alterTableString);
	                                if (options.prettyDebug) {
	                                    logger.log("-----");
	                                }
	                            }

	                            // console.log(alterTableString);

	                            seriesCalls.push(function (cb) {
	                                connection.execute(alterTableString, [], function (err, results) {
	                                    cb(err, results);
	                                });
	                            });
                            }
														
													});


                        // }
												
						            async.series(seriesCalls, function() {
						            	console.log("DESCRIBE SINGLE TABLE DONE!");
													cb1();
						            });

                    }

                    // callback();

                    // console.log(undefinedFields);

                    // console.log(tableName);
                    // console.log(schema);

                    //A few notes: If you change field types, I can't handle that
                    //If you try to change primary key / partition key, Cassandra/CQL can't handle that - don't do it
                    //To change a field's type, you would need to: ALTER TABLE to delete the column, then start the script again (it'll notice that the column is missing & create it then). Alternatively, you would need to manually manage the data transfer - ie its not recommended.


                    // callback();

                );
            }

        });
    });

//    }

    console.log(describeSeriesCalls);

    async.series(describeSeriesCalls, function() {
    	console.log("UPDATE TABLES BE DONE!");
			callback();
    });

};

/**
 * function that checks if table exists for schema (uses plural options, etc.) then syncs columns for that table based on validations, etc.
 *
 *
 *
 */
// exports.syncTable = function(schema, model, connection, keyspace, options, cqlOptions, callback) {
	// if(!connection) {
		// throw "Cassie Error: Cannot sync tables without cassandra connection.";
	// }
	
	// console.log(schema);
	
	//For each key in schema, need to add to a CREATE TABLE string that creates the table in the keyspace
	
	//Also need to do this for primary keys schema options
	
	
	//Use "DESCRIBE TABLES" to get all the tables in the current keyspace
	
	//I wonder if connection has this information... (it doesn't), connections.options.keyspace is the keyspace name btw
	
	//Use select * from system.schema_columnfamilies where keyspace_name='mykeyspace'
	//Instead of DESCRIBE TABLES because it returns rows (and can easily access "columnfamily_name")
	
	//This needs to be moved out to the syncTables method outside of the async stuff (because its common across all schemas trying to be sync'ed)
	
	
	
	
	
	
	// var describeTablesQuery = "SELECT * FROM system.schema_columnfamilies WHERE keyspace_name=?";
	// var describeTablesArguments = [keyspace];
	
	// connection.execute(describeTablesQuery, describeTablesArguments, function(err, results) {
	// 	console.log(err);
	// 	// console.log(results);
	// 	// console.log(results.rows);
	//
	// 	if(results.rows) {
	//
	// 		//If schema is not in describeTables, then need to CREATE, otherwise need to update (which results in a query to system.schema_columns)
	//
	//
	// 		results.rows.forEach(function(row) {
	// 			console.log(row.columnfamily_name);
	//
	// 			//Now for each of these, I will do a select * from system.schema_columns where keyspace_name='mykeyspace' and columnfamily_name='users';
	//
	// 			var describeTableQuery = "SELECT * FROM system.schema_columns WHERE keyspace_name=? AND columnfamily_name=?";
	// 			var describeTableArguments = [keyspace, row.columnfamily_name];
	//
	// 			connection.execute(describeTableQuery, describeTableArguments, function(err, results) {
	// 				console.log(err);
	//
	// 				if(results.rows) {
	// 					results.rows.forEach(function(tableRow) {
	// 						console.log(tableRow.column_name);
	// 					})
	// 				}
	//
	// 			});
	//
	// 		});
	// 	}
	//
	//
	// 	callback();
	// });
	
	
	// callback();
	
	
	
	
	
	
	
	//Use "DESCRIBE TABLE <tablename>" to get information on the table itself
	
	//Actually, do this: select * from system.schema_columns where keyspace_name='mykeyspace' and columnfamily_name='users';
	//You get rows back which are easier to decipher
	
	//If the table doesn't exist in DESCRIBE TABLES, CREATE it
	//If the table does exist, check its columns and if there's one missing from the schema, ALTER the table to fit the schema model (do not DELETE though)
	
	// console.log(connection);
	
	// console.log(model);
		
	// console.log(keyspace);
	
	// console.log(options);
	
	// console.log(cqlOptions);
	
	// callback();
// }
