var Cassandra = require('cassandra-driver') ;

var db = null;
var CassandraConnection = {
  Client: function(config, options) {
    var overriddenOptions = config;
    // The old driver used to specify hosts as the field, this is changed to contactPoints. Hosts is used as config param for backward compatibility
    overriddenOptions.contactPoints = config.hosts;
    db = new Cassandra.Client(overriddenOptions);
    return this;
  },
  execute: function(query, params, options, callback) {
    db.execute(query, params, options, callback);
  },
  stream: function(query, params, options, callback) {
    return db.stream(query, params, options, callback);
  },
  executePrepared: function(query, params, options, callback) {
    var overriddenOptions = Object.assign({}, options, {prepare: true});
    db.execute(query, params, overriddenOptions, callback);
  },
  executeBatch: function(queryArray, options, callback) {
    if (!queryArray || queryArray.length == 0) {
      return callback();
    }
    db.batch(queryArray, options, callback);
    // var batchedQuery = db.beginBatch();
    // queryArray.forEach(function(queryObj, index) {
      // var query = db.beginQuery();
      // query.query(queryObj.query);
      // query.params.forEach(function(param) {
        // query.param(param);
      // });
      // batchedQuery.add(query);
    // });
    // batchedQuery
      // .options(options)
      // .timestamp()
      // .execute(function(err) {
        // console.log('error during batched query', err);
      // })
      // .done(callback);
  },
  shutdown: function(callback) {
    callback();
    // db.close(callback);
  }
};

module.exports = CassandraConnection;
