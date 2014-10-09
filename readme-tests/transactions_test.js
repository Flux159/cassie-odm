var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
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

            var new_user_2 = new User({user_id: 2001, name: 'bob'});

            new_user_2.save({debug: true, prettyDebug:true}, function(err) {
                console.log(err);

                new_user_2.name = 'bill';

                new_user_2.save({if: {name: 'bill'}, debug: true, prettyDebug:true}, function(err) {
                    if(err) console.log(err);

                    new_user.name = "apple";
                    new_user.save({if: {name: 'steve'}, debug: true, prettyDebug:true}, function(err) {

                        User.find({}, {debug: true, prettyDebug: true}, function(err) {
                            if(err) console.log(err);

                            cassie.close();

                        });

                    });

                });

            });

        });

    });

});
