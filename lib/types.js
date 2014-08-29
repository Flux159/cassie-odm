'use strict';

/**
 * UUID Generator (v1 and v4) obtained from node-cassandra-cql types.js
 */
var uuidGenerator = require('node-uuid');

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

/**
 * Returns a long representation.
 * Used internally for deserialization obtained from node-cassandra-cql types.js
 */
//Long.fromBuffer = function (value) {
//    if (!(value instanceof Buffer)) {
//        throw new TypeError('Expected Buffer', value, Buffer);
//    }
//    return new Long(value.readInt32BE(4), value.readInt32BE(0, 4));
//};

Long.fromString = function(value) {
    if(typeof value !== 'string') {
        throw new TypeError('Expected String', value, String);
    }
    return new long.fromString(value);
};

Long.toString = function(obj) {
    if(typeof obj !== 'object') {
        throw new TypeError('Expected Object {low: lower-32 bits, high: higher-32 bits}', obj, Object);
    }
    var strlong = new long(obj);
    return strlong.toString();
};

/**
 * Returns a big-endian buffer representation of the Long instance obtained from node-cassandra-cql types.js
 * @param {Long} value
 */
//Long.toBuffer = function (value) {
//    if (!(value instanceof Long)) {
//        throw new TypeError('Expected Long', value, Long);
//    }
//    var buffer = new Buffer(8);
//    buffer.writeUInt32BE(value.getHighBitsUnsigned(), 0);
//    buffer.writeUInt32BE(value.getLowBitsUnsigned(), 4);
//    return buffer;
//};

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
