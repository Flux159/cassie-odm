var EventEmitter = require('events').EventEmitter;

var cql = require('node-cassandra-cql');

var types = {
    'String': String,
    'Number': Number,
    'Date': Date,
    'Buffer': Buffer,
    'Blob': Buffer,
    'Boolean': Boolean,
    'Mixed': Object,
    'Object': Object,
    'ObjectId': cql.types.uuid, //Node uuid (v4)
    'uuid': cql.types.uuid,
    'long': cql.types.Long, //Note this uses nodejs long
    'Long': cql.types.Long,
    'Int': Number, //Note no support for real ints
    'int': Number,
    'Timestamp': cql.types.timestamp,
    'timestamp': cql.types.timestamp,
    'Array': Array
};

var determinePrimaryKey = function(schema) {
//    Object.keys(schema).forEach(function(key) {
    for(var key in schema) {
        if(typeof schema[key] === 'object') {
            if(schema[key].primary) {
                return key;
            }
        }
    }
    return null;
//    });
};

var requiredValidator = function(model, fieldName) {
    //Ensure that model.fieldName is not null
    return !(model[fieldName]);
};

var addDefaultValidators = function(schema) {

    //Need to add default validators for schema fields (namely just 'required' & possible type checking)

    Object.keys(schema._fields).forEach(function(field) {
        if(typeof schema._fields[field] === 'object' && schema._fields[field].required) {
            schema.validators[field].push(requiredValidator);
        }
    });

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
	returnObj._virtuals = {};

	returnObj._primary = determinePrimaryKey(obj);
	
	// console.log(typeof options.primary);
	if(typeof options.primary === 'object' && options.primary instanceof Array) {
		if(returnObj._primary) {
			throw "Cassie Error: Cannot specify multiple primary keys (either specify with key name or specify as an option, not both).";
		}
		
		// console.log("SETTING ARRAY FOR PRIMARY KEY!");
		returnObj._primary = options.primary;

		//Note that primaryKey[0] can be a composite key as well (ie another array)

	} else if(typeof options.primary === 'string') {
        returnObj._primary = options.primary;
    }
			
	if(!returnObj._primary) {

        //Add (id uuid PRIMARY KEY) field (if id is not taken, if it is, then throw the error)
        if(!returnObj._fields['id']) {
            returnObj._fields['id'] = {type: types.uuid, primary: true};
        } else {
            throw "Cassie Error: You must specify a primary key for all Schemas. Normally Cassie would generate a primary key field 'id' if you don't provide one." +
                "However, you already defined a field named 'id' but did not specify any field as the primary key. Cassandra requires a primary key for all tables.";
        }
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

    Object.keys(obj).forEach(function(key) {
       returnObj.validators[key] = [];
    });

    returnObj.preFunctions = {save: [], remove: []};
    returnObj.postFunctions = {init: [], validate: [], save: [], remove: []};

    returnObj.validate = function(fieldName, validateFunction) {
        //Adds to validate list for given fieldName (if fieldName doesn't exist, it'll still add to a list, but on validate, it only checks which fields are in the schema)
        if(!returnObj.validators[fieldName]) {
            returnObj.validators[fieldName] = [];
        }

        returnObj.validators[fieldName].push(validateFunction);
    };

//    returnObj.path = function(fieldName) {
//        //Returns a "path" object that has a validate method
//    };

    returnObj.pre = function(hookName, preFunction) {
        //Adds a presave hook

        //Currently supports 'save', 'remove'

        if(hookName === 'save' || hookName === 'remove') {
            returnObj.preFunctions[hookName].push(preFunction);
        } else {
            throw "Cassie Schema.pre(hook, function) function only supports 'save' and 'remove' hooks.";
        }

    };

    returnObj.post = function(hookName, postFunction) {
        //Adds a postsave hook

        //Currently supports 'init', 'validate', 'save', 'remove'

        var postKeys = Object.keys(returnObj.post);

        if(postKeys.indexOf(hookName) > -1) {
            returnObj.postFunctions[hookName].push(postFunction);
        } else {
            throw "Cassie Schema.post(hook, function) function only supports 'init', 'save', 'validate', and 'remove' hooks.";
        }

    };

    returnObj.add = function(fieldObject) {
        //Adds a field to an object (after an initial creation of schema)
        //Note: cannot add a primary index

        var _this = this;
        if(typeof fieldObject === 'object') {

            Object.keys(fieldObject).forEach(function(key) {

                if(typeof fieldObject[key] === 'object') {

                    if(fieldObject[key].primary) {
                        fieldObject[key].primary = false; //Can't specify primary key when adding
                        console.log("Cassie warning: Cannot specify primary key when adding to a schema. Primary key must be specified on creation of Schema.");
                    }

                    if(_this._fields[key]) {
                        console.log("Cassie warning: Overwriting already defined field in Schema.add(). Consider refactoring your schema initialization code. Field will be overwritten.");
                    }

                    _this._fields[key] = fieldObject[key];
                }

            });

        }

        //Pretty much just add to _fields

    };

//    returnObj.test = function(testing) {
//        console.log(this);
//    };

    //TODO: Schema generation (create table, etc. like active record - problem occurs when updating, etc.)
//TODO: Indices and "plugin" support for schemas (need to see how Cassandra handles indices)
//TODO: Need primary, indices, etc.

	returnObj.index = function(pathName) {
		//Adds a secondary index to a schema - need to sync as well... I really don't want to offer this...

        if(!this._fields[pathName]) {
            console.log("Cassie warning: No field " + pathName + " found in schema.");
        } else {
            if(typeof this._fields[pathName] === 'object'){
                this._fields[pathName].index = true;
            } else {
                var tempFunc = this._fields[pathName];
                this._fields[pathName] = {type: tempFunc, index: true};
            }
        }

	};
	
	returnObj.virtual = function(virtualName, virtualObject) {
		//Returns a "Virtual Field Type" object that can be chained to "get" and "set" methods - forget chaining, you either "get" or "set" a virtual field

        //Add to _fields with a "virtual" boolean, indicating that it shouldn't be saved to the db
        //No, add to a _virtuals array, so that I can guarantee that it won't be saved (just need to iterate across when creating model then)
        if(this._fields[virtualName]) {
            console.log("Cassie warning: Cannot create a virtual field " + virtualName + " on schema because another field already exists with that name.");
        } else {
            if(!virtualObject) {
                console.log("Cassie warning: Cannot create a virtual field " + virtualName + " on schema without get method. See Cassie documentation on virtual fields for more information.");
            } else {
                if(typeof virtualObject === 'function') {
                    this._virtuals[virtualName] = virtualObject;
                } else {
                    this._virtuals[virtualName] = virtualObject;
                }
            }

        }

	};
	
	returnObj.plugin = function(pluginFunction, options) {

        //Can add fields, create virtuals, add indices, add pre, post, validations in a plugin
        //Can also share plugins between Models

//		console.log(this);
		
		//Runs plugin function with schema = to returnObj (so can do schema.add, schema.pre, etc.)
        if(typeof pluginFunction === 'function') {
            pluginFunction(this, options);
        } else {
            throw "Cassie Error: Schema.plugin(arg): Arg must be a function.";
        }
		
	};

    //Add validators specified in field's options "required"

    addDefaultValidators(returnObj);

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

Schema.types = types;

Schema.prototype.__proto__ = EventEmitter.prototype;

module.exports = exports = Schema;
