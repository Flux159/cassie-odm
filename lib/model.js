
var pluralize = require('pluralize');

var Query = require('./query');

var nullCallback = function() {};

function parseArguments(arguments) {
	if(typeof arguments !== 'object') {
		throw "Error: Arguments must be a javascript object / dictionary";
	}
	
	var argumentString = " ";
	
	var argStringArray = [];

	for(var key in arguments) {		
		var value = arguments[key];
		
		//NOTE: CQL may not support all of these on every field by default (see ALLOW FILTERING for more info) 
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
				//Use 'IN' with a () encompassed array containing strings (or nums)
			} else {
				//Can be object with $gt: String or Num, $lt: String or Num, $in: [Array]
				var tempArgStringArray = [];
				for(var vkey in value) {
					if(vkey === '$gt') {
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
	//2 Options currently - one is a string option (where it just limits fields)
	//Other is an object, where you can have allow_filtering: true and fields: 'string'
	//See documentation on cql ALLOW FILTERING
	var optionsDictionary = {};
	if(typeof options === 'string') {
		optionsDictionary.fields = options;
	} else if(typeof options === 'object') {
		optionsDictionary = options;
	} else {
		throw "Options must be string containing fields to select or object. See documentation on options for <CassieModel>.find() for more information.";
	}
	return optionsDictionary;
}

function Model(doc, docOptions, modelName, schema, connection, options) {
	
	//If user is creating doc (ie from new User), use this path
	//If Cassie is internally creating Model, use else path (w/ schema, connection, etc.)
	if(doc) {
		if(!docOptions) {
			docOptions = {};
		}
		//Data is object w/ data fields

		//this._is_dirty contains flags for all data fields

		this._is_dirty = {};

		this._is_new = docOptions.new;

		this.save = function(callback) {
			//Standard insert or update (based on _is_new)

		};

		this.markModified = function(callback) {

		};

		//I might need to do something about fields that are named "save" and "markModified"? (probably just rename those fields to be _save and _markModified - that seems easiest)

		//One thing to note: some modelSchema fields can be null


		//I think I need this.toString() to be defined? (so it doesn't show _is_dirty flags & save, markModified functions?)

	} else {
		
		if(!connection) {
			throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
		}
	
		this.modelName = modelName;
		this.tableName = this.modelName;
		if(options.lowercase) {
			this.tableName = this.tableName.toLowerCase();
		}
		if(options.pluralize) {
			this.tableName = pluralize(this.tableName);
		}
	
			//TODO: Validations - like a pre.save thing (I think that this would be in schema to begin with, then added to each model as a list of "pre"-save things to do, ie: pre: [function, function, etc.])
			//TODO: BigInteger / Long support
		
			this.find = function(arguments, options, callback) {
			
				//TODO: Fix this to allow for promises / chaining / exec
				// if(!options) {
				// 	throw "You must supply a callback to the find function. See Model.find(arguments, callback) for documentation."
				// }
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
			
				var query = "SELECT "+fields+" FROM "+this.tableName;
			
				//TODO: Append to query using arguments
				var argumentString = parseArguments(arguments);
			
				// console.log(argumentString);
			
				var query = query + argumentString;
			
				if(optionsDictionary.allow_filtering) {
					query = query + " ALLOW FILTERING";
				}
			
				//This should create a new Query object here (return if no callback) from the parsed arguments and options
			
				console.log(query);
			
				var queryObject = new Query(query, options, connection);
			
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
			this.findById = function() {
				console.log("Implement findById");
				//Finds by _id for model (convention in schema)
			};
			this.findOne = function() {
				//Finds a single model
			};
			this.remove = function() {
				//Finds & Removes from database
			};
		
			this.query = function() {
				//Manually run cql query (same as Cassie.cql - uses connection that this model holds though)
				//TODO: Allow user to make their own queries w/ default connection (Cassie.cql())
			
			};
		
	}
}

exports.create = function(modelName, schema, connection, options) {
	return new Model(null, null, modelName, schema, connection, options);
};
