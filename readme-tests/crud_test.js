
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var FishSchema = new Schema({
    fish_id: {type: Number, primary: true},
    name: String
});

cassie.model('Fish', FishSchema);

cassie.syncTables(connectOptions, function(err) {
    //Create Example (assuming schemas have been defined and sync'ed - see sync for more information)
    var Fish = cassie.model('Fish');

    var fishee = new Fish({fish_id: 2001, name: 'eevee'});
    fishee.save(function(err) {
        //Handle errors, etc.
    });


//Read Example (assuming schemas have been defined & sync'ed - see sync for more information)
    var Fish = cassie.model('Fish');

    Fish.find({fish_id: {$in: [2000, 2001, 2002, 2003, 2004]}}).exec(function(err, fishes) {
        console.log(fishes.toString());
        var firstFish = fishes[0]; //...
    });

//Update Example (assuming schemas have been defined & sync'ed - see sync for more information)

    var Fish = cassie.model('Fish');

    var fishee2 = new Fish({fish_id: 2002, name: 'eevee'});
    fishee2.save(function(err) {
        if(err) console.log(err);
        //Renaming the fish
        fishee2.name = 'bambie';

        fishee2.save(function(err) {
            //fishee2 has now been renamed (Cassie internally stores a flag to know when you've modified fields - for arrays and maps, you must specified that a field has been modified using the fishee2.markModified('fieldName'); method though (see 'Modeling' for an example).
        });
    });

//Alternatively, you can also send update queries if you know some information about the model

    var Fish = cassie.model('Fish');
    var fish_id3 = 2003; //Assumes fish_id is a number. If uuid, would need to pass uuid as a string

    Fish.update({fish_id: fish_id3}, {name: 'bambie'}, function(err) {
        if(err) console.log(err);
        //Fish with id 2000 has had its name updated
        //If no fish with id exists, returns error
    });

//Fish.update can also take multiple ids in the same way as find: {id: {$in: [1234,1235]} or {id: [1234,1235]}

//Delete Example (assuming schemas have been defined & sync'ed - see sync for more information)

    var Fish = cassie.model('Fish');

    var fishee4 = new Fish({fish_id: 2004, name: 'goldee'});
    fishee4.save(function(err) {
        if(err) console.log(err);

        fishee4.remove(function(err) {
            if(err) console.log(err);
            //Fishee has been removed.
        });
    });

//Alternatively, you can also send delete queries if you know some information about the model (that Cassandra indexes by)

    var Fish = cassie.model('Fish');
    var fish_id5 = 2005; //Assumes fish_id is a number. If uuid, would need to pass uuid as a string

    Fish.remove({fish_id: fish_id5}, 'name', function(err) {
        if(err) console.log(err);
        //Fish with id 2001 has had its name deleted
    });

//To delete entire row, ignore second argument. Ex:
//Fish.remove({id: fish_id5}, function(err) {
//Your callback code
//});

//Fish.remove can also take multiple ids in the same way as find: {id: {$in: [1234,1235]} or {id: [1234,1235]}


});


