
var cassie = require('./lib/cassie'),
		Schema = cassie.Schema;

var config = {hosts: ['127.0.0.1'], keyspace: 'mykeyspace'};

cassie.connect(config);

var UserSchema = new Schema({
	'user_id': {type: cassie.types.uuid, primary: true, default: 'uuid'},
 	'fname': String,
	'lname': String
}, {sync: true});

cassie.model('User', UserSchema);

var User = cassie.model('User');

var newUser = new User({user_id: 1800, fname: "test", lname: "bob"});
var newUser2 = new User({user_id: 1801, fname: "test2", lname: "steve"});

var options = {debug: true, prettyDebug: true, timing: true, logger: null, if_not_exists: false};

newUser.save(options,function(err) {
	if(err) {
		console.log(err);
		return cassie.close();
	}

	newUser2.save(options, function(err) {
		if(err) {
			console.log(err);
			return cassie.close();
		}

		User.find({user_id: 1745}, options, function(err, results) {
			if(err) {
				console.log(err);
				return cassie.close();
			}

			var firstResult = results[0];
			firstResult.lname = "Dole";
			firstResult.fname = "Bob";
			firstResult.save(options, function(err) {
				if(err) {
					console.log(err);
					return cassie.close();
				}

				newUser.remove(options, function(err) {
					if(err) {
						console.log(err);
						return cassie.close();
					}

					//Doing a find for 'smith' will have to search all rows
					//In general, good data modeling practices make sure that you're using primary key correctly, otherwise reads will be very slow (high latency & cpu usage)
					User.find({lname: 'smith'}, options, function(err, results) {
						if(err) {
							console.log(err.message);
							return cassie.close();
						}

                        cassie.close(function() {
                            console.log("Closed connection.");
                        });
					});

				});

			});

		});
		
	});

});