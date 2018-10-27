'use strict';

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var cassie = require('../../lib/cassie');
var Query = require('../../lib/query');
var types = require('../../lib/types');

var expect = chai.expect;
chai.use(sinonChai);

describe('Unit :: Query', function() {
  describe('toString', function () {
    describe('when pretty', function () {
      it('should return the query as a formated string', function () {
        var query = new Query('select * from my_table');
        expect(query.toString(true))
          .to.equal('-----\nCQL Query: \x1B[0;34m select * from my_table \x1B[0m');
      });

      it('should return the query as a formated string with parameters', function () {
        var query = new Query('select * from my_table where id = ?', [42]);
        expect(query.toString(true))
          .to.equal('-----\nCQL Query: \x1B[0;34m select * from my_table where id = ? \x1B[0m\nCQL Parameters: \x1B[0;32m [42] \x1B[0m');
      });
    });

    describe('when not pretty', function () {
      it('should return the query as a string', function () {
        var query = new Query('select * from my_table');
        expect(query.toString())
          .to.equal('CQL Query: select * from my_table');
      });

      it('should return the query as a string with parameters', function () {
        var query = new Query('select * from my_table where id = ?', [42]);
        expect(query.toString())
          .to.equal('CQL Query: select * from my_table where id = ?\nCQL Parameters: [42]');
      });
    });
  });

  describe('Limit', function () {
    it('should return self if no query string', function () {
      var query = new Query();
      expect(query.limit(5)).to.have.property('queryString')
          .which.is.undefined;
    });

    it('should throw if limit is not a number', function () {
      var query = new Query('select * from my_table');
      expect(function () {
        query.limit('5')
      }).to.throw(/must be a number/);
    });

    describe('when query string already has a limit', function () {
      it('should return self (upper case)', function () {
        // TODO: Should we not throw? Fail fast and all that
        var query = new Query('select * from my_table LIMIT 10');
        expect(query.limit(5)).to.have.property('queryString')
          .which.equals('select * from my_table LIMIT 10');
      });

      // BUG: we're not checking for lower case ///////////////////////////////
      it.skip('should return self (lower case)', function () {
        // TODO: Should we not throw? Fail fast and all that
        var query = new Query('select * from my_table limit 10');
        expect(query.limit(5)).to.have.property('queryString')
          .which.equals('select * from my_table limit 10 ');
      });
      it('will append multiple limits if lower case (bug)', function () {
        var query = new Query('select * from my_table limit 10');
        expect(query.limit(5)).to.have.property('queryString')
          .which.equals('select * from my_table limit 10 LIMIT 5 ');
      });
      /////////////////////////////////////////////////////////////////////////
    });

    describe('when ALLOW FILTERING is in query string', function () {
      it('should insert limit before allow filtering (upper case)', function () {
        var query = new Query('select * from my_table ALLOW FILTERING');
        expect(query.limit(5)).to.have.property('queryString')
          .which.equals('select * from my_table  LIMIT 5 ALLOW FILTERING');
      });

      // BUG: we're not checking for lower case ///////////////////////////////
      it.skip('should insert limit before allow filtering (lower case)', function () {
        var query = new Query('select * from my_table allow filtering');
        expect(query.limit(5)).to.have.property('queryString')
          .which.equals('select * from my_table LIMIT 5 ALLOW FILTERING');
      });
      it('will append limit _after_ allow filtering (bug)', function () {
        var query = new Query('select * from my_table allow filtering');
        expect(query.limit(5)).to.have.property('queryString')
          .which.equals('select * from my_table allow filtering LIMIT 5 ');
      });
      /////////////////////////////////////////////////////////////////////////
    });
  });

  describe('Sort', function () {
    it('should return self if no query string', function () {
      var query = new Query();
      expect(query.sort({})).to.have.property('queryString')
          .which.is.undefined;
    });

    it('should throw if sort param is not an object', function () {
      var query = new Query('select * from my_table');
      expect(function () {
        query.sort('5')
      }).to.throw(/must be an object/);
    });

    it('should throw if sort param is not valid', function () {
      var query = new Query('select * from my_table');
      expect(function () {
        query.sort({ name: 100 })
      }).to.throw(/can only be ASCENDING \(1\) or DESCENDING \(-1\)/);
    });

    it('should append order by', function () {
      var query = new Query('select * from my_table');
      expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table ORDER BY name ASC age DESC ');
    });

    describe('when query string has a limit', function () {
      it('should append ORDER BY before LIMIT (upper case)', function () {
        var query = new Query('select * from my_table LIMIT 10');
        expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table  ORDER BY name ASC age DESC  LIMIT 10');
      });

      // BUG: we're not checking for lower case ///////////////////////////////
      it.skip('should append ORDER BY before LIMIT (lower case)', function () {
        var query = new Query('select * from my_table limit 10');
        expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table ORDER BY name ASC age DESC LIMIT 10');
      });
      it('will append ORDER BY _after_ LIMIT if limit is lower case (bug)', function () {
        var query = new Query('select * from my_table limit 10');
        expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table limit 10 ORDER BY name ASC age DESC ');
      });
      /////////////////////////////////////////////////////////////////////////
    });

    describe('when ALLOW FILTERING is in query string', function () {
      it('should insert ORDER BY before allow filtering (upper case)', function () {
        var query = new Query('select * from my_table ALLOW FILTERING');
        expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table  ORDER BY name ASC age DESC ALLOW FILTERING');
      });

      // BUG: we're not checking for lower case ///////////////////////////////
      it.skip('should insert ORDER BY before allow filtering (lower case)', function () {
        var query = new Query('select * from my_table allow filtering');
        expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table ORDER BY name ASC age DESC ALLOW FILTERING');
      });
      it('will append ORDER BY _after_ allow filtering (bug)', function () {
        var query = new Query('select * from my_table allow filtering');
        expect(query.sort({ name: 1, age: -1 })).to.have.property('queryString')
          .which.equals('select * from my_table allow filtering ORDER BY name ASC age DESC ');
      });
      /////////////////////////////////////////////////////////////////////////
    });
  });

  describe('Page', function () {
    it('should return self if no query string', function () {
      var query = new Query();
      expect(query.page({})).to.have.property('queryString')
          .which.is.undefined;
    });

    it('should throw if parameter is not an object', function () {
      var query = new Query('select * from my_table');
      expect(function () {
        query.page('invalid')
      }).to.throw(/must be an object/);
    });

    it('should return self if query string has LIMIT', function () {
      // TODO: Should we not throw?
      var query = new Query('select * from my_table LIMIT 10');
      expect(query.page({})).to.have.property('queryString')
          .which.equals('select * from my_table LIMIT 10');
    });

    it.skip('should return self if query string has limit', function () {
      // TODO: Should we not throw?
      // BUG: We're not checking lower case
      var query = new Query('select * from my_table limit 10');
      expect(query.page({})).to.have.property('queryString')
        .which.equals('select * from my_table limit 10');
    });

    it('should return self if query string has ORDER BY', function () {
      // TODO: Should we not throw?
      var query = new Query('select * from my_table ORDER BY name');
      expect(query.page({})).to.have.property('queryString')
        .which.equals('select * from my_table ORDER BY name');
    });

    it.skip('should return self if query string has order by', function () {
      // TODO: Should we not throw?
      // BUG: We're not checking lower case
      var query = new Query('select * from my_table order by name');
      expect(query.page({})).to.have.property('queryString')
        .which.equals('select * from my_table order by name');
    });

    it('should append WHERE clause', function () {
      var query = new Query('select * from my_table');
      query.page({ age: 35 });
      expect(query).to.have.property('queryString')
        .which.equals('select * from my_table WHERE age >= ? LIMIT ?');
      expect(query).to.have.property('params')
        .which.deep.equals([ 35, 25 ]);
    });

    it('should append WHERE clause with non-default LIMIT', function () {
      var query = new Query('select * from my_table');
      query.page({ age: { page: 35, count: 10 } });
      expect(query).to.have.property('queryString')
        .which.equals('select * from my_table WHERE age >= ? LIMIT ?');
      expect(query).to.have.property('params')
        .which.deep.equals([ 35, 10 ]);
    });

    describe('when WHERE is already in query string', function () {
      it('should append AND to existing WHERE clause', function () {
        var query = new Query('select * from my_table WHERE last_name = "smith"');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table WHERE last_name = "smith" AND age >= ? LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });

      it.skip('should append AND to existing where clause', function () {
        var query = new Query('select * from my_table where last_name = "smith"');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table where last_name = "smith" AND age >= ? LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });
      it('will append a second WHERE (bug)', function () {
        var query = new Query('select * from my_table where last_name = "smith"');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table where last_name = "smith" WHERE age >= ? LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });
    });

    describe('when ALLOW FILTERING is in query string', function () {
      it('should append WHERE clause _before_ ALLOW FILTERING', function () {
        var query = new Query('select * from my_table ALLOW FILTERING');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table  WHERE age >= ? LIMIT ? ALLOW FILTERING');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });

      it.skip('should append WHERE clause _before_ allow filtering', function () {
        var query = new Query('select * from my_table allow filtering');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table  WHERE age >= ? LIMIT ? allow filtering');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });

      it('will append WHERE clause _after_ allow filtering (bug)', function () {
        var query = new Query('select * from my_table allow filtering');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table allow filtering WHERE age >= ? LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });
    });

    describe('when page is partition key', function () {
      before(function() {
        var model = sinon.stub(cassie, 'model');
        model.withArgs('my_model')
          .returns({
          _primary: 'age'
        });
        model.withArgs('my_compound_model')
          .returns({
          _primary: ['age', 'name']
        });
        model.withArgs('my_composite_model')
          .returns({
          _primary: [['age', 'name'], 'location']
        });
      });
      after(function () {
        cassie.model.restore();
      });

      it('should append WHERE clause without token if model not found', function () {
        var query = new Query('select * from my_table', null, null, null, 'not_my_model');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table WHERE age >= ? LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });

      it('should append WHERE clause using token', function () {
        var query = new Query('select * from my_table', null, null, null, 'my_model');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table WHERE token(age) >= token(?) LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });

      it('should append WHERE clause using token if partition key is compound', function () {
        var query = new Query('select * from my_table', null, null, null, 'my_compound_model');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table WHERE token(age) >= token(?) LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });

      it('should append WHERE clause using token if partition key is composite', function () {
        var query = new Query('select * from my_table', null, null, null, 'my_composite_model');
        query.page({ age: 35 });
        expect(query).to.have.property('queryString')
          .which.equals('select * from my_table WHERE token(age) >= token(?) LIMIT ?');
        expect(query).to.have.property('params')
          .which.deep.equals([ 35, 25 ]);
      });
    });
  });

  describe('Exec', function () {
    it('should return error if no query string', function () {
      var query = new Query('');
      var cb = sinon.stub();

      query.exec(null, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith('Query is null. This is typically due to a validation error.', null);
    });

    it('should call execute with default consistency', function () {
      var cb = sinon.stub();
      var connection = {
        execute: sinon.stub()
      };
      var query = new Query('select * from my_table where age > ?', [25], connection);


      query.exec({}, cb);
      expect(connection.execute).to.have.been.calledOnce;
      expect(connection.execute).to.have.been.calledWith('select * from my_table where age > ?', [25], types.consistencies.quorum);
    });

    it('should call execute with Query consistency', function () {
      // TODO: We only do this if we forget to pass in an options into the stream function
      // should we not be doing the same here as we do above and default to the default
      // consistency vs. what was passed into the Query constructor or should we update the
      // above test to do this?

      var cb = sinon.stub();
      var connection = {
        execute: sinon.stub()
      };
      var options = { consistency: types.consistencies.localOne };
      var query = new Query('select * from my_table where age > ?', [25], connection, options);

      query.exec(cb);

      expect(connection.execute).to.have.been.calledOnce;
      expect(connection.execute).to.have.been.calledWith('select * from my_table where age > ?',
        [25], types.consistencies.localOne);
    });

    it('should call execute with given consistency', function () {
      var cb = sinon.stub();
      var connection = {
        execute: sinon.stub()
      };
      var options = { consistency: types.consistencies.localOne };
      var query = new Query('select * from my_table where age > ?', [25], connection, options);

      query.exec(options, cb);
      expect(connection.execute).to.have.been.calledOnce;
      expect(connection.execute).to.have.been.calledWith('select * from my_table where age > ?', [25], types.consistencies.localOne);
    });

    describe('Callback', function () {
      before(function() {
        var stub = sinon.stub(cassie, 'model');
        stub.withArgs('my_model')
          .returns(function(model) {
            return model;
          });
      });
      after(function () {
        cassie.model.restore();
      });

      var options = { consistency: types.consistencies.localOne };
      var results = {
        rows: [
          { columns: ['a', 'b', 'c'], fu: 'bar' },
          { columns: ['a', 'b', 'c'], hello: 'world' }
        ]
      };

      it('should call callback with raw results if no model', function () {
        var cb = sinon.stub();
        var connection = {
          execute: sinon.stub().yields(null, results, 'metadata')
        };
        var query = new Query('select * from my_table where age > ?', [25], connection, options);

        query.exec(options, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb).to.have.been.calledWith(null, {
          rows: [
            { columns: ['a', 'b', 'c'], fu: 'bar' },
            { columns: ['a', 'b', 'c'], hello: 'world' }
          ]
        }, 'metadata');
      });

      it('should call callback with parsed results if model found', function () {
        var cb = sinon.stub();
        var connection = {
          execute: sinon.stub().yields(null, results, 'metadata')
        };
        var query = new Query('select * from my_table where age > ?', [25], connection, options, 'my_model');

        query.exec(options, cb);
        expect(cb).to.have.been.calledOnce;
        expect(cb.lastCall.args[1]).to.deep.equals([
          { fu: 'bar' },
          { hello: 'world' }
        ]);
      });
    });

    describe('Prepared', function () {
      var cb = sinon.stub();

      it('should call executePrepared with default consistency', function () {
        var connection = {
          executePrepared: sinon.stub()
        };
        var options = { prepare: true };
        var query = new Query('select * from my_table where age > ?', [25], connection);

        query.exec(options, cb);
        expect(connection.executePrepared).to.have.been.calledOnce;
        expect(connection.executePrepared).to.have.been.calledWith('select * from my_table where age > ?', [25], types.consistencies.quorum);
      });

      it('should call executePrepared with Query consistency', function () {
        // TODO: We only do this if we forget to pass in an options into the stream function
        // should we not be doing the same here as we do above and default to the default
        // consistency vs. what was passed into the Query constructor or should we update the
        // above test to do this?

        var cb = sinon.stub();
        var connection = {
          executePrepared: sinon.stub()
        };
        var options = { prepare: true, consistency: types.consistencies.localOne };
        var query = new Query('select * from my_table where age > ?', [25], connection, options);

        query.exec(cb);

        expect(connection.executePrepared).to.have.been.calledOnce;
        expect(connection.executePrepared).to.have.been.calledWith('select * from my_table where age > ?',
          [25], types.consistencies.localOne);
      });

      it('should call executePrepared with given consistency', function () {
        var cb = sinon.stub();
        var connection = {
          executePrepared: sinon.stub()
        };
        var options = { prepare: true, consistency: types.consistencies.localOne };
        var query = new Query('select * from my_table where age > ?', [25], connection, options);

        query.exec(options, cb);
        expect(connection.executePrepared).to.have.been.calledOnce;
        expect(connection.executePrepared).to.have.been.calledWith('select * from my_table where age > ?', [25], types.consistencies.localOne);
      });

      it('should call executePrepared when prepared', function () {
        var cb = sinon.stub();
        var connection = {
          executePrepared: sinon.stub()
        };
        var options = { prepared: true, consistency: types.consistencies.localOne };
        var query = new Query('select * from my_table where age > ?', [25], connection, options);

        query.exec(options, cb);
        expect(connection.executePrepared).to.have.been.calledOnce;
        expect(connection.executePrepared).to.have.been.calledWith('select * from my_table where age > ?', [25], types.consistencies.localOne);
      });

      describe('Callback', function () {
        before(function() {
          var stub = sinon.stub(cassie, 'model');
          stub.withArgs('my_model')
            .returns(function(model) {
              return model;
            });
        });
        after(function () {
          cassie.model.restore();
        });
        beforeEach(function () {
          cb.reset();
        })

        var options = { prepared: true, consistency: types.consistencies.localOne };
        var results = {
          rows: [
            { columns: ['a', 'b', 'c'], fu: 'bar' },
            { columns: ['a', 'b', 'c'], hello: 'world' }
          ]
        };

        it('should call callback with raw results if no model', function () {
          var connection = {
            executePrepared: sinon.stub().yields(null, results, 'metadata')
          };
          var query = new Query('select * from my_table where age > ?', [25], connection, options);

          query.exec(options, cb);
          expect(cb).to.have.been.calledOnce;
          expect(cb).to.have.been.calledWith(null, {
            rows: [
              { columns: ['a', 'b', 'c'], fu: 'bar' },
              { columns: ['a', 'b', 'c'], hello: 'world' }
            ]
          }, 'metadata');
        });

        it('should call callback with parsed results if model found', function () {
          var connection = {
            executePrepared: sinon.stub().yields(null, results, 'metadata')
          };
          var query = new Query('select * from my_table where age > ?', [25], connection, options, 'my_model');

          query.exec(options, cb);
          expect(cb).to.have.been.calledOnce;
          expect(cb.lastCall.args[1]).to.deep.equals([
            { fu: 'bar' },
            { hello: 'world' }
          ]);
        });
      });
    });

    describe('Timings', function () {
      var cb = sinon.stub();
      var connection = {
        execute: sinon.stub().yields()
      };

      it('should log query timings if set in options', function () {
        var logger = {
          info: sinon.stub()
        };
        var options = { logger: logger, timing: true };

        var query = new Query('select * from my_table where age > ?', [25], connection, options);
        query.exec(options, cb);

        expect(logger.info).to.have.been.calledOnce;
        expect(logger.info).to.have.been.calledWith(sinon.match(/CQL Timing: [0-9]+/));
      });

      it('should log query timings with pretty format if set in options', function () {
        var logger = {
          info: sinon.stub()
        };
        var options = { logger: logger, timing: true, prettyDebug: true };

        var query = new Query('select * from my_table where age > ?', [25], connection, options);
        query.exec(options, cb);

        expect(logger.info).to.have.been.calledOnce;
        expect(logger.info).to.have.been.calledWith(sinon.match(/CQL Timing: \x1B[0;32m [0-9]+/));
      });
    });
  });

  describe('Stream', function () {
    it('should return error if no query string', function () {
      var query = new Query('');
      var cb = sinon.stub();

      query.stream(null, cb);
      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith('Query is null. This is typically due to a validation error.', null);
    });

    it('should call stream with default consistency', function () {
      var cb = sinon.stub();
      var connection = {
        stream: sinon.stub()
      };
      var options = { consistency: types.consistencies.localOne };
      var query = new Query('select * from my_table where age > ?', [25], connection, options);

      query.stream(null, cb);

      expect(connection.stream).to.have.been.calledOnce;
      expect(connection.stream).to.have.been.calledWith('select * from my_table where age > ?',
        [25], types.consistencies.quorum, cb);
    });

    it('should call stream with Query consistency', function () {
      // TODO: We only do this if we forget to pass in an options into the stream function
      // should we not be doing the same here as we do above and default to the default
      // consistency vs. what was passed into the Query constructor or should we update the
      // above test to do this?

      var cb = sinon.stub();
      var connection = {
        stream: sinon.stub()
      };
      var options = { consistency: types.consistencies.localOne };
      var query = new Query('select * from my_table where age > ?', [25], connection, options);

      query.stream(cb);

      expect(connection.stream).to.have.been.calledOnce;
      expect(connection.stream).to.have.been.calledWith('select * from my_table where age > ?',
        [25], types.consistencies.localOne, cb);
    });

    it('should call stream with given consistency', function () {
      var cb = sinon.stub();
      var connection = {
        stream: sinon.stub()
      };
      var options = { consistency: types.consistencies.localOne };
      var query = new Query('select * from my_table where age > ?', [25], connection, options);

      query.stream({ consistency: types.consistencies.all }, cb);

      expect(connection.stream).to.have.been.calledOnce;
      expect(connection.stream).to.have.been.calledWith('select * from my_table where age > ?',
        [25], types.consistencies.all, cb);
    });
  });

  describe('Batch', function () {
    it('should call executeBatch with default options', function () {
      var cb = sinon.stub();
      var queries = [
        { queryString: 'select * from my_table', params: [] },
        { queryString: 'select * from my_table WHERE age > ?', params: [25] }
      ];
      var connection = {
        executeBatch: sinon.stub().yields()
      };

      Query.batch(queries, connection, cb);

      expect(connection.executeBatch).to.have.been.calledOnce;
      expect(connection.executeBatch).to.have.been.calledWith([
        { query: 'select * from my_table', params: [] },
        { query: 'select * from my_table WHERE age > ?', params: [25] }
      ], types.consistencies.quorum, { counter: false });
      expect(cb).to.have.been.calledOnce;
    });

    it('should call executeBatch with given options', function () {
      var cb = sinon.stub();
      var queries = [
        { queryString: 'select * from my_table', params: [] },
        { queryString: 'select * from my_table WHERE age > ?', params: [25] }
      ];
      var connection = {
        executeBatch: sinon.stub().yields()
      };
      var options = {
        consistency: types.consistencies.localOne,
        counter: true
      };

      Query.batch(queries, connection, options, cb);

      expect(connection.executeBatch).to.have.been.calledOnce;
      expect(connection.executeBatch).to.have.been.calledWith([
        { query: 'select * from my_table', params: [] },
        { query: 'select * from my_table WHERE age > ?', params: [25] }
      ], types.consistencies.localOne, { counter: true });
      expect(cb).to.have.been.calledOnce;
    });

    it('should pass error along to callback', function () {
      var cb = sinon.stub();
      var queries = [
        { queryString: 'select * from my_table', params: [] },
        { queryString: 'select * from my_table WHERE age > ?', params: [25] }
      ];
      var err = new Error('boom');
      var connection = {
        executeBatch: sinon.stub().yields(err)
      };
      var options = {
        consistency: types.consistencies.localOne,
        counter: true
      };

      Query.batch(queries, connection, options, cb);

      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(err)
    });

    describe('Timings', function () {
      var cb = sinon.stub();
      var queries = [
        { queryString: 'select * from my_table', params: [] },
        { queryString: 'select * from my_table WHERE age > ?', params: [25] }
      ];
      var connection = {
        executeBatch: sinon.stub().yields()
      };

      it('should log query timings if set in options', function () {
        var logger = {
          info: sinon.stub()
        };
        var options = { logger: logger, timing: true };

        Query.batch(queries, connection, options, cb);

        expect(logger.info).to.have.been.calledOnce;
        expect(logger.info).to.have.been.calledWith(sinon.match(/CQL Timing: [0-9]+/));
      });

      it('should log query timings with pretty format if set in options', function () {
        var logger = {
          info: sinon.stub()
        };
        var options = { logger: logger, timing: true, prettyDebug: true };

        Query.batch(queries, connection, options, cb);

        expect(logger.info).to.have.been.calledOnce;
        expect(logger.info).to.have.been.calledWith(sinon.match(/CQL Timing: \x1B[0;32m [0-9]+/));
      });
    });

    describe('Debug', function () {
      var cb = sinon.stub();
      var queries = [
        { queryString: 'select * from my_table', params: [] },
        { queryString: 'select * from my_table WHERE age > ?', params: [25] }
      ];
      var connection = {
        executeBatch: sinon.stub().yields()
      };

      it('should log query start/complete if set in options', function () {
        var logger = {
          info: sinon.stub()
        };
        var options = { logger: logger, debug: true };

        Query.batch(queries, connection, options, cb);

        expect(logger.info).to.have.been.calledThrice;
        expect(logger.info).to.have.been.calledWith("CQL Batch Queries: ");
        expect(logger.info).to.have.been.calledWith('[{"query":"select * from my_table","params":[]},{"query":"select * from my_table WHERE age > ?","params":[25]}]');
        expect(logger.info).to.have.been.calledWith("CQL Batch Queries complete");
      });

      it('should log query start/complete with pretty format if set in options', function () {
        var logger = {
          info: sinon.stub()
        };
        var options = { logger: logger, debug: true, prettyDebug: true };

        Query.batch(queries, connection, options, cb);

        expect(logger.info).to.have.been.calledThrice;
        expect(logger.info).to.have.been.calledWith("-----\nCQL Batch Queries: ");
        expect(logger.info).to.have.been.calledWith("CQL Batch:\x1B[0;36m Queries complete\x1B[0m");
      });
    });
  });
});
