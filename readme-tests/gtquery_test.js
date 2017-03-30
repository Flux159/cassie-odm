
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = { hosts: ["127.0.0.1:9042"], keyspace: "CassieTest" };
cassie.connect(connectOptions);

// var DogeSchema = new Schema({
//     'dog_id': {type: Number},
//     'fname': String,
//     'lname': String
// }, {primary: ['dog_id', 'fname']});

var PokemonSchema = new Schema({
    fish_id: { type: Number },
    time: String,
    name: String,
}, { primary: ['fish_id', 'time'] });

cassie.model('Pokemon', PokemonSchema);

cassie.syncTables(connectOptions, function (err) {
    // Read Example Querying:
    var Pokemon = cassie.model('Pokemon');

    var waterType3000 = new Pokemon({ fish_id: 3000, name: 'eevee', time: '10:00' });
    var waterType3001 = new Pokemon({ fish_id: 3001, name: 'squirtle', time: '11:00' });
    var waterType3002 = new Pokemon({ fish_id: 3002, name: 'vaporeon', time: '12:00' });
    var waterType3003 = new Pokemon({ fish_id: 3003, name: 'wartortle', time: '13:00' });

    var allWaterTypes = [3000, 3001, 3002, 3003];
    var queries = [waterType3000.save(), waterType3001.save(), waterType3002.save(), waterType3003.save()];

    var options = { debug: true, prettyDebug: true, timing: true };
    cassie.batch(queries, options, function (err) {
        // Note the restrictions here - you must supply an $in clause on the primary key
        // Then you can use a $gt, $lt, $gte, or $lte operator
        // Doing just Pokemon.find({time: {$gt: '10:00', $lt: '12:00'}}, function(err, fishes)) will not work
        // See more here: https://www.datastax.com/dev/blog/a-deep-look-to-the-cql-where-clause

        Pokemon.find({ fish_id: { $in: allWaterTypes }, time: { $gt: '10:00', $lt: '12:00' } }, options).exec(function (err, fishes) {
            if (err) console.log(err);

            console.log('Strictly Greater than:');
            console.log(fishes.toString());
            var firstFish = fishes[0]; // ...
        });

        Pokemon.find({ fish_id: { $in: allWaterTypes }, time: { $gte: '10:00', $lte: '12:00' } }, options).exec(function (err, fishes) {
            if (err) console.log(err);

            console.log('Greater than or equal to:');
            console.log(fishes.toString());
            var firstFish = fishes[0]; // ...
        });
    });
});
