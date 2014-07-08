var assert = require('assert');

var cassie = require('../../lib/cassie'),
    Schema = cassie.Schema;

describe('Basic', function() {

    describe("find", function() {
        it('should return -1 when the value is not present', function(done) {
//            assert.equal(-1, [1,2,3].indexOf(4));

            var connectOptions = {hosts: ["127.0.0.1:9042"], keyspace: "CassieODMTest"};
            cassie.connect(connectOptions);

            var TrickSchema = new Schema({'name': {type: String}});

            TrickSchema.post('init', function(model) {
//    console.log("Testing post init");
            });

            TrickSchema.post('validate', function(model) {
//    console.log("Testing postvalidate")
            });

            TrickSchema.pre('save', function(model) {
//    console.log(model);
//    console.log("Testing presave");
            });

            TrickSchema.post('save', function(model) {
//    console.log("Testing postsave");
            });

            TrickSchema.pre('remove', function(model) {
//   console.log("Testing pre remove");
            });

            TrickSchema.post('remove', function(model) {
//    console.log("Testing post remove");
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

            cassie.syncTables(connectOptions, function(err, results) {
                var Trick = cassie.model('Trick');
                var trick = new Trick({name: 'illusion'});

                trick.save(function(err, results) {

                    cassie.close();
                    done();

                });
            });

        });
    });

    describe("save", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

    describe("findOne", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

    describe("update", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

    describe("findById", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

    describe("remove", function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });

});
