Cassie
=====
Cassie is a model layer and CQL generator that uses the [node-cassandra-cql](https://github.com/jorgebay/node-cassandra-cql) project and attempts to mimic mongoose's API to allow for easy switching between MongoDB and Cassandra.

Getting Started
----------
```
var cassie = require('cassie-odm');
cassie.connect({keyspace: "mykeyspace", hosts: ["127.0.0.1:9042"]});

var Cat = cassie.model('Cat', {name: String});

var kitty = new Cat({ name: 'Eevee'});
kitty.save(function(err) {
	if(err) return console.log(err);
	console.log("meow");
});

```

Client Connections
----------
Client connections are handled by node-cassandra-cql.

Modeling
---------
Modeling is the process of defining your Schemas. Although Cassandra is a NoSQL database, it is helpful to organize your code by defining Schemas in a single location (for easy reference). Modeling also allows you to perform validations and apply pre-save hooks to your models.

Validations
----------
Write validation stuff.

Plugins
----------
Models support plugins. Plugins allow you to share schema properties between models and allow for pre-save hooks.

Queries
----------
Construct CQL queries by passing arguments or chaining methods. 

Examples
----------
Write additional examples here.

Testing & Development
----------
Pre-reqs:
Nodejs installed and a Cassandra server running on localhost:9160
Clone the repository and run the following from command line:
```
npm test-init && npm test
```
Note: 'npm test-init' creates a keyspace "CassieTest" on your local Cassandra server

'npm test' runs the tests.

Submit pull requests for any bug fixes!

More information about Cassandra including Installation Guides, Production Setups, and Data Modeling Best Practices
----------

For information on how to Install Cassandra on a developer Mac OS X, Linux, or Windows machine, see the [wiki](http://wiki) or Cassandra's [getting started guide](http://wiki.apache.org/cassandra/GettingStarted).

In addition, for information on developer and minimal production setups (including EC2 setups), see this [wiki link](http://wiki2).

For information on Cassandra, including why to choose Cassandra as your database, go to the [Apache Cassandra homepage](http://cassandra.apache.org/).

For information on Cassandra's fault-tolerant, distributed architecture, see [the original Facebook whitepaper on Cassandra annotated with differences](http://www.datastax.com/documentation/articles/cassandra/cassandrathenandnow.html). Alternatively, also read Google's [BigTable architecture whitepaper](http://static.googleusercontent.com/media/research.google.com/en/us/archive/bigtable-osdi06.pdf) and [Amazon's Dynamo whitepaper](http://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) as Cassandra's design was influenced by both.

For helpful tips on data modeling in Cassandra (particularly if you come from a SQL background), see these two links:
[Cassandra Data Modeling Best Practices Part 1 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/07/16/cassandra-data-modeling-best-practices-part-1/#.U7YP_Y1dU_Q)
[Cassandra Data Modeling Best Practices Part 2 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/08/14/cassandra-data-modeling-best-practices-part-2/#.U7YQGI1dU_Q)
[Datastax Cassandra Tutorials](http://www.datastax.com/dev/tutorials)