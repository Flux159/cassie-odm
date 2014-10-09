
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
cassie.connect(connectOptions);


//Requiring that 'fname' is provided (is not null)
var DogSchema = new Schema({
    'dog_id': {type: Number, primary: true},
    'fname': {type: String, required: true},
    'lname': String
});

//Adding a custom validation to 'lname'
DogSchema.validate('lname', function(model, fieldKey) {
    return (model[fieldKey] === 'doge');
}, "Last name is required.");

//A validate function is passed the model and the fieldKey to validate. It returns true or false.
//The validation function above requires that 'lname' is equal to 'doge' for all models

cassie.model('Dog', DogSchema);

//var options = {debug:true, prettyDebug: true};
var options = {};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        var Dog = cassie.model('Dog');
        var newdog = new Dog({dog_id: 1000, fname: "Test"});

        newdog.save(function(err) {
           //Should fail save w/ validation error
            console.log(err);

            newdog.lname = 'doge';

            newdog.save(function(err) {
                console.log(err);

                cassie.close();
            });

        });

    });

});
