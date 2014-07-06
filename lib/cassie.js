'use strict';

var cql = require('node-cassandra-cql');
var async = require('async');

var Schema = require('./schema'),
		Model = require('./model'),
		Query = require('./query');

var Sync = require('./sync');

// var types = require('./types');

var nullCallback = function() {};

var Cassie = {
	schemas: {},
	models: {},
	connection: null,
	connections: [],
	keyspace: null,
	hosts: null,
	config: null
};

//Connect and store connection (also return to user if multiple connections wanted)
exports.connect = function(config) {
	
	Cassie.keyspace = config.keyspace;
	Cassie.hosts = config.hosts;
	Cassie.config = config;
	
	// Sync.check
	
	var connection = new cql.Client(config);
	

	
	if(!Cassie.connection) {
		Cassie.connection = connection;
	}
	Cassie.connections.push(connection);
	return connection;
};

//Execute raw cql (directly from node-cassandra-cql)
exports.cql = function(query, args, callback) {
	if(!Cassie.connection) {
		throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
	}
	
	if (typeof args === 'function'){
		callback = args;
		args = [];
	}
		
	Cassie.connection.execute(query, args, function(err, results, metadata) {
		(callback || nullCallback)(err, results);
	});
};

exports.Query = function(query, args) {
	return new Query(query, args, connection);
}

exports.Schema = Schema;

// console.log(cql.types);

exports.consistencies = cql.types.consistencies;
exports.types = cql.types.dataTypes;

// exports.types = types;

/* Creates a model w/ modelName: Ex: Cassie.model('User', UserSchema)
 * Returns a Model object based on the schema it created: Ex: var User = Cassie.model('User')
 * Options: {connection: 'A connection returned from makeConnection() that will be passed to Model object'}
 * Model uses internal Cassie.connection if not specified (throws error if no connection has been made)	
 */
exports.model = function(modelName, schema, options) {
	if(!options) {
		options = {};
	}
	
	if(!schema) {
		var model = Cassie.models[modelName];
		if(model) {
			return model;
		} else {
			throw "cassie.model(String) error: Model " + modelName + " does not exist.";
		}
	}
	
	if(Cassie.schemas[modelName]) {
		throw "cassie.model(String, Schema) error: Model " + modelName + " already exists.";
	}
	// console.log(pluralize(modelName));
	
	Cassie.schemas[modelName] = schema;
	
	// Cassie.models[modelName] = Model.create(modelName, schema, (options.connection || Cassie.connection || null), options);
	
	var model = Model.create(modelName, schema, (options.connection || Cassie.connection || null), options);
	
	Cassie.models[modelName] = model;
	
	// Sync.syncTable(schema, model, (options.connection || Cassie.connection || null), Cassie.keyspace, Cassie.config, function() {
	//
	// });
	
	// console.log(Cassie.models[modelName]);
	
	// console.log(Cassie.models);
	
};

exports.checkKeyspace = function(config, options, callback) {
	Sync.checkKeyspaceExists(config.hosts, config.keyspace, config, options, callback);
}

//Sync all tables and create keyspace(s)
exports.syncTables = function(options, callback) {
	
	if(typeof options === 'function') {
		callback = options;
		options = {};
	}
	
	var seriesCalls = [];
	for(var modelName in Cassie.models) {
		seriesCalls.push(function(cb) {
			if(Cassie.schemas[modelName]._sync) {
							Sync.syncTable(Cassie.schemas[modelName], Cassie.models[modelName], (options.connection || Cassie.connection || null), Cassie.keyspace, Cassie.config, options, cb);
			} else {
				cb();
			}
		});
	}
	
	async.series(seriesCalls, callback);
};

//Close connection
exports.close = function(callback) {
	var cb = (callback || nullCallback);
	Cassie.connection.shutdown(cb);
	Cassie.connections.splice(0,1);
	Cassie.connection = Cassie.connections[0] || null;
};

//Close all connections
exports.closeAll = function(callback) {
	var parallelClose = [];
	Cassie.connections.forEach(function(connection) {
		parallelClose.push(function(cb) {
			connection.shutdown(cb);
		});
	});
	async.parallel(parallelClose, function(err, results) {
		Cassie.connection = null;
		Cassie.connections = [];
		(callback || nullCallback)(err, results);
	});
}
