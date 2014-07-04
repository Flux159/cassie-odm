
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
			
			
			//TODO: Limit query when options is given as string (ie only return _id, etc. when '_id' is passed as options arg)
			
			connection.execute(query, options, function(err, results, metadata) {
				
				//TODO: Parsed results need to be objects w/ save/delete methods
				var parsedResults; 
				if(results) {
					parsedResults = results.rows;
					parsedResults.forEach(function(parsedResult) {
						delete parsedResult.columns;
					});
				}
				
				callback(err, parsedResults, metadata);
			});
			
		},
		findById: function() {
			console.log("Implement findById");
		},
		
		get: function() {
			console.log("Implement get");
		}
	};
};
