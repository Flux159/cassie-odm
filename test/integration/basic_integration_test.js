var assert = require('assert');

var cassie = require('../../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieODMTest"};
cassie.connect(connectOptions);

var TrickSchema = new Schema({'name': {type: String}});

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


describe('Basic', function () {

    before(function (done) {
        cassie.syncTables(connectOptions, function (err, results) {
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

            var Trick = cassie.model('Trick');
            var trick = new Trick({name: 'illusion'});

            trick.save(function (err, results) {
                Trick.find({id: trick.id}, function (err, results) {
                    assert.equal(results[0].name, trick.name);
                    assert.equal(results[0].id, trick.id);
                    done();
                });
            });
        });
    });

    describe("remove", function () {
        it('should return -1 when the value is not present', function () {
            assert.equal(-1, [1, 2, 3].indexOf(4));
        });
    });

    describe("findOne", function () {
        it('should return -1 when the value is not present', function () {
            assert.equal(-1, [1, 2, 3].indexOf(4));
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

    describe("remove", function () {
        it('should return -1 when the value is not present', function () {
            assert.equal(-1, [1, 2, 3].indexOf(4));
        });
    });

});
