
var cql = require('node-cassandra-cql');
var cassie = require('./cassie');

var parseResults = function(results, Model) {
	
	var parsedResults = [];
	
	if(results) {
		if(results.rows) {
			results.rows.forEach(function(parsedResult) {
				delete parsedResult.columns;
				
				var newModel = new Model(parsedResult, {'_from_db': true});
				console.log("Should be done creating model returned");
				console.log(newModel.toString());
				parsedResults.push(newModel);
			});
		}
	}
	
	parsedResults.toString = function() {
		var returnArray = [];
		this.forEach(function(model) {
			returnArray.push(model.toString());
		});
		return returnArray;
	}
	
	return parsedResults;
};

function Query(queryString, params, connection, options, modelName) {
	
	this.queryString = queryString;
	if(!params) {
		params = [];
	}
	this.params = params;
	if(!options) {
		options = {};
	}
	
	this.limit = function(limitAmount) {
		if(typeof limitAmount !== 'number') {
			throw "Limit argument must be a number";
		}
		//Add limit to query (no execution) - return this
		
		//Remove "ALLOW FILTERING" and add back on
		var appendFiltering = false;
		if(this.queryString.indexOf("ALLOW FILTERING") > -1) {
			this.queryString = this.queryString.replace("ALLOW FILTERING", "");
			appendFiltering = true;
		}
		
		//LIMIT clause
		this.queryString = queryString + " LIMIT " + limitAmount.toString() + " ";
		
		if(appendFiltering) {
			this.queryString = queryString + "ALLOW FILTERING";
		}
		
		return this;
	};
	this.sort = function(sortObject) {
		//Add sort to query (no execution) - return this
		//sortObject is {field_name: 1} or {field_name: -1} (for sorting by Ascending / Descending order)
		if(typeof sortObject !== 'object') {
			throw "Sort argument must be an object containing a field key with an order value. Example: {field_name: -1} for DESCENDING order or {field_name: 1} ASCENDING order.";
		}
		
		//Remove "ALLOW FILTERING" and add back on
		var appendFiltering = false;
		if(this.queryString.indexOf("ALLOW FILTERING") > -1) {
			this.queryString = this.queryString.replace("ALLOW FILTERING", "");
			appendFiltering = true;
		}
		
		var sortString = " ";
		for(var key in sortObject) {
			sortString = sortString + key.toString() + " ";
			if(sortObject[key] === 1) {
				sortString = sortString + "ASC";
			} else if(sortObject[key] === -1) {
				sortString = sortString + "DESC";
			} else {
				throw "Sorting can only be ASCENDING (1) or DESCENDING (-1). See documentation on sort for more information.";
			}
		}
		
		//ORDER BY clause
		this.queryString = queryString + " ORDER BY " + sortString + " ";
		
		if(appendFiltering) {
			this.queryString = queryString + "ALLOW FILTERING";
		}
		
		return this;
	};
	this.exec = function(execOptions, callback) {
		//Execute saved query (if the user doesn't supply a callback, then it should use nullCallback - ie execute async)
		
		if(typeof execOptions === 'function') {
			callback = execOptions;
			execOptions = options;
		}
		
		var logger;
		if(execOptions.logger) {
			logger = execOptions.logger;
		} else {
			logger = console;
		}
		
		if(execOptions.debug) {
			if(execOptions.prettyDebug) {
				logger.info("-----");
			}
			logger.info("CQL Query: " + queryString);
			if(params.length > 0) {
				logger.info("CQL Parameters: " + params);
			}
		}
		
		if(!execOptions.consistency) {
			execOptions.consistency = cql.types.consistencies.quorum;
		}
		
		var start;
		if(execOptions.timing) {
			start = process.hrtime();
		}
		
		connection.execute(queryString, params, execOptions.consistency, function(err, results, metadata) {
			if(execOptions.timing) {
				var elapsed = process.hrtime(start);
				var milli = elapsed[1] / 1000000; //millisecond time
				logger.info("CQL Timing: Query took %d seconds and %d milliseconds to return", elapsed[0], milli);
			}
			
			var Model = cassie.model(modelName);
			
			var parsedResults = parseResults(results, Model); 
			
			if(execOptions.debug) {
				if(err) {
					logger.info("CQL Error: ");
					logger.info(err);
				}
				if(parsedResults.length > 0) {
					logger.info("CQL Results: ");
					logger.info(parsedResults.toString());
				} else {
					logger.info("CQL Results: Empty (No error)");
				}
			}
			
			(callback || nullCallback)(err, parsedResults, metadata);
		});
	};	
}

module.exports = exports = Query;
