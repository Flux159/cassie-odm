var assert = require('assert');

var connectOptions = require('../cassieconnect').connectOptions;
var cassie = require('../../lib/cassie');

describe('Sync', function () {

    describe("createKeyspace", function () {
        it('Should check or create a keyspace', function (done) {
            cassie.checkKeyspace(connectOptions, function (err) {
                done(err);
            });
        });
    });

    describe("updateTables", function () {
        it('Should create and update an existing table', function (done) {

            var CatSchema = new cassie.Schema({name: String});
            var Cat = cassie.model('Cat', CatSchema);

//            var options = {debug: true, prettyDebug: true};
            var options = {};

            cassie.syncTables(connectOptions, options, function () {

                var newCatSchema = new cassie.Schema({name: String, breed: String});
                var Cat = cassie.model('Cat', newCatSchema);

                cassie.syncTables(connectOptions, options, function (err) {
                    done(err);
                });

            });
        });
    });

});
