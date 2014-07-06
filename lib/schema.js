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

function Schema (obj, options) {
	// if (!(this instanceof Schema)) {
	// 		return new Schema(obj, options);
	// }
	   
	if(!options) {
		options = {};
		options.sync = true; //Default is to sync table on initial load - this may be a bad default?
		//This would only happen when starting your nodejs instance, so I don't think that its a bad idea
		//It should definitely log / output somewhere when its doing this though
	}
		  
	var returnObj = obj;
	returnObj._primary = determinePrimaryKey(obj);
	
	// console.log(typeof options.primary);
	if(typeof options.primary === 'object' && options.primary instanceof Array) {
		if(returnObj._primary) {
			throw "Cassie Error: Cannot specify multiple primary keys (either specify with key name or specify as an option, not both).";
		}
		
		// console.log("SETTING ARRAY FOR PRIMARY KEY!");
		returnObj._primary = options.primary;
		
		//TODO: Note that primaryKey[0] can be a composite key as well (ie another array)
		
	}
			
	if(!returnObj._primary) {
		throw "Cassie Error: Must specify a primary key for all Schemas.";
		//Need to create primary key (_id)
	}
	
	returnObj._sync = options.sync;
			
	// if(options.sync) {
		// syncTable(this);
	// }
	
	return returnObj;
}

// Schema.dropTable = function(schema) {
//
// }
//
// //
// Schema.createTable = function(schema) {
//
// }

Schema.prototype.__proto__ = EventEmitter.prototype;

module.exports = exports = Schema;

//TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
//TODO: Indices and "plugin" support for schemas (need to see how Cassandra handles indices)
//TODO: Need primary, indices, etc.