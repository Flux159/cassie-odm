
var pluralize = require('pluralize');

// //Execute raw cql (directly from node-cassandra-cql)
// var cql = function(query, args, callback) {
// 	if(!Cassie.connection) {
// 		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
// 	}
//
// 	if (typeof args === 'function'){
// 		callback = args;
// 		args = [];
// 	}
//
// 	Cassie.connection.execute(query, args, function(err, results, metadata) {
// 		(callback || nullCallback)(err, results);
// 	});
// };

function parseArguments(arguments) {
	if(typeof arguments !== 'object') {
		throw "Error: Arguments must be a javascript object / dictionary";
	}
	
	// var argumentString = "WHERE ";
	var argumentString = " ";
	
	// console.log(arguments);

	var argStringArray = [];

	for(var key in arguments) {
		// console.log("Key: " + key);
		// console.log("Value: " + arguments[key]);
		
		var value = arguments[key];
		
		// console.log("Value: " + value);
		// console.log(typeof value);
		
		//3 special functions / values: $gt $lt $in (in would be the array case), $gt and $lt should be parsed to >= and =< respectively
		//Note that these are defined as follows: created_at: {$gt: num1, $lt: num2}
		//or... name_list: {$in: ['array', 'of', 'names']}
		
		//A note: Cassandra doesn't have strictly less than or strictly greater than operators (they're just aliases for >= and =<)
		
		if(typeof value === 'string') {
			console.log(value + " is a string");
			//Use '='
			argStringArray.push(" " + key + " = '" + value + "' ");
		}
		
		if(typeof value === 'number') {
			console.log(value + " is a number");
			//Use '='
			argStringArray.push(" " + key + " = " + value + " ");
		}
		
		if(typeof value === 'object') {

			if(Object.prototype.toString.call(value) === '[object Array]') {
				// console.log(value + " is an array");
				// console.log(value);
				argStringObj = " " + key + " IN (";
				value.forEach(function(v, i) {
					if(typeof v === 'string') {
						argStringObj = argStringObj + "'"+v+"'";
					} else if(typeof v === 'number') {
						argStringObj = argStringObj + v;
					} else {
						throw "Arguments inside of an array must be a string or number";
					}
					if(i !== (value.length-1)) {
						argStringObj = argStringObj + ',';
					}
				});
				argStringObj = argStringObj + ") ";
				argStringArray.push(argStringObj);
				//Use 'IN' with a () encompassed array containing strings (or nums?)
			} else {
				
				// console.log(value + "is an object");
				// console.log(value);
				
				//Can be object with $gt: String or Num, $lt: String or Num, $in: [Array]
				var tempArgStringArray = [];
				for(var vkey in value) {
					if(vkey === '$gt') {
						// console.log("Object has key $gt:");
						// console.log(value[vkey]);
						//Use '>='
						if(typeof value[vkey] === 'string') {
								tempArgStringArray.push(" " + key + " >= '" + value[vkey] + "' ");
						} else if(typeof value[vkey] === 'number') {
							tempArgStringArray.push(" " + key + " >= " + value[vkey] + " ");
						} else {
							throw "Greater than or equal to argument must be a string or number";
						}
					}
					if(vkey === '$lt') {
						// console.log("Object has key $lt:");
						// console.log(value[vkey]);
						//Use '=<'
						if(typeof value[vkey] === 'string') {
								tempArgStringArray.push(" " + key + " <= '" + value[vkey] + "' ");
						} else if(typeof value[vkey] === 'number') {
								tempArgStringArray.push(" " + key + " <= " + value[vkey] + " ");
						} else {
							throw "Less than or equal to argument must be a string or number";
						}
						
					}
					if(vkey === '$in') {
						// console.log("Object has key $in:");
						// console.log(value[vkey]);
						//Use 'IN' with a () encompassed array containing strings - same as above for array case
						
						argStringObj = " " + key + " IN (";
						
						value[vkey].forEach(function(v, i) {
							if(typeof v === 'string') {
								argStringObj = argStringObj + "'"+v+"'";
							} else if(typeof v === 'number') {
								argStringObj = argStringObj + v;
							} else {
								throw "Arguments inside of an array must be a string or number";
							}
							if(i !== (value[vkey].length-1)) {
								argStringObj = argStringObj + ',';
							}
						});
						argStringObj = argStringObj + ") ";
						tempArgStringArray.push(argStringObj);
						
					}
				}
				var joinedTempArgString = tempArgStringArray.join(' AND ');
				argStringArray.push(joinedTempArgString);
			}
			
		}

		
		// if(typeof value === 'array') {
			// console.log(value + " is an array");
		// }
		
		
	}
	
	var joinedArgStringArray = "";
	if(argStringArray.length !== 0) {
		joinedArgStringArray = argStringArray.join(' AND ');
		return argumentString = argumentString + "WHERE " + joinedArgStringArray;
	} else {
		return argumentString;
	}
	
}

function parseOptions(options) {
	var optionsDictionary = {};
	
	return optionsDictionary;
}

function parseResults(results) {
	
	//TODO: Parsed results need to be objects w/ save/delete methods (and probably hold references to connection interally as well then, along w/ _is_dirty flag - need a markModified method), _is_dirty is probably going to need to be an object (because I don't want to update all the fields - probably only the )
	
	
	var parsedResults;
	if(results) {
		parsedResults = results.rows;
		parsedResults.forEach(function(parsedResult) {
			delete parsedResult.columns;
		});
	}
	return parsedResults;
}

exports.create = function(modelName, schema, connection, options) {
	if(!connection) {
		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
	}
	
	console.log(schema);
	// console.log(pluralize(modelName));
	
	var tableName = modelName;
	if(options.lowercase) {
		tableName = tableName.toLowerCase();
	}
	if(options.pluralize) {
		tableName = pluralize(tableName);
	}
	
	// var tableName = schema.
	
	return {
		//TODO: Need to do dirty flags for save / update / delete (probably going to have to make an object / return objects w/ save / delete methods, etc.)
		//TODO: Validations
		//TODO: BigInteger / Long support
		//TODO: Allow user to make their own queries w/ default connection (Cassie.cql())
		//TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
		//TODO: Indices and "plugin" support for schemas (need to see how Cassandra handles indices)
		
		find: function(arguments, options, callback) {
			
			//TODO: Fix this to allow for promises / chaining / exec
			if(!options) {
				throw "You must supply a callback to the find function. See Model.find(arguments, callback) for documentation."
			}
			if(typeof options === 'function') {
				callback = options;
				options = [];
			}
			// console.log("Implement find");
			
			var optionsDictionary = parseOptions(options);
			
			var fields = "*";
			if(optionsDictionary.fields) {
				fields = optionsDictionary.fields;
			}
			
			var query = "SELECT "+fields+" FROM "+tableName;
			
			//TODO: Append to query using arguments
			var argumentString = parseArguments(arguments);
			
			// console.log(argumentString);
			
			var query = query + argumentString;
			
			
			
			
			
			console.log(query);
			
			//TODO: Limit query when options is given as string (ie only return _id, etc. when '_id' is passed as options arg)
			//TODO: Add "limit" & "sort" arguments
			//TODO: Write documentation and Tests
			
			connection.execute(query, options, function(err, results, metadata) {
				
				var parsedResults = parseResults(results); 
				
				callback(err, parsedResults, metadata);
			});
			
		},
		findById: function() {
			console.log("Implement findById");
		},
		findOne: function() {
			
		},
		remove: function() {
			
		},
		limit: function() {
			
		},
		sort: function() {
			
		},
		exec: function() {
			
		},
		query: function() {
			
		}
		
		// get: function() {
		// 	console.log("Implement get");
		// }
	};
};
