var assert = require('assert');

var cassie = require('../../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieTest"};

cassie.connect(connectOptions);

var DogSchema = new Schema({
    'dog_id': {type: Number, primary: true},
    'fname': String,
    'lname': String
}, {sync: true});

cassie.model('Dog', DogSchema);

var Dog = cassie.model('Dog');

describe('Crud', function () {

    before(function (done) {
        var options = {};
        cassie.syncTables(connectOptions, options, function (err, results) {
            done();
        });
    });

    it('Should create some users, remove a field from a user, check that the field has been removed, then update the field again', function(done) {

        var newDog = new Dog({dog_id: 1800, fname: "test", lname: "bob"});
        var newDog2 = new Dog({dog_id: 1801, fname: "test2", lname: "steve"});

        var options = {prettyDebug: false, timing: false, logger: null, if_not_exists: false};

        newDog.save(options, function (err) {
            if (err) {
                console.log(err);
                return cassie.close();
            }

            newDog2.save(options, function (err) {
                if (err) {
                    console.log(err);
                    return cassie.close();
                }

                Dog.remove({dog_id: 1800}, 'fname', function () {

                    Dog.find({dog_id: 1800}, 'fname lname', function(err, users) {

                        assert(users[0].fname === null);
                        assert(users[0].lname === 'bob');

                        Dog.update({dog_id: 1800}, {fname: 'Dole'}, function () {

                            Dog.find({dog_id: 1800}, 'fname lname', function(err, users) {

                                assert(users[0].fname === 'Dole');
                                assert(users[0].lname === 'bob');

                                done();

                            });

                        });

                    });

                });

            });

        });

    });

});
