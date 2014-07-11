
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

//updatedAtPlugin.js
function updatedAtPlugin(schema, options) {
    schema.add({updated_at: Date}); //Adds a field to the model instance

    schema.addQuery({'get': function(args, callback) {
        console.log("Inside Model get function");
        var results = args;
        callback(results);
    }});
    //Adds a function to query by on Model class (like Model.find, Model.update, Model.remove)
    //This can be useful when making plugins that add query logic to a Model class
    //Example: Integrate an external data source / index in a plugin (like a search index), then add a method that will query that external data source
    //Combining pre/post save logic and queries can allow for expressive plugins

    schema.pre('save', function(model) {
        model.updated_at = new Date();
    });

    if(options && options.index) {
        schema.index('updated_at');
    }
}

//user.js
//var updatedAtPlugin = require('./updatedAtPlugin');
var UserSchema = new Schema({name: String});
UserSchema.plugin(updatedAtPlugin, {index: true});

//blog.js
//var updatedAtPlugin = require('./updatedAtPlugin');
var BlogSchema = new Schema({title: String});
BlogSchema.plugin(updatedAtPlugin, {index: true});

var User = cassie.model('User', UserSchema);
var Blog = cassie.model('Blog', BlogSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        User.get('some args', function(results) {
            console.log(results);

            cassie.close();
        });

    });

});
