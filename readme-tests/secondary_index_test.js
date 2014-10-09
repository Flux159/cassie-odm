
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

//Explicitly defining a primary key and defining a secondary index
var DogSchema = new Schema({
    'dog_id': {type: Number, primary: true},
    'fname': {type: String, index: true},
    'lname': String
});

//Alternative way of defining a secondary index
DogSchema.index('lname');

cassie.model('Dog', DogSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        cassie.close();
    });

});

