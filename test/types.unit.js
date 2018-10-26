'use strict';

var assert = require('assert');

var types = require('../lib/types');

describe('Unit :: Types', function() {
  describe('Long', function() {
    describe('toString', function() {
      it('should throw if not an object', function() {
        assert.throws(function() {
          types.datatypes.Long.toString('not an object');
        }, /Expected Object/);
      });

      it('should convert object to string', function() {
        var actual = types.datatypes.Long.toString({ low: 0xFFFFFFFF, high: 0x7FFFFFFF });
        assert.equal(actual, '9223372036854775807');
      });

      it('should return -1 if value exceeds twos-complement 64-bits', function() {
        var actual = types.datatypes.Long.toString({ low: 0xFFFFFFFF, high: 0xFFFFFFFF });
        assert.equal(actual, '-1');
      });
    });
  });
});
