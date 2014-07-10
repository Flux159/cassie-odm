var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var UserSchema = new Schema({user_id: {type: Number, primary: true}, name: String});

var User = cassie.model('User', UserSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        //Assumption is that user_id is primary key
        var new_user = new User({user_id: 2000, name: 'steve'});

        new_user.save({if_not_exists: true, debug: true, prettyDebug:true}, function(err) {
            console.log(err);
            //Handle errors, etc.

            cassie.close();

        });


    });

});
