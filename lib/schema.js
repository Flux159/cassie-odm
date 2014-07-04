var EventEmitter = require('events').EventEmitter;

function Schema (obj, options) {
	if (!(this instanceof Schema)) {
			return new Schema(obj, options);
	}
	    
	return obj;
}

Schema.prototype.__proto__ = EventEmitter.prototype;

module.exports = exports = Schema;

//TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
//TODO: Indices and "plugin" support for schemas (need to see how Cassandra handles indices)