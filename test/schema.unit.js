'use strict';

var assert = require('assert');

var types = require('../lib/types');
var Schema = require('../lib/schema');

describe('Unit :: Schema', function() {
  describe('Sync', function() {
    it('should default sync to true when no options', function() {
      var model = {};
      var schema = new Schema(model);
      assert.equal(true, schema._sync);
    });

    it('should default sync to true when null', function() {
      var model = {};
      var schema = new Schema(model, { sync: null });
      assert.equal(true, schema._sync);
    });

    it('should default sync to true when undefined', function() {
      var model = {};
      var schema = new Schema(model, { });
      assert.equal(true, schema._sync);
    });
  });

  describe('Primary key', function() {
    it('should set the primary key to field when defined in field', function() {
      var model = {
        dog_id: { type: Number, primary: true }
      };
      var schema = new Schema(model);
      assert.equal('dog_id', schema._primary);
      assert.deepEqual(['dog_id'], schema._flatPrimaryList);
    });

    it('will over ride the primary key if also set in options as string', function() {
      // Should it be doing this?
      var model = {
        dog_id: { type: Number, primary: true }
      };
      var options = {
        primary: 'cat_id'
      };
      var schema = new Schema(model, options);
      assert.equal('cat_id', schema._primary);
      assert.deepEqual(['cat_id'], schema._flatPrimaryList);
    });

    it('should set the primary key when defined in options as array', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {
        primary: ['cat_id']
      };
      var schema = new Schema(model, options);
      assert.equal('cat_id', schema._primary);

      // Should this not be 'cat_id'? I think this a bug based on how _flatPrimaryList is used
      assert.deepEqual([0], schema._flatPrimaryList);
    });

    it('should throw if primary key is set in both field and options as array', function() {
      var model = {
        dog_id: { type: Number, primary: true }
      };
      var options = {
        primary: ['cat_id']
      };

      assert.throws(function() {
        var schema = new Schema(model, options);
      }, /Cannot specify multiple primary keys/);
    });

    it('should set the composite key', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {
        primary: ['dog_id', 'cat_id']
      };
      var schema = new Schema(model, options);
      assert.deepEqual(['dog_id', 'cat_id'], schema._primary);

      // Should this not be ['dog_id', 'cat_id']? I think this a bug based on how _flatPrimaryList is used
      assert.deepEqual([0, 1], schema._flatPrimaryList);
    });

    it('should set the composite and partition keys', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {
        primary: [['dog_id', 'cat_id'], 'fish_id']
      };
      var schema = new Schema(model, options);
      assert.deepEqual([['dog_id', 'cat_id'], 'fish_id'], schema._primary);

      // Should this not be ['dog_id', 'cat_id', 'fish_id']? I think this a bug based on how _flatPrimaryList is used
      assert.deepEqual([0, 1], schema._flatPrimaryList);
    });

    it('should set the primary key to id if none provided', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {};
      var schema = new Schema(model, options);
      assert.equal('id', schema._primary);
      assert.deepEqual(['id'], schema._flatPrimaryList);
    });

    it('should create id field if no primary key is provided', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {};
      var schema = new Schema(model, options);
      assert.deepEqual({
        type: types.datatypes.uuid,
        primary: true,
      }, schema._fields['id']);
    });

    it('should throw if id field exists and no primary key is provided', function() {
      var model = {
        id: { type: Number }
      };
      var options = {};
      assert.throws(function() {
        var schema = new Schema(model, options);
      }, /must specify a primary key/)
    });
  });

  describe('Fields', function () {
    it('should set fields to the model fields', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);
      assert.deepEqual(model, schema._fields);
    });

    it('should add a validator for each field', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);
      assert.deepEqual({
        dog_id: [],
        breed: []
      }, schema.validators);
    });
  });
});
