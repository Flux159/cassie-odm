'use strict';

/**
 * UUID Generator (v1 and v4) obtained from node-cassandra-cql types.js
 */
var uuidGenerator = require('uuid');

/**
 * Long constructor, wrapper of the internal library used. obtained from node-cassandra-cql types.js
 */
var long = require('long');

function Long() {
    return long;
}

/**
 * Generates and returns a RFC4122 v1 (timestamp based) UUID.
 * Uses node-uuid module as generator. obtained from node-cassandra-cql types.js
 */
function timeuuid(options, buffer, offset) {
    return uuidGenerator.v1(options, buffer, offset);
}

/**
 * Generate and return a RFC4122 v4 UUID.
 * Uses node-uuid module as generator. obtained from node-cassandra-cql types.js
 */
function uuid(options, buffer, offset) {
    return uuidGenerator.v4(options, buffer, offset);
}

Long.fromString = function(value) {
    if(typeof value !== 'string') {
        throw new TypeError('Expected String', value, String);
    }
    return new long.fromString(value);
};

/**
 * @param {Number} obj.low The lower 32-bit part of the value
 * @param {Number} obj.high The higher 32-bit part of the value
 * @returns The string representation of the 64-bit integer
 */
Long.toString = function(obj) {
    if(typeof obj !== 'object') {
        throw new TypeError('Expected Object {low: lower-32 bits, high: higher-32 bits}', obj, Object);
    }
    var strlong = new long(obj.low, obj.high);
    return strlong.toString();
};

/**
 * Int type - provides a hint to node-cassandra-cql to use an integer
 * @param value
 * @constructor
 */
function Int(value) {}
Int.hint = 'int';

function Double(value) {}
Double.hint = 'double';

/**
 * Counter type - provides a hint to node-cassandra-cql to use a counter
 */
function Counter(value) {}
Counter.hint = 'counter';

exports.datatypes = {
    'String': String,
    'Number': Number,
    'Double': Double,
    'Date': Date,
    'Buffer': Buffer,
    'Blob': Buffer,
    'Boolean': Boolean,
    'Mixed': Object,
    'Object': Object,
    'ObjectId': uuid, //Node uuid (v4)
    'uuid': uuid,
    'long': Long, //Note this uses nodejs long
    'Long': Long,
    'Int': Int, //Note no support for real ints
    'int': Int,
    'Integer': Int,
    'Timestamp': timeuuid,
    'timestamp': timeuuid,
    'Array': Array,
    'Counter': Counter
};

/**
 * Consistency levels - obtained from node-cassandra-cql types.js
 */
exports.consistencies = {
    any:          0x00,
    one:          0x01,
    two:          0x02,
    three:        0x03,
    quorum:       0x04,
    all:          0x05,
    localQuorum:  0x06,
    eachQuorum:   0x07,
    localOne:     0x10,
    getDefault: function () {
        return this.quorum;
    }
};
