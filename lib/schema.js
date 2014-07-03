var EventEmitter = require('events').EventEmitter;

function Schema (obj, options) {
	if (!(this instanceof Schema)) {
			return new Schema(obj, options);
	}
	    
	return obj;
}

Schema.prototype.__proto__ = EventEmitter.prototype;

module.exports = exports = Schema;

