'use strict';

var async = require('async');
var util = require('util');

var Query = require('./query');

/**
 * function that checks if a keyspace exists (connects using a separate node-cassandra-cql) and creates the keyspace if it doesn't exist (then closes its connection)
 *
 */
exports.checkKeyspaceExists = function (client, keyspace, options, execOptions, callback) {

    if (typeof execOptions === 'function') {
        callback = execOptions;
        execOptions = {};
    }

    //TODO: Write Replication Strategy Notes in Readme / documentation
    //Notes on Replication Strategy and Topology:

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
    // CREATE KEYSPACE test
    // WITH placement_strategy = 'NetworkTopologyStrategy'
    // AND strategy_options={us-east:6,us-west:3};

    //NetworkTopologyStrategy using RackInferringSnitch for production default - assumes 10.ddd.rrr.nnn IP network (default of 10.0.0.0/16 vpc network when setting up EC2 VPC in a region, 10.0.x.0/24 for EC2 VPC subnet in a region), replication of 3 - can give property object containing name:DC1, name:DC2, etc.
    //NetworkTopologyStrategy using PropertyFileSnitch if topology is specified in JSON (ie, pass in JSON to use) - NOT IMPLEMENTED YET

    //NetworkTopologyStrategy requires that strategy_options is specified (and ignores replication_factor)

    var replicationStrategy = "";
    if (options.replication) {
        if (options.replication.strategy === 'SimpleStrategy') {
            if (options.replication.replication_factor) {
                // replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = " options.replication.replication_factor.toString();

                replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor': " + options.replication.replication_factor.toString() + "}";
            } else {
                // replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = 1";

                replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }";
            }
        } else if (options.replication.strategy === 'NetworkTopologyStrategy') {
            if (options.replication.strategy_options) {
                replicationStrategy = {'class': 'NetworkTopologyStrategy'};
                for (var key in options.replication.strategy_options) {
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

    var queryString = "CREATE KEYSPACE IF NOT EXISTS " + keyspace + " WITH REPLICATION = " + replicationStrategy;

    var query = new Query(queryString, [], client ,execOptions, null);

    query.exec(function(err, results) {
        client.shutdown(function() {
            callback(err, results);
        });
    });
};

exports.deleteKeyspace = function(client, keyspace, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    if(!keyspace) {
        throw "cassie.deleteKeyspace must have config.keyspace defined. See documentation for more information.";
    }

    var queryString = "DROP KEYSPACE " + keyspace;

    var query = new Query(queryString, [], client, options, null);

    query.exec(function(err, results) {
        client.shutdown(function() {
            callback(err, results);
        });
    });
};

//Going from function (listed in cassie.types) to CQL type
var typeTranslationMap = {
    'String': 'text',
    'Number': 'int',
    'Double': 'double',
    'Int': 'int',
    'Date': 'timestamp',
    'Buffer': 'blob',
    'Boolean': 'boolean',
    'Object': 'map',
    'uuid': 'uuid',
    'Long': 'bigint',
    'timestamp': 'timestamp',
    'timeuuid': 'timestamp',
    'Array': 'list',
    'Counter': 'counter'
};

function determineKeyType(keyValue) {

    var keyType = null;
    var translatedKey = null;

    var arrayCollectionType = null;
    var mapCollectionTypes = [];

    if (typeof keyValue === 'object') {

        if(util.isArray(keyValue)) {
            keyType = 'Array';
            if(keyValue.length === 0) {
                return new Error("Error syncing tables. Array must have a list type (ie you input [], you need something like [String] or [cassie.types.uuid] or [Number]). This is a limitation of Cassandra and CQL.");
            } else {
                arrayCollectionType = typeTranslationMap[keyValue[0].name];
                if(!arrayCollectionType) {
                    return new Error("Error syncing tables. Array type '" + arrayCollectionType + "' not supported.");
                }
            }
        } else {
            if (!keyValue.type) {
                return new Error("Error syncing tables. Schema.type must be specified. For CQL maps, you must use field_name: {type: {map_from_type: map_to_type}}.");
            }

            if(typeof keyValue.type === 'object') {

                var keyValueTypeKey = Object.keys(keyValue.type)[0];

                mapCollectionTypes[0] = typeTranslationMap[Object.keys(keyValue.type)[0]];
                mapCollectionTypes[1] = typeTranslationMap[keyValue.type[keyValueTypeKey].name];

                keyType = 'Object';

            } else {
                keyType = keyValue.type.name;
            }
        }

    } else if (typeof keyValue === 'function') {
        keyType = keyValue.name;

        //Find out what type of object (String, Number, Boolean, Object, Array, Buffer, uuid, Date)
    }
    if (keyType) {
        translatedKey = typeTranslationMap[keyType];
        if (!translatedKey) {
            return new Error("Error determing CQL Translation type for: " + keyType);
        }
    } else {
        return new Error("Error determining type of schema field.");
    }

    if(arrayCollectionType) {
        translatedKey = translatedKey + "<" + arrayCollectionType + ">";
    }
    if(mapCollectionTypes.length > 0) {
        translatedKey = translatedKey + "<" + mapCollectionTypes[0] + "," + mapCollectionTypes[1] + ">";
    }

    return translatedKey;

}

exports.createTables = function (createTablesDictionary, connection, options, callback) {
    var logger;
    if (options.logger) {
        logger = options.logger;
    } else {
        logger = console;
    }

    var seriesCalls = [];

    Object.keys(createTablesDictionary).forEach(function (tableName) {

        var createTableQuery = "CREATE TABLE " + tableName + " (";
        var primaryKeyString = "";

        var schema = createTablesDictionary[tableName];

        Object.keys(schema._fields).forEach(function (tableKey) {
            var keyType = determineKeyType(schema._fields[tableKey]);
            if(keyType instanceof Error) {
                console.log(keyType);
                callback(err, null);
            }

            var keyString = tableKey + " " + keyType + ",";
            createTableQuery = createTableQuery + keyString;
        });

        if (typeof schema._primary === 'string') {
            primaryKeyString = "PRIMARY KEY (" + schema._primary + ")";
        } else if (typeof schema._primary === 'object') {

            primaryKeyString = primaryKeyString + "PRIMARY KEY (";
            //For each item inside the array, add to primary key string
            schema._primary.forEach(function (primary_key_item, index) {
                if (index === 0) {
                    //First item can be composite key
                    if (typeof primary_key_item === 'object') {
                        primaryKeyString = primaryKeyString + "(";
                        primary_key_item.forEach(function (composite_key_item, index) {
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

        createTableQuery = createTableQuery + primaryKeyString + ")";

        //TODO: Add to create table query WITH options

        //TODO NOTE: WITH CLUSTERING ORDER BY (field ASC|DESC) - supported
        //TODO NOTE: compression = JSON_OBJECT - NOT supported (change using alter table manually)
        //TODO NOTE: compaction = JSON_OBJECT - NOT supported (change using alter table manually)
        //TODO: There are a ton of options here: http://www.datastax.com/documentation/cql/3.1/cql/cql_reference/tabProp.html
        //Apparently the CQL parsing requires single quotes in the map, I'm not implementing that, if someone else wants to submit a pull request with the corresponding tests, then I'll integrate it
        //TODO NOTE: Compact storage is not supported

        var withString = "";

        if(schema._createOptions) {
            var paramsStrings = [];
            if(schema._createOptions.clustering_order) {
                var orderByString = "";
                //Only get one
                Object.keys(schema._createOptions.clustering_order).forEach(function(orderKey) {
                    var orderValue = "";
                    if(schema._createOptions.clustering_order[orderKey] === 1) {
                        orderValue = "ASC";
                    } else if(schema._createOptions.clustering_order[orderKey] === -1) {
                        orderValue = "DESC";
                    } else {
                        throw "Clustering order can only be ASCENDING (1) or DESCENDING (-1). See documentation on sort for more information.";
                    }
                    orderByString = "(" + orderKey + " " + orderValue + ")";
                });

                var clusteringString = "CLUSTERING ORDER BY " + orderByString;
                paramsStrings.push(clusteringString);
            }

            if(paramsStrings.length === 1) {
                withString = " WITH " + paramsStrings[0];
            }

            //TODO: Leaving this here for anyone who wants to implement the todos above (you would iterate through each option using Object.keys(schema._createOptions).forEach(function(option) {})
            //Then you would need to manually construct the string for each one (JSON.stringify doesn't work because of this quote: "Enclose properties that are strings in single quotation marks." in the CQL documentation here: http://www.datastax.com/documentation/cql/3.1/cql/cql_reference/tabProp.html

//            if(schema._createOptions.compression) {
//                var compressionJson = schema._createOptions.compression;
//                var compressionString = "compression = " + JSON.stringify(compressionJson);
//                paramsStrings.push(compressionString);
//            }
//            if(schema._createOptions.compaction) {
//                var compactionJson = schema._createOptions.compaction;
//                var compactionString = "compaction = " + JSON.stringify(compactionJson);
//                paramsStrings.push(compactionString);
//            }
//
//            if(paramsStrings.length === 1) {
//                withString = " WITH " + paramsStrings[0];
//            } else if(paramsStrings.length > 1) {
//                withString = " WITH " + paramsStrings.join(" AND ");
//            }

        }

        createTableQuery = createTableQuery + withString;

        //Need to find fields that have indices here and add those to series calls
        var fieldsToAddIndex = {};

        Object.keys(schema._fields).forEach(function (field) {
            if (typeof schema._fields[field] === 'object' && schema._fields[field].index) {
                fieldsToAddIndex[field] = true;
            }
        });

        seriesCalls.push(function (cb) {

            if(options && options.debug) {
                options.debug_prefix = " Create Table ";
            }

            var query = new Query(createTableQuery, [], connection ,options, null);

            query.exec(function(err, results) {
                cb(err, results);
            });

        });

        Object.keys(fieldsToAddIndex).forEach(function (indexField) {
            var indexName = tableName + "_" + indexField;
            var createIndexString = "CREATE INDEX " + indexName + " ON " + tableName + " (" + indexField + ")";

            seriesCalls.push(function (cb) {

                if(options && options.debug) {
                    options.debug_prefix = " Create Index ";
                }

                var query = new Query(createIndexString, [], connection ,options, null);

                query.exec(function(err, results) {
                    cb(err, results);
                });

            });

        });

    });

    async.series(seriesCalls, function (err) {
        callback(err);
    });
};

exports.updateTables = function (updateTablesDictionary, connection, options, callback) {
    var logger;
    if (options.logger) {
        logger = options.logger;
    } else {
        logger = console;
    }

    var describeSeriesCalls = [];

    var keyspace = connection.options.keyspace;
    Object.keys(updateTablesDictionary).forEach(function (tableName) {

        describeSeriesCalls.push(function (cb1) {

            var schema = updateTablesDictionary[tableName];

            if (schema._sync) {

                var describeTableQuery = "SELECT * FROM system.schema_columns WHERE keyspace_name=? AND columnfamily_name=?";
                var describeTableArguments = [keyspace.toLowerCase(), tableName];

                if(options && options.debug) {
                    options.debug_prefix = " Describe Table ";
                }

                var query = new Query(describeTableQuery, describeTableArguments, connection ,options, null);

                query.exec(function (err, results) {
                    if (err) {
                        console.log("Cassie Sync Error updating table: " + tableName + ". Allowing Cassie to continue.");
                        cb1(err, null);
                    }

                    var fieldsToAdd = {};
                    var fieldsToAddIndex = {};
                    var undefinedFields = {};

                    for (var field in schema._fields) {
                        fieldsToAdd[field] = schema._fields[field];
                    }

                    Object.keys(schema._fields).forEach(function (field) {
                        if (typeof schema._fields[field] === 'object' && schema._fields[field].index) {
                            fieldsToAddIndex[field] = true;
                        }
                    });

                    if (results.rows) {
                        results.rows.forEach(function (tableRow) {

                            //A few notes: If you change field types, Cassie can't handle that (that's why the below is commented out)
                            // determineKeyType(fieldsToUpdate[tableRow.column_name]) === tableRow.SOMETHING - tableRow doesn't contain the actual type data
                            //Tablerow has marshallers though, so you might be able to determine the type from that, but that's something for later

                            if (fieldsToAdd[tableRow.column_name]) {
                                delete fieldsToAdd[tableRow.column_name];
                            } else {
                                undefinedFields[tableRow.column_name] = true;
                            }

                            if (fieldsToAddIndex[tableRow.column_name]) {
                                if (tableRow.index_name) {
                                    delete fieldsToAddIndex[tableRow.column_name];
                                }
                            }

                        });
                    }

                    var flatPrimaryList = schema._flatPrimaryList;

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

                    Object.keys(fieldsToAdd).forEach(function (addField) {

                        if (flatPrimaryList.indexOf(addField) > -1) {
                            logger.log("Cassie Sync Error adding: " + addField + " field to table: " + tableName + " . Cannot add a primary key to a table after it has been created. Allowing cassie to continue. The field was not added to the database.");
                        } else {
                            var alterTableString = "ALTER TABLE " + tableName + " ADD " + addField + " " + determineKeyType(fieldsToAdd[addField]);

                            seriesCalls.push(function (cb) {

                                if(options && options.debug) {
                                    options.debug_prefix = " Alter Table ";
                                }

                                var query = new Query(alterTableString, [], connection ,options, null);

                                query.exec(function(err, results) {

                                    cb(err, results);
                                });
                            });
                        }

                    });

                    Object.keys(fieldsToAddIndex).forEach(function (indexField) {
                        var indexName = tableName + "_" + indexField;
                        var createIndexString = "CREATE INDEX " + indexName + " ON " + tableName + " (" + indexField + ")";

                        seriesCalls.push(function (cb) {

                            if(options && options.debug) {
                                options.debug_prefix = " Create Index ";
                            }

                            var query = new Query(createIndexString, [], connection ,options, null);

                            query.exec(function(err, results) {
                                cb(err, results);
                            });

                        });

                    });

                    if(seriesCalls.length === 0) {
                        cb1();
                    } else {
                        async.series(seriesCalls, function () {
                            cb1();
                        });
                    }


                });

                //TODO: Write limitations on syncing in README (include the following);
//                    //A few notes: If you change field types, Cassie can't handle that
//                    //If you try to change primary key / partition key, Cassandra/CQL can't handle that - don't do it
//                    //To change a field's type, you would need to: ALTER TABLE to modify/delete the type, then start the script again (it'll notice that the column is missing & create it then). Alternatively, you would need to manually manage the data transfer - ie its not recommended.

            }

        });
    });

    async.series(describeSeriesCalls, function () {
//        console.log("done w/ all describes");
        callback();
    });

};
