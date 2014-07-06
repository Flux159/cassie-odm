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
exports.checkKeyspaceExists = function(hosts, keyspace, options, cqlOptions, callback) {
	var client = new cql.Client({hosts: hosts});
	
	if(typeof cqlOptions === 'function') {
		callback = cqlOptions;
		cqlOptions = {};
	}
	
	//Default is Simple strategy with a default replication_factor of 1

	//Notes on NetworkTopologyStrategy:
	//RackInferringSnitch or PropertyFileSnitch - configured in cassandra.yml (located )
	
	// Notes on strategy_options (from http://www.datastax.com/docs/1.0/configuration/storage_configuration#strategy-options)
	//
	// Specifies configuration options for the chosen replication strategy.
	//
	// For SimpleStrategy, it specifies replication_factor in the format of replication_factor:number_of_replicas.
	//
	// For NetworkTopologyStrategy, it specifies the number of replicas per data center in a comma separated list of datacenter_name:number_of_replicas. Note that what you specify for datacenter_name depends on the cluster-configured snitch you are using. There is a correlation between the data center name defined in the keyspace strategy_options and the data center name as recognized by the snitch you are using. The nodetool ring command prints out data center names and rack locations of your nodes if you are not sure what they are.
	//
	// See Choosing Keyspace Replication Options for guidance on how to best configure replication strategy and strategy options for your cluster.
	//
	// Setting and updating strategy options with the Cassandra CLI requires a slightly different command syntax than other attributes; note the brackets and curly braces in this example:
	//
	// [default@unknown] CREATE KEYSPACE test
	// WITH placement_strategy = 'NetworkTopologyStrategy'
	// AND strategy_options={us-east:6,us-west:3};
	
	//NetworkTopologyStrategy using RackInferringSnitch for production default - assumes 10.ddd.rrr.nnn IP network (default of 10.0.0.0/16 vpc network when setting up EC2 VPC in a region, 10.0.x.0/24 for EC2 VPC subnet in a region), replication of 3 - can give property object containing name:DC1, name:DC2, etc.
	//NetworkTopologyStrategy using PropertyFileSnitch if topology is specified in JSON (ie, pass in JSON to use) - NOT IMPLEMENTED YET
	
	//NetworkTopologyStrategy requires that strategy_options is specified (and ignores replication_factor)
	
	var replicationStrategy = "";
	if(options.replication) {
		if(options.replication.strategy === 'SimpleStrategy') {
			if(options.replication.replication_factor) {
				// replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = " options.replication.replication_factor.toString();
				
				replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor': " + options.replication.replication_factor.toString() + "}";
			} else {
				// replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = 1";
				
				replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }";
			}
		} else if(options.replication.strategy === 'NetworkTopologyStrategy') {
			if(options.replication.strategy_options) {
				replicationStrategy = {'class': 'NetworkTopologyStrategy'};
				for(var key in options.replication.strategy_options) {
					replicationStrategy[key] = options.replication.strategy_options[key];
				}
				replicationStrategy = JSON.stringify(replicationStrategy);
			} else {
				throw "Replication Strategy 'NetworkTopologyStrategy' requires strategy_options object /dictionary containing <datacenter_name>:<replication_number> fields. See Cassandra docs on CREATE KEYSPACE / Keyspace Replication Options for more information.";
			}
		} else {
			throw "Config.options.strategy must be either 'SimpleStrategy' (recommended for development) or 'NetworkTopologyStrategy' (recommended for production). See Cassandra docs for CREATE KEYSPACE / Keyspace Replication Options more information.";
		}
		
	} else {
		replicationStrategy = "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }";
		// replicationStrategy = "placement_strategy = 'SimpleStrategy' AND strategy_options:replication_factor = 1";
	}
	
	var cqlQuery = "CREATE KEYSPACE IF NOT EXISTS " + keyspace + " WITH REPLICATION = " + replicationStrategy;
	
	if(cqlOptions.debug) {
		//TODO: Pretty print & log to file / log to winston
		console.log("CQL Create Keyspace Query: ");
		console.log(cqlQuery);
	}
	
	client.execute(cqlQuery, function(err, result) {
		// if(err) {
			//Probably need to create keyspace
			// console.log(err);
			// exports.createKeyspace(client, keyspace);
		// } else {
			//Don't do anything, just return in callback
			// callback();
		// }
		
		if(cqlOptions.debug) {
			console.log(err);
			console.log(result);
		}
		
		callback(err, result);
	});
}

/**
 * function that checks if table exists for schema (uses plural options, etc.) then syncs columns for that table based on validations, etc.
 *
 *
 *
 */
exports.syncTable = function(schema, model, connection, keyspace, options, cqlOptions, callback) {
	if(!connection) {
		throw "Cassie Error: Cannot sync tables without cassandra connection.";
	}
	
	console.log(schema);
	
	console.log(model);
		
	console.log(keyspace);
	
	console.log(options);
	
	console.log(cqlOptions);
	
	callback();
}
