
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

var PostSchema = new Schema({post_id: {type: Number, primary: true}, title: String});

var Post = cassie.model('User', PostSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        var new_post = new Post({title: 'My time limited post', post_id: 1000});

        new_post.save({ttl: 86400, debug: true, prettyDebug: true}, function(err) {
            //Handle errors, etc.

            cassie.close();

        });

    });

});




