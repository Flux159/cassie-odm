var assert = require('assert');

var cassie = require('../../lib/cassie');

describe('Client Connections', function() {

    describe("find", function() {
        it('should return -1 when the value is not present', function() {
//            var cassie = require('cassie-odm');
            var cassie = require('../../lib/cassie');
            var connection = cassie.connect({keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]});

            connection.execute("SELECT * FROM cats", [], function(err, results) {
                if(err) return console.log(err);
                console.log("meow");
            });
        });
    });

});
