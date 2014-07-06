var cql = require('node-cassandra-cql');

/**
 * function that creates a keyspace if it doesn't exist. Apparently only hosts is required to connect.
 *
 */
exports.createKeyspace = function(connection, keyspace) {
	console.log("Creating keyspace: " + keyspace);
	
	
	
}

/**
 * function that checks if a keyspace exists (connects using a separate node-cassandra-cql) and creates the keyspace if it doesn't exist (then closes its connection)
 *
 */
exports.checkKeyspaceExists = function(hosts, keyspace, options, callback) {
	var client = new cql.Client({hosts: hosts});
	
	//Simple strategy if not production, replication factor of 1
	
	//NetworkTopologyStrategy using RackInferringSnitch for production default - assumes 10.ddd.rrr.nnn IP network (default of 10.0.0.0/16 vpc network when setting up EC2 VPC in a region, 10.0.x.0/24 for EC2 VPC subnet in a region), replication of 3 - can give property object containing name:DC1, name:DC2, etc.
	
	//NetworkTopologyStrategy using PropertyFileSnitch if snitch is specified in JSON (ie, pass in JSON to use) - NOT IMPLEMENTED YET
	
	var replicationStrategy = "";
	if(options.production) {
		
	} else {
		
	}
	
	var cqlQuery = "CREATE KEYSPACE IF NOT EXISTS " + keyspace + " WITH ";
	
	client.execute(cqlQuery, function(err, result) {
		// if(err) {
			//Probably need to create keyspace
			// console.log(err);
			// exports.createKeyspace(client, keyspace);
		// } else {
			//Don't do anything, just return in callback
			// callback();
		// }
		
		console.log(err);
		console.log(result);
		
		callback();
	});
}

/**
 * function that checks if table exists for schema (uses plural options, etc.) then syncs columns for that table based on validations, etc.
 *
 *
 *
 */
exports.syncTable = function(schema, model, connection, keyspace, options, callback) {
	if(!connection) {
		throw "Cassie Error: Cannot sync tables without cassandra connection.";
	}
	
	console.log(keyspace);
	
	console.log(schema);
	
	console.log(model);
		
	
	
	
}
