var assert = require('assert');

var cassie = require('../../lib/cassie');
var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
cassie.connect(config);

describe('Sync', function () {

    describe("createKeyspace", function () {
        it('Should check or create a keyspace', function (done) {
            cassie.checkKeyspace(config, function (err, results) {
                done();
            });
        });
    });

    describe("updateTables", function () {
        it('Should create and update an existing table', function (done) {

            var CatSchema = new cassie.Schema({name: String});
            var Cat = cassie.model('Cat', CatSchema);

//            var options = {debug: true, prettyDebug: true};
            var options = {};

            cassie.syncTables(config, options, function () {

                var newCatSchema = new cassie.Schema({name: String, breed: String});
                var Cat = cassie.model('Cat', newCatSchema);

                cassie.syncTables(config, options, function () {
                    done();
                });

            });
        });
    });

});
