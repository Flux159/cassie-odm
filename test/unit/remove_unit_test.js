var assert = require('assert');

var cassie = require('../../lib/cassie');

describe('Remove', function() {

    describe("remove", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

});
