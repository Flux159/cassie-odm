Cassie
=====
Cassie is a model layer and CQL generator that uses the node-cassandra-cql project and attempts to mimic mongoose's API for easy replacement.

Modeling
---------

Model Options
---------
{
	consistency:{
		select: 'ONE' | 'QUORUM' | 'ALL',
		insert: ...
	}
}
You can define consistency options for all CRUD operations.

Properties
---------

Define some properties on your models.

Associations
---------
Cassie supports the following associations:
hasOne
hasMany
belongsTo

The following are examples:

Validations
----------
Write validation stuff

Plugins
----------
Models support plugins.

Client Connections
----------
Client connections are handled by node-cassandra-cql.

Examples
----------
Write examples here

Testing & Development
----------
Pre-reqs:
Nodejs, Cassandra server running on localhost:9160
Clone the repository and run npm test-init && npm test

test-init creates a keyspace "Cassie" on your local Cassandra server
test runs the tests

Submit pull requests for any bug fixes!
