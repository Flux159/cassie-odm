


exports.create = function(schema, connection) {
	if(!connection) {
		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
	}
	
	return {
		//TODO: Need to do dirty flags for save / update
		//TODO: Validations
		//TODO: BigInteger / Long support
		//TODO: Allow user to make their own queries w/ default connection (Cassie.cql())
		//TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
		
		find: function() {
			console.log("Implement find");
		},
		findById: function() {
			console.log("Implement findById");
		},
		
		get: function() {
			console.log("Implement get");
		}
	};
};
