Cassie
=====
Cassie is a model layer and CQL generator that uses the [node-cassandra-cql](https://github.com/jorgebay/node-cassandra-cql) project and attempts to mimic most of mongoose's API to allow for easy switching between MongoDB and Cassandra. Note that Cassie-ODM is not currently a full 1:1 mapping to mongoose's API (and probably will never be due to certain architectural differences between Cassandra and MongoDB's query languages).

Getting Started
----------
```

    var cassie = require('cassie-odm'),
        Schema = cassie.Schema;
    cassie.connect({keyspace: "mykeyspace", hosts: ["127.0.0.1:9042"]});
    
    var CatSchema = new Schema({name: String});
    var Cat = cassie.model('Cat', CatSchema);
    
    var kitty = new Cat({ name: 'Eevee'});
    kitty.save(function(err) {
        if(err) return console.log(err);
        console.log("meow");
    });

```

Client Connections
----------
Client connections are handled by node-cassandra-cql. Cassie encapsulates a connection internally, but you can also use the node-cassandra-cql connection directly:

```

    var cassie = require('cassie-odm');
    var connection = cassie.connect({keyspace: "mykeyspace", hosts: ["127.0.0.1:9042"]});
    
    connection.execute("SELECT * FROM cats", [], function(err, results) {
        if(err) return console.log(err);
        console.log("meow");
    });
```

Modeling
---------
Modeling is the process of defining your Schemas. Although Cassandra is a NoSQL database, it is required to make a column family (similar to a table in a RDB) with a primary key. Cassie makes this process easier by helping you organize your code by defining Schemas in a single location (for easy reference). Modeling also allows you to perform validations and apply pre and post hooks to your models. Finally, Cassie will actually sync your tables forward to make rapid development easier (ie tables and fields that don't exist in Cassandra will be created. Cassie does not delete tables or fields as this could lead to data loss. Cassie can warn you if there are unused fields though, see the "Sync" section for more information).

```

    var cassie = require('cassie-odm'); //Require cassie module
    var connection = cassie.connect({keyspace: "mykeyspace", hosts: ["127.0.0.1:9042"]}); //Connect to local cassandra server
    
    //Creates a User Schema
    var UserSchema = new Schema({
        username: String,
        email: {type: String, required: true},
        hashedPassword: {type: String, required: true},
        blogs: []});
    
    //Adds a validator for username
    UserSchema.validate('username', function(user) {
        return (user.username !== null);
    });
    
    //Add a post-save hook
    UserSchema.post('save', function(model) {
        console.log("A new user signed up!");
    });
    
    //Creates a Blog Schema
    var BlogSchema = new Schema({title: {type: String, required: true}, content: String, author: String});
    
    //Registers the schemas with cassie
    var User = cassie.model('User', UserSchema);
    var Blog = cassie.model('Blog', BlogSchema);
    
    //Sync the schemas with Cassandra to ensure that they exist and contain the appropriate fields (see additional notes on the limitations of syncing)
    cassie.syncTables(config.cassandra.options, {debug: true, warning: true}, function(err, results) {
    
        //Creates a new user
        var newUser = new User({username: 'ManBearPig', email: 'AlGore@gmail.com', hashedPassword: 'Never-do-this-use-crypto-module'});
    
        //Asynchronous function that returns to provided callback
        newUser.save(function(err, results) {
            if(err) console.log(err);
            
            //Creates a new blog
            var newBlog = new Blog({title: 'Global warming and Manbearpig', content: 'Half-man, half-bear, half-pig...', author: new_user.username});
        
            //.save() without a callback returns a Query object. Here we batch together multiple queries to execute them together
            var firstQuery = newBlog.save();
            
            //Note that for types other than arrays and maps, cassie tracks changes for saving, however, since blogs is an array, we need to mark it as modified
            //Also note that after running .save(), newBlog has a generated field called 'id'. This only occurs if cassie created the primary key for us (see "Primary Keys" for more info).
            newUser.blogs.push(newBlog.id);
            newUser.markModified('blogs');
            
            //Get second query to batch
            var secondQuery = newUser.save();
        
            //Run batch cql commands
            cassie.batch([firstQuery, secondQuery], {consistency: cassie.consistencies.quorum}, function(err, results) {
                if(err) console.log(err);
                
                //Close the connection since we're done
                cassie.close();
            });
        });
    
    });

```

The above example shows a lot of code, but is relatively simple to understand (particularly if you've used Mongoose). First, we connect to the Cassandra server. Then, we create some schemas with cassie (along with a validator for username and a post-save hook on users). After we register the Schemas with cassie, we sync the tables to make sure that Cassandra knows that they exist (see "Sync" for more information on this and the limitations of syncing). Also note that we haven't provided a primary key in any of our schemas. In general, its good practice to explicitly define a primary key in a NoSQL database (and Cassandra requires it actually). Cassie takes care of this requirement by generating a field called 'id' if we don't specify a primary key. After we call the sync tables function, we can now create users and blogs in our database. First, we create a new user and save it. Then we create a new blog and store the query to be called after we do some other updates. Once we've completed our updates, we gather the queries and send them in a batch to our Cassandra server using the cassie.batch command to create our blog post and update our user. Finally, we close the connection when we're done.

Some things to note about the above example:
    First, never store a password in plain text, ideally, you would use the crypto module to generate a hash of the user's password and store that in your database. Second, this data model is not very efficient for a number of reasons that would make more sense if you read through the "Data Modeling Notes" and Cassandra's documentation / architecture (not posting here for brevity).

Queries
----------
Construct CQL queries by passing arguments or chaining methods. 

CRUD (Create, Read, Update, Delete) Operations
----------
Create, Read, Update, Delete operations on Schemas.

Select (Find)
----------
SELECT query.

Creating and Updating
----------
INSERT and UPDATE queries. Also write information on _is_dirty flag used for updates (and how it doesn't work for arrays and maps, but works for other data-types).

Removing
----------
DELETE query. 

Sync
----------
Write Sync stuff.

Primary Keys
----------
Write Primary Key information.

Validations
----------
Write validation stuff.

Hooks
----------
Pre, Post hooks for save, remove. Post hooks for init & validate.

Plugins
----------
Models support plugins. Plugins allow you to share schema properties between models and allow for pre-save hooks.

Lightweight Transactions
----------
IF NOT EXISTS option when creating queries. Note that IF field = value is not currently supported for updates.

Time to Live (TTL)
----------
TTL option when inserting data.

Batching
----------
How to batch queries together (fewer network roundtrips).

Examples
----------
Write additional examples here. Execute Prepared, Streaming each row, Streaming each field, stream

Mongoose API Differences
----------
API differences between Cassie and Mongoose.

Common Issues using Cassandra
----------
Write some common differences between CQL and RDBMs (SQL). What is not supported by CQL. Write some differences between Cassandra and MongoDB.

Why Cassandra
----------
Why would you want to use Cassandra with all those limitations? Distributed, fault tolerant design (kind of like auto-sharded, auto-replicated, master-master). Designed so that if any one node goes down, you can create another node, attach it to the cluster, and retrieve the "lost" data without any downtime. Linearly scalable reads and writes (and storage), when you need more reads/sec or writes/sec, you can simply add another node to the cluster. Finally, with Cassie, relatively easy data modeling in nodejs that compares to the ease of use of MongoDB using Mongoose (once you understand some data modeling differences).

Data Modelling Notes
----------
Write some notes on how to properly model data in Cassandra.

Session Storage
----------
See [cassie-store](http://github.com/Flux159/cassie-store) for an express compatible session store. Also has notes on how to manually create a session store.

Not yet supported
----------

Cassie Side:
* Hinting - node-cassandra-cql supports hinting (if you want to use it, use the connection provided or cassie.cql)
* Paging - need to support some form of client side paging for common use case (I'm thinking primary key timestamp based?)
* Default - when adding a column, specify default value (in schema / sync)
* Optional - specify table name when creating (in schema options - should automatically sync to use that tableName)

Driver Side:
* Input Streaming - not supported by node-cassandra-cql yet
* SSL Connections - not supported by node-cassandra-cql yet
* Auto determine other hosts - not supported by node-cassandra-cql yet
* "Smart connections" - Only send CQL request to the hosts that contain the data (requires knowing about how the data is sharded)
* Possibly switch to officially supported native C/C++ driver when out of beta (would need to test performance and wrap in javascript) - https://github.com/datastax/cpp-driver

Testing & Development
----------
Pre-reqs:
Nodejs installed and a Cassandra server running on localhost:9160 (see [wiki](http://wiki) for more information on installing Cassandra).
Clone the repository and run the following from command line:

```

    npm install && npm test

```

Note: 'npm test' creates a keyspace "CassieODMTest" on your local Cassandra server.

Submit pull requests for any bug fixes!

More information about Cassandra including Installation Guides, Production Setups, and Data Modeling Best Practices
----------

For information on how to Install Cassandra on a developer Mac OS X, Linux, or Windows machine, see the [wiki](http://wiki) or Cassandra's [getting started guide](http://wiki.apache.org/cassandra/GettingStarted).

In addition, for information on developer and minimal production setups (including EC2 setups), see this [wiki link](http://wiki2).

For information on adding nodes, migrating data, and creating snapshots and backups, see this [wiki link](http://wiki3).

For information on Cassandra, including why to choose Cassandra as your database, go to the [Apache Cassandra homepage](http://cassandra.apache.org/).

For information on Cassandra's fault-tolerant, distributed architecture, see [the original Facebook whitepaper on Cassandra annotated with differences](http://www.datastax.com/documentation/articles/cassandra/cassandrathenandnow.html). Alternatively, also read Google's [BigTable architecture whitepaper](http://static.googleusercontent.com/media/research.google.com/en/us/archive/bigtable-osdi06.pdf) and [Amazon's Dynamo whitepaper](http://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) as Cassandra's design was influenced by both.

For helpful tips on data modeling in Cassandra (particularly if you come from a SQL background), see these two links:
[Cassandra Data Modeling Best Practices Part 1 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/07/16/cassandra-data-modeling-best-practices-part-1/#.U7YP_Y1dU_Q)
[Cassandra Data Modeling Best Practices Part 2 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/08/14/cassandra-data-modeling-best-practices-part-2/#.U7YQGI1dU_Q)
[Datastax Cassandra Tutorials](http://www.datastax.com/dev/tutorials)
