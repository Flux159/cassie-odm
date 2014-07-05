
var pluralize = require('pluralize');

var Query = require('./query');

var nullCallback = function() {};

//Just some fancy string manipulation to parse find arguments into a CQL string
function parseArguments(arguments) {
	if(typeof arguments !== 'object') {
		throw "Error: Arguments must be a javascript object / dictionary";
	}
	var argumentString = " ";
	
	var argStringArray = [];
	var argValueArray = [];

	for(var key in arguments) {		
		var value = arguments[key];
						
		if(typeof value === 'string') {
			//Use '='
			argStringArray.push(" " + key + " =? ");
			argValueArray.push(value);
		}
		
		if(typeof value === 'number') {
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
						argStringObj = argStringObj + "?";
						argStringValArray.push(v);
					} else if(typeof v === 'number') {
						argStringObj = argStringObj + "?";
						argStringValArray.push(v);
					} else {
						throw "Arguments inside of an array must be a string or number";
					}
					if(i !== (value.length-1)) {
						argStringObj = argStringObj + ',';
					}
				});
				argStringObj = argStringObj + ") ";
				
				argStringArray.push(argStringObj);
				
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
								tempArgStringArray.push(" " + key + " >= ? ");
								tempArgValueArray.push(value[vkey]);
						} else if(typeof value[vkey] === 'number') {
								tempArgStringArray.push(" " + key + " >= ? ");
								tempArgValueArray.push(value[vkey]);
						} else {
							throw "Greater than or equal to argument must be a string or number";
						}
					}
					if(vkey === '$lt') {
						//Use '=<'
						if(typeof value[vkey] === 'string') {
							tempArgStringArray.push(" " + key + " <= ? ");
							tempArgValueArray.push(value[vkey]);
						} else if(typeof value[vkey] === 'number') {
							tempArgStringArray.push(" " + key + " <= ? ");
							tempArgValueArray.push(value[vkey]);
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
								argStringObj = argStringObj + "?";
								argStringValArray.push(v);
							} else if(typeof v === 'number') {
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

//Some Options:
//Just pass a string of fields to limit the fields returned: Ex: 'fname, lname' (or even 'fname lname')
//Other is an object, where you can have the following: 
//{
//	allow_filtering: Boolean,
// 	fields: String,
//	limit: Number,
//	sort: 1 or -1 (Number)
//} 
//See documentation on cql ALLOW FILTERING for what allow_filtering does. The rest are fairly self explanatory.
function parseOptions(options) {

	var optionsDictionary = {};
	if(typeof options === 'string') {
		optionsDictionary.fields = parseFields(options);
	} else if(typeof options === 'object') {
		if(!options) {
			optionsDictionary = {};
		} else {
			if(options.fields) {
				options.fields = parseFields(options.fields);
			}
			optionsDictionary = options;
		}
	} else {
		throw "Options must be string containing fields to select or object. See documentation on options for <CassieModel>.find() for more information.";
	}
	return optionsDictionary;
}

//Based on model, parse model._is_new, model._is_dirty, and fields to generate INSERT or UPDATE cql string
function parseSave(model, saveOptions) {
	// var saveString = "";
	// if(model._is_new) {
		// saveString = saveString + "INSERT INTO"
	// }
	// console.log(model);
	
	var saveString = "";
	var argumentParams = [];
	if(model._is_new) {
		saveString = saveString + "INSERT INTO " + model._tableName;
		
		var keyString = "(";
		var valueString = "(";
		for(var key in model._is_dirty) {
			if(model[key]) {
				keyString = keyString + key + ",";
				if(typeof model[key] === 'number') {
					valueString = valueString + model[key] + ",";
				} else if(typeof model[key] === 'string') {
					valueString = valueString + "'" + model[key] + "'" + ",";
				} else {
					valueString = valueString + "'" + model[key].toString() + "'" + ",";
				}
			}
		}
		keyString = keyString.slice(0,-1);
		keyString = keyString + ")";
		valueString = valueString.slice(0,-1);
		valueString = valueString + ") ";
		
		saveString = saveString + " " + keyString + " VALUES " + valueString;
		
		if(saveOptions.if_not_exists) {
			saveString = saveString + " IF NOT EXISTS";
		}
				
		saveStringOptions = [];
		if(saveOptions.ttl) {
			if(typeof saveOptions.ttl === 'number') {
				var ttl = saveOptions.ttl;
				saveStringOptions.push(" TTL " + ttl.toString());
				// query = query + " LIMIT " + limitAmount.toString() + " ";
			}	
		}
		if(saveOptions.timestamp) {
			if(typeof saveOptions.timestamp === 'number') {
				var timestamp = saveOptions.timestamp;
				saveStringOptions.push(" TIMESTAMP " + timestamp.toString());
				// saveString = saveString + ""
			} else {
				saveStringOptions.push(" TIMESTAMP");
			}
		}
		
		if(saveStringOptions.length !== 0) {
			combinedSaveStringOptions = saveStringOptions.join(" AND");
			saveString = saveString + " USING" + combinedSaveStringOptions;
		}
		
		// console.log(model._is_dirty);
		
	} else {
		saveString = saveString + "UPDATE " + model._tableName;
		//TODO: Update - it has a lot of stuff... http://www.datastax.com/documentation/cql/3.0/cql/cql_reference/update_r.html
	}
	// console.log(saveString);
	
	var returnObj = {};
	returnObj.saveString = saveString;
	returnObj.argumentParams = argumentParams;
	
	return returnObj;
}

function parseRemove(model, removeOptions) {
	var removeString = "";
	var argumentParams = [];
	
	var removeFields = "";
	if(typeof removeOptions === 'string') {
		// var argumentParams = parseFields(removeOptions);
		removeFields = parseFields(removeOptions);
	} else {
		if(removeOptions.fields) {
				removeFields = parseFields(removeOptions.fields);
		}
	}
	
	//Note that this is currently only for single object deletion, multiple object deletion should be handled by ModelSchema.remove() (parsing the same way as find because it can support IN, etc.)
	
	//Also note that this probably has to have index information from schema (makes no sense without it - I won't be able to delete)
	//TODO: Get primary_key varialbe into model, then use in this remove function
	//Reference for Remove:
	//http://www.datastax.com/documentation/cql/3.0/cql/cql_reference/delete_r.html
	
	var returnObj = {};
	returnObj.removeString = removeString;
	returnObj.argumentParams = argumentParams;
	
	return returnObj;
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
	
	//TODO: Parse through schema and add a "primary_key" variable (this.primary_key), etc. into Model & ModelSchema (find needs it)
	//If there isn't a primary key specified, then create one ('_id')
	//This will also be useful later when making / attempting to update tables (/columnfamilies)
	
	//Reference for schema stuff (python driver):
	//https://github.com/cqlengine/cqlengine
	//Also see this for how they create keyspaces, sync tables, etc:
	//https://github.com/cqlengine/cqlengine/blob/master/cqlengine/management.py
	
	
			function Model(doc, docOptions) {
			
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

					//I might need to do something about fields that are named "save" and "markModified"? (probably just rename those fields to be _save and _markModified - that seems easiest)

					//One thing to note: some modelSchema fields can be null - this is the same as trying to retrieve a field without its primary key

					//I think I need this.toString() to be defined? (so it doesn't show _is_dirty flags & save, markModified functions?)

				} else {
		
				}
			
				//Return object with properties and save function, etc.
				this.save = function(saveOptions, callback) {
					//Standard insert or update (based on _is_new)
					if(typeof saveOptions === 'function') {
						callback = saveOptions;
						saveOptions = {};
					}

					//Parse fields, is_dirty, and is_new to make an INSERT or UPDATE function for this model
					//One issue: if they try to retrieve a field without its PRIMARY key, then I probably won't be able to save it (make PRIMARY one of the schema things that I can set), along w/ indices, etc. - if they don't define PRIMARY, then I'll create _id as a primary key (long uuid by default)
					var saveQueryObject = parseSave(this, saveOptions);
					var saveQuery = saveQueryObject.saveString;
					var argumentParams = saveQueryObject.argumentParams;

					// console.log(saveQueryObject);
					// console.log(saveQuery);
					// console.log(argumentParams);

					var queryObject = new Query(saveQuery, argumentParams, connection, saveOptions);
		
					if(!callback) {
						return queryObject;
					} else {
						// console.log("Should be executing query...");
						this._is_new = false; //This is kinda bad... (if it doesn't succeed, then I can't set this?)
						this._is_dirty = {};
						queryObject.exec(function(err, results) {
							// console.log(this);
							// this._is_new = false;
							callback(err, results);
						});
					}

					// this._is_new = false;

					//Query, save, err, etc.
					// var err = null;
					// callback(err);
				};

				this.remove = function(removeOptions, callback) {
					if(typeof removeOptions === 'function') {
						callback = removeOptions;
						removeOptions = {};
					}
					
					var removeQueryObject = parseRemove(this, removeOptions);
					var removeQuery = removeQueryObject.removeString;
					var argumentParams = removeQueryObject.argumentParams;
					
					var queryObject = new Query(removeQuery, argumentParams, connection, saveOptions);
					
					if(!callback) {
						return queryObject;
					} else {
						queryObject.exec(callback);	
					}
				};

				this.markModified = function(callback) {
					//Set _is_dirty flag for specified field

				};
				
				this._modelName = modelName;
				this._tableName = tableName;
				this._connection = connection;
				this._options = options;
				this._validators = schema.validators;
				this._presaves = schema.presaves;
				
				// var returnObject = {
// 					save: this.save,
// 					markModified: this.markModified,
// 					_modelName: modelName,
// 					_tableName: tableName,
// 					_connection: connection,
// 					_options: options,
// 					_validators: schema.validators,
// 					_presaves: schema.presaves
// 				};
//
// 				return returnObject; 
			}
	
			Model.find = function(arguments, findOptions, callback) {
						if(typeof findOptions === 'function') {
							callback = findOptions;
							findOptions = {};
						}
			
						var optionsDictionary = parseOptions(findOptions);
						
						var fields = "*";
						if(optionsDictionary.fields) {
							fields = optionsDictionary.fields;
						}
			
						var query = "SELECT "+fields+" FROM "+tableName;
			
						var argumentResult = parseArguments(arguments);
						var argumentString = argumentResult.argumentString;
						var argumentParams = argumentResult.paramArray;
			
						var query = query + argumentString;
			
						//Allow limiting and sorting as options in find (incase you don't want to use chaining method)
						if(optionsDictionary.limit) {
							if(typeof optionsDictionary.limit === 'number') {
								var limitAmount = optionsDictionary.limit;
								query = query + " LIMIT " + limitAmount.toString() + " ";
							}
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
						var queryObject = new Query(query, argumentParams, connection, findOptions);
			
						if(!callback) {
							return queryObject;
						} else {
							queryObject.exec(callback);
						}			
					};
	
					Model.findById = function(id, findOptions, callback) {
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
						Model.find(args, findOptions, callback);
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

exports.parseResults = function(results) {
	//TODO: Parsed results need to be objects w/ save/delete methods (and probably hold references to connection interally as well then, along w/ _is_dirty flag - need a markModified method), _is_dirty is probably going to need to be an object (because I don't want to update all the fields - probably only the )
	
			//TODO: Need to do dirty flags for save / update / delete (probably going to have to make an object / return objects w/ save / delete methods, etc.)
	
	var parsedResults;
	
	//TODO: Make these Model objects (new Model)
	if(results) {
		parsedResults = results.rows;
		if(parsedResults) {
			parsedResults.forEach(function(parsedResult) {
				delete parsedResult.columns;
			});
		}
	}
	
	//This needs save / update / _is_dirty flag
	
	return parsedResults;
};

exports.create = function(modelName, schema, connection, options) {
	return new ModelSchema(modelName, schema, connection, options);
};
