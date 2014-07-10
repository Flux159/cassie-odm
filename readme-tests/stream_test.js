
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var UserSchema = new Schema({user_id: {type: Number, primary: true}, name: String});

var User = cassie.model('User', UserSchema);

var new_user = new User({user_id: 1000, name: "test"});
var new_user2 = new User({user_id: 1002, name: "blah"});

var options = {};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        new_user.save(function(err) {
            if(err) console.log(err);
            new_user2.save(function(err) {
                if(err) console.log(err);

                var query = User.find({user_id: {$in: [1000, 1001, 1002, 1003]}});
                query.stream()
                    .on('readable', function() {
                        var row;
                        while(row = this.read()) {
                            console.log(row);
                        }
                    })
                    .on('end', function() {
                        //Stream ended
                        console.log("Stream ended");
                        cassie.close();
                    })
                    .on('error', function(err) {
                        //Stream error
                        console.log(err);
                    });


            })
        });

    });

});




