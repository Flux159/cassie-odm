var pluralize = require('pluralize');

var Query = require('./query');

var nullCallback = function () {
};

//TODO: Parse arguments needs to know about modelSchema to take advantage of 'hint' (same w/ parseSave)

//Just some fancy string manipulation to parse find arguments into a CQL string
function parseArguments(arguments, primaryKey) {
    if (typeof arguments !== 'object') {
        throw "Error: Arguments must be a javascript object / dictionary";
    }
    var argumentString = " ";

    var argStringArray = [];
    var argValueArray = [];

    for (var key in arguments) {
        var value = arguments[key];

        if (typeof value === 'string') {
            //Use '='
            argStringArray.push(" " + key + " =? ");
            argValueArray.push(value);
        }

        if (typeof value === 'number') {
            //Use '='
            argStringArray.push(" " + key + " =? ");
            argValueArray.push(value);
        }

        if (typeof value === 'object') {

            if (Object.prototype.toString.call(value) === '[object Array]') {
                var argStringObj = " " + key + " IN (";
                var argStringValArray = [];
                value.forEach(function (v, i) {
                    if (typeof v === 'string') {
                        argStringObj = argStringObj + "?";
                        argStringValArray.push(v);
                    } else if (typeof v === 'number') {
                        argStringObj = argStringObj + "?";
                        argStringValArray.push(v);
                    } else {
                        throw "Arguments inside of an array must be a string or number";
                    }
                    if (i !== (value.length - 1)) {
                        argStringObj = argStringObj + ',';
                    }
                });
                argStringObj = argStringObj + ") ";

                argStringArray.push(argStringObj);

                argValueArray = argValueArray.concat(argStringValArray);

                //Use 'IN' with a () encompassed array containing strings (or nums)
            } else {
                //Can be object with $gt: String or Num, $lt: String or Num, $in: [Array]
                var tempArgStringArray = [];
                var tempArgValueArray = [];
                for (var vkey in value) {
                    if (vkey === '$gt') {
                        //Use '>='

                        if (key === primaryKey) {
                            tempArgStringArray.push(" token(" + key + ") >= token(?) ");
                            tempArgValueArray.push(value[vkey]);
                        } else {
                            tempArgStringArray.push(" " + key + " >= ? ");
                            tempArgValueArray.push(value[vkey]);
                        }
                    }
                    if (vkey === '$lt') {
                        //Use '<='

                        //Note: Token uses partitioner, and is pretty much useless for the default Murmur3Partitioner... (ie don't do this for primary_key?)
                        if (key === primaryKey) {
                            tempArgStringArray.push(" token(" + key + ") <= token(?) ");
                            tempArgValueArray.push(value[vkey]);
                        } else {
                            tempArgStringArray.push(" " + key + " <= ? ");
                            tempArgValueArray.push(value[vkey]);
                        }

                    }
                    if (vkey === '$in') {
                        //Use 'IN' with a () encompassed array containing strings - same as above for array case
                        argStringObj = " " + key + " IN (";
                        argStringValArray = [];

                        value[vkey].forEach(function (v, i) {
                            if (typeof v === 'string') {
                                argStringObj = argStringObj + "?";
                                argStringValArray.push(v);
                            } else if (typeof v === 'number') {
                                argStringObj = argStringObj + "?";
                                argStringValArray.push(v);
                            } else {
                                throw "Arguments inside of an array must be a string or number";
                            }
                            if (i !== (value[vkey].length - 1)) {
                                argStringObj = argStringObj + ',';
                            }
                        });
                        argStringObj = argStringObj + ") ";
                        tempArgStringArray.push(argStringObj);
                        tempArgValueArray = tempArgValueArray.concat(argStringValArray);
                    }
                }
                var joinedTempArgString = tempArgStringArray.join(' AND ');
                argStringArray.push(joinedTempArgString);
                argValueArray = argValueArray.concat(tempArgValueArray);
            }

        }
    }

    var joinedArgStringArray = "";
    if (argStringArray.length !== 0) {
        joinedArgStringArray = argStringArray.join(' AND ');
        argumentString = argumentString + "WHERE " + joinedArgStringArray;

        var paramArray = argValueArray;

        var result = {argumentString: argumentString, paramArray: paramArray};
        return result;
    } else {
        var result = {argumentString: argumentString, paramArray: []};
        return result;
    }

}

function parseFields(fields) {
    return fields.split(' ').join(',');
}

//Some Options:
//Just pass a string of fields to limit the fields returned: Ex: 'fname, lname' (or even 'fname lname')
//Other is an object, where you can have the following: 
//{
//	allow_filtering: Boolean,
// 	fields: String,
//	limit: Number,
//	sort: 1 or -1 (Number)
//} 
//See documentation on cql ALLOW FILTERING for what allow_filtering does. The rest are fairly self explanatory.
function parseOptions(options) {

    var optionsDictionary = {};
    if (typeof options === 'string') {
        optionsDictionary.fields = parseFields(options);
    } else if (typeof options === 'object') {
        if (!options) {
            optionsDictionary = {};
        } else {
            if (options.fields) {
                options.fields = parseFields(options.fields);
            }
            optionsDictionary = options;
        }
    } else {
        throw "Options must be string containing fields to select or object. See documentation on options for Model.find() for more information.";
    }
    return optionsDictionary;
}

//Based on model, parse model._is_new, model._is_dirty, and fields to generate INSERT or UPDATE cql string
function parseSave(model, saveOptions) {
    var saveString = "";
    var argumentParams = [];
    //THIS NEEDS TO USE ARGUMENT PARAMS (valueString should be (?,?,?) with argumentParams being passed)
    if (model._is_new) {
        saveString = saveString + "INSERT INTO " + model._tableName;

        var keyString = "(";
        var valueString = "(";
        for (var key in model._is_dirty) {
            if (model[key]) {
                keyString = keyString + key + ",";
                valueString = valueString + "?,";
                argumentParams.push(model[key]);
            }
        }
        keyString = keyString.slice(0, -1);
        keyString = keyString + ")";
        valueString = valueString.slice(0, -1);
        valueString = valueString + ") ";

        saveString = saveString + " " + keyString + " VALUES " + valueString;

        if (saveOptions.if_not_exists) {
            saveString = saveString + " IF NOT EXISTS";
        }

        saveStringOptions = [];
        if (saveOptions.ttl) {
            if (typeof saveOptions.ttl === 'number') {
                var ttl = saveOptions.ttl;
                saveStringOptions.push(" TTL " + ttl.toString());
            }
        }
        if (saveOptions.timestamp) {
            if (typeof saveOptions.timestamp === 'number') {
                var timestamp = saveOptions.timestamp;
                saveStringOptions.push(" TIMESTAMP " + timestamp.toString());
            } else {
                saveStringOptions.push(" TIMESTAMP");
            }
        }

        if (saveStringOptions.length !== 0) {
            combinedSaveStringOptions = saveStringOptions.join(" AND");
            saveString = saveString + " USING" + combinedSaveStringOptions;
        }

    } else {
        saveString = saveString + "UPDATE " + model._tableName;

        var setFields = false;
        var setString = " SET ";
        for (var key in model._is_dirty) {
            if (model[key]) {
                setFields = true;
                setString = setString + key + " = ?,";
                argumentParams.push(model[key]);
            }
        }
        if (setFields) {
            setString = setString.slice(0, -1); //Remove trailing comma
        } else {
            setString = " ";
        }

        saveString = saveString + setString;

        //Use primary key here (arrays/ update many (/UPDATE ... IN) should be done via Model.update class method - like remove many)
        var primaryKey = model._schema._primary;

        if (typeof primaryKey === 'object') {

            var primaryKeys = [];
            var indices = [];

            primaryKey.forEach(function (combined_key, index) {
                if (index === 0 && typeof combined_key === 'object') {
                    combined_key.forEach(function (composite_key) {
                        primaryKeys.push(composite_key);
                        indices.push(model[composite_key]);
                    });
                } else {
                    primaryKeys.push(combined_key);
                    indices.push(model[combined_key]);
                }
            });

            //Now create substring to add to saveString via primaryKeys and indices
            var substrings = [];
            for (var i = 0; i < primaryKeys.length; i++) {
                var substring = primaryKeys[i] + " = ?";
                substrings.push(substring);
            }
            if (substrings.length > 0) {
                var combinedSubstring = substrings.join(" AND ");
                saveString = saveString + " WHERE " + combinedSubstring;
                argumentParams = argumentParams.concat(indices);
            }

        } else {
            var index = model[primaryKey];

            saveString = saveString + " WHERE " + primaryKey + " = ?";
            argumentParams.push(index);
        }

    }

    var returnObj = {};
    returnObj.saveString = saveString;
    returnObj.argumentParams = argumentParams;

    return returnObj;
}

function parseRemove(model, removeOptions) {
    var removeString = "DELETE ";
    var argumentParams = [];

    //You can remove specific fields from a row
    var removeFields = "";
    if (removeOptions.fields) {
        removeFields = parseFields(removeOptions.fields);
    }

    var primaryKey = model._schema._primary;

    var tableName = model._tableName;

    if (typeof primaryKey === 'object') {

        var primaryKeys = [];
        var indices = [];

        primaryKey.forEach(function (combined_key, index) {
            if (index === 0 && typeof combined_key === 'object') {
                combined_key.forEach(function (composite_key) {
                    primaryKeys.push(composite_key);
                    indices.push(model[composite_key]);
                });
            } else {
                primaryKeys.push(combined_key);
                indices.push(model[combined_key]);
            }
        });

        //Now create substring to add to saveString via primaryKeys and indices
        var substrings = [];
        for (var i = 0; i < primaryKeys.length; i++) {
            var substring = primaryKeys[i] + " = ?";
            substrings.push(substring);
        }
        if (substrings.length > 0) {
            var combinedSubstring = substrings.join(" AND ");
            removeString = removeString + removeFields + " FROM " + tableName + " WHERE " + combinedSubstring;
            argumentParams = argumentParams.concat(indices);
        }

    } else {
        var index = model[primaryKey];

        removeString = removeString + removeFields + " FROM " + tableName + " WHERE " + primaryKey + " = ?";
        argumentParams.push(index);
    }

    //Note that this is currently only for single object deletion, multiple object deletion should be handled by ModelSchema.remove() (parsing the same way as find because it can support IN, etc.)
    //Reference for Remove:
    //http://www.datastax.com/documentation/cql/3.0/cql/cql_reference/delete_r.html

    var returnObj = {};
    returnObj.removeString = removeString;
    returnObj.argumentParams = argumentParams;

    return returnObj;
}

ModelSchema = function (modelName, schema, connection, options) {
    if (!connection) {
        throw "You must make a connection to the database first. See documentation for Cassie.connect(config).";
    }

    var modelName = modelName;
    var tableName = modelName;
    if (options.lowercase) {
        tableName = tableName.toLowerCase();
    }
    if (options.pluralize) {
        tableName = pluralize(tableName);
    }
    var connection = connection;
    var options = options;

    //Reference for schema stuff (python driver):
    //https://github.com/cqlengine/cqlengine
    //Also see this for how they create keyspaces, sync tables, etc:
    //https://github.com/cqlengine/cqlengine/blob/master/cqlengine/management.py

    //The video on cassandra.apache.org shows the CTO of datastax saying: Expect roughly 5000ops/sec/core (read/write) for cassandra (linearly scalable). Note that I don't know what type of machine the guy was talking about (I'm assuming a non-VM machine). Apparently PostGres/Oracle can do 16000 transactions/sec: however, this is w/ scaling up: (From: http://blogs.law.harvard.edu/philg/2011/01/10/how-many-updates-per-second-can-a-standard-rdbms-process/) About a year ago I benchmarked PostgreSQL 8.3 and Oracle 10g on a pair of HP blade servers with 2x 2.4GHz quad-core Opterons and 8GB each, and one 320GB FusionIO PCIe SSD module each. The list price of the SSDs, $10,000+ each, was much higher than the rest of the systems put together.

    function Model(doc, docOptions) {

        var _this = this;

        function createInternalField(field) {
            var value;

            Object.defineProperty(_this, field, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                }
            });
        }

        createInternalField('_modelName');
        createInternalField('_tableName');
        createInternalField('_connection');
        createInternalField('_options');
        createInternalField('_schema');

        createInternalField('_is_dirty');
        createInternalField('_is_new');

        this._modelName = modelName;
        this._tableName = tableName;
        this._connection = connection;
        this._options = options;
        this._schema = schema;

        this._is_dirty = {};
        this._is_new = true;

        Object.keys(this._schema._fields).forEach(function (field) {

            (function (field) {
                var value;

                Object.defineProperty(_this, field, {
                    get: function () {
                        return value;
                    },
                    set: function (newValue) {
                        _this._is_dirty[field] = true;
                        value = newValue;
                    }
                });

            })(field);

        });

        Object.keys(this._schema._virtuals).forEach(function (virtual_field) {

            (function (virtual_field) {

                Object.defineProperty(_this, virtual_field, {
                    get: function () {
                        return _this._schema._virtuals[virtual_field].get(_this);
                    }
                });

            })(virtual_field);

        });

        if (doc) {
            if (!docOptions) {
                docOptions = {};
            }
            //Data is object w/ data fields
            if (typeof doc !== 'object') {
                throw "new " + modelName + "(object) must have an object as its first argument.";
            }

            this._is_new = !docOptions._from_db;

            for (var field in doc) {
                this[field] = doc[field];
            }

            if (!this._is_new) {
                this._is_dirty = {};
            }
        }

        //Return object with properties and save function, etc.
        this.save = function (saveOptions, callback) {
            //Standard insert or update (based on _is_new)
            if (typeof saveOptions === 'function') {
                callback = saveOptions;
                saveOptions = {};
            } else if (typeof saveOptions === 'string') {
//						var fields = saveOptions;
                saveOptions = {fields: saveOptions};
            } else if (!saveOptions) {
                saveOptions = {};
            }

            var currentModel = this;

            var passedAllValidations = true;

            //Run validate functions (for each field, check if it has validation functions in _schema.validators & execute them w/ "this" & the field name)
            Object.keys(this._schema.validators).forEach(function (key) {
                var passed = currentModel._schema.validators[key].every(function (validationFunction) {
                    return validationFunction(currentModel, key);
                });
                if (!passed) {
                    passedAllValidations = false;
                }
            });

            if (!passedAllValidations) {
                if (saveOptions.debug) {
                    if (saveOptions.prettyDebug) {
                        console.log("-----\nCassie Validation Error: \033[0;31m " + this._modelName + " failed validation. Object was not saved to database. \033[0m");
                    } else {
                        console.log("Cassie Validation Error: " + this._modelName + " failed validation. Object was not saved to database.");
                    }
                }
                if (!callback) {
                    return new Query(null, null, connection, saveOptions, modelName);
                } else {
                    return callback("Cassie Validation Error: " + this._modelName + " failed validation. Object was not saved to database.", null);
                }
            }

            //Run post validate functions
            currentModel._schema.postFunctions.validate.forEach(function (postValidateFunction) {
                postValidateFunction(currentModel);
            });

            //Run pre-save functions
            this._schema.preFunctions.save.forEach(function (preSaveFunction) {
                preSaveFunction(currentModel);
            });

            //Parse fields, is_dirty, and is_new to make an INSERT or UPDATE function for this model
            var saveQueryObject = parseSave(this, saveOptions);
            var saveQuery = saveQueryObject.saveString;
            var argumentParams = saveQueryObject.argumentParams;

            var queryObject = new Query(saveQuery, argumentParams, connection, saveOptions, modelName);

            if (!callback) {
                return queryObject; //Must explicitly call exec if no callback provided - might want to change this to just run async if options.async = true
            } else {

                queryObject.exec(function (err, results) {
                    currentModel._is_new = false;
                    currentModel._is_dirty = {};

                    //Run post-save functions (pass in current model)
                    currentModel._schema.postFunctions.save.forEach(function (postSaveFunction) {
                        postSaveFunction(currentModel);
                    });

                    callback(err, results);
                });
            }
        };

        this.remove = function (removeOptions, callback) {
            if (typeof removeOptions === 'function') {
                callback = removeOptions;
                removeOptions = {};
            } else if (typeof removeOptions === 'string') {
                var fields = removeOptions;
                removeOptions = {fields: fields};
            }

            var currentModel = this;
            //Run pre-remove functions
            this._schema.preFunctions.remove.forEach(function (preRemoveFunction) {
                preRemoveFunction(currentModel);
            });

            var removeQueryObject = parseRemove(this, removeOptions);
            var removeQuery = removeQueryObject.removeString;
            var argumentParams = removeQueryObject.argumentParams;

            if (argumentParams.length === 0) {
                callback("Cassie Error: Could not determine primary key of model. Delete request not sent to database server.", null);
            }

            var queryObject = new Query(removeQuery, argumentParams, connection, removeOptions, modelName);

            if (!callback) {
                return queryObject; //Must explicitly call exec if no callback provided
            } else {

                queryObject.exec(function (err, results) {
                    currentModel._is_deleted = true;

                    //Run post-remove functions (pass in current model)
                    currentModel._schema.postFunctions.remove.forEach(function (postRemoveFunction) {
                        postRemoveFunction(currentModel);
                    });

                    callback(err, results);
                });
            }
        };

        this.markModified = function (field) {
            this._is_dirty[field] = true;
        };

        this.toString = function () {
            var returnModel = {};
            for (var key in schema._fields) {
                returnModel[key] = this[key];
            }
            delete returnModel._primary;
            return returnModel;
        };

        //Run post-remove functions (pass in current model)
        var currentModel = this;
        this._schema.postFunctions.init.forEach(function (postInitFunction) {
            postInitFunction(currentModel);
        });

    }

    Model._modelName = modelName;
    Model._tableName = tableName;

    Model.find = function (arguments, findOptions, callback) {
        if (typeof findOptions === 'function') {
            callback = findOptions;
            findOptions = {};
        }

        var optionsDictionary = parseOptions(findOptions);

        var fields = "*";
        if (optionsDictionary.fields) {
            fields = optionsDictionary.fields;
        }

        var query = "SELECT " + fields + " FROM " + tableName;

        var argumentResult = parseArguments(arguments, schema._primary);
        var argumentString = argumentResult.argumentString;
        var argumentParams = argumentResult.paramArray;

        var query = query + argumentString;

        //Allow limiting and sorting as options in find (incase you don't want to use chaining method)
        if (optionsDictionary.limit) {
            if (typeof optionsDictionary.limit === 'number') {
                var limitAmount = optionsDictionary.limit;
                query = query + " LIMIT " + limitAmount.toString() + " ";
            }
        }

        if (optionsDictionary.sort) {

            var sortObject = optionsDictionary.sort;
            if (typeof sortObject !== 'object') {
                throw "Sort argument must be an object containing a field key with an order value. Example: {field_name: -1} for DESCENDING order or {field_name: 1} ASCENDING order.";
            }
            var sortString = " ";
            for (var key in sortObject) {
                sortString = sortString + key.toString() + " ";
                if (sortObject[key] === 1) {
                    sortString = sortString + "ASC";
                } else if (sortObject[key] === -1) {
                    sortString = sortString + "DESC";
                } else {
                    throw "Sorting can only be ASCENDING (1) or DESCENDING (-1). See documentation on sort for more information.";
                }
            }
            query = query + " ORDER BY " + sortString + " ";
        }

        if (optionsDictionary.allow_filtering) {
            query = query + " ALLOW FILTERING";
        }
        var queryObject = new Query(query, argumentParams, connection, findOptions, modelName);

        if (!callback) {
            return queryObject;
        } else {
            queryObject.exec(callback);
        }
    };

    Model.findById = function (id, findOptions, callback) {
        //Finds by id for model (convention in schema)
        if (!id) {
            throw "findById(id) requires id argument";
        }
        var args = {id: id};
        Model.find(args, findOptions, callback);
    };
//    Model.findByIdAndUpdate = function (id, options, callback) {
//
//    };
//    Model.findByIdAndRemove = function (id, options, callback) {
//
//    };
    Model.findOne = function (args, findOptions, callback) {
        //Finds a single model - pretty sure that this is just a find with limit 1 (manually create CQL string instead of having to do the entire find? No, too much stuff that find does well, just use it)
        if (!findOptions) {
            findOptions = {limit: 1};
        } else {
            findOptions.limit = 1;
        }
        Model.find(args, findOptions, function (err, results) {
            if (results) {
                (callback || nullCallback)(err, results[0]);
            }
        });
    };
//    Model.findOneAndUpdate = function () {
//
//    };
//    Model.findOneAndRemove = function () {
//
//    };
//					Model.insert = function() {
    //Inserts into database - this is for batch inserts - batch inserts should use Cassie.batch(queryArray, callback);
//					};

    //TODO: Implement "IN" remove & update (would probably be better on parsedResults)
    Model.remove = function () {
        //Finds & Removes from database - this is for remove multiple (ie delete IN)
    };
    Model.update = function () {
        //Finds & updates from database - this is for update multiple (ie update IN)
    };

    return Model;
};

exports.create = function (modelName, schema, connection, options) {
    return new ModelSchema(modelName, schema, connection, options);
};
