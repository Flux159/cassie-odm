
/**
 * UUID Generator (v1 and v4)
 */
var uuidGenerator = require('node-uuid');

/**
 * Long constructor, wrapper of the internal library used. obtained from node-cassandra-cql types.js
 */
var Long = require('long');

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
Long.fromBuffer = function (value) {
    if (!(value instanceof Buffer)) {
        throw new TypeError('Expected Buffer', value, Buffer);
    }
    return new Long(value.readInt32BE(4), value.readInt32BE(0, 4));
};

/**
 * Returns a big-endian buffer representation of the Long instance obtained from node-cassandra-cql types.js
 * @param {Long} value
 */
Long.toBuffer = function (value) {
    if (!(value instanceof Long)) {
        throw new TypeError('Expected Long', value, Long);
    }
    var buffer = new Buffer(8);
    buffer.writeUInt32BE(value.getHighBitsUnsigned(), 0);
    buffer.writeUInt32BE(value.getLowBitsUnsigned(), 4);
    return buffer;
};

exports.datatypes = {
    'String': String,
    'Number': Number,
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
    'Int': Number, //Note no support for real ints
    'int': Number,
    'Timestamp': timeuuid,
    'timestamp': timeuuid,
    'Array': Array
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
