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
};

var addDefaultValidators = function(schema, options) {

    //Need to add default validators for schema fields (namely just 'required' & possible type checking)


};

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
	
	//TODO: Fairly sure that I should set this in _fields (and use this in new Model in the  model._schema area)
	//That saves me from messing w/ fields, etc. between schema & model
	//Would also save me from some _sync and _primary checking in sync (just iterate across schema._fields)
	var returnObj = {};	  
	returnObj._fields = obj;
	
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
	
//	returnObj._validators = {};
//	returnObj._presave = [];

    //Add _validators: {path: [function(), function2()], path2: [function3()], ...}
//Add _presave: {path: [function4()]}

    returnObj.validators = {};

    for(var key in obj) {
        returnObj.validators[key] = [];
    }

    returnObj.pre = {save: [], remove: []};
    returnObj.post = {init: [], validate: [], save: [], remove: []};

    returnObj.validate = function(fieldName, validateFunction) {
        //Pass field value to validateFunction & add to presave list

    };

//    returnObj.path = function(fieldName) {
//        //Returns a "path" object that has a validate method
//    };

    returnObj.pre = function(hookName, preFunction) {
        //Adds a presave hook

        //Currently supports 'save', 'remove'

    };

    returnObj.post = function(hookName, postFunction) {
        //Adds a postsave hook

        //Currently supports 'init', 'validate', 'save', 'remove'

    };

    returnObj.add = function(fieldObject) {
        //Adds a field to an object (after an initial creation of schema)
        //Note: cannot add a primary index
    };

    //TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
//TODO: Indices and "plugin" support for schemas (need to see how Cassandra handles indices)
//TODO: Need primary, indices, etc.

	returnObj.index = function(pathName) {
		//Adds a secondary index to a schema - need to sync as well... I really don't want to offer this...
	};
	
	returnObj.virtual = function(virtualName) {
		//Returns a "Virtual Field Type" object that can be chained to "get" and "set" methods
	};
	
	returnObj.plugin = function(pluginFunction, options) {
		console.log(this);
		
		//Runs plugin function with schema = to returnObj (so can do schema.add, schema.pre, etc.)
		
		
	};

    //Add validators specified in field's options "required"

    addDefaultValidators(returnObj, options);

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
