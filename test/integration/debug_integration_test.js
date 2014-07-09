var assert = require('assert');

var cassie = require('../../lib/cassie');
var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
cassie.connect(config);

describe('Sync', function () {

    describe("updateTables", function () {
        it('Should create and update an existing table (with debug enabled)', function (done) {

            var CatSchema = new cassie.Schema({name: String});
            var Cat = cassie.model('Cat', CatSchema);

            var options = {debug: true, prettyDebug: true};

            cassie.syncTables(config, options, function () {

                var newCatSchema = new cassie.Schema({name: String, breed: String});
                var Cat = cassie.model('Cat', newCatSchema);

                cassie.syncTables(config, options, function () {
                    done();
                });

            });
        });
    });

    describe("Queries", function () {
        it('Should insert, find, and batch remove (with debug)', function (done) {

            var CatSchema = new cassie.Schema({name: String});
            var Cat = cassie.model('Cat', CatSchema);

//            var options = {debug: true, prettyDebug: true};
            var options = {};

            cassie.syncTables(config, options, function () {

                var newCatSchema = new cassie.Schema({name: String, breed: String});
                var Cat = cassie.model('Cat', newCatSchema);

                var kitten1 = new Cat({name: 'evee'});
                var kitten2 = new Cat({name: 'akka'});

                kitten1.save({debug: true, prettyDebug:true, timing:true}, function(err) {

                    kitten2.save({debug: true, prettyDebug:true, timing:true}, function(err) {

                        Cat.find({id: {$in: [kitten1.id, kitten2.id]}}, function(err, results) {

                            var resultStrings = results.toString();
                            console.log(resultStrings);

                            var query1 = kitten1.remove();
                            var query2 = kitten2.remove();

                            cassie.batch([query1, query2], {debug: true, prettyDebug:true, timing: true}, function(err) {
                                done();
                            });
                        });
                    });

                });
            });
        });
    });

});
