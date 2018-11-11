'use strict';

var assert = require('assert');

var config = require('../cassieconnect').connectOptions;
var cassie = require('../../lib/cassie');

var options = { debug: true, prettyDebug: true };

describe('Types', function() {
  describe('String', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ name: cassie.types.String });
      Type = cassie.model('StringType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ name: 'Hello' });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal('Hello', results[0].name);

        done();
      });
    });
  });

  describe('Number', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ value: cassie.types.Number });
      Type = cassie.model('NumberType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ value: 42 });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal(42, results[0].value);

        done();
      });
    });
  });

  describe('Boolean', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ value: cassie.types.Boolean });
      Type = cassie.model('BooleanType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ value: true });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal(true, results[0].value);

        done();
      });
    });
  });

  describe('Date', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ time: cassie.types.Date });
      Type = cassie.model('DateType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ time: new Date() });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert(results[0].time instanceof Date, 'Date field did not equal expected value:' + results[0].time);

        done();
      });
    });
  });

  describe('Long', function () {
    var Type;
    var model = {
      mykey: cassie.types.Long.fromString('39437654321'),
      largeint: cassie.types.Long.fromString('12345673493')
    };

    before(function (done) {
      var TypeSchema = new cassie.Schema({ mykey: cassie.types.Long, largeint: { type: cassie.types.Long, index: true } }, { primary: 'mykey' });
      Type = cassie.model('LongType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      var t1 = new Type(model);
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type by the Long Key', function (done) {
      Type.find({mykey: model.mykey }, options, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal(model.mykey.toString(), results[0].mykey.toString());
        assert.equal(model.largeint.toString(), results[0].largeint.toString());

        done();
      });
    });

    it('should retrieve the type by the Long Index', function (done) {
      Type.find({largeint: model.largeint}, options, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal(model.mykey.toString(), results[0].mykey.toString());
        assert.equal(model.largeint.toString(), results[0].largeint.toString());

        done();
      });
    });
  });

  describe('Int', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ int: cassie.types.Int });
      Type = cassie.model('IntType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ int: 42 });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal(42, results[0].int);

        done();
      });
    });
  });

  describe('Double', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ dbl: cassie.types.Double });
      Type = cassie.model('DoubleType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ dbl: 5324.53 });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal(5324.53, results[0].dbl);

        done();
      });
    });
  });

  describe('Buffer', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ buff: cassie.types.Buffer });
      Type = cassie.model('BufferType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({ buff: new Buffer('dadfdjkva') });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);
        assert.equal('dadfdjkva', results[0].buff.toString());

        done();
      });
    });
  });

  describe('Map', function () {
    var Type;
    var t1;

    before(function (done) {
      var TypeSchema = new cassie.Schema({ specialmap: { type: { String: cassie.types.String } } });
      Type = cassie.model('MapType', TypeSchema);

      cassie.syncTables(config, options, function (err) {
        done(err);
      });
    });

    it('should save the type', function (done) {
      t1 = new Type({
        specialmap: {
          test: 'blah' ,
          fu: 'bar'
        }
      });
      t1.save(options, function(err) {
        done(err);
      });
    });

    it('should retrieve the type', function (done) {
      Type.find({id: t1.id}, function(err, results) {
        if (err) return done(err);

        assert.equal(1, results.length);

        var expected = {
          test: 'blah',
          fu: 'bar'
        };
        assert.deepEqual(expected, results[0].specialmap);

        done();
      });
    });
  });

    //Need to test timestamps, Object (Mixed), UUIDs, Counter, Array
});
