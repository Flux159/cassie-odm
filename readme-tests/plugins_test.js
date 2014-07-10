
var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

//updatedAtPlugin.js
function updatedAtPlugin(schema, options) {
    schema.add({updated_at: Date});

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

cassie.model('User', UserSchema);
cassie.model('Blog', BlogSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        cassie.close();
    });

});
