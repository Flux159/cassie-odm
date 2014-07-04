
var Model = require('./model');
var cql = require('node-cassandra-cql');

// function parseResults(results) {
//
// 	//TODO: Parsed results need to be objects w/ save/delete methods (and probably hold references to connection interally as well then, along w/ _is_dirty flag - need a markModified method), _is_dirty is probably going to need to be an object (because I don't want to update all the fields - probably only the )
//
// 			//TODO: Need to do dirty flags for save / update / delete (probably going to have to make an object / return objects w/ save / delete methods, etc.)
//
// 	var parsedResults;
//
// 	//TODO: Make these Model objects
// 	if(results) {
// 		parsedResults = results.rows;
// 		parsedResults.forEach(function(parsedResult) {
// 			delete parsedResult.columns;
// 		});
// 	}
//
// 	//This needs save / update / _is_dirty flag
//
// 	return parsedResults;
// }

function Query(queryString, params, connection, options) {
	
	this.queryString = queryString;
	if(!params) {
		params = [];
	}
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
	this.exec = function(callback) {
		//Execute saved query (if the user doesn't supply a callback, then it should use nullCallback - ie execute async)
		
		// if(consistency && (typeof consistency === 'function')) {
			// consistency = options.consistency || cql.types.consistencies.quorum;
			// callback = consistency;
		// }
		
		if(options.debug) {
			console.log("CQL Query: " + queryString);
			console.log("Parameters: " + options);
		}
		
		connection.execute(queryString, params, function(err, results, metadata) {
			
			var parsedResults = Model.parseResults(results); 
			
			(callback || nullCallback)(err, parsedResults, metadata);
			// callback(err, parsedResults, metadata);
		});
		
	};
	
}

module.exports = exports = Query;
