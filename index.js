
var cassie = require('./lib/cassie'),
		Schema = cassie.Schema;

var config = require('./config');

var conn1 = cassie.connect(config.cassandra.options);
// var conn2 = cassie.connect(config.cassandra.options);

var UserSchema = new Schema({
	'user_id': {type: cassie.types.uuid, primary: true, default: 'uuid'},
 	'fname': String,
	'lname': {type: String, index:true},
	'blah': {type: Number, index: true}
}, {sync: true});


cassie.model('User', UserSchema);

var CatSchema = new Schema({'name': {type: String}, 'cat_id': {type: cassie.types.uuid, primary: true}, 'ref_id': cassie.types.uuid});

cassie.model('Cat', CatSchema);

var MagicSchema = new Schema({'name': {type: String, primary: true}, 'magic': String, type: String});

cassie.model('Magic', MagicSchema);

var IllusionSchema = new Schema({'name': {type: String, primary: true}, 'trick': String});

cassie.model('Illusion', IllusionSchema);

var TrickSchema = new Schema({'name': {type: String}});

TrickSchema.post('init', function(model) {
    console.log("Testing post init");
});

TrickSchema.post('validate', function(model) {
    console.log("Testing postvalidate")
});

TrickSchema.pre('save', function(model) {
    console.log(model);
    console.log("Testing presave");
});

TrickSchema.post('save', function(model) {
    console.log("Testing postsave");
});

TrickSchema.pre('remove', function(model) {
   console.log("Testing pre remove");
});

TrickSchema.post('remove', function(model) {
    console.log("Testing post remove");
});

TrickSchema.validate('name', function(model, field) {
    return (model[field]);
});

TrickSchema.plugin(function(schema, options) {
    schema.virtual('hidden', function(model) {
        return {
            'name': model.name,
            'hidden': 'field'
        };
    });
}, {testing: 'options'});

cassie.model('Trick', TrickSchema);

var Trick = cassie.model('Trick');
var trick = new Trick({name: 'illusion'});
var badTrick = new Trick({});

var trick1 = new Trick({name: 'first'});
var trick2 = new Trick({name: 'second'});
var trick3 = new Trick({name: 'third'});

//Before using anywhere, check if keyspace exists & sync tables

cassie.syncTables(config.cassandra.options, {debug: true, prettyDebug: true, warning: true}, function(err, results) {

    trick.save({debug: true}, function(err, results) {

        badTrick.save({debug: true}, function(err, results) {

            var query1 = trick1.save();
            var query2 = trick2.save();
            var query3 = trick3.save();

            cassie.batch([query1, query2, query3], {debug: true}, function(err, results) {

                trick.remove({debug: true}, function(err, results) {

                    var User = cassie.model('User');

                    cassie.close(function() {
                        console.log("Closed connection.");
                    });
                });

            });

        });

    });
	
});
