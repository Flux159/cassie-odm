var assert = require('assert');

describe('Types', function() {

    //Need to test maps, date objects (timestamps), Longs (bigints), Buffers (Blobs), Ints

    it('should not fail', function (done) {

        var cassie = require('../../lib/cassie');
        var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
        cassie.connect(config);

        //Testing everything but maps and arrays
        var TypeSchema = new cassie.Schema({name: String, value: Number, time: Date, largeint: cassie.types.Long});
//        var TypeSchema = new cassie.Schema({name: String, value: Number, time: Date});
        var Type = cassie.model('Type', TypeSchema);


        cassie.syncTables(config, {debug: true, prettyDebug: true}, function (err, results) {

            var t1 = new Type({name: 'Hello', value: 3, time: new Date(), largeint: cassie.types.Long.fromString('12345')});

            t1.save({debug: true, prettyDebug: true}, function(err) {
                if(err){
                    console.log(err);
                    cassie.close();
                    done();
                } else {

                    Type.find({id: t1.id}, function(err, results) {
                        console.log(results.toString()); //The long value gets printed as {low: 12345, high: 0, unsigned: false}
                        console.log(cassie.types.Long.toString(results[0].largeint)); //Print as a number

                        cassie.close();
                        done();

                    });

                }

            });

//            var kitty = new Cat({ name: 'Eevee'});
//            kitty.save(function (err) {
//                if (err) return console.log(err);
//
//                cassie.close();
//                done();
//
//            });

        });

    });

});
