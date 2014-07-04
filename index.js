
// var Cassie = require('./lib/cassie').Cassie;
//
// var cassie = new Cassie({
// 	hosts: ['127.0.0.1:9042'],
// 	keyspace: 'mykeyspace'
// });
//
// var users = cassie.model('users');
//
// users.property('user_id', Number, {primary: true});
// users.property('fname', String);
// users.property('lname', String);
//
// // users.cql("SELECT * FROM users WHERE lname = 'smith'", function(err, users) {
// // 	console.log(users);
// // 	cassie.close(function(){console.log("Shutting down.")});
// // });
//
// users.find({as: users}, function(err, users) {
// 	if(err) {
// 		console.log(err);
// 	}
//
// 	users.forEach(function(user) {
// 		// console.log(users.get('fname'));
// 		console.log(user);
// 	});
// 	// console.log(users);
// 	cassie.close(function(){console.log("Shutting down.")});
// });

// var cql = require('node-cassandra-cql');
// var client = new cql.Client({hosts:['127.0.0.1:9042'], keyspace: 'mykeyspace'});
//
// client.execute("SELECT * FROM users WHERE lname = 'smith'", null, function(err, result) {
// 	if(err) {
// 		console.log("Execute failed");
// 		return;
// 	}
//
// 	var users = result.rows;
//
// 	console.log("Got users:");
// 	console.log(users);
// 	client.shutdown(function(err) {
// 		console.log("Shutting down client");
// 	})
// });

var cassie = require('./lib/cassie'),
		Schema = cassie.Schema;

var config = require('./config');

var conn1 = cassie.connect(config.cassandra.options);
var conn2 = cassie.connect(config.cassandra.options);

var UserSchema = new Schema({
	'user_id': Number,
 	'fname': String,
	'lname': String
});

// console.log(UserSchema);

// cassie.model('User', UserSchema, {pluralize: true, lowercase: true});
// cassie.model('User', UserSchema, {pluralize: false, lowercase: false});
cassie.model('User', UserSchema, {pluralize: true});

var User = cassie.model('User');

// console.log(User);

// console.log(User);

// var newUser = new User({test: 'this', thing: 'blah'});

console.log(User);

var CatSchema = new Schema({'name': String});

cassie.model('Cat', CatSchema);

var Cat = cassie.model('Cat');

// console.log(Cat);
// console.log(User);

var newUser = new User();
console.log(newUser);

var kitten = new Cat();
console.log(kitten);

// User.findOne({}, {debug: true}, function(err, results) {
// 	if(err) {
// 				console.log(err.message);
// 				return cassie.close();
// 	}
// 	console.log(results);
// 	cassie.close();
// });

User.find({fname: 'john', lname: 'smith'}, {debug: true, allow_filtering: true, fields: 'fname lname'}, function(err, results) {
	if(err) {
		console.log(err.message);
		return cassie.close();
	}
	// console.log(err);
	console.log(results);
	cassie.close();
	// cassie.close();
});

// User.find({fname: {$gt: 'smith', $lt:"epe"}, user_id: 1, some_object: {$in: ['this','is','array']}}, function(err, results) {
// 	console.log(err);
// 	console.log(results);
// 	cassie.close();
// });

// User.find({fname: 'smith', user_id: 1, some_array: ['testing', 'this']}, function(err, results) {
// 	console.log(err);
// 	console.log(results);
// 	cassie.close();
// });

// cassie.model('User', {test: 'error'});

//Testing out multiple connections (seems to work) - closeAll may have an issue
// cassie.cql("SELECT * FROM users WHERE lname = 'smith'", function(err, results) {
// 	console.log(results);
// 	cassie.close(function() {
//
// 		cassie.cql("SELECT * FROM users", function(err, results) {
// 			console.log(results);
// 			cassie.close();
// 		});
//
// 	});
// 	// cassie.closeAll(function() {
// 	//
// 	// });
//
//
//
// });



// var winston = require('winston');

// var priam = require('priam');

// var options = {
// 	config: {
// 		cqlVersion: "3.0.0",
// 		timeout: 4000,
// 		poolSize: 2,
// 		consistencyLevel: 1,
// 		driver: "node-cassandra-cql",
// 		numRetries: 3,
// 		retryDelay: 50,
// 		enableConsistencyFailover: true,
// 		//queryDirectory: path.join(__dirname, 'path/to/cql/files'), //Path to namedQueries (require('path'))
// 		// user: "<username>",
// 		// password: "<password>",
// 		keyspace: "mykeyspace",
// 		hosts: [
// 		"127.0.0.1:9042"
// 		]
// 	}
// 	// logger: new (require("winston")).Logger({})
// };
//
// // var db = priam(options);
// var db = require('priam')(options);
//
// db.cql("SELECT * FROM users", [], {consistency: db.consistencyLevel.QUORUM}, function(err, users) {
// 	if(err) {
// 		console.log("ERROR: " + err);
// 	}
// 	// console.log("Returned data: ");
// 	console.log(users);
//
// 	// users.forEach(function(user) {
// 	// 	console.log(user.lname);
// 	// });
//
// 	// console.log(db);
// 	db.closePool(db.pools.default, function() {
// 		// console.log("Pool closed");
// 	});
// });


// var db = require('priam')(options);
//
// db.cql("SELECT * FROM users", [], {consistency: db.consistencyLevel.QUORUM}, function(err, users) {
// 	if(err) {console.log("ERROR: " + err);}
// 	console.log(users);
// 	db.closePool(db.pools.default, function() {
// 		console.log("Pool closed");
// 	});
// });


// db.cql("SELECT * FROM users WHERE lname = 'smith'", [], {consistency: db.consistencyLevel.ONE}, function(err, data) {
// 	if(err) {
// 		console.log("ERROR: " + err);
// 	}
// 	console.log("Returned data: ");
// 	console.log(data);
// 	// console.log(db);
// 	db.closePool(db.pools.default, function() {
// 		console.log("Pool closed");
// 	});
// });

//NOTE: CQL may not support all of these on every field by default (see ALLOW FILTERING for more info) 
//3 special functions / values: $gt $lt $in (in would be the array case), $gt and $lt should be parsed to >= and =< respectively
//Note that these are defined as follows: created_at: {$gt: num1, $lt: num2}
//or... name_list: {$in: ['array', 'of', 'names']}

//A note: Cassandra doesn't have strictly less than or strictly greater than operators (they're just aliases for >= and =<)

//Need to do TODOS:
//TODO: Write documentation and Tests
//TODO: Validations - like a pre.save thing (I think that this would be in schema to begin with, then added to each model as a list of "pre"-save things to do, ie: pre: [function, function, etc.])
//TODO: BigInteger / Long support
//TODO: Also, adding priam support (primarily for cql file support) would be nice to have

//I don't think this should be allowed, they can use Cassie.query if they want to (and Cassie.connection if they want the manual node-cassandra-cql connection or Cassie.cql for running CQL)
// this.query = function() {
	//Manually run cql query (same as Cassie.cql - uses connection that this model holds though)			
// };

//Done TODOS:

//TODO: Limit query when options is given as string (ie only return _id, etc. when '_id' is passed as options arg)
//TODO: Add "limit" & "sort" arguments - need to allow for chaining
//TODO: I should definitely be passing these as parameters (to prevent SQL injection)

