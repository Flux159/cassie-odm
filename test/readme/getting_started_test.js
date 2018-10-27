'use strict';

var config = require('../cassieconnect').connectOptions;
var cassie = require('../../lib/cassie');

describe('Getting Started', function() {
    it('should not fail', function (done) {
        var CatSchema = new cassie.Schema({name: String});
        var Cat = cassie.model('Cat', CatSchema);

        cassie.syncTables(config, function (err, results) {
            if (err) return done(err);

            var kitty = new Cat({ name: 'Eevee'});
            kitty.save(function (err) {
                done(err);
            });
        });
    });
});
