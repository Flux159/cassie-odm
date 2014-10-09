
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var UserSchema = new Schema({user_id: Number, name: String, page: Number}, {primary: ['user_id', 'name', 'page']});

var User = cassie.model('User', UserSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        //Assumption is that user_id is primary key
        var new_user = new User({user_id: 2000, name: 'steve', page: 1});

        new_user.save({if_not_exists: true, debug: true, prettyDebug:true}, function(err) {
            console.log(err);
            //Handle errors, etc.

            //TODO: Don't think that generic pagination is ready just yet (v0.1.0), check w/ node-cassandra-cql driver when its ready there

            var query = User.find({user_id: [2000]}).page({name: {page: 'steve', count: 25}});
//            var query = User.find({user_id: [2000]});
//            var query = User.find({}).limit(25);
//            console.log(query.toString(true));

            query.exec({debug: true, prettyDebug: true, timing: true, prepared: true}, function(err, results) {
                cassie.close();
            });

        });


    });

});


