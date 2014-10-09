
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var UserSchema = new Schema({user_id: Number, name: String}, {primary: ['user_id', 'name']});

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

            User.find({user_id: [2000, 2001, 2002, 2003]}, {limit: 10, sort: {name: 1}, debug: true, prettyDebug: true}, function(err, users) {
                console.log(users.toString());

                //Same query as above using chaining
                User.find({user_id: [2000, 2001, 2002, 2003]}).limit(10).sort({name: 1}).exec({debug: true, prettyDebug:true}, function(err, users) {
                    console.log(users.toString());

                    cassie.close();
                });

            });

        });


    });

});


