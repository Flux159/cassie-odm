
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var UserSchema = new Schema({user_id: {type: Number, primary: true}, name: String});

var User = cassie.model('User', UserSchema);

var options = {};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        var new_user_1 = new User({user_id: 1000, name: 'Bob'});
        var new_user_2 = new User({user_id: 2000, name: 'Steve'});

        var query_1 = new_user_1.save();
        var query_2 = new_user_2.save();

        var batchOptions = {debug: true, prettyDebug: true, timing: true};
        cassie.batch([query_1, query_2], batchOptions, function(err) {
            //Handle errors, etc.
            if(err) console.log(err);

            cassie.close();
        });


    });

});





