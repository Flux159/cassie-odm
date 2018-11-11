'use strict';

var config = require('../cassieconnect').connectOptions;
var cassie = require('../../lib/cassie');

describe('Client Connections and raw queries', function() {
    it('should not fail', function (done) {
        var connection = cassie.connect(config);

        connection.execute("SELECT * FROM cats", [], function(err, results) {
          console.log("meow");
          done(err);
        });
    });
});
