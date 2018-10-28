'use strict';

var chai = require('chai');
var Long = require('long');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var model = require('../../lib/model');
var Schema = require('../../lib/schema');
var Query = require('../../lib/query');

var expect = chai.expect;
chai.use(sinonChai);

var createSchema = function () {
  var schema = {
    age: { type: Number },
    breed: String,
    colour: [String],
    weightHistory: { type: { Number: String }},
  };
  return new Schema(schema);
};

describe('Unit :: Model', function () {
  it('should throw if not connected', function () {
    var schema = createSchema();
    var connection = null;
    expect(function () {
      model.create('myModel', schema, connection);
    }).to.throw(/must make a connection/);
  });

  it('should set the model name', function () {
    var schema = createSchema();
    var connection = { not: 'null' };

    var m = model.create('dog', schema, connection, {});
    expect(m).to.have.property('_modelName')
      .which.equals('dog');
  });

  it('should set the table name', function () {
    var schema = createSchema();
    var connection = { not: 'null' };

    var m = model.create('dog', schema, connection, {});
    expect(m).to.have.property('_tableName')
      .which.equals('dog');
  });

  it('should pluralize the table name', function () {
    var schema = createSchema();
    var connection = { not: 'null' };

    var m = model.create('dog', schema, connection, { pluralize: true });
    expect(m).to.have.property('_tableName')
      .which.equals('dogs');
  });

  it('should lower case the table name', function () {
    var schema = createSchema();
    var connection = { not: 'null' };

    var m = model.create('Dog', schema, connection, { lowercase: true });
    expect(m).to.have.property('_tableName')
      .which.equals('dog');
  });

  describe('Static :: ', function () {
    describe('Find', function () {
      var Model;
      before(function () {
        var schema = createSchema();
        var connection = { not: 'null' };

        Model = model.create('Dog', schema, connection, { lowercase: true });
      });

      it('should return Query object if no callback', function () {
        var args = {};

        expect(Model.find(args)).to.be.an.instanceof(Query);
      });

      it('should generate a simple select statement', function () {
        var args = {};
        var query = Model.find(args);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog ');
      });

      it('should throw if options isn\'t a string or object', function () {
        var args = {};
        var options = 42;
        expect(function() {
          Model.find(args, options);
        }).to.throw(/must be string.+or object/)
      });

      describe('when fields passed in as string', function () {
        it('should limit select to give fields when passed in white space delimited list of fields', function () {
          var args = {};
          var query = Model.find(args, 'name breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog ');
        });

        it('should limit select to give fields when passed in CSV list of fields', function () {
          var args = {};
          var query = Model.find(args, 'name,breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog ');
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit select to give fields when passed in CSV list of fields which include spaces', function () {
          var args = {};
          var query = Model.find(args, 'name, breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog ');
        });
      });

      describe('when fields passed in as object', function () {
        it('should limit select to give fields when passed in white space delimited list of fields', function () {
          var args = {};
          var options = {
            fields: 'name breed'
          };
          var query = Model.find(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog ');
        });

        it('should limit select to give fields when passed in CSV list of fields', function () {
          var args = {};
          var options = {
            fields: 'name,breed'
          };
          var query = Model.find(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog ');
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit select to give fields when passed in CSV list of fields which include spaces', function () {
          var args = {};
          var options = {
            fields: 'name, breed'
          };
          var query = Model.find(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog ');
        });
      });

      describe('Where Clause', function () {
        it('should throw if args isn\'t an object', function () {
          var args = 42;
          expect(function() {
            Model.find(args);
          }).to.throw(/must be a javascript object/)
        });

        it('should generate a WHERE clause for String value', function () {
          var args = {
            name: 'fido'
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  name =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'fido' ]);
        });

        it('should generate a WHERE clause for Number value', function () {
          var args = {
            age: 3
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  age =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 3 ]);
        });

        it('should generate a WHERE clause for Boolean value (true)', function () {
          var args = {
            likes_cats: true
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  likes_cats =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'true' ]);
        });

        it('should generate a WHERE clause for Boolean value (false)', function () {
          var args = {
            likes_cats: false
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  likes_cats =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'false' ]);
        });

        it('should generate a WHERE clause for Date value', function () {
          var args = {
            dob: new Date()
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  dob =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ args.dob ]);
        });

        it('should generate a WHERE clause for Long value', function () {
          var args = {
            value: new Long.fromString('9223372036854775807')
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  value =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ args.value ]);
        });

        describe('Array', function () {
          it('should generate a WHERE/IN clause for String values', function () {
            var args = {
              colour: ['black', 'brown']
            };
            var query = Model.find(args);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('SELECT * FROM dog WHERE  colour IN (?,?) ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 'black', 'brown' ]);
          });

          it('should generate a WHERE/IN clause for Number values', function () {
            var args = {
              age: [3, 4, 5]
            };
            var query = Model.find(args);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('SELECT * FROM dog WHERE  age IN (?,?,?) ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 3, 4, 5 ]);
          });

          it('should throw if array does not hold Stings or Numbers', function () {
            var args = {
              age: [true, 3]
            };

            expect(function () {
              Model.find(args);
            }).to.throw(/must be a string or number/);
          });
        });

        describe('Object', function () {
          describe('Greater Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gt: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age > ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gt: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) > token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Greater Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age >= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gte: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) >= token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Less Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lt: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age < ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lt: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) < token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Less Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lte: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age <= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lte: 4 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) <= token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('IN', function () {
            it('should generate a WHERE/IN clause for String values', function () {
              var args = {
                colour: { $in: ['black', 'brown'] }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  colour IN (?,?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'black', 'brown' ]);
            });

            it('should generate a WHERE/IN clause for Number values', function () {
              var args = {
                age: { $in: [3, 4, 5] }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age IN (?,?,?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 3, 4, 5 ]);
            });

            it('should throw if array does not hold Stings or Numbers', function () {
              var args = {
                age: { $in: [true, 3] }
              };

              expect(function () {
                Model.find(args);
              }).to.throw(/must be a string or number/);
            });
          });

          describe('Multi operators', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4, $lte: 10 }
              };
              var query = Model.find(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age >= ?  AND  age <= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4, 10 ]);
            });
          })
        });

        it('should generate a WHERE clause for multiple values', function () {
          var args = {
            name: 'fido',
            age: 3
          };
          var query = Model.find(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  name =?  AND  age =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'fido', 3 ]);
        });
      });

      describe('Sorting', function () {
        it('should throw if not an object', function () {
          var args = {};
          var options = {
            sort: 42
          };
          expect(function() {
            Model.find(args, options);
          }).to.throw(/must be an object/);
        });

        it('should throw if not a valid sort value (must be 1 or -1)', function () {
          var args = {};
          var options = {
            sort: {
              age: 42
            }
          };
          expect(function() {
            Model.find(args, options);
          }).to.throw(/ASCENDING \(1\) or DESCENDING \(-1\)/);
        });

        it('should generate a ASC ORDER BY clause', function () {
          var args = {};
          var options = {
            sort: {
              age: 1
            }
          };
          var query = Model.find(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog  ORDER BY  age ASC ');
        });

        it('should generate a DESC ORDER BY clause', function () {
          var args = {};
          var options = {
            sort: {
              age: -1
            }
          };
          var query = Model.find(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog  ORDER BY  age DESC ');
        });

        it('should generate a multi field ORDER BY clause', function () {
          var args = {};
          var options = {
            sort: {
              age: -1,
              breed: 1
            }
          };
          var query = Model.find(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog  ORDER BY  age DESC breed ASC ');
        });
      });

      it('should generate a LIMIT clause', function () {
        var args = {};
        var options = {
          limit: 42
        };
        var query = Model.find(args, options);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog  LIMIT 42 ');
      });

      it('should generate a ALLOW FILTERING clause', function () {
        var args = {};
        var options = {
          allow_filtering: true
        };
        var query = Model.find(args, options);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog  ALLOW FILTERING');
      });
    });

    // TODO: findById only works if the primary key is the default 'id'
    // If the schema defines a custom key which isn't 'id' this won't work
    describe('FindById', function () {
      var Model;
      before(function () {
        var schema = createSchema();
        var connection = { not: 'null' };

        Model = model.create('Dog', schema, connection, { lowercase: true });
      });

      it('should return Query object if no callback', function () {
        expect(Model.findById(42)).to.be.an.instanceof(Query);
      });

      it('should generate a simple select statement', function () {
        var query = Model.findById(42);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog WHERE  id =? ');
        expect(query, 'arguments').to.have.property('params')
          .which.deep.equals([ 42 ]);
      });

      it('should throw if ID is falsy', function () {
        expect(function() {
          Model.findById(null);
        }).to.throw(/requires id argument/);
      });

      it('should throw if options isn\'t a string or object', function () {
        var options = 42;
        expect(function() {
          Model.findById(42, options);
        }).to.throw(/must be string.+or object/)
      });

      describe('when fields passed in as string', function () {
        it('should limit select to give fields when passed in white space delimited list of fields', function () {
          var query = Model.findById(42, 'name breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        it('should limit select to give fields when passed in CSV list of fields', function () {
          var query = Model.findById(42, 'name,breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit select to give fields when passed in CSV list of fields which include spaces', function () {
          var query = Model.findById(42, 'name, breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });
      });

      describe('when fields passed in as object', function () {
        it('should limit select to give fields when passed in white space delimited list of fields', function () {
          var options = {
            fields: 'name breed'
          };
          var query = Model.findById(42, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        it('should limit select to give fields when passed in CSV list of fields', function () {
          var options = {
            fields: 'name,breed'
          };
          var query = Model.findById(42, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit select to give fields when passed in CSV list of fields which include spaces', function () {
          var options = {
            fields: 'name, breed'
          };
          var query = Model.findById(42, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });
      });

      describe('Sorting', function () {
        it('should throw if not an object', function () {
          var options = {
            sort: 42
          };
          expect(function() {
            Model.findById(42, options);
          }).to.throw(/must be an object/);
        });

        it('should throw if not a valid sort value (must be 1 or -1)', function () {
          var options = {
            sort: {
              age: 42
            }
          };
          expect(function() {
            Model.findById(42, options);
          }).to.throw(/ASCENDING \(1\) or DESCENDING \(-1\)/);
        });

        it('should generate a ASC ORDER BY clause', function () {
          var options = {
            sort: {
              age: 1
            }
          };
          var query = Model.findById(42, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  id =?  ORDER BY  age ASC ');
        });

        it('should generate a DESC ORDER BY clause', function () {
          var options = {
            sort: {
              age: -1
            }
          };
          var query = Model.findById(42, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  id =?  ORDER BY  age DESC ');
        });

        it('should generate a multi field ORDER BY clause', function () {
          var options = {
            sort: {
              age: -1,
              breed: 1
            }
          };
          var query = Model.findById(42, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  id =?  ORDER BY  age DESC breed ASC ');
        });
      });

      it('should generate a LIMIT clause', function () {
        var options = {
          limit: 42
        };
        var query = Model.findById(42, options);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog WHERE  id =?  LIMIT 42 ');
      });

      it('should generate a ALLOW FILTERING clause', function () {
        var options = {
          allow_filtering: true
        };
        var query = Model.findById(42, options);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog WHERE  id =?  ALLOW FILTERING');
      });
    });

    describe('FindOne', function () {
      var Model;
      before(function () {
        var schema = createSchema();
        var connection = { not: 'null' };

        Model = model.create('Dog', schema, connection, { lowercase: true });
      });

      it('should return Query object if no callback', function () {
        var args = {};

        expect(Model.findOne(args)).to.be.an.instanceof(Query);
      });

      it('should generate a simple select statement', function () {
        var args = {};
        var query = Model.findOne(args);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog  LIMIT 1 ');
      });

      it('should throw if options isn\'t a string or object', function () {
        var args = {};
        var options = 42;
        expect(function() {
          Model.findOne(args, options);
        }).to.throw(/must be string.+or object/)
      });

      describe('when fields passed in as string', function () {
        it('should limit select to give fields when passed in white space delimited list of fields', function () {
          var args = {};
          var query = Model.findOne(args, 'name breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog  LIMIT 1 ');
        });

        it('should limit select to give fields when passed in CSV list of fields', function () {
          var args = {};
          var query = Model.findOne(args, 'name,breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog  LIMIT 1 ');
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit select to give fields when passed in CSV list of fields which include spaces', function () {
          var args = {};
          var query = Model.findOne(args, 'name, breed');

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog  LIMIT 1 ');
        });
      });

      describe('when fields passed in as object', function () {
        it('should limit select to give fields when passed in white space delimited list of fields', function () {
          var args = {};
          var options = {
            fields: 'name breed'
          };
          var query = Model.findOne(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog  LIMIT 1 ');
        });

        it('should limit select to give fields when passed in CSV list of fields', function () {
          var args = {};
          var options = {
            fields: 'name,breed'
          };
          var query = Model.findOne(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog  LIMIT 1 ');
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit select to give fields when passed in CSV list of fields which include spaces', function () {
          var args = {};
          var options = {
            fields: 'name, breed'
          };
          var query = Model.findOne(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT name,breed FROM dog  LIMIT 1 ');
        });
      });

      describe('Where Clause', function () {
        it('should throw if args isn\'t an object', function () {
          var args = 42;
          expect(function() {
            Model.findOne(args);
          }).to.throw(/must be a javascript object/)
        });

        it('should generate a WHERE clause for String value', function () {
          var args = {
            name: 'fido'
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  name =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'fido' ]);
        });

        it('should generate a WHERE clause for Number value', function () {
          var args = {
            age: 3
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  age =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 3 ]);
        });

        it('should generate a WHERE clause for Boolean value (true)', function () {
          var args = {
            likes_cats: true
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  likes_cats =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'true' ]);
        });

        it('should generate a WHERE clause for Boolean value (false)', function () {
          var args = {
            likes_cats: false
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  likes_cats =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'false' ]);
        });

        it('should generate a WHERE clause for Date value', function () {
          var args = {
            dob: new Date()
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  dob =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ args.dob ]);
        });

        it('should generate a WHERE clause for Long value', function () {
          var args = {
            value: new Long.fromString('9223372036854775807')
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  value =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ args.value ]);
        });

        describe('Array', function () {
          it('should generate a WHERE/IN clause for String values', function () {
            var args = {
              colour: ['black', 'brown']
            };
            var query = Model.findOne(args);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('SELECT * FROM dog WHERE  colour IN (?,?)  LIMIT 1 ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 'black', 'brown' ]);
          });

          it('should generate a WHERE/IN clause for Number values', function () {
            var args = {
              age: [3, 4, 5]
            };
            var query = Model.findOne(args);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('SELECT * FROM dog WHERE  age IN (?,?,?)  LIMIT 1 ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 3, 4, 5 ]);
          });

          it('should throw if array does not hold Stings or Numbers', function () {
            var args = {
              age: [true, 3]
            };

            expect(function () {
              Model.findOne(args);
            }).to.throw(/must be a string or number/);
          });
        });

        describe('Object', function () {
          describe('Greater Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gt: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age > ?  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gt: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) > token(?)  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Greater Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age >= ?  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gte: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) >= token(?)  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Less Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lt: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age < ?  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lt: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) < token(?)  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Less Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lte: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age <= ?  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lte: 4 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  token(id) <= token(?)  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('IN', function () {
            it('should generate a WHERE/IN clause for String values', function () {
              var args = {
                colour: { $in: ['black', 'brown'] }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  colour IN (?,?)  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'black', 'brown' ]);
            });

            it('should generate a WHERE/IN clause for Number values', function () {
              var args = {
                age: { $in: [3, 4, 5] }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age IN (?,?,?)  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 3, 4, 5 ]);
            });

            it('should throw if array does not hold Stings or Numbers', function () {
              var args = {
                age: { $in: [true, 3] }
              };

              expect(function () {
                Model.findOne(args);
              }).to.throw(/must be a string or number/);
            });
          });

          describe('Multi operators', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4, $lte: 10 }
              };
              var query = Model.findOne(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('SELECT * FROM dog WHERE  age >= ?  AND  age <= ?  LIMIT 1 ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4, 10 ]);
            });
          })
        });

        it('should generate a WHERE clause for multiple values', function () {
          var args = {
            name: 'fido',
            age: 3
          };
          var query = Model.findOne(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('SELECT * FROM dog WHERE  name =?  AND  age =?  LIMIT 1 ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'fido', 3 ]);
        });
      });

      describe('Sorting', function () {
        it('should throw if not an object', function () {
          var args = {};
          var options = {
            sort: 42
          };
          expect(function() {
            Model.findOne(args, options);
          }).to.throw(/must be an object/);
        });

        it('should throw if not a valid sort value (must be 1 or -1)', function () {
          var args = {};
          var options = {
            sort: {
              age: 42
            }
          };
          expect(function() {
            Model.findOne(args, options);
          }).to.throw(/ASCENDING \(1\) or DESCENDING \(-1\)/);
        });

        it('should generate a ASC ORDER BY clause', function () {
          var args = {};
          var options = {
            sort: {
              age: 1
            }
          };
          var query = Model.findOne(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog  ORDER BY  age ASC  LIMIT 1 ');
        });

        it('should generate a DESC ORDER BY clause', function () {
          var args = {};
          var options = {
            sort: {
              age: -1
            }
          };
          var query = Model.findOne(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog  ORDER BY  age DESC  LIMIT 1 ');
        });

        it('should generate a multi field ORDER BY clause', function () {
          var args = {};
          var options = {
            sort: {
              age: -1,
              breed: 1
            }
          };
          var query = Model.findOne(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('SELECT * FROM dog  ORDER BY  age DESC breed ASC  LIMIT 1 ');
        });
      });

      it('should generate a LIMIT clause', function () {
        var args = {};
        var options = {
          limit: 42
        };
        var query = Model.findOne(args, options);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog  LIMIT 42 ');
      });

      it('should generate a ALLOW FILTERING clause', function () {
        var args = {};
        var options = {
          allow_filtering: true
        };
        var query = Model.findOne(args, options);

        expect(query).to.have.property('queryString')
          .which.equals('SELECT * FROM dog  LIMIT 1  ALLOW FILTERING');
      });
    });

    describe('Remove', function () {
      var Model;
      before(function () {
        var schema = createSchema();
        var connection = { not: 'null' };

        Model = model.create('Dog', schema, connection, { lowercase: true });
      });

      it('should return Query object if no callback', function () {
        var args = {
          id: 42
        };

        expect(Model.remove(args)).to.be.an.instanceof(Query);
      });

      // TODO: we should probably not allow the nuking of the entire table
      it.skip('should throw if no where clause', function () {
        var args = {};
        expect(function() {
          Model.remove(args);
        }).to.throw(/must have row selector/)
      });

      it('should generate a simple delete statement', function () {
        var args = {
          id: 42
        };
        var query = Model.remove(args);

        expect(query).to.have.property('queryString')
          .which.equals('DELETE  FROM dog  WHERE  id =? ');
        expect(query, 'arguments').to.have.property('params')
          .which.deep.equals([ 42 ]);
      });

      it('should throw if options isn\'t a string or object', function () {
        var args = {};
        var options = 42;
        expect(function() {
          Model.remove(args, options);
        }).to.throw(/must be string.+or object/)
      });

      describe('when fields passed in as string', function () {
        it('should limit delete to give fields when passed in white space delimited list of fields', function () {
          var args = {
            id: 42
          };
          var query = Model.remove(args, 'name breed');

          expect(query).to.have.property('queryString')
            .which.equals('DELETE name,breed FROM dog  WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        it('should limit delete to give fields when passed in CSV list of fields', function () {
          var args = {
            id: 42
          };
          var query = Model.remove(args, 'name,breed');

          expect(query).to.have.property('queryString')
            .which.equals('DELETE name,breed FROM dog  WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit delete to give fields when passed in CSV list of fields which include spaces', function () {
          var args = {
            id: 42
          };
          var query = Model.remove(args, 'name, breed');

          expect(query).to.have.property('queryString')
            .which.equals('DELETE name,breed FROM dog  WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });
      });

      describe('when fields passed in as object', function () {
        it('should limit delete to give fields when passed in white space delimited list of fields', function () {
          var args = {
            id: 42
          };
          var options = {
            fields: 'name breed'
          };
          var query = Model.remove(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('DELETE name,breed FROM dog  WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        it('should limit delete to give fields when passed in CSV list of fields', function () {
          var args = {
            id: 42
          };
          var options = {
            fields: 'name,breed'
          };
          var query = Model.remove(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('DELETE name,breed FROM dog  WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });

        // BUG: if the CSV list includes white space extra , are inserted.
        it.skip('should limit delete to give fields when passed in CSV list of fields which include spaces', function () {
          var args = {
            id: 42
          };
          var options = {
            fields: 'name, breed'
          };
          var query = Model.remove(args, options);

          expect(query).to.have.property('queryString')
            .which.equals('DELETE name,breed FROM dog  WHERE  id =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 42 ]);
        });
      });

      describe('Where Clause', function () {
        it('should throw if args isn\'t an object', function () {
          var args = 42;
          expect(function() {
            Model.remove(args);
          }).to.throw(/must be a javascript object/)
        });

        it('should generate a WHERE clause for String value', function () {
          var args = {
            name: 'fido'
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  name =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'fido' ]);
        });

        it('should generate a WHERE clause for Number value', function () {
          var args = {
            age: 3
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  age =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 3 ]);
        });

        it('should generate a WHERE clause for Boolean value (true)', function () {
          var args = {
            likes_cats: true
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  likes_cats =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'true' ]);
        });

        it('should generate a WHERE clause for Boolean value (false)', function () {
          var args = {
            likes_cats: false
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  likes_cats =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'false' ]);
        });

        it('should generate a WHERE clause for Date value', function () {
          var args = {
            dob: new Date()
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  dob =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ args.dob ]);
        });

        it('should generate a WHERE clause for Long value', function () {
          var args = {
            value: new Long.fromString('9223372036854775807')
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  value =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ args.value ]);
        });

        describe('Array', function () {
          it('should generate a WHERE/IN clause for String values', function () {
            var args = {
              colour: ['black', 'brown']
            };
            var query = Model.remove(args);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('DELETE  FROM dog  WHERE  colour IN (?,?) ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 'black', 'brown' ]);
          });

          it('should generate a WHERE/IN clause for Number values', function () {
            var args = {
              age: [3, 4, 5]
            };
            var query = Model.remove(args);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('DELETE  FROM dog  WHERE  age IN (?,?,?) ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 3, 4, 5 ]);
          });

          it('should throw if array does not hold Stings or Numbers', function () {
            var args = {
              age: [true, 3]
            };

            expect(function () {
              Model.remove(args);
            }).to.throw(/must be a string or number/);
          });
        });

        describe('Object', function () {
          describe('Greater Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gt: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  age > ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gt: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  token(id) > token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Greater Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  age >= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gte: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  token(id) >= token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Less Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lt: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  age < ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lt: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  token(id) < token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('Less Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lte: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  age <= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lte: 4 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  token(id) <= token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4 ]);
            });
          });

          describe('IN', function () {
            it('should generate a WHERE/IN clause for String values', function () {
              var args = {
                colour: { $in: ['black', 'brown'] }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  colour IN (?,?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'black', 'brown' ]);
            });

            it('should generate a WHERE/IN clause for Number values', function () {
              var args = {
                age: { $in: [3, 4, 5] }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  age IN (?,?,?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 3, 4, 5 ]);
            });

            it('should throw if array does not hold Stings or Numbers', function () {
              var args = {
                age: { $in: [true, 3] }
              };

              expect(function () {
                Model.remove(args);
              }).to.throw(/must be a string or number/);
            });
          });

          describe('Multi operators', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4, $lte: 10 }
              };
              var query = Model.remove(args);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('DELETE  FROM dog  WHERE  age >= ?  AND  age <= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 4, 10 ]);
            });
          })
        });

        it('should generate a WHERE clause for multiple values', function () {
          var args = {
            name: 'fido',
            age: 3
          };
          var query = Model.remove(args);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('DELETE  FROM dog  WHERE  name =?  AND  age =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'fido', 3 ]);
        });
      });
    });

    describe('Update', function () {
      var Model;
      before(function () {
        var schema = createSchema();
        var connection = { not: 'null' };

        Model = model.create('Dog', schema, connection, { lowercase: true });
      });

      it('should return Query object if no callback', function () {
        var args = {
          id: 42
        };
        var options = {
          name: 'rex'
        }

        expect(Model.update(args, options)).to.be.an.instanceof(Query);
      });

      it('should generate a simple update statement', function () {
        var args = {
          id: 42
        };
        var options = {
          name: 'rex'
        }
        var query = Model.update(args, options);

        expect(query).to.have.property('queryString')
          .which.equals('UPDATE dog SET name = ? WHERE  id =? ');
        expect(query, 'arguments').to.have.property('params')
          .which.deep.equals([ 'rex', 42 ]);
      });

      it('should generate a simple update statement for multiple fields', function () {
        var args = {
          id: 42
        };
        var options = {
          name: 'rex',
          age: 8
        }
        var query = Model.update(args, options);

        expect(query).to.have.property('queryString')
          .which.equals('UPDATE dog SET name = ?,age = ? WHERE  id =? ');
        expect(query, 'arguments').to.have.property('params')
          .which.deep.equals([ 'rex', 8, 42 ]);
      });

      describe('Where Clause', function () {
        it('should throw if args isn\'t an object', function () {
          var args = 42;
          expect(function() {
            Model.update(args);
          }).to.throw(/must be a javascript object/)
        });

        it('should generate a WHERE clause for String value', function () {
          var args = {
            name: 'fido'
          };
          var options = {
            name: 'rex'
          };
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  name =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', 'fido' ]);
        });

        it('should generate a WHERE clause for Number value', function () {
          var args = {
            age: 3
          };
          var options = {
            name: 'rex'
          };
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  age =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', 3 ]);
        });

        it('should generate a WHERE clause for Boolean value (true)', function () {
          var args = {
            likes_cats: true
          };
          var options = {
            name: 'rex'
          };
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  likes_cats =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', 'true' ]);
        });

        it('should generate a WHERE clause for Boolean value (false)', function () {
          var args = {
            likes_cats: false
          };
          var options = {
            name: 'rex'
          };
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  likes_cats =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', 'false' ]);
        });

        it('should generate a WHERE clause for Date value', function () {
          var args = {
            dob: new Date()
          };
          var options = {
            name: 'rex'
          };
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  dob =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', args.dob ]);
        });

        it('should generate a WHERE clause for Long value', function () {
          var args = {
            value: new Long.fromString('9223372036854775807')
          };
          var options = {
            name: 'rex'
          };
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  value =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', args.value ]);
        });

        describe('Array', function () {
          it('should generate a WHERE/IN clause for String values', function () {
            var args = {
              colour: ['black', 'brown']
            };
            var options = {
              name: 'rex'
            };
            var query = Model.update(args, options);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('UPDATE dog SET name = ? WHERE  colour IN (?,?) ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 'rex', 'black', 'brown' ]);
          });

          it('should generate a WHERE/IN clause for Number values', function () {
            var args = {
              age: [3, 4, 5]
            };
            var options = {
              name: 'rex'
            };
            var query = Model.update(args, options);

            expect(query, 'query').to.have.property('queryString')
              .which.equals('UPDATE dog SET name = ? WHERE  age IN (?,?,?) ');
            expect(query, 'arguments').to.have.property('params')
              .which.deep.equals([ 'rex', 3, 4, 5 ]);
          });

          it('should throw if array does not hold Stings or Numbers', function () {
            var args = {
              age: [true, 3]
            };
            var options = {
              name: 'rex'
            };

            expect(function () {
              Model.update(args, options);
            }).to.throw(/must be a string or number/);
          });
        });

        describe('Object', function () {
          describe('Greater Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gt: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  age > ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gt: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  token(id) > token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });
          });

          describe('Greater Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  age >= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $gte: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  token(id) >= token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });
          });

          describe('Less Than', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lt: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  age < ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lt: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  token(id) < token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });
          });

          describe('Less Than or Equal', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $lte: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  age <= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });

            it('should generate a WHERE clause for the primary key', function () {
              var args = {
                id: { $lte: 4 }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  token(id) <= token(?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4 ]);
            });
          });

          describe('IN', function () {
            it('should generate a WHERE/IN clause for String values', function () {
              var args = {
                colour: { $in: ['black', 'brown'] }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  colour IN (?,?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 'black', 'brown' ]);
            });

            it('should generate a WHERE/IN clause for Number values', function () {
              var args = {
                age: { $in: [3, 4, 5] }
              };
              var options = {
                name: 'rex'
              };
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  age IN (?,?,?) ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 3, 4, 5 ]);
            });

            it('should throw if array does not hold Stings or Numbers', function () {
              var args = {
                age: { $in: [true, 3] }
              };
              var options = {};

              expect(function () {
                Model.update(args, options);
              }).to.throw(/must be a string or number/);
            });
          });

          describe('Multi operators', function () {
            it('should generate a WHERE clause', function () {
              var args = {
                age: { $gte: 4, $lte: 10 }
              };
              var options = {
                name: 'rex'
              }
              var query = Model.update(args, options);

              expect(query, 'query').to.have.property('queryString')
                .which.equals('UPDATE dog SET name = ? WHERE  age >= ?  AND  age <= ? ');
              expect(query, 'arguments').to.have.property('params')
                .which.deep.equals([ 'rex', 4, 10 ]);
            });
          })
        });

        it('should generate a WHERE clause for multiple values', function () {
          var args = {
            name: 'fido',
            age: 3
          };
          var options = {
            name: 'rex'
          }
          var query = Model.update(args, options);

          expect(query, 'query').to.have.property('queryString')
            .which.equals('UPDATE dog SET name = ? WHERE  name =?  AND  age =? ');
          expect(query, 'arguments').to.have.property('params')
            .which.deep.equals([ 'rex', 'fido', 3 ]);
        });
      });
    });

    describe('Custom Queries', function () {
      var Model;
      var findByName = sinon.stub();
      before(function () {
        var schema = createSchema();
        var connection = { not: 'null' };

        schema.addQuery({
          findByName: findByName
        });
        Model = model.create('Dog', schema, connection, { lowercase: true });
      });
      afterEach(function() {
        findByName.reset();
      });

      it('should have a custom query', function () {
        // expect(Model).to.respondTo('findByName'); // This isn't working cause the query isn't on the prototype
        expect(Model).to.have.property('findByName')
          .which.is.a('function');
      });

      it('should call the custom query function', function () {
        Model.findByName('my-name');
        expect(findByName).to.have.been.calledOnce;
        expect(findByName).to.have.been.calledWith('my-name');
      });
    });
  });

  describe('Methods :: ', function () {
    var Model;
    var schema;
    before(function () {
      schema = createSchema();
      var connection = { not: 'null' };
      schema.virtual('fakeField', function () {})

      Model = model.create('Dog', schema, connection, { lowercase: true });
    });

    describe('constructor', function () {
      it('should set the model name', function () {
        var m = new Model();
        expect(m).to.have.property('_modelName', 'Dog');
      });

      it('should set the table name', function () {
        var m = new Model();
        expect(m).to.have.property('_tableName', 'dog');
      });

      it('should set the connection', function () {
        var m = new Model();
        expect(m).to.have.property('_connection')
          .which.deep.equals({
            not: 'null'
          });
      });

      it('should set the options', function () {
        var m = new Model();
        expect(m).to.have.property('_options')
          .which.deep.equals({
            lowercase: true
          });
      });

      it('should set the schema', function () {
        var m = new Model();
        expect(m).to.have.property('_schema', schema);
      });

      it('should initialize is new to true', function () {
        var m = new Model();
        expect(m).to.have.property('_is_new', true);
      });

      it('should initialize is dirty to empty object', function () {
        var m = new Model();
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({});
      });

      it('should attach schema fields', function () {
        var m = new Model();
        expect(m).to.have.property('age');
        expect(m).to.have.property('breed');
      });

      it('should attach a virtual field', function () {
        var m = new Model();
        expect(m).to.have.property('fakeField');
      });

      it('should default Lists to an empty array', function () {
        var m = new Model();
        expect(m).to.have.property('colour')
          .which.is.an('array')
          .with.length(0);
      });

      it('should default Maps to an empty map', function () {
        var m = new Model();
        expect(m).to.have.property('weightHistory')
          .which.is.an('object')
          .that.deep.equals({});
      });

      describe('Initialization', function () {
        var doc;
        before(function () {
          doc = {
            age: 3,
            colour: ['brown', 'black']
          }
        });

        it('should throw if first param is not an object', function () {
          expect(function () {
            var m = new Model(42);
          }).to.throw(/must have an object/);
        });

        it('should populate fields', function () {
          var doc = {
            age: 3,
            colour: ['brown', 'black']
          }
          var m = new Model(doc);
          expect(m).to.have.property('age', 3);
          expect(m).to.have.property('breed', undefined);
          expect(m).to.have.property('colour')
            .which.deep.equals(['brown', 'black'])
        });

        it('should set is new flag to true', function () {
          var m = new Model(doc);
          expect(m).to.have.property('_is_new', true);
        });

        it('should set is dirty flag to the dirty fields', function () {
          var m = new Model(doc);
          expect(m).to.have.property('_is_dirty')
            .which.deep.equals({
              age: true,
              colour: true
            });
        });

        describe(':: if doc is from the database', function () {
          it('should set is new flag to false', function () {
            var m = new Model(doc, { _from_db: true });
            expect(m).to.have.property('_is_new', false);
          });

          it('should clear the is dirty flag', function () {
            var m = new Model(doc, { _from_db: true });
            expect(m).to.have.property('_is_dirty')
              .which.deep.equals({});
          });
        })
      });
    });

    describe('setter/getter', function () {
      it('should set the field', function () {
        var m = new Model();
        expect(m).to.have.property('age', undefined);

        m.age = 2;
        expect(m).to.have.property('age', 2);
      });

      it('should set the dirty flag', function () {
        var m = new Model();
        m.age = 2;
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({
            age: true
          });
      });

      // TODO: Maybe we should mark field dirty if we push to the array.
      // Same would be true for Maps.
      it('will not set the dirty flag if pushing to an array', function () {
        var m = new Model();
        m.colour.push('brown');
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({});
      });

      it('should set the dirty flag if reassigning an array', function () {
        var m = new Model();
        m.colour = ['brown'];
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({
            colour: true
          });
      });

      it('should not set the dirty flag if field is a key', function () {
        var m = new Model({ id: 1 }, { _from_db: true });
        m.id = 2;
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({});
      });

      it('should set the dirty flag if field is a key if model is new', function () {
        var m = new Model({ id: 1 }, { _from_db: false });
        m.id = 2;
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({
            id: true
          });
      });
    });

    describe('Save', function () {
      describe(':: when failed validation', function () {
        before(function () {
          // add failing validator
          schema.validate('age', function() { return false }, 'oops');
        });
        after(function () {
          // revert failing validator
          schema.validators['age'] = [];
        });

        // TODO: should this be the result?
        it('should return Query without script if no callback', function () {
          var m = new Model();
          var q = m.save();
          expect(q).to.be.an.instanceof(Query);
          expect(q, 'query string').to.have.property('queryString')
            .which.is.null;
          expect(q, 'params').to.have.property('params')
            .which.deep.equals([]);
        });

        it('should invoke callback with error string', function () {
          var callback = sinon.stub();
          var m = new Model();
          var q = m.save(callback);

          expect(callback).to.be.calledOnce;
          expect(callback).to.be.calledWith('Cassie Validation Error: Dog failed validation. Object was not saved to database. Error: oops');
        });
      });

      describe(':: when validation passed', function () {
        var postValidation = sinon.stub();
        var preSave = sinon.stub();
        var postSave = sinon.stub();
        before(function () {
          schema.post('validate', postValidation);
          schema.pre('save', preSave);
          schema.post('save', postSave);
        });
        beforeEach(function () {
          postValidation.reset();
          preSave.reset();
          postSave.reset();
        });

        it('should invoke the post validation functions', function () {
          var m = new Model();
          m.save();

          expect(postValidation).to.have.been.calledOnce;
          expect(postValidation).to.have.been.calledWith(m);
        });

        it('should invoke the pre save functions', function () {
          var m = new Model();
          m.save();

          expect(preSave).to.have.been.calledOnce;
          expect(preSave).to.have.been.calledWith(m);
        });

        it('should return Query if no callback', function () {
          var m = new Model();
          var q = m.save();
          expect(q).to.be.an.instanceof(Query);
        });

        // TODO: it probably should be
        it('will not invoke the post save functions if no callback', function () {
          var m = new Model();
          m.save();

          expect(postSave).to.have.not.been.called;
        });

        describe(':: when callback passed in', function () {
          before(function () {
            sinon.stub(Query.prototype, 'exec').yields(null, 'hello world');
          });
          after(function () {
            Query.prototype.exec.restore();
          });

          var m;
          beforeEach('setup new object', function () {
            m = new Model();
            m.id = 42;
            m.age = 3;
            expect(m).to.have.property('_is_new')
              .which.is.true;
          });

          it('should invoke the post save functions', function () {
            var m = new Model();
            var callback = sinon.stub();
            m.save(callback);

            expect(postSave).to.have.been.calledOnce;
            expect(postSave).to.have.been.calledWith(m, null, 'hello world');
          });

          it('should reset dirty flag (only if callback)', function () {
            var m = new Model();
            m.age = 3;
            expect(m).to.have.property('_is_dirty')
              .which.deep.equals({
                age: true
              });


            var callback = sinon.stub();
            m.save(callback);

            expect(m).to.have.property('_is_dirty')
              .which.deep.equals({});
          });

          it('should invoke callback', function () {
            var m = new Model();
            var callback = sinon.stub();
            m.save(callback);

            expect(callback).to.have.been.calledOnce;
            expect(callback).to.have.been.calledWith(null, 'hello world');
          });

          it('should set is new flag to false (only if callback)', function () {
            var callback = sinon.stub();
            m.save(callback);

            expect(m).to.have.property('_is_new')
              .which.is.false;
          });
        });

        describe(':: and new object', function () {
          var m;
          beforeEach('setup new object', function () {
            m = new Model();
            m.id = 42;
            m.age = 3;
            expect(m).to.have.property('_is_new')
              .which.is.true;
          });

          it('should return insert string', function () {
            var q = m.save();
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?) ');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                42,
                3
              ]);
          });

          it('should include IF NOT EXISTS if set in options', function () {
            var q = m.save({ if_not_exists: true });
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?)  IF NOT EXISTS');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                42,
                3
              ]);
          });

          it('should include TTL if set in options', function () {
            var q = m.save({ ttl: 55 });
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?)  USING TTL 55');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                42,
                3
              ]);
          });

          it('should not include TTL if not set to number', function () {
            var q = m.save({ ttl: '55' });
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?) ');
          });

          it('should include TIMESTAMP if set in options', function () {
            var q = m.save({ timestamp: 55 });
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?)  USING TIMESTAMP 55');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                42,
                3
              ]);
          });

          it('should not include TIMESTAMP value if not set to a number', function () {
            var q = m.save({ timestamp: '55' });
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?)  USING TIMESTAMP');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                42,
                3
              ]);
          });

          it('should include both TTL and TIMESTAMP if set in options', function () {
            var q = m.save({ timestamp: 55, ttl: 42 });
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('INSERT INTO dog (id,age) VALUES (?,?)  USING TTL 42 AND TIMESTAMP 55');
          });
        });

        describe(':: and existing object', function () {
          var m;
          beforeEach('setup existing object', function () {
            m = new Model({ id: 42 }, { _from_db: true });
            m.age = 3;
            m.colour = ['black', 'brown'];

            expect(m).to.have.property('_is_new')
              .which.is.false;
          });

          it('should return update string', function () {
            var q = m.save();
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('UPDATE dog SET age = ?,colour = ? WHERE id = ?');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                3,
                ['black', 'brown'],
                42
              ]);
          });

          it('should add IF claus if set in options', function () {
            var options = {
              if: {
                breed: 'labrador'
              }
            };
            var q = m.save(options);
            expect(q, 'query string').to.have.property('queryString')
              .which.equals('UPDATE dog SET age = ?,colour = ? WHERE id = ? IF breed =? ');
            expect(q, 'params').to.have.property('params')
              .which.deep.equals([
                3,
                ['black', 'brown'],
                42,
                'labrador'
              ]);
          });

          describe('when compound key', function () {
            var cat;
            before('setup compound model', function() {
              var schema = {
                id: { type: Number },
                age: { type: Number },
                name: String,
                breed: String,
                colour: Array,
                weightHistory: Object
              };
              var catSchema = new Schema(schema, {
                primary: [['id', 'breed'], 'name']
              });

              var connection = { not: 'null' };
              var Cat = model.create('Cat', catSchema, connection, { lowercase: true });
              cat = new Cat({ id: 42, breed: 'tom', name: 'Sylvester'}, { _from_db: true });
              cat.age = 3;
              cat.colour = ['black', 'brown'];

              expect(cat).to.have.property('_is_new')
                .which.is.false;
            });

            it('should return update string with WHERE claus for each key value', function () {
              var q = cat.save();
              expect(q, 'query string').to.have.property('queryString')
                .which.equals('UPDATE cat SET age = ?,colour = ? WHERE id = ? AND breed = ? AND name = ?');
              expect(q, 'params').to.have.property('params')
                .which.deep.equals([
                  3,
                  ['black', 'brown'],
                  42,
                  'tom',
                  'Sylvester'
                ]);
            });
          });
        });
      });
    });

    describe('Remove', function () {
      var preRemove = sinon.stub();
      var postRemove = sinon.stub();
      before(function () {
        schema.pre('remove', preRemove);
        schema.post('remove', postRemove);

        sinon.stub(Query.prototype, 'exec').yields(null, 'hello world');
      });
      beforeEach(function () {
        preRemove.reset();
        postRemove.reset();
      });
      after(function () {
        Query.prototype.exec.restore();
      });

      it('should invoke the pre remove functions', function () {
        var m = new Model();
        m.remove();

        expect(preRemove).to.have.been.calledOnce;
        expect(preRemove).to.have.been.calledWith(m);
      });

      it('should return Query if no callback', function () {
        var m = new Model();
        var q = m.remove();
        expect(q).to.be.an.instanceof(Query);
      });

      // TODO: it probably should be
      it('will not invoke the post remove functions if no callback', function () {
        var m = new Model();
        m.remove();

        expect(postRemove).to.have.not.been.called;
      });

      it('should invoke the post remove functions if callback is passed in', function () {
        var m = new Model();
        var callback = sinon.stub();
        m.remove(callback);

        expect(postRemove).to.have.been.calledOnce;
        expect(postRemove).to.have.been.calledWith(m, null, 'hello world');
      });

      it('should set is deleted flag (only if callback)', function () {
        var m = new Model();
        // TODO: Currently the property is only _created_ when deleted.
        // expect(m).to.have.property('_is_deleted', false);

        var callback = sinon.stub();
        m.remove(callback);

        expect(m).to.have.property('_is_deleted', true);
      });

      it('should invoke callback', function () {
        var m = new Model();
        var callback = sinon.stub();
        m.remove(callback);

        expect(callback).to.have.been.calledOnce;
        expect(callback).to.have.been.calledWith(null, 'hello world');
      });

      // TODO: This check has a bug, the params list is never empty, can contain undefined
      it.skip('should invoke callback with error if no parameters', function () {
        var m = new Model();
        var callback = sinon.stub();
        m.remove(callback);

        expect(callback).to.have.been.calledOnce;
        expect(callback).to.have.been.calledWith('Cassie Error: Could not determine primary key of model. Delete request not sent to database server.', null);
      });

      //TODO: should we return null vs. an invalid query?
      it('will return invalid delete query when no parameters', function () {
        var m = new Model();
        var q = m.remove();
        expect(q, 'query string').to.have.property('queryString')
          .which.equals('DELETE  FROM dog WHERE id = ?');
        expect(q, 'params').to.have.property('params')
          .which.deep.equals([
            undefined,
          ]);
      });

      it('should return delete row query', function () {
        var m = new Model();
        m.id = 42;
        var q = m.remove();
        expect(q, 'query string').to.have.property('queryString')
          .which.equals('DELETE  FROM dog WHERE id = ?');
        expect(q, 'params').to.have.property('params')
          .which.deep.equals([
            42,
          ]);
      });

      it('should return delete values query if fields provided', function () {
        var m = new Model();
        m.id = 42;
        var q = m.remove({ fields: 'hello world' });
        expect(q, 'query string').to.have.property('queryString')
          .which.equals('DELETE hello,world FROM dog WHERE id = ?');
        expect(q, 'params').to.have.property('params')
          .which.deep.equals([
            42,
          ]);
      });

      it('should return delete values query if fields provided as a string', function () {
        var m = new Model();
        m.id = 42;
        var q = m.remove('hello world');
        expect(q, 'query string').to.have.property('queryString')
          .which.equals('DELETE hello,world FROM dog WHERE id = ?');
        expect(q, 'params').to.have.property('params')
          .which.deep.equals([
            42,
          ]);
      });

      describe('when compound key', function () {
        var cat;
        before('setup compound model', function() {
          var schema = {
            id: { type: Number },
            age: { type: Number },
            name: String,
            breed: String,
            colour: Array,
            weightHistory: Object
          };
          var catSchema = new Schema(schema, {
            primary: [['id', 'breed'], 'name']
          });

          var connection = { not: 'null' };
          var Cat = model.create('Cat', catSchema, connection, { lowercase: true });
          cat = new Cat({ id: 42, breed: 'tom', name: 'Sylvester'}, { _from_db: true });
          cat.age = 3;
          cat.colour = ['black', 'brown'];

          expect(cat).to.have.property('_is_new')
            .which.is.false;
        });

        it('should return delete values query', function () {
          var q = cat.remove();
          expect(q, 'query string').to.have.property('queryString')
            .which.equals('DELETE  FROM cat WHERE id = ? AND breed = ? AND name = ?');
          expect(q, 'params').to.have.property('params')
            .which.deep.equals([
              42,
              'tom',
              'Sylvester',
            ]);
        });

        it('should return delete values query if fields provided as a string', function () {
          var q = cat.remove('hello world');
          expect(q, 'query string').to.have.property('queryString')
            .which.equals('DELETE hello,world FROM cat WHERE id = ? AND breed = ? AND name = ?');
          expect(q, 'params').to.have.property('params')
            .which.deep.equals([
              42,
              'tom',
              'Sylvester',
            ]);
        });
      });
    });

    describe('Mark Modified', function () {
      it('should set the dirty flag to true', function () {
        var m = new Model();
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({});

        m.markModified('age');
        expect(m).to.have.property('_is_dirty')
          .which.deep.equals({
            age: true
          });
      });
    });

    describe('toString', function () {
      it('should return a JSON object of just field key/values', function () {
        var m = new Model();
        m.age = 2;
        m.colour.push('black');
        m.colour.push('brown');
        m.breed = 'Labrador';
        var json = m.toString();

        expect(json).to.deep.equals({
          id: undefined,
          age: 2,
          breed: 'Labrador',
          colour: ['black', 'brown'],
          weightHistory: {}
        });
      });

      it('should not JSON-ify non-schema fields', function () {
        var m = new Model();
        m.age = 2;
        m.barks = 'yes'; // not in schema
        var json = m.toString();

        expect(json).to.deep.equals({
          id: undefined,
          age: 2,
          breed: undefined,
          colour: [],
          weightHistory: {},
        });
      });
    })
  });
});
