'use strict';

var cassie = require('../lib/cassie');
var connectOptions = require('./cassieconnect').connectOptions;

after('Drop keyspace and Close', function (done) {
  this.timeout(10000);

  cassie.deleteKeyspace(connectOptions, {}, function (err) {
    if (err) return done(err);
    cassie.close(function(err) {
      if (err) return done(err);
      cassie.closeAll(function(err) {
        done(err);
      });
    });
  });
});
