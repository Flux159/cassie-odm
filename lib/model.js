
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
	var argumentString = " "
	
	console.log(arguments);

	for(var key in arguments) {
		console.log("Key: " + key);
		// console.log("Value: " + arguments[key]);
		
		var value = arguments[key];
		
		console.log("Value: " + value);
		console.log(typeof value);
		
		//3 special functions / values: $gt $lt $in (in would be the array case), $gt and $lt should be parsed to >= and =< respectively
		//Note that these are defined as follows: created_at: {$gt: num1, $lt: num2}
		//or... name_list: {$in: ['array', 'of', 'names']}
		
		//A note: Cassandra doesn't have strictly less than or strictly greater than operators (they're just aliases for >= and =<)
		
		if(typeof value === 'string') {
			console.log(value + " is a string");
			//Use '='
		}
		
		if(typeof value === 'number') {
			console.log(value + " is a number");
			//Use '='
		}
		
		if(Object.prototype.toString.call(value) === '[object Array]') {
			console.log(value + " is an array");
			console.log(value);
			//Use 'IN' with a () encompassed array containing strings
		}
		
		// if(typeof value === 'array') {
			// console.log(value + " is an array");
		// }
		
		
	}
	
	return argumentString;
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

exports.create = function(schema, connection) {
	if(!connection) {
		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
	}
	
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
			
			var query = "SELECT * FROM users";
			
			//TODO: Append to query using arguments
			var argumentString = parseArguments(arguments);
			
			var query = query + argumentString;
			
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
