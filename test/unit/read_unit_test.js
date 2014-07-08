var assert = require('assert');

var cassie = require('../../lib/cassie');

describe('Read', function() {

    describe("find", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

});
