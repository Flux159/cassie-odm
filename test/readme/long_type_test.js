var assert = require('assert');

describe('Long Type Key', function() {

    //Need to test maps, date objects (timestamps), Longs (bigints), Buffers (Blobs), Ints

    it('should not fail', function (done) {

        var cassie = require('../../lib/cassie');
        var config = {keyspace: "CassieTest", hosts: ["127.0.0.1"]};
        cassie.connect(config);

        //Testing everything but maps and arrays
        var LongKeySchema = new cassie.Schema({mykey: cassie.types.Long, value: Number, time: Date, largeint: {type: cassie.types.Long, index: true}, int: cassie.types.Int, dbl: cassie.types.Double}, {primary: 'mykey'});
        var LongKey = cassie.model('LongKey', LongKeySchema);

        cassie.syncTables(config, {debug: true, prettyDebug: true}, function (err, results) {

            var t1 = new LongKey({mykey: cassie.types.Long.fromString('12345673493'), value: 3, time: new Date(), largeint: cassie.types.Long.fromString('12345'), int: 42, dbl: 5324.53});

            t1.save({debug: true, prettyDebug: true}, function(err) {
                if(err){
                    console.log(err);
                    cassie.close();
                    done();
                } else {

                    LongKey.find({mykey: cassie.types.Long.fromString('12345673493')}, {debug: true, prettyDebug: true}, function(err, results) {

                        assert.equal(1, results.toString().length);

                        LongKey.find({largeint: cassie.types.Long.fromString('12345')}, {debug: true, prettyDebug: true}, function(err, indexResults) {

                            assert.equal(1, results.toString().length);

                            cassie.close();
                            done();

                        });

                    });
                }

            });

        });

    });

});
