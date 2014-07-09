var assert = require('assert');

describe('Maps Buffer', function() {

    //Need to test maps, date objects (timestamps), Longs (bigints), Buffers (Blobs), Ints

    it('should not fail', function (done) {

        var cassie = require('../../lib/cassie');
        var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
        cassie.connect(config);

        var MapsBuffer = new cassie.Schema({name: String, specialmap: {type: {String: String}, buff: cassie.types.Buffer}});
//        var MapsBuffer = new cassie.Schema({name: String, buff: Buffer});
        var Maps = cassie.model('Maps', MapsBuffer);

        cassie.syncTables(config, {debug: true, prettyDebug: true}, function (err, results) {

            var t1 = new Maps({name: 'Hello', buff: Buffer('dadfdjkva'), specialmap: {'test': 'blah'}});

            t1.save({debug: true, prettyDebug: true}, function(err) {
                if(err){
                    console.log(err);
                    cassie.close();
                    done();
                } else {

                    Maps.find({id: t1.id}, function(err, results) {

                        console.log(results.toString());

                        cassie.close();
                        done();
                    });
                }

            });

        });

    });

});
