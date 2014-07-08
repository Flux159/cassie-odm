var assert = require('assert');

var cassie = require('../../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieODMTest"};
cassie.connect(connectOptions);

var TrickSchema = new Schema({'name': {type: String, index: true}});

TrickSchema.post('init', function (model) {
});

TrickSchema.post('validate', function (model) {
});

TrickSchema.pre('save', function (model) {
});

TrickSchema.post('save', function (model) {
});

TrickSchema.pre('remove', function (model) {
});

TrickSchema.post('remove', function (model) {
});

TrickSchema.validate('name', function (model, field) {
    return (model[field]);
});

TrickSchema.plugin(function (schema) {
    schema.virtual('hidden', function (model) {
        return {
            'name': model.name,
            'hidden': 'field'
        };
    });
}, {testing: 'options'});

cassie.model('Trick', TrickSchema);

var ids = [];

describe('Basic', function () {

    before(function (done) {
        var options = {};
//        var options = {debug: true, prettyDebug: true};
        cassie.syncTables(connectOptions, options, function (err, results) {
            done();
        });
    });

    after(function (done) {
        cassie.deleteKeyspace(connectOptions, function (err, results) {
            cassie.close();
            done();
        });
    });

    describe("find", function () {
        it('Should save a trick and find the saved trick.', function (done) {
//            if(err) throw "Error saving during save and find test.";
            var Trick = cassie.model('Trick');
            var trick = new Trick({name: 'illusion'});

            trick.save(function (err) {
                Trick.find({id: trick.id}, function (err, results) {

                    ids.push(trick.id);

                    assert.equal(results[0].name, trick.name);
                    assert.equal(results[0].id, trick.id);
                    done();
                });
            });
        });
    });

    describe("remove", function () {
        it('Should save a trick, find it, remove it, then return no results', function (done) {
            var Trick = cassie.model('Trick');
            var trick = new Trick({name: 'illusion'});

            trick.save(function (err) {
                Trick.find({id: trick.id}, function (err, results) {
                    assert.equal(results[0].name, trick.name);
                    assert.equal(results[0].id, trick.id);
                    trick.remove(function (err) {
                        if (err) throw "Error removing during remove test.";

                        Trick.find({id: trick.id}, function (err, results) {
                            if (err) throw "Error finding second time during remove test.";

                            assert.equal(results.length, 0);
                            done();
                        });

                    });
                });
            });
        });

    });

    describe("findOne", function () {
        it('Should find one object named illusion', function (done) {

            var Trick = cassie.model('Trick');

            var trick2 = new Trick({name: 'illusion'});
            trick2.save(function (err) {
                if (err) throw "Error in findOne test: save";

                var options = {};
//                var options = {debug: true, prettyDebug: true};

                Trick.find({name: 'illusion'}, options, function(err, results) {
                    if (err) throw "Error in findOne test: find";

                    assert.ok(results.length > 1);

                    Trick.findOne({name: 'illusion'}, options, function (err, result) {
                        if (err) throw "Error in findOne test";

                        assert.ok(result);

                        done();
                    });

                });

            });

        });
    });

    describe("update", function () {
        it('should return -1 when the value is not present', function () {
            assert.equal(-1, [1, 2, 3].indexOf(4));
        });
    });

    describe("findById", function () {
        it('should return -1 when the value is not present', function () {
            assert.equal(-1, [1, 2, 3].indexOf(4));
        });
    });

});
