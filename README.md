Cassie
=====
Cassie is a model layer and CQL generator written in javascript that uses the [node-cassandra-cql](https://github.com/jorgebay/node-cassandra-cql) project and attempts to mimic most of mongoose's API to allow for easy switching between MongoDB and Cassandra. Note that Cassie-ODM is not currently a full 1:1 mapping to mongoose's API (and probably will never be due to certain architectural differences between Cassandra and MongoDB).

Installing
----------
If you have nodejs installed, just run the following in your project's directory:

```
    npm install cassie-odm
```

Also note that to use any of the examples below, it is assumed that you have Cassandra downloaded and running on the default port of 9042. Check out Cassie's [Cassandra Installation Guide](http://wiki) for how to get Cassandra for your system (specifically brew on OSX, apt-get/yum on linux, or via an installer for Windows). Alternatively see the [Apache Cassandra Download](http://cassandra.apache.org/download/) page.

Getting Started
----------
```

    var cassie = require('cassie-odm');
    var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
    cassie.connect(config);
    
    var CatSchema = new cassie.Schema({name: String});
    var Cat = cassie.model('Cat', CatSchema);
    
    cassie.syncTables(config, function(err, results) {
    
        var kitty = new Cat({ name: 'Eevee'});
        kitty.save(function(err) {
            if(err) return console.log(err);
            console.log("meow");
            cassie.close();
        });
        
    });
    

```

Modeling
---------
Modeling is the process of defining your Schemas. Although Cassandra is a NoSQL database, it is required to make a column family with a primary key. Cassie makes this process easier by helping you organize your code by defining Schemas in a single location (for easy reference). If you do not specify a primary key, Cassie will automatically generate an 'id' key for you. Modeling also allows you to perform validations and apply pre and post hooks to your models. Finally, Cassie will actually sync your tables forward to make rapid development easier ( tables and fields that don't exist in Cassandra will be created. Cassie does not delete tables or fields as this could lead to data loss. Cassie can warn you if there are unused fields though, see the "Sync" section for more information).

```

    var cassie = require('cassie-odm'),
        Schema = cassie.Schema; //Require cassie module

    var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
    cassie.connect(config); //Connect to local cassandra server

    //User Schema
    var UserSchema = new Schema({
        username: String,
        email: {type: String, required: true},
        hashed_password: {type: String, required: true},
        blogs: [cassie.types.uuid]});

    //Adds a validator for username
    UserSchema.validate('username', function (user) {
        return (user.username !== null);
    });

    //Add a post-save hook
    UserSchema.post('save', function (model) {
        console.log("A new user signed up!");
    });

    //Blog Schema
    var BlogSchema = new Schema({title: {type: String, required: true}, content: String, author: String});

    //Registers the schemas with cassie
    var User = cassie.model('User', UserSchema);
    var Blog = cassie.model('Blog', BlogSchema);

    //Sync the schemas with Cassandra to ensure that they exist and contain the appropriate fields (see additional notes on the limitations of syncing)
    var syncOptions = {debug: true, prettyDebug: true, warning: true};
    cassie.syncTables(config, syncOptions, function (err, results) {
        console.log(err);

        //Creates a new user
        var newUser = new User({username: 'ManBearPig', email: 'AlGore@gmail.com', hashed_password: 'Never-do-this-use-crypto-module'});

        //Asynchronous function that returns to provided callback
        newUser.save({debug: true, prettyDebug: true}, function (err, results) {
            if (err) console.log(err);

            //Creates a new blog
            var newBlog = new Blog({title: 'Global warming and Manbearpig', content: 'Half-man, half-bear, half-pig...', author: newUser.username});

            //.save() without a callback returns a Query object. Here we batch together multiple queries to execute them together
            var firstQuery = newBlog.save();

            //Note that for types other than arrays and maps, cassie tracks changes for saving, however, since blogs is an array, we need to mark it as modified
            //Also note that after running .save(), newBlog has a generated field called 'id'. This only occurs if cassie created the primary key for us (see "Primary Keys" for more info).
            newUser.blogs.push(newBlog.id);
            newUser.markModified('blogs');

            //Get second query to batch
            var secondQuery = newUser.save();

            //Run batch cql commands
            cassie.batch([firstQuery, secondQuery], {consistency: cassie.consistencies.quorum, debug: true, prettyDebug: true}, function (err, results) {
                if (err) console.log(err);

                //Close the connection since we're done
                cassie.close();
            });
        });

    });


```

The above example shows a lot of code, but is relatively simple to understand (particularly if you've used Mongoose). First, we connect to the Cassandra server. Then, we create some schemas with cassie (along with a validator for username and a post-save hook on users). After we register the Schemas with cassie, we sync the tables to make sure that Cassandra knows that they exist (see "Sync" for more information on this and the limitations of syncing). Also note that we haven't provided a primary key in any of our schemas. In general, its good practice to explicitly define a primary key in a NoSQL database (and Cassandra requires it actually). Cassie takes care of this requirement by generating a field called 'id' if we don't specify a primary key. After we call the sync tables function, we can now create users and blogs in our database. First, we create a new user and save it. Then we create a new blog and store the query to be called with some other updates. Once we've done our updates locally, we gather the queries and send them in a batch to our Cassandra server using the cassie.batch command to create our blog post and update our user. Finally, we close the connection when we're done.

NOTE: All fields and should be lowercase. This is due to Cassandra's columns being lowercase (and currently Cassie doesn't automatically covert these for you in JS).

Some things to note about the above example:
    First, all fields inside of models must be lowercase. This is because when creating fields in Cassandra through CQL, fields are stored without any uppercase letters. Second, never store a password in plain text, ideally, you would use the crypto module to generate a hash of the user's password and store that in your database. Finally, this data model is not very efficient for a number of reasons that would make more sense if you read through the "Data Modeling Notes" and Cassandra's documentation / architecture (not posting here for brevity).

Queries
----------
Construct and run CQL queries by passing arguments or chaining methods. See the following sections for basic CRUD operations.

CRUD (Create, Read, Update, Delete) Operations
----------
Create, Read, Update, Delete operations on Models.

Create Example (INSERT):

```

    //Create Example (assuming schemas have been defined and sync'ed - see sync for more information)
    var Fish = cassie.model('Fish');

    var fishee = new Fish({fish_id: 2001, name: 'eevee'});
    fishee.save(function(err) {
        //Handle errors, etc.
    });

```

Read Example (SELECT):

```

    //Read Example (assuming schemas have been defined & sync'ed - see sync for more information)
    var Fish = cassie.model('Fish');

    Fish.find({fish_id: {$in: [2000, 2001, 2002, 2003, 2004]}}).exec(function(err, fishes) {
        console.log(fishes.toString());
        var firstFish = fishes[0]; //...
    });


```

Update Example (UPDATE):
Note: Cassie internally stores a flag to know when you've modified fields - for arrays and maps, you must specified that a field has been modified using the Model.markModified('fieldName'); method though (see 'Modeling' for an example)

```

    //Update Example (assuming schemas have been defined & sync'ed - see sync for more information)

    var Fish = cassie.model('Fish');

    var fishee2 = new Fish({fish_id: 2002, name: 'eevee'});
    fishee2.save(function(err) {

        //Renaming the fish
        fishee2.name = 'bambie';

        fishee2.save(function(err) {
            //fishee2 has now been renamed (Cassie internally stores a flag to know when you've modified fields - for arrays and maps, you must specified that a field has been modified using the fishee2.markModified('fieldName'); method though (see 'Modeling' for an example).
        });
    });

    //Alternatively, you can also send update queries if you know some information about the model

    var Fish = cassie.model('Fish');
    var fish_id3 = 2003; //Assumes fish_id is a number. If uuid, would need to pass uuid as a string

    Fish.update({fish_id: fish_id3}, {name: 'bambie'}, function(err) {
        if(err) console.log(err);
        //Fish with id 2000 has had its name updated
        //If no fish with id exists, returns error
    });

    //Fish.update can also take multiple ids in the same way as find: {id: {$in: [1234,1235]} or {id: [1234,1235]}

```

Delete Example (DELETE):

```

    //Delete Example (assuming schemas have been defined & sync'ed - see sync for more information)

    var Fish = cassie.model('Fish');

    var fishee4 = new Fish({fish_id: 2004, name: 'goldee'});
    fishee4.save(function(err) {
        if(err) console.log(err);

        fishee4.remove(function(err) {
            if(err) console.log(err);
            //Fishee has been removed.
        });
    });

    //Alternatively, you can also send delete queries if you know some information about the model (that Cassandra indexes by)

    var Fish = cassie.model('Fish');
    var fish_id5 = 2005; //Assumes fish_id is a number. If uuid, would need to pass uuid as a string

    Fish.remove({fish_id: fish_id5}, 'name', function(err) {
        if(err) console.log(err);
        //Fish with id 2001 has had its name deleted
    });

    //To delete entire row, ignore second argument. Ex:
    //Fish.remove({id: fish_id5}, function(err) {
    //Your callback code
    //});

    //Fish.remove can also take multiple ids in the same way as find: {id: {$in: [1234,1235]} or {id: [1234,1235]}

```


Types
----------
Cassie supports the following types. Note that arrays and Maps must have defined types.

String
Number (can specify Int by using cassie.types.Int, Double by cassie.types.Double, or Long by cassie.types.Long) - default is Int if you use Number
Date (a timestamp)
ObjectId (specified by cassie.types.ObjectId or cassie.types.uuid) - this is a uuid v4
Buffer (Cassandra stores as blobs)
Arrays (must specify internal type, like: [String])
Maps (must specify internal types, like {String: String} - arbitrary maps are not supported, use Buffers instead)

Sync
----------

Syncing is the process of creating keyspaces (similar to a database in traditional RDBMs) and column families (similar to tables) from your schemas. Cassie handles the process of syncing via its syncTables function. Sync tables will create a keyspace if it doesn't exist, create column families if they don't exist, and alter column families if you've added fields to your schemas. Syncing also creates a primary key with the name of 'id' if you don't specify a different primary key. This allows you to rapidly iterate on modifying your schemas and keep your tables in sync. 

However, syncing has some limitations in its current form. 

Syncing cannot alter column names, so if you decide to change your column name, you would have to use cqlsh (see CQL documentation on ALTER TABLE with the RENAME clause [here](http://www.datastax.com/documentation/cql/3.0/cql/cql_reference/alter_table_r.html). This is because cassie doesn't know what you previously defined a column as (and it has no way of knowing that information).

Cassie cannot change the types of already defined columns. This is currently a limitation of Cassie's sync function and may be added later (see roadmap). 

Cassie also cannot change the primary key for any table after it has been created. This is a limitation of Cassandra.

Finally, Cassie does not delete columns or tables from your database if they aren't defined. You can pass a "warning: true" option to sync tables to tell you which columns are missing from your schemas, but Cassie will not delete the columns for you (to prevent unintended data loss). This is what "syncing forward" implies.

Here is an example of using sync tables to sync two tables to the database with debugging and warning flags enabled:

```

        //User Schema
        var UserSchema = new Schema({
            username: String,
            email: {type: String, required: true},
            hashed_password: {type: String, required: true},
            blogs: [cassie.types.uuid]});

        //Blog Schema
        var BlogSchema = new Schema({title: {type: String, required: true}, content: String, author: String});

        //Registers the schemas with cassie
        var User = cassie.model('User', UserSchema);
        var Blog = cassie.model('Blog', BlogSchema);
        
        var syncOptions = {debug: true, prettyDebug: true, warning: true};
        cassie.syncTables(config, syncOptions, function (err) {
            console.log(err);
        });

```

When writing an application, the general idea is that you preload all your schemas into cassie, then sync your models once before running your other code (ie before starting an express application or web server). This will give you access to all your models whenever you need them by using the cassie.model('ModelName') function. An example of this process is given in the [wiki](http://wiki).

Primary Keys
----------
Cassandra requires a primary key for all column families. This means that you would need to define a primary key whenever creating a table. Cassie relaxes that restriction slightly by allowing you to define Schemas without primary keys. However, what Cassie does internally is create an 'id' field on your Schema and adds a pre-save hook to generate an id for all new models (see "Hooks" for how you can do the same with your own fields). Cassie then marks this 'id' field as your primary key. This is important to note because primary keys cannot be modified using an ALTER TABLE command. In Cassandra, once your primary key has been set for a table, you're not allowed to modify it. If you want sophisticated primary keys (like composite primary keys), you need to design your Data Model appropriately from the beginning and make sure that you define it correctly in your Schema.
 
 See "Data Modeling" notes for more information on designing appropriate models for common use cases. Take particular note of how composite primary keys can be used for quick advanced queries.

The examples below show how a primary key can be explicitly defined on a field, how a composite primary key can be defined, and how to allow Cassie to generate a primary key for you:

```

    //Explicitly defining a primary key
    var DogSchema = new Schema({
        'dog_id': {type: Number, primary: true},
        'fname': String,
        'lname': String
    });
    
    //Explicitly defining a composite primary key
    var DogeSchema = new Schema({
        'dog_id': {type: Number},
        'fname': String,
        'lname': String
    }, {primary: ['dog_id', 'fname']});
    
    //Explicitly defining a composite primary key
    var DawgSchema = new Schema({
        'dog_id': {type: Number},
        'fname': String,
        'lname': String
    }, {primary: [['dog_id','fname'], 'lname']});
    
    //Cassie defines 'id' field for you - Note that in this case 'dog_id' is NOT the primary key, 'id' is (and 'id' is a uuid v4 type)
    var DagSchema = new Schema({
        'dog_id': {type: Number, default: 'uuid'},
        'fname': String,
        'lname': String
    });

```

Secondary Indexing
----------
Cassie supports secondary indexes on fields with the following option {index: true}. See the example below:

    //Explicitly defining a primary key and defining a secondary index
    var DogSchema = new Schema({
        'dog_id': {type: Number, primary: true},
        'fname': {type: String, index: true},
        'lname': String
    });
    
    //Alternative way of defining a secondary index
    DogSchema.index('lname');

Validations
----------
Validations are a core part of Cassie's Object Data Model. Validations allow you to easily reject inserts and updates across all your models in javascript without ever hitting your database. Cassie comes with internal support for a "required" validation and also allows you to validate any field with a custom function.

```

    //Requiring that 'fname' is provided (is not null)
    var DogSchema = new Schema({
        'dog_id': {type: Number, primary: true},
        'fname': {type: String, required: true},
        'lname': String
    });

    //Adding a custom validation to 'lname'
    DogSchema.validate('lname', function(model, fieldKey) {
        return (model[fieldKey] === 'doge');
    });

    //A validate function is passed the model and the fieldKey to validate. It returns true or false.
    //The validation function above requires that 'lname' is equal to 'doge' for all models

```

Hooks
----------

Cassie supports pre-save and pre-remove hooks for its models. It also supports post-init, post-validate, post-save, and post-remove hooks. The example below shows all of these being used.

```

    var TrickSchema = new Schema({'name': {type: String, index: true}});
    
    TrickSchema.post('init', function (model) {
        console.log("Initialized Trick");
    });
    
    TrickSchema.post('validate', function (model) {
        console.log("Validated Trick");
    });
    
    TrickSchema.pre('save', function (model) {
        console.log("About to save (insert or update) trick to database");
    });
    
    TrickSchema.post('save', function (model) {
        console.log("Saved Trick to database");
    });
    
    TrickSchema.pre('remove', function (model) {
        console.log("About to remove trick (or trick fields) from database");
    });
    
    TrickSchema.post('remove', function (model) {
        console.log("Removed trick (or trick fields) from database");
    });
    
    cassie.model('Trick', TrickSchema);

```

Note that hooks are only called on Cassie object instances, not when performing Model.update or Model.remove (because those are direct database calls that don't generate any Cassie instances).

Plugins
----------
Models support plugins. Plugins allow you to share schema properties between models and allow for pre-save hooks, validations, indexes, pretty much anything you can do with a Schema. Note that you can't modify primary keys or add primary keys in a plugin.

```
    
    //updatedAtPlugin.js
    module.exports = exports = function updatedAtPlugin(schema, options) {
        schema.add({updated_at: Date});
    
        schema.pre('save', function(model) {
            model.updated_at = new Date();
        });
    
        if(options && options.index) {
            schema.index('updated_at');
        }
    };
    
    //user.js
    var updatedAtPlugin = require('./updatedAtPlugin');
    var UserSchema = new Schema({name: String});
    UserSchema.plugin(updatedAtPlugin, {index: true});
    
    //blog.js
    var updatedAtPlugin = require('./updatedAtPlugin');
    var BlogSchema = new Schema({title: String});
    BlogSchema.plugin(updatedAtPlugin, {index: true});

```

Lightweight Transactions
----------

Cassie supports lightweight transactions for saving data via the {if_not_exists: Boolean} option.

Note that currently, the IF field = value clause is not supported for updates (on roadmap).

```

    var User = cassie.model('User');
    
    //Assumption is that user_id is primary key
    var new_user = new User({user_id: 2000, name: 'steve'});
    
    new_user.save({if_not_exists: true}, function(err) {
        //Handle errors, etc.
    });

```


Time to Live (TTL)
----------
Cassie supports specifying a TTL when inserting data via the {ttl: Number} option, where Number is the time in seconds. Also see "Sessions".

```

    var Post = cassie.model('Post');
    
    var new_post = new Post({title: 'My time limited post'});

    new_post.save({ttl: 86400}, function(err) {
        //Handle errors, etc.
    });

```

Limit
----------
Cassie can limit your queries based on options or by chaining queries. See the examples below:

```

    var User = cassie.model('User');
    
    User.find({}, {limit: 10, sort: {name: 1}}, function(err, users) {
        console.log(users.toString());
    });
    
    //Same query as above using chaining
    User.find({}).limit(10).sort({name: 1}).exec(function(err, users) {
        console.log(users.toString());
    });
    

```

Batching
----------
Cassie can batch queries together to run at once. This is done by not specifying a callback to an insert or delete function and passing an array of queries to cassie.batch(). See the example below:

```

    var User = cassie.model('User');
    var new_user_1 = new User({name: 'Bob'});
    var new_user_2 = new User({name: 'Steve'});
    
    var query_1 = new_user_1.save();
    var query_2 = new_user_2.save();
    
    var batchOptions = {debug: true, prettyDebug: true, timing: true};
    cassie.batch([query1, query2], batchOptions, function(err) {
        //Handle errors, etc.
    });
    

```

Execute Prepared
----------
Cassie can execute prepared queries by passing in a "prepared" option when calling exec (either through a callback or through Query.exec() directly). See the examples below:

```

    var User = cassie.model('User');
    
    User.find({id: {$in: [1000, 1001, 1002, 1003]}}, {prepared: true}, function(err, users) {
        //Handle errors, do stuff w/ results
    });
    
    //This is equivalent to the above
    var query = User.find({id: {$in: [1000, 1001, 1002, 1003]}});
    query.exec({prepared: true}, function(err, users) {
        //Handle errors, do stuff w/ results
    });

```

Streaming
----------
Cassie supports streaming results via a Query.stream(options, callback) method. This returns a readable stream (can view documentation for node-cassandra-cql streams as well). See the example below:

```

    var User = cassie.model('User');
    
    var query = User.find({id: {$in: [1000, 1001, 1002, 1003]}});
    query.stream()
        .on('readable', function() {
            var row;
            while(row = this.read()) {
                console.log(row);
            }
        })
        .on('end', function() {
            //Stream ended
        })
        .on('error', function() {
            //Stream error
        });

```

Client Connections and raw queries
----------
Client connections are handled by node-cassandra-cql. Cassie encapsulates a connection internally, but you can also use the node-cassandra-cql connection directly for CQL queries:

```

    var cassie = require('cassie-odm');
    var connection = cassie.connect({keyspace: "mykeyspace", hosts: ["127.0.0.1:9042"]});
    
    connection.execute("SELECT * FROM cats", [], function(err, results) {
        if(err) return console.log(err);
        console.log("meow");
    });
    
```

Common Issues using Cassandra
----------
Write some common differences between CQL and RDBMs (SQL). What is not supported by CQL. Write some differences between Cassandra and MongoDB.

Why Cassandra
----------
Why would you want to use Cassandra with those limitations? Cassandra provides a truly distributed, fault tolerant design (kind of like auto-sharded, auto-replicated, master-master). Cassandra is designed so that if any one node goes down, you can create another node, attach it to the cluster, and retrieve the "lost" data without any downtime. Cassandra provides linearly scalable reads and writes based on the number of nodes in a cluster. In other words, when you need more reads/sec or writes/sec, you can simply add another node to the cluster. Finally, with Cassie, you get relatively easy data modeling in nodejs that compares to the ease of use of MongoDB using Mongoose (once you understand some data modeling differences).

When to use Cassandra
----------

With all that being said, there are some use cases where it would be easier to use MongoDB or MySQL / PostgreSQL as opposed to Cassandra. 

Data Modelling Notes
----------
Write some notes on how to properly model data in Cassandra.

Common Examples
----------

Pagination Example

Common schemas / Data models in Cassandra

Session Storage
----------
See [cassie-store](http://github.com/Flux159/cassie-store) for an express compatible session store. Also has notes on how to manually create a session store using cassie.

Not yet supported (on roadmap)
----------

Cassie Side:
* Hinting - node-cassandra-cql supports hinting (if you want to use it, use the connection provided or cassie.cql)
* Paging - need to support some form of client side paging for common use case (I'm thinking primary key timestamp based?)
* Default - when adding a column, specify default value (in schema / sync)
* Optional - specify table name when creating (in schema options - should automatically sync to use that tableName)
* Additional Lightweight Transactions - specifically IF field = value (currently only supports IF NOT EXISTS clause)
* Collections - collection modifications (UPDATE/REMOVE collection in single query with IN clause)
* Queries loaded from external CQL files
* Counters are not supported by Cassie
* Create table doesn't support options yet: Currently doesn't support properties like compression, compaction, compact storage - would need to add to options parsing for sync
* Stream rows - node-cassandra-cql supports it, but it was failing in Cassie's tests, so its not included
* Change type of defined columns - should be possible, but need a translation layer between Cassandra's Java Marshaller classes and Cassie types
* Not on roadmap: Connecting to multiple keyspaces (ie keyspace multi-tenancy with one app) - Can currently use a new connection and manually run CQL, but can't sync over multiple keyspaces because schemas and models are tied to a single cassie instance. Current way to deal with this is to use a separate server process (ie a different express/nodejs server process) and don't do multitenancy over multiple keyspaces in the same server process.

Driver Side:
* Input Streaming - not supported by node-cassandra-cql yet
* SSL Connections - not supported by node-cassandra-cql yet
* Auto determine other hosts - not supported by node-cassandra-cql yet
* "Smart connections" - Only send CQL request to the hosts that contain the data (requires knowing about how the data is sharded) - this might have to be based on your Schemas
* Possibly switch to officially supported native C/C++ driver when out of beta (would need to test performance and wrap in javascript) - https://github.com/datastax/cpp-driver

Testing & Development
----------
Pre-reqs:
Nodejs installed and a Cassandra server running on localhost:9160 (see [wiki](http://wiki) for more information on installing Cassandra).
Clone the repository and run the following from command line:

```

    npm install && npm test

```

Note: 'npm test' creates a keyspace "CassieTest" on your local Cassandra server then deletes it when done.

Get code coverage reports by running 'npm run test-coverage' (coverage reports will go into /coverage directory).

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
