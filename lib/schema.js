'use strict';

var types = require('./types');

var determinePrimaryKey = function (schema) {
    for (var key in schema) {
        if (typeof schema[key] === 'object') {
            if (schema[key].primary) {
                return key;
            }
        }
    }
    return null;
};

var requiredValidator = function (model, field) {
    //Ensure that model.fieldName is not null
    //Adding a fix for booleans where a false value would've given a validation error
    return (model[field] !== null);
};

var addDefaultValidators = function (schema) {

    //Need to add default validators for schema fields (namely just 'required' & possible type checking)

    Object.keys(schema._fields).forEach(function (field) {
        if (typeof schema._fields[field] === 'object' && schema._fields[field].required) {
            var validationString = "Field: " + field + " is required.";
            schema.validators[field].push({func: requiredValidator, str: validationString});
        }
    });

};

function Schema(obj, options) {

    if (!options) {
        options = {};
        options.sync = true; //Default is to sync table on initial load - this may be a bad default?
        //This would only happen when starting your nodejs instance, so I don't think that its a bad idea
        //It should definitely log / output somewhere when its doing this though
//        options.createOptions = {};
    }

    if(options.sync === null || options.sync === undefined) {
        options.sync = true; //Must explicitly define sync as false
    }

//    if(options.createOptions === null || options.createOptions === undefined) {
//        options.createOptions = {};
//    }

    var returnObj = {};
    returnObj._fields = obj;
    returnObj._virtuals = {};

    returnObj._primary = determinePrimaryKey(obj);

    if (typeof options.primary === 'object' && options.primary instanceof Array) {
        if (returnObj._primary) {
            throw "Cassie Error: Cannot specify multiple primary keys (either specify with key name or specify as an option, not both).";
        }

        returnObj._primary = options.primary;

        //Note that primaryKey[0] can be a composite key as well (ie another array)
    } else if (typeof options.primary === 'string') {
        returnObj._primary = options.primary;
    }

    returnObj._sync = options.sync;

    returnObj._createOptions = options.create_options;

    returnObj._addQueries = {};

    returnObj.validators = {};

    Object.keys(obj).forEach(function (key) {
        returnObj.validators[key] = [];
    });

    returnObj.preFunctions = {save: [], remove: []};
    returnObj.postFunctions = {init: [], validate: [], save: [], remove: []};

    returnObj.pre = function (hookName, preFunction) {
        //Adds a pre hook
        //Currently supports 'save', 'remove' (see preFunctions keys above)
        var preKeys = Object.keys(returnObj.preFunctions);

        if (preKeys.indexOf(hookName) > -1) {
            returnObj.preFunctions[hookName].push(preFunction);
        } else {
            throw "Cassie Schema.pre(hook, function) function only supports 'save' and 'remove' hooks.";
        }
    };

    returnObj.post = function (hookName, postFunction) {
        //Adds a post hook
        //Currently supports 'init', 'validate', 'save', 'remove' (see postFunctions keys above)
        var postKeys = Object.keys(returnObj.postFunctions);

        if (postKeys.indexOf(hookName) > -1) {
            returnObj.postFunctions[hookName].push(postFunction);
        } else {
            throw "Cassie Schema.post(hook, function) function only supports 'init', 'save', 'validate', and 'remove' hooks.";
        }
    };

    if (!returnObj._primary) {

        //Add (id uuid PRIMARY KEY) field (if id is not taken, if it is, then throw the error)
        if (!returnObj._fields['id']) {
            returnObj._fields['id'] = {type: types.datatypes.uuid, primary: true};
            returnObj._primary = 'id';
            //Add presave function that will generate uuid for the user
            returnObj.pre('save', function (model) {
                //Only create id if it doesn't exist (otherwise it'll cause a lot of problems when trying to update)
                if(!model.id) {
                    model.id = types.datatypes.uuid();
                }
            });
        } else {
            throw "Cassie Error: You must specify a primary key for all Schemas. Normally Cassie would generate a primary key field 'id' if you don't provide one." +
                "However, you already defined a field named 'id' but did not specify any field as the primary key. Cassandra requires a primary key for all tables.";
        }
    }

    returnObj._flatPrimaryList = [];
    if (typeof returnObj._primary === 'object') {
        Object.keys(returnObj._primary).forEach(function (primaryKey) {
            if (typeof primaryKey === 'object') {
                primaryKey.forEach(function (compositeKey) {
                    returnObj._flatPrimaryList.push(compositeKey);
                })
            } else {
                returnObj._flatPrimaryList.push(primaryKey);
            }
        });
    } else {
        returnObj._flatPrimaryList.push(returnObj._primary);
    }

    returnObj.validate = function (fieldName, validateFunction, validateString) {
        //Adds to validate list for given fieldName (if fieldName doesn't exist,
        //it'll still add to a list, but on validate, it only checks which fields are in the schema)
        if (!returnObj.validators[fieldName]) {
            returnObj.validators[fieldName] = [];
        }

        returnObj.validators[fieldName].push({func: validateFunction, str: validateString});
    };

    //This is a mongoose method, but I don't think its really necessary
    //    returnObj.path = function(fieldName) {
    //        //Returns a "path" object that has a validate method
    //        //Not adding this method (even though for true 1:1 Mongoose API compatibility I should). See validate method instead.
    //    };

    returnObj.add = function (fieldObject) {
        //Adds a field to an object (after an initial creation of schema)
        //Note: Cannot add a primary index

        var _this = this;
        if (typeof fieldObject === 'object') {

            Object.keys(fieldObject).forEach(function (key) {

                if (typeof fieldObject[key] === 'object') {

                    if (fieldObject[key].primary) {
                        fieldObject[key].primary = false; //Can't specify primary key when adding
                        console.log("Cassie warning: Cannot specify primary key when adding to a schema. Primary key must be specified on creation of Schema.");
                    }

                    if (_this._fields[key]) {
                        console.log("Cassie warning: Overwriting already defined field in Schema.add(). Consider refactoring your schema initialization code. Field will be overwritten.");
                    }

                }
                _this._fields[key] = fieldObject[key];

            });

        }

    };

    returnObj.addQuery = function(queryObject) {
        //Add a custom query that can either return a query object, perform a separate query, etc.
        //This is added to the Model (like Model.find, Model.update, Model.remove)
        //It is more useful for plugins that want to add functionality to a Model
        //As of v0.1.0, This functionality is currently in BETA - use at your own risk

        var _this = this;
        if(typeof queryObject === 'object') {
            Object.keys(queryObject).forEach(function(key) {
                if(typeof queryObject[key] === 'function') {
                    _this._addQueries[key] = queryObject[key];
                } else {
                    console.log("Cassie addQuery warning: Could not add query named '"+ key +"' because key value is not a function.");
                }
            });

        } else {
            console.log("Cassie addQuery warning: Could not add query because argument passed to .addQuery is not an object");
        }

    };

    returnObj.index = function (pathName) {
        //Adds a secondary index to a schema

        if (!this._fields[pathName]) {
            console.log("Cassie warning: No field " + pathName + " found in schema.");
        } else {
            if (typeof this._fields[pathName] === 'object') {
                this._fields[pathName].index = true;
            } else {
                var tempFunc = this._fields[pathName];
                this._fields[pathName] = {type: tempFunc, index: true};
            }
        }

    };

    returnObj.virtual = function (virtualName, virtualObject) {
        //Returns a "Virtual Field Type" object that can be chained to "get" and "set" methods - forget chaining, you only "get" a virtual field (set normal fields)

        if (this._fields[virtualName]) {
            console.log("Cassie warning: Cannot create a virtual field " + virtualName + " on schema because another field already exists with that name.");
        } else {
            if (!virtualObject) {
                console.log("Cassie warning: Cannot create a virtual field " + virtualName + " on schema without get method. See Cassie documentation on virtual fields for more information.");
            } else {
                if (typeof virtualObject === 'function') {
                    this._virtuals[virtualName] = {get: virtualObject};
                } else {
                    this._virtuals[virtualName] = virtualObject;
                }
            }

        }

    };

    returnObj.plugin = function (pluginFunction, options) {
        //Can add fields, create virtuals, add indices, add pre, post, validations in a plugin
        //Can also share plugins between Models

        //Runs plugin function with schema = to returnObj (so can do schema.add, schema.pre, etc.)
        if (typeof pluginFunction === 'function') {
            pluginFunction(this, options);
        } else {
            throw "Cassie Error: Schema.plugin(arg): Arg must be a function.";
        }

    };

    //Add validators specified in field's options "required"

    addDefaultValidators(returnObj);

    return returnObj;
}

module.exports = exports = Schema;
