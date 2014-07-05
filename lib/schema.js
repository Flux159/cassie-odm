var EventEmitter = require('events').EventEmitter;

var determinePrimaryKey = function(schema) {
	for(var key in schema) {
		if(typeof schema[key] === 'object') {
			if(schema[key].primary) {
				return key;
			}
		}
	}
	return null;
}

var syncTable = function(schema) {
	
}

function Schema (obj, options) {
	// if (!(this instanceof Schema)) {
	// 		return new Schema(obj, options);
	// }
	   
	if(!options) {
		options = {};
		options.sync = true; //Default is to sync table on initial load - this may be a bad default?
		//This would only happen when starting your nodejs instance, so I don't think that its a bad idea
	}
		  
	var returnObj = obj;
	returnObj._primary = determinePrimaryKey(obj);
			
	if(!returnObj._primary) {
		//Need to create primary key (_id)
	}
			
	if(options.sync) {
		syncTable(this);
	}
	
	return returnObj;
}

Schema.dropTable = function(schema) {
	
}

//
Schema.createTable = function(schema) {
	
}

Schema.prototype.__proto__ = EventEmitter.prototype;

module.exports = exports = Schema;

//TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
//TODO: Indices and "plugin" support for schemas (need to see how Cassandra handles indices)
//TODO: Need primary, indices, etc.