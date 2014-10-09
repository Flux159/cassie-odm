var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

//Explicitly defining a primary key
var DogSchema = new Schema({
    'dog_id': {type: Number, primary: true},
    'fname': String,
    'lname': String
});

//Explicitly defining a composite primary key
var DogeSchema = new Schema({
    'dog_id': {type: Number},
    'fname': String,
    'lname': String
}, {primary: ['dog_id', 'fname']});

//Explicitly defining a composite primary key
var DawgSchema = new Schema({
    'dog_id': {type: Number},
    'fname': String,
    'lname': String
}, {primary: [['dog_id','fname'], 'lname']});

//Cassie defines 'id' field for you - Note that in this case 'dog_id' is NOT the primary key, 'id' is (and 'id' is a uuid v4 type)
var DagSchema = new Schema({
    'dog_id': {type: Number, default: 'uuid'},
    'fname': String,
    'lname': String
});

cassie.model('Dog', DogSchema);
cassie.model('Doge', DogeSchema);
cassie.model('Dawg', DawgSchema);
cassie.model('Dag', DagSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        cassie.close();
    });

});


