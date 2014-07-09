var assert = require('assert');

var cassie = require('../../lib/cassie');
var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
cassie.connect(config);

describe("Queries", function () {
    it('Should insert, find, and batch remove (with debug)', function (done) {

        var CatSchema = new cassie.Schema({name: String});
        var Cat = cassie.model('Cat', CatSchema);

        var options = {};

        cassie.syncTables(config, options, function () {

            var newCatSchema = new cassie.Schema({name: String, breed: String});
            var Cat = cassie.model('Cat', newCatSchema);

            var kitten1 = new Cat({name: 'evee'});
            var kitten2 = new Cat({name: 'akka'});

            var query1 = kitten1.save();
            var query2 = kitten2.save();

            query1.exec({prepared: true, debug: true}, function() {

                query2.exec({prepared: false, debug: false}, function() {

                    done();

                });

            });

        });
    });
});
