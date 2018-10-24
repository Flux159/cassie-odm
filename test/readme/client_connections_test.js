'use strict';

var config = require('../cassieconnect').connectOptions;
var cassie = require('../../lib/cassie');

describe('Client Connections and raw queries', function() {
    it('should not fail', function (done) {
        // var cassie = require('cassie-odm');
        // var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
        var connection = cassie.connect(config);

        connection.execute("SELECT * FROM cats", [], function(err, results) {
          // if(err) return console.log(err);
          console.log("meow");
          done(err); // Added to complete test (not in modeling documentation)
        });
    });
});
