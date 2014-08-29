'use strict';

var cassie = require('./cassie'); //Need Cassie for obtaining model
var types = require('./types');

var nullCallback = function () {
};

var parseResults = function (results, Model) {

    var parsedResults = [];

    if (results) {
        if (results.rows) {
            results.rows.forEach(function (parsedResult) {
                delete parsedResult.columns;

                var newModel = new Model(parsedResult, {'_from_db': true});
                parsedResults.push(newModel);
            });
        }
    }

    parsedResults.toString = function () {
        var returnArray = [];
        this.forEach(function (model) {
            returnArray.push(model.toString());
        });
        return returnArray;
    };

    return parsedResults;
};

var logResults = function(logger, execOptions, err, parsedResults) {
    if (err) {
        logger.info("CQL Error: ");
        if(execOptions.prettyDebug) {
            logger.info("\x1B[0;31m " + err + " \x1B[0m");
        } else {
            logger.info(err);
        }
    }
    if (parsedResults.length > 0) {
        logger.info("CQL Results: ");
        if(execOptions.prettyDebug) {
            logger.info("\x1B[0;36m" + JSON.stringify(parsedResults.toString(), null, 2) + " \x1B[0m");
        } else {
            logger.info(parsedResults.toString());
        }
    } else {
        if(execOptions.prettyDebug) {
            logger.info("CQL Results: \x1B[0;36m Empty (No error) \x1B[0m");
        } else {
            logger.info("CQL Results: Empty (No error)");
        }
    }
};

var cleanupExecOptions = function(execOptions, logger, queryString, params) {
    if (execOptions.debug) {
        var prefix = "";
        if(execOptions.prepare || execOptions.prepared) {
            prefix = "Executing as prepared: ";
        }
        if(!execOptions.debug_prefix) {
            execOptions.debug_prefix = " ";
        }
        if (execOptions.prettyDebug) {

            logger.info("-----\nCQL" + execOptions.debug_prefix + "Query: \x1B[0;34m " + queryString + " \x1B[0m");
            if (params.length > 0) {
                logger.info("CQL Parameters: \x1B[0;32m " + JSON.stringify(params) + " \x1B[0m");
            }
        } else {
            logger.info(prefix + "CQL Query: " + queryString);
            if (params.length > 0) {
                logger.info("CQL Parameters: " + JSON.stringify(params));
            }
        }
    }

    if (!execOptions.consistency) {
        execOptions.consistency = types.consistencies.quorum;
    }
    return execOptions;
};

function Query(queryString, params, connection, options, modelName) {

    this.queryString = queryString;
    if (!params) {
        params = [];
    }
    this.params = params;

    //Fix/hack for map hints
    var mapIndex = -1;
    this.params.forEach(function(param, index) {
        if(typeof param === 'object' && !(param instanceof Array)) {
            if(!param.low && !(param instanceof Date)) {
                mapIndex = index;
            }
        }
    });
    if(mapIndex !== -1) {
        this.params[mapIndex] = {hint: 'map', value: this.params[mapIndex]};
    }

    var _this = this;

    if (!options) {
        options = {};
    }

    this.toString = function(pretty) {
        var returnString;
        if (pretty) {
            returnString = "-----\nCQL Query: \x1B[0;34m " + _this.queryString + " \x1B[0m";
            if (params.length > 0) {
                returnString = returnString + "\nCQL Parameters: \x1B[0;32m " + JSON.stringify(params) + " \x1B[0m";
            }
        } else {
            returnString = "CQL Query: " + queryString;
            if (params.length > 0) {
                returnString = returnString + "\nCQL Parameters: " + JSON.stringify(params);
            }
        }
        return returnString;
    };

    this.limit = function (limitAmount) {
        if (!_this.queryString) {
            return _this;
        }

        if (typeof limitAmount !== 'number') {
            throw "Limit argument must be a number";
        }
        //Add limit to query (no execution) - return this

        if(_this.queryString.indexOf("LIMIT") > -1) {
            console.log("Cassie: Query cannot limit multiple times. Paging automatically adds a limit (default of 10).");
            return _this;
        }

        //Remove "ALLOW FILTERING" and add back on
        var appendFiltering = false;
        if (_this.queryString.indexOf("ALLOW FILTERING") > -1) {
            _this.queryString = _this.queryString.replace("ALLOW FILTERING", "");
            appendFiltering = true;
        }

        //LIMIT clause
        _this.queryString = _this.queryString + " LIMIT " + limitAmount.toString() + " ";

        if (appendFiltering) {
            _this.queryString = _this.queryString + "ALLOW FILTERING";
        }

        return new Query(_this.queryString, _this.params, connection, options, modelName);
    };
    this.sort = function (sortObject) {
        if (!_this.queryString) {
            return _this;
        }

        //Add sort to query (no execution) - return this
        //sortObject is {field_name: 1} or {field_name: -1} (for sorting by Ascending / Descending order)
        if (typeof sortObject !== 'object') {
            throw "Sort argument must be an object containing a field key with an order value. Example: {field_name: -1} for DESCENDING order or {field_name: 1} ASCENDING order.";
        }

        //Remove "ALLOW FILTERING" and add back on
        var appendFiltering = false;
        if (_this.queryString.indexOf("ALLOW FILTERING") > -1) {
            _this.queryString = _this.queryString.replace("ALLOW FILTERING", "");
            appendFiltering = true;
        }

        var appendLimit = false;
        var limitMatch = "";
        if(_this.queryString.indexOf("LIMIT") > -1) {

            var limitRegex = /LIMIT ([0-9]+)/g;
            var match = limitRegex.exec(_this.queryString);
            limitMatch = match[0];

            _this.queryString = _this.queryString.replace(/LIMIT ([0-9]+)/, "");
            appendLimit = true;
        }

        var sortString = " ";
        for (var key in sortObject) {
            sortString = sortString + key.toString() + " ";
            if (sortObject[key] === 1) {
                sortString = sortString + "ASC";
            } else if (sortObject[key] === -1) {
                sortString = sortString + "DESC";
            } else {
                throw "Sorting can only be ASCENDING (1) or DESCENDING (-1). See documentation on sort for more information.";
            }
        }

        //ORDER BY clause
        _this.queryString = _this.queryString + " ORDER BY " + sortString + " ";

        if(appendLimit) {
            _this.queryString = _this.queryString + " " + limitMatch;
        }

        if (appendFiltering) {
            _this.queryString = _this.queryString + "ALLOW FILTERING";
        }

        return new Query(_this.queryString, _this.params, connection, options, modelName);
    };

    this.page = function(pageObject) {
        if(!_this.queryString) {
            return _this;
        }

        if(_this.queryString.indexOf("LIMIT") > -1) {
            console.log("Cassie: Query cannot limit before paging. Use page before limit.");
            return _this;
        }

        if(_this.queryString.indexOf("ORDER BY") > -1) {
            console.log("Cassie: Query cannot sort before paging. Use page before sort.");
            return _this;
        }

        //Use token(key) >= value with Limit (count)

        if(typeof pageObject !== 'object') {
            throw "Page argument must be an object containing a field key with with a page token or page token object. Example: {field_name: 'token_val'} for first page with 10 results per page. {field_name: {page: 'token_val', count: 25}} for a page with 25 results per page. See documentation on paging for more information and for information on what token_val should be. Also be sure to read documentation on how Cassandra handles paging.";
        }

        //Remove "ALLOW FILTERING" and add back on
        var appendFiltering = false;
        if (_this.queryString.indexOf("ALLOW FILTERING") > -1) {
            _this.queryString = _this.queryString.replace("ALLOW FILTERING", "");
            appendFiltering = true;
        }

        //Handles pagination logic
        //Pagination is handled by token(key) >= 'primary key value' LIMIT 10;
        //This is why ODMs are kinda difficult because they hide the underlying implementation of efficient queries

        var defaultCount = 25;
        var pageStrings = [];
        var argsVals = [];
        Object.keys(pageObject).forEach(function(pageKey) {
            var pageVal = pageObject[pageKey];
//            var greaterThan;

            var pageToken = pageVal;

            if(typeof pageVal === 'object') {
                defaultCount = pageVal.count;
                pageToken = pageVal.page;
            }

            var partitionKey = "";

            if(modelName) {
                var Model = cassie.model(modelName);
                if(Model) {
                    if(typeof Model._primary === 'string') {
                        partitionKey = Model._primary;
                    } else {
                        if(typeof Model._primary[0] === 'object') {
                            partitionKey = Model._primary[0][0];
                        } else {
                            partitionKey = Model._primary[0];
                        }
                    }
                }
            }

//            console.log("Partition key is: '" + partitionKey + "'");

            var pageString;

            if(pageKey === partitionKey) {
                pageString = "token(" + pageKey + ") >= token(?)";
            } else {
                pageString = pageKey + " >= ?";
            }

            argsVals.push(pageToken);
            pageStrings.push(pageString);
        });

        //Need to find if WHERE clause is already there (then it just becomes "AND <joinedPageStrings>" instead of "WHERE <joinedPageStrings"

        var prefixAppendPagination = " WHERE ";
        if(_this.queryString.indexOf("WHERE") > -1) {
            prefixAppendPagination = " AND ";
        }

        var paginationString = prefixAppendPagination + pageStrings.join(" ");

        paginationString = paginationString + " LIMIT ?";
        argsVals.push(defaultCount);

        _this.queryString = _this.queryString + paginationString;
        _this.params = _this.params.concat(argsVals);

        //pageObject is {field_name: 1} or {field_name: {page: 1, count: 25}} (default count is 25)

        //No check on if field_name exists because query doesn't do those checks (Cassandra will return an error)

        //Calculate greater than and less than for field, then create "pageString" = " WHERE field_name >= greater_than AND field_name <= less_than", I should just make paging not supported with limit & sorting. 1 I don't think Cassandra will like them, 2. paging is already a sort/limit combined operation and its a pain to deal w/ deleting the string, adding the string, and testing all of that.

        if (appendFiltering) {
            _this.queryString = _this.queryString + " ALLOW FILTERING";
        }

        return new Query(_this.queryString, _this.params, connection, options, modelName);
    };

    this.exec = function (execOptions, callback) {
        if (!queryString) {
            return (callback || nullCallback)("Query is null. This is typically due to a validation error.", null);
        }

        if (typeof execOptions === 'function') {
            callback = execOptions;
            execOptions = options;
        }

        var logger;
        if (execOptions.logger) {
            logger = execOptions.logger;
        } else {
            logger = console;
        }

        execOptions = cleanupExecOptions(execOptions, logger, queryString, params);

        var start;
        if (execOptions.timing) {
            start = process.hrtime();
        }

        if(execOptions.prepare || execOptions.prepared) {

            connection.executeAsPrepared(queryString, params, execOptions.consistency, function (err, results, metadata) {
                if (execOptions.timing) {
                    var elapsed = process.hrtime(start);
                    var milli = elapsed[1] / 1000000; //millisecond time

                    var prefixString = "CQL Timing: ";
                    if(execOptions.prettyDebug) {
                        if(elapsed[0] === 0) {
                            logger.info(prefixString + "\x1B[0;32m " + milli.toFixed(2) + " ms \x1B[0m");
                        } else {
                            logger.info(prefixString + "\x1B[0;31m " + elapsed[0] + "." + (milli/1000) + " sec \x1B[0m");
                        }
                    } else {
                        if(elapsed[0] === 0) {
                            logger.info(prefixString + milli.toFixed(2) + " ms");
                        } else {
                            logger.info(prefixString + elapsed[0] + "." + (milli/1000) + " sec");
                        }
                    }
                }

                var parsedResults;
                if(modelName) {
                    var Model = cassie.model(modelName);

                    parsedResults = parseResults(results, Model);

                    if(execOptions.debug) logResults(logger, execOptions, err, parsedResults);
                } else {
                    parsedResults = results;
                }

                (callback || nullCallback)(err, parsedResults, metadata);
            });

        } else {

            connection.execute(queryString, params, execOptions.consistency, function (err, results, metadata) {
                if (execOptions.timing) {
                    var elapsed = process.hrtime(start);
                    var milli = elapsed[1] / 1000000; //millisecond time

                    var prefixString = "CQL Timing: ";
                    if(execOptions.prettyDebug) {
                        if(elapsed[0] === 0) {
                            logger.info(prefixString + "\x1B[0;32m " + milli.toFixed(2) + " ms \x1B[0m");
                        } else {
                            logger.info(prefixString + "\x1B[0;31m " + elapsed[0] + "." + (milli/1000) + " sec \x1B[0m");
                        }
                    } else {
                        if(elapsed[0] === 0) {
                            logger.info(prefixString + milli.toFixed(2) + " ms");
                        } else {
                            logger.info(prefixString + elapsed[0] + "." + (milli/1000) + " sec");
                        }
                    }
                }

                var parsedResults;
                if(modelName) {
                    var Model = cassie.model(modelName);

                    parsedResults = parseResults(results, Model);

                    if(execOptions.debug) logResults(logger, execOptions, err, parsedResults);
                } else {
                    parsedResults = results;
                }

                (callback || nullCallback)(err, parsedResults, metadata);
            });

        }

    };

//    this.streamRows = function(execOptions, rowCallback, endCallback) {
//        if (!queryString) {
//            return (callback || nullCallback)("Query is null. This is typically due to a validation error.", null);
//        }
//        if (typeof execOptions === 'function') {
//            rowCallback = execOptions;
//            endCallback = rowCallback;
//            execOptions = options;
//        }
//        if(!rowCallback || !endCallback) {
//            return (rowCallback || endCallback || nullCallback)("Must supply both row callback and end callback for Query.streamRows()", null);
//        }
//        execOptions = cleanupExecOptions(execOptions, queryString, params);
//
//        connection.eachRow(queryString, params, execOptions.consistency, rowCallback, endCallback);
//
//    };
//
//    this.streamFields = function(execOptions, callback) {
//
//        if (!queryString) {
//            return (callback || nullCallback)("Query is null. This is typically due to a validation error.", null);
//        }
//        if (typeof execOptions === 'function') {
//            rowCallback = execOptions;
//            endCallback = rowCallback;
//            execOptions = options;
//        }
//        execOptions = cleanupExecOptions(execOptions, queryString, params);
//
//        connection.streamField(queryString, params, execOptions.consistency, callback);
//
//    };

    this.stream = function(execOptions, callback) {

        if (!queryString) {
            return (callback || nullCallback)("Query is null. This is typically due to a validation error.", null);
        }
        if (typeof execOptions === 'function') {
            callback = execOptions;
            execOptions = options;
        }
        if(!execOptions) {
            execOptions = {};
        }

        execOptions = cleanupExecOptions(execOptions, queryString, params);

        return connection.stream(queryString, params, execOptions.consistency, callback);

    }

}

Query.batch = function (cassieQueries, connection, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var queries = [];
    cassieQueries.forEach(function (cassieQuery) {
        queries.push({
            query: cassieQuery.queryString,
            params: cassieQuery.params
        });
    });

    var logger;
    if (options.logger) {
        logger = options.logger;
    } else {
        logger = console;
    }

    if (options.debug) {
        if(options.prettyDebug) {
            logger.info("-----\nCQL Batch Queries: ");
            logger.info("\x1B[0;34m" + JSON.stringify(queries, null, 2) + " \x1B[0m");
        } else {
            logger.info("CQL Batch Queries: ");
            logger.info(JSON.stringify(queries));
        }

    }

    if (!options.consistency) {
        options.consistency = types.consistencies.quorum;
    }

    if (!options.counter) {
        options.counter = false;
    }

    var start;
    if (options.timing) {
        start = process.hrtime();
    }

    connection.executeBatch(queries, options.consistency, {counter: options.counter}, function (err) {
        if (options.timing) {
            var elapsed = process.hrtime(start);
            var milli = elapsed[1] / 1000000; //millisecond time

            var prefixString = "CQL Timing: ";
            if(options.prettyDebug) {
                if(elapsed[0] === 0) {
                    logger.info(prefixString + "\x1B[0;32m" + milli.toFixed(2) + " ms \x1B[0m");
                } else {
                    logger.info(prefixString + "\x1B[0;31m" + elapsed[0] + "." + (milli/1000) + " sec \x1B[0m");
                }
            } else {
                if(elapsed[0] === 0) {
                    logger.info(prefixString + milli.toFixed(2) + " ms");
                } else {
                    logger.info(prefixString + elapsed[0] + "." + (milli/1000) + " sec");
                }
            }
        }

        if (options.debug) {
            if(options.prettyDebug) {
                logger.info("CQL Batch:\x1B[0;36m Queries complete\x1B[0m");
            } else {
                logger.info("CQL Batch Queries complete");
            }
        }

        callback(err);
    });

};

module.exports = exports = Query;
