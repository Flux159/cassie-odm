'use strict';

var types = require('./types');

var findPrimaryKeyField = function (schema) {
  for (var key in schema) {
    if ((typeof schema[key] === 'object') && (schema[key].primary)) {
      return key;
    }
  }
  return null;
};

var determinePrimaryKey = function (schema, options) {
  var primaryField = findPrimaryKeyField(schema);

  if (typeof options.primary === 'string') {
    primaryField = options.primary;
  } else if (typeof options.primary === 'object' && options.primary instanceof Array) {
    if (primaryField) {
      throw new Error('Cassie Error: Cannot specify multiple primary keys (either specify with key name or specify as an option, not both).');
    }

    primaryField = options.primary;
  }

  return primaryField;
};

var createDefaultPrimaryKey = function() {
  if (this._fields['id']) {
    throw new Error('Cassie Error: You must specify a primary key for all Schemas. Normally Cassie would generate a primary key field \'id\' if you don\'t provide one.' +
      'However, you already defined a field named \'id\' but did not specify any field as the primary key. Cassandra requires a primary key for all tables.');
  }

  this._fields['id'] = { type: types.datatypes.uuid, primary: true };
  this._primary = 'id';
  //Add presave function that will generate uuid for the user
  this.pre('save', function (model) {
      //Only create id if it doesn't exist (otherwise it'll cause a lot of problems when trying to update)
      if(!model.id) {
          model.id = types.datatypes.uuid();
      }
  });
};

var getPrimaryKeys = function(primary) {
  var primaries = [];

  if (typeof primary === 'object') {
    Object.keys(primary).forEach(function (primaryKey) {
      if (typeof primaryKey === 'object') {
        primaryKey.forEach(function (compositeKey) {
          primaries.push(compositeKey);
        })
      } else {
        primaries.push(primaryKey);
      }
    });
  } else {
    primaries.push(primary);
  }

  return primaries;
};

var requiredValidator = function (model, field) {
    //Ensure that model.fieldName is not null
    //Adding a fix for booleans where a false value would've given a validation error
    return (model[field] !== null);
};

var addDefaultValidators = function () {
    // Need to add default validators for schema fields (namely just 'required' & possible type checking)

    var _this = this;
    Object.keys(this._fields).forEach(function (field) {
      if (typeof _this._fields[field] === 'object' && _this._fields[field].required) {
        var validationString = "Field: " + field + " is required.";
        _this.validators[field].push({func: requiredValidator, str: validationString});
      }
    });
};

function Schema(obj, options) {
  if (!options) {
    options = {};
  }

  if(options.sync === null || options.sync === undefined) {
    options.sync = true; // Must explicitly define sync as false
  }

  var _this = this;
  this._fields = Object.assign({}, obj);
  this._virtuals = {};
  this._sync = options.sync;
  this._createOptions = options.create_options;
  this._addQueries = {};
  this.validators = {};
  this.preFunctions = { save: [], remove: [] };
  this.postFunctions = { init: [], validate: [], save: [], remove: [] };
  this._primary = determinePrimaryKey(obj, options);

  Object.keys(obj).forEach(function (key) {
    _this.validators[key] = [];
  });

  if (!this._primary) {
    createDefaultPrimaryKey.call(this);
  }

  this._flatPrimaryList = getPrimaryKeys(this._primary);

  addDefaultValidators.call(this);
}

/**
 * Adds a pre hook
 * @param {String} hookName is the name of the hook, can be save or remove
 * @param {Function} preFunction is the function to call when the hook is triggered
 */
Schema.prototype.pre = function (hookName, preFunction) {
  var preKeys = Object.keys(this.preFunctions);

  if (preKeys.indexOf(hookName) > -1) {
    this.preFunctions[hookName].push(preFunction);
  } else {
    throw new Error('Cassie Schema.pre(hook, function) function only supports \'save\' and \'remove\' hooks.');
  }
};

/**
 * Adds a post hook
 * @param {String} hookName is the name of the hook, can be init, validate, save, or remove
 * @param {Function} postFunction is the function to call when the hook is triggered
 */
Schema.prototype.post = function (hookName, postFunction) {
  var postKeys = Object.keys(this.postFunctions);

  if (postKeys.indexOf(hookName) > -1) {
    this.postFunctions[hookName].push(postFunction);
  } else {
    throw new Error('Cassie Schema.post(hook, function) function only supports \'init\', \'save\', \'validate\', and \'remove\' hooks.');
  }
};

/**
 * Adds a validator for a field
 * @param {String} fieldName is the name of the existing field to add the validator to
 * @param {Function} validateFunction is the function to call when validating a field
 * @param {String} validateString is the message to display when the validation fails
 */
Schema.prototype.validate = function (fieldName, validateFunction, validateString) {
    // If fieldName doesn't exist, it'll still add to a list, but on validate,
    // it only checks which fields are in the schema
    if (!this.validators[fieldName]) {
      this.validators[fieldName] = [];
    }

    this.validators[fieldName].push({ func: validateFunction, str: validateString });
};

/**
 * Adds a field to an object after an initial creation of schema
 * Note: Cannot add a primary key
 * @param {Object} fieldObject is an map of fields to add to the schema
 */
Schema.prototype.add = function (fieldObject) {
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

/**
 * Add a custom query that can either return a query object, perform a separate query, etc.
 * This is added to the Model (like Model.find, Model.update, Model.remove)
 * It is more useful for plugins that want to add functionality to a Model
 * As of v0.1.0, This functionality is currently in BETA - use at your own risk
 * @param {Object} queryObject is the name of the query as well as the custom function to call when invoking the query
 */
Schema.prototype.addQuery = function(queryObject) {
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

/**
 * Adds a secondary index to a schema
 * @param {String} pathName the name of the field to add the index to
 */
Schema.prototype.index = function (pathName) {
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

/**
 * Adds a virtual field, a field not saved in the database
 * @param {String} virtualName is the name of the field
 * @param {Object|Function} virtualObject is the function to call when the field is invoked
 */
Schema.prototype.virtual = function (virtualName, virtualObject) {
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

/**
 * Install a plugin for this Schema
 * This allows to reuse creation code between multiple schemas. The function passed when invoked will
 * add fields, create virtuals, add indices, add pre/post/etc. hooks, and custom validators.
 *
 * @param {Function} pluginFunction is the plugin function which installs new fields, virtuals, indices, hooks, etc.
 * @param {Object} options is the options to pass into the plugin function
 */
Schema.prototype.plugin = function (pluginFunction, options) {
    if (typeof pluginFunction === 'function') {
        pluginFunction(this, options);
    } else {
        throw new Error('Cassie Error: Schema.plugin(arg): Arg must be a function.');
    }
};

module.exports = Schema;
