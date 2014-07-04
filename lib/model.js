
var pluralize = require('pluralize');

var Query = require('./query');

var nullCallback = function() {};

function parseArguments(arguments) {
	if(typeof arguments !== 'object') {
		throw "Error: Arguments must be a javascript object / dictionary";
	}
	
	var argumentString = " ";
	
	var argStringArray = [];
	var argValueArray = [];

	for(var key in arguments) {		
		var value = arguments[key];
		
		//NOTE: CQL may not support all of these on every field by default (see ALLOW FILTERING for more info) 
		//3 special functions / values: $gt $lt $in (in would be the array case), $gt and $lt should be parsed to >= and =< respectively
		//Note that these are defined as follows: created_at: {$gt: num1, $lt: num2}
		//or... name_list: {$in: ['array', 'of', 'names']}
		
		//A note: Cassandra doesn't have strictly less than or strictly greater than operators (they're just aliases for >= and =<)
		
		//TODO: I should definitely be passing these as parameters (to prevent SQL injection)
		//TODO: Also, adding priam support (primarily for cql file support) would be nice to have
		
		if(typeof value === 'string') {
			// console.log(value + " is a string");
			//Use '='
			argStringArray.push(" " + key + " =? ");
			argValueArray.push(value);
		}
		
		if(typeof value === 'number') {
			// console.log(value + " is a number");
			//Use '='
			argStringArray.push(" " + key + " =? ");
			argValueArray.push(value);
		}
		
		if(typeof value === 'object') {

			if(Object.prototype.toString.call(value) === '[object Array]') {
				var argStringObj = " " + key + " IN (";
				var argStringValArray = [];
				value.forEach(function(v, i) {
					if(typeof v === 'string') {
						// argStringObj = argStringObj + "'"+v+"'";
						argStringObj = argStringObj + "?";
						argStringValArray.push(v);
					} else if(typeof v === 'number') {
						argStringObj = argStringObj + "?";
						argStringValArray.push(v);
						// argStringObj = argStringObj + v;
					} else {
						throw "Arguments inside of an array must be a string or number";
					}
					if(i !== (value.length-1)) {
						argStringObj = argStringObj + ',';
					}
				});
				argStringObj = argStringObj + ") ";
				
				argStringArray.push(argStringObj);
				
				// console.log(argStringValArray);
				
				argValueArray = argValueArray.concat(argStringValArray);
				
				//Use 'IN' with a () encompassed array containing strings (or nums)
			} else {
				//Can be object with $gt: String or Num, $lt: String or Num, $in: [Array]
				var tempArgStringArray = [];
				var tempArgValueArray = [];
				for(var vkey in value) {
					if(vkey === '$gt') {
						//Use '>='
						if(typeof value[vkey] === 'string') {
								// tempArgStringArray.push(" " + key + " >= '" + value[vkey] + "' ");
								tempArgStringArray.push(" " + key + " >= ? ");
								tempArgValueArray.push(value[vkey]);
						} else if(typeof value[vkey] === 'number') {
								tempArgStringArray.push(" " + key + " >= ? ");
								tempArgValueArray.push(value[vkey]);
							// tempArgStringArray.push(" " + key + " >= " + value[vkey] + " ");
						} else {
							throw "Greater than or equal to argument must be a string or number";
						}
					}
					if(vkey === '$lt') {
						//Use '=<'
						if(typeof value[vkey] === 'string') {
							tempArgStringArray.push(" " + key + " <= ? ");
							tempArgValueArray.push(value[vkey]);
								// tempArgStringArray.push(" " + key + " <= '" + value[vkey] + "' ");
						} else if(typeof value[vkey] === 'number') {
							tempArgStringArray.push(" " + key + " <= ? ");
							tempArgValueArray.push(value[vkey]);
								// tempArgStringArray.push(" " + key + " <= " + value[vkey] + " ");
						} else {
							throw "Less than or equal to argument must be a string or number";
						}
						
					}
					if(vkey === '$in') {
						//Use 'IN' with a () encompassed array containing strings - same as above for array case
						argStringObj = " " + key + " IN (";
						argStringValArray = [];
						
						value[vkey].forEach(function(v, i) {
							if(typeof v === 'string') {
								// argStringObj = argStringObj + "'"+v+"'";
								argStringObj = argStringObj + "?";
								argStringValArray.push(v);
							} else if(typeof v === 'number') {
								// argStringObj = argStringObj + v;
								argStringObj = argStringObj + "?";
								argStringValArray.push(v);
							} else {
								throw "Arguments inside of an array must be a string or number";
							}
							if(i !== (value[vkey].length-1)) {
								argStringObj = argStringObj + ',';
							}
						});
						argStringObj = argStringObj + ") ";
						tempArgStringArray.push(argStringObj);
						tempArgValueArray = tempArgValueArray.concat(argStringValArray);
					}
				}
				var joinedTempArgString = tempArgStringArray.join(' AND ');
				argStringArray.push(joinedTempArgString);
				argValueArray = argValueArray.concat(tempArgValueArray);
			}
			
		}
	}
	
	var joinedArgStringArray = "";
	if(argStringArray.length !== 0) {
		joinedArgStringArray = argStringArray.join(' AND ');
		argumentString = argumentString + "WHERE " + joinedArgStringArray;
		
		var paramArray = argValueArray;
		
		var result = {argumentString: argumentString, paramArray: paramArray};
		return result;
	} else {
		var result = {argumentString: argumentString, paramArray: []};
		return result;
	}
	
}

function parseFields(fields) {
	return fields.split(' ').join(',');
} 

function parseOptions(options) {
	//2 Options currently - one is a string option (where it just limits fields)
	//Other is an object, where you can have allow_filtering: true and fields: 'string'
	//See documentation on cql ALLOW FILTERING
	var optionsDictionary = {};
	if(typeof options === 'string') {
		optionsDictionary.fields = parseFields(options);
	} else if(typeof options === 'object') {
		if(options.fields) {
			options.fields = parseFields(options.fields);
		}
		optionsDictionary = options;
	} else {
		throw "Options must be string containing fields to select or object. See documentation on options for <CassieModel>.find() for more information.";
	}
	return optionsDictionary;
}

function parseSave(model) {
	// var saveString = "";
	// if(model._is_new) {
		// saveString = saveString + "INSERT INTO"
	// }
	console.log(model);
}

// function Model(doc, docOptions) {
// 	console.log("Creating model");
// }

function Model(doc, docOptions, modelName, schema, connection, options) {
	
	//When schema actually contains stuff (like validations, pre-save stuff, then run validators before save)
	
	//If user is creating doc (ie from new User), use this path
	//If Cassie is internally creating Model, use else path (w/ schema, connection, etc.)
	if(doc) {
		if(!docOptions) {
			docOptions = {};
		}
		//Data is object w/ data fields
		if(typeof doc !== 'object') {
			throw "new "+modelName+"(object) must have an object as its first argument.";
		}
		
		//this._is_dirty contains flags for all data fields
		this._is_dirty = {};

		for(var field in doc) {
			if(field === 'save') {
				throw "Cannot name field save as that is a reserved method on Cassie.model()";
			} else if(field === 'markModified') {
				throw "Cannot name field markModified as that is a reserved method on Cassie.model()";
			}
			this[field] = doc[field];
			this._is_dirty[field] = true;
		}
		
		//Set docOptions.from_db when parsing results (user should not set this option when creating new)
		this._is_new = !docOptions.from_db;

		//I think that I need getters and setters on all the properties to modify _is_dirty and by default, I use _is_new = true when instantiating, I'll specify docOptions.new = false when parsing results

		this.save = function(callback) {
			//Standard insert or update (based on _is_new)

			//Parse fields, is_dirty, and is_new to make an INSERT or UPDATE function for this model
			//One issue: if they try to retrieve a field without its PRIMARY key, then I probably won't be able to save it (make PRIMARY one of the schema things that I can set), along w/ indices, etc. - if they don't define PRIMARY, then I'll create _id as a primary key (long uuid by default)
			parseSave(this);

			this._is_new = false;

		};

		this.markModified = function(callback) {
			//Set _is_dirty flag for specified field

		};

		//I might need to do something about fields that are named "save" and "markModified"? (probably just rename those fields to be _save and _markModified - that seems easiest)

		//One thing to note: some modelSchema fields can be null - this is the same as trying to retrieve a field without its primary key

		//I think I need this.toString() to be defined? (so it doesn't show _is_dirty flags & save, markModified functions?)

	} else {
		
		// if(!connection) {
		// 	throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
		// }
		
			//TODO: Validations - like a pre.save thing (I think that this would be in schema to begin with, then added to each model as a list of "pre"-save things to do, ie: pre: [function, function, etc.])
			//TODO: BigInteger / Long support
		
			//I don't think this should be allowed, they can use Cassie.query if they want to (and Cassie.connection if they want the manual node-cassandra-cql connection or Cassie.cql for running CQL)
			// this.query = function() {
				//Manually run cql query (same as Cassie.cql - uses connection that this model holds though)			
			// };
		
	}
}

ModelSchema = function(modelName, schema, connection, options) {
	if(!connection) {
		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
	}
	
	var modelName = modelName;
	var tableName = modelName;
	if(options.lowercase) {
		tableName = tableName.toLowerCase();
	}
	if(options.pluralize) {
		tableName = pluralize(tableName);
	}
	var connection = connection;
	var options = options;
	
			function Model(doc, docOptions) {
			
				//Return object with properties and save function, etc.
				this.save = function() {
					console.log(save);
				}
				
				return {
					save: this.save,
					modelName: modelName,
					tableName: tableName,
					connection: connection,
					options: options
				}
			}
	
			Model.find = function(arguments, findOptions, callback) {
			
						//TODO: Fix this to allow for promises / chaining / exec
						// if(!options) {
						// 	throw "You must supply a callback to the find function. See Model.find(arguments, callback) for documentation."
						// }
						if(typeof findOptions === 'function') {
							callback = findOptions;
							findOptions = {};
						}
						// console.log("Implement find");
			
						var optionsDictionary = parseOptions(findOptions);
						
						var fields = "*";
						if(optionsDictionary.fields) {
							fields = optionsDictionary.fields;
						}
			
						var query = "SELECT "+fields+" FROM "+tableName;
			
						//TODO: Append to query using arguments
						// var argumentString = parseArguments(arguments);
						var argumentResult = parseArguments(arguments);
						var argumentString = argumentResult.argumentString;
						var argumentParams = argumentResult.paramArray;
			
						// console.log(argumentString);
			
						var query = query + argumentString;
			
						//Allow limiting and sorting as options in find (incase you don't want to use chaining method)
						if(optionsDictionary.limit) {
							var limitAmount = optionsDictionary.limit;
							query = query + " LIMIT " + limitAmount.toString() + " ";
						}
			
						if(optionsDictionary.sort) {
										
							var sortObject = optionsDictionary.sort;
							if(typeof sortObject !== 'object') {
								throw "Sort argument must be an object containing a field key with an order value. Example: {field_name: -1} for DESCENDING order or {field_name: 1} ASCENDING order.";
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
							query = query + " ORDER BY " + sortString + " ";
						}
			
						if(optionsDictionary.allow_filtering) {
							query = query + " ALLOW FILTERING";
						}
			
						//This should create a new Query object here (return if no callback) from the parsed arguments and options
			
						// console.log(query);
			
						var queryObject = new Query(query, argumentParams, connection, findOptions.debug);
			
						if(!callback) {
							return queryObject;
						} else {
							queryObject.exec(callback);
						}
			
						//Chaining returns query object (which is the same as model object, just storing a query to execute) - also I think that I would need to pass along options as well
			
						//TODO: Limit query when options is given as string (ie only return _id, etc. when '_id' is passed as options arg)
						//TODO: Add "limit" & "sort" arguments - need to allow for chaining
						//TODO: Write documentation and Tests
			
						//Optional execution (whether a callback exists or not)
						// connection.execute(query, options, function(err, results, metadata) {
						//
						// 	var parsedResults = parseResults(results);
						//
						// 	callback(err, parsedResults, metadata);
						// });
			
					};
	
					Model.findById = function(id, options, callback) {
						console.log("Implement findById");
						//Fairly sure I can just use findOne
						//Finds by _id for model (convention in schema)
						if(!id) {
							throw "findById(id) requires id argument";
						}
						var args = {_id: id};
						// if(!options) {
							// options = {limit: 1};
						// }
						Model.find(args, options, callback);
					};
					Model.findByIdAndUpdate = function(id, options, callback) {
				
					};
					Model.findByIdAndRemove = function(id, options, callback) {
				
					};
					Model.findOne = function(args, findOptions, callback) {
						//Finds a single model - pretty sure that this is just a find with limit 1 (manually create CQL string instead of having to do the entire find? No, too much stuff that find does well, just use it)
						if(!findOptions) {
							findOptions = {limit: 1};
						} else {
							findOptions.limit = 1;
						}
						
						Model.find(args, findOptions, function(err, results) {
							if(results) {
									(callback || nullCallback)(err, results[0]);
							}
						});
					};
					Model.findOneAndUpdate = function() {
				
					};
					Model.findOneAndRemove = function() {
				
					}
					Model.remove = function() {
						//Finds & Removes from database
					};
	
	
			return Model;
}

// ModelSchema.find = function(arguments, findOptions, callback) {
//
// 				//TODO: Fix this to allow for promises / chaining / exec
// 				// if(!options) {
// 				// 	throw "You must supply a callback to the find function. See Model.find(arguments, callback) for documentation."
// 				// }
// 				if(typeof findOptions === 'function') {
// 					callback = findOptions;
// 					findOptions = {};
// 				}
// 				// console.log("Implement find");
//
// 				var optionsDictionary = parseOptions(findOptions);
//
// 				var fields = "*";
// 				if(optionsDictionary.fields) {
// 					fields = optionsDictionary.fields;
// 				}
//
// 				var query = "SELECT "+fields+" FROM "+this.tableName;
//
// 				//TODO: Append to query using arguments
// 				// var argumentString = parseArguments(arguments);
// 				var argumentResult = parseArguments(arguments);
// 				var argumentString = argumentResult.argumentString;
// 				var argumentParams = argumentResult.paramArray;
//
// 				// console.log(argumentString);
//
// 				var query = query + argumentString;
//
// 				//Allow limiting and sorting as options in find (incase you don't want to use chaining method)
// 				if(optionsDictionary.limit) {
// 					var limitAmount = optionsDictionary.limit;
// 					query = query + " LIMIT " + limitAmount.toString() + " ";
// 				}
//
// 				if(optionsDictionary.sort) {
//
// 					var sortObject = optionsDictionary.sort;
// 					if(typeof sortObject !== 'object') {
// 						throw "Sort argument must be an object containing a field key with an order value. Example: {field_name: -1} for DESCENDING order or {field_name: 1} ASCENDING order.";
// 					}
// 					var sortString = " ";
// 					for(var key in sortObject) {
// 						sortString = sortString + key.toString() + " ";
// 						if(sortObject[key] === 1) {
// 							sortString = sortString + "ASC";
// 						} else if(sortObject[key] === -1) {
// 							sortString = sortString + "DESC";
// 						} else {
// 							throw "Sorting can only be ASCENDING (1) or DESCENDING (-1). See documentation on sort for more information.";
// 						}
// 					}
// 					//ORDER BY clause
// 					query = query + " ORDER BY " + sortString + " ";
// 				}
//
// 				if(optionsDictionary.allow_filtering) {
// 					query = query + " ALLOW FILTERING";
// 				}
//
// 				//This should create a new Query object here (return if no callback) from the parsed arguments and options
//
// 				// console.log(query);
//
// 				var queryObject = new Query(query, argumentParams, this.connection, findOptions.debug);
//
// 				if(!callback) {
// 					return queryObject;
// 				} else {
// 					queryObject.exec(callback);
// 				}
//
// 				//Chaining returns query object (which is the same as model object, just storing a query to execute) - also I think that I would need to pass along options as well
//
// 				//TODO: Limit query when options is given as string (ie only return _id, etc. when '_id' is passed as options arg)
// 				//TODO: Add "limit" & "sort" arguments - need to allow for chaining
// 				//TODO: Write documentation and Tests
//
// 				//Optional execution (whether a callback exists or not)
// 				// connection.execute(query, options, function(err, results, metadata) {
// 				//
// 				// 	var parsedResults = parseResults(results);
// 				//
// 				// 	callback(err, parsedResults, metadata);
// 				// });
//
// 			};

// ModelSchema.prototype = Object.create(Model.prototype);

exports.parseResults = function(results) {
	//TODO: Parsed results need to be objects w/ save/delete methods (and probably hold references to connection interally as well then, along w/ _is_dirty flag - need a markModified method), _is_dirty is probably going to need to be an object (because I don't want to update all the fields - probably only the )
	
			//TODO: Need to do dirty flags for save / update / delete (probably going to have to make an object / return objects w/ save / delete methods, etc.)
	
	var parsedResults;
	
	//TODO: Make these Model objects (new Model)
	if(results) {
		parsedResults = results.rows;
		parsedResults.forEach(function(parsedResult) {
			delete parsedResult.columns;
		});
	}
	
	//This needs save / update / _is_dirty flag
	
	return parsedResults;
};

exports.create = function(modelName, schema, connection, options) {
	
	// modelProperties = new ModelProperties(modelName, schema, connection, options);
	// Model.prototype.properties = modelProperties;
	
	return new ModelSchema(modelName, schema, connection, options);

	// Model.setProperties(modelName, schema, connection, options);
	// return Model;
	
	// return new Model(null, null, modelName, schema, connection, options);
};
