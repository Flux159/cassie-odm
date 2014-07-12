Cassie
=====
Cassie is a model layer and CQL generator written in javascript that uses the [node-cassandra-cql](https://github.com/jorgebay/node-cassandra-cql) project and attempts to mimic most of mongoose's API to allow for easy switching between MongoDB and Cassandra. Note that Cassie-ODM is not currently a full 1:1 mapping to mongoose's API (and probably will never be due to certain architectural differences between Cassandra and MongoDB).

Cassie is currently in beta (as of v0.1.0). Use at your own risk in production environments.

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

NOTE: Make sure to read about "Keyspace Replication Strategies and Production Notes" if you intend on using Cassandra in Production. It is required to understand replication strategies for production, particularly for automated deployment setups.

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

A final thing to note is that you can specify Keyspace replication strategy's in your Cassie config (if you let Cassie create your keyspaces for you - you can do this yourself through cqlsh, but Cassie can automate the process as well). See "Keyspace Replication Strategy and Production Notes" for more information.

Table Creation Options
----------

WITH CLUSTERING
ORDER BY


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
    
    TrickSchema.post('save', function (model, err, results) {
        if(!err) console.log("Saved Trick to database");
    });
    
    TrickSchema.pre('remove', function (model) {
        console.log("About to remove trick (or trick fields) from database");
    });
    
    TrickSchema.post('remove', function (model, err, results) {
        if(!err) console.log("Removed trick (or trick fields) from database");
    });
    
    cassie.model('Trick', TrickSchema);

```

Note that hooks are only called on Cassie object instances, not when performing Model.update or Model.remove (because those are direct database calls that don't generate any Cassie instances).

Plugins
----------
Models support plugins. Plugins allow you to share schema properties between models and allow for pre-save hooks, validations, indexes, pretty much anything you can do with a Schema. Note that you can't modify primary keys or add primary keys in a plugin.

```
    
    //updatedAtPlugin.js
    function updatedAtPlugin(schema, options) {
        schema.add({updated_at: Date}); //Adds a field to the model instance
    
        schema.addQuery({'get': function(args, callback) {
            console.log("Inside Model get function");
            var results = args;
            callback(results);
        }});
        //Adds a function to query by on Model class (like Model.find, Model.update, Model.remove)
        //This can be useful when making plugins that add query logic to a Model class
        //Example: Integrate an external data source / index in a plugin (like a search index), then add a method that will query that external data source
        //Combining pre/post save logic and queries can allow for expressive plugins
    
        schema.pre('save', function(model) {
            model.updated_at = new Date();
        });
    
        if(options && options.index) {
            schema.index('updated_at');
        }
    }
    
    //user.js
    //var updatedAtPlugin = require('./updatedAtPlugin');
    var UserSchema = new Schema({name: String});
    UserSchema.plugin(updatedAtPlugin, {index: true});
    
    //blog.js
    //var updatedAtPlugin = require('./updatedAtPlugin');
    var BlogSchema = new Schema({title: String});
    BlogSchema.plugin(updatedAtPlugin, {index: true});
    
    var User = cassie.model('User', UserSchema);
    var Blog = cassie.model('Blog', BlogSchema);

    //Can now perform queries like:
    User.get('args', function(results) {
        console.log(results);
    });

```

Lightweight Transactions
----------

Cassie supports lightweight transactions for saving new data via the {if_not_exists: Boolean} option.

For updating data, you can use the IF field = 'value' CQL command by passing {if: {field: value}} as an option to save.

```

    var User = cassie.model('User');
    
    //Assumption is that user_id is primary key
    var new_user = new User({user_id: 2000, name: 'steve'});
    
    new_user.save({if_not_exists: true}, function(err) {
        //Handle errors, etc.
        
        //Same user using IF field = value
        new_user.name = "bill";
        
        new_user.save({if: {name: 'bob'}, debug: true}, function(err) {
            
            //Handle errors, etc.
            //Note that this query will not update new_user because new_user's name is not 'bob'
        
        });
        
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

Limit & Sorting
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

    var new_user_1 = new User({user_id: 1000, name: 'Bob'});
    var new_user_2 = new User({user_id: 2000, name: 'Steve'});

    var query_1 = new_user_1.save();
    var query_2 = new_user_2.save();

    var batchOptions = {debug: true, prettyDebug: true, timing: true};
    cassie.batch([query_1, query_2], batchOptions, function(err) {
        //Handle errors, etc.
        if(err) console.log(err);
    });
    

```

Execute Prepared
----------
Cassie can execute prepared queries by passing in a "prepared" option when calling exec (either through a callback or through Query.exec() directly). See the examples below:

```

    var User = cassie.model('User');
    
    User.find({user_id: {$in: [1000, 1001, 1002, 1003]}}, {prepared: true}, function(err, users) {
        //Handle errors, do stuff w/ results
    });
    
    //This is equivalent to the above
    var query = User.find({user_id: {$in: [1000, 1001, 1002, 1003]}});
    query.exec({prepared: true}, function(err, users) {
        //Handle errors, do stuff w/ results
    });

```

Streaming
----------
Cassie supports streaming results via a Query.stream(options, callback) method. This returns a readable stream (can view documentation for node-cassandra-cql streams as well). See the example below:

```

    var User = cassie.model('User');
    
    var query = User.find({user_id: {$in: [1000, 1001, 1002, 1003]}});
    query.stream()
        .on('readable', function() {
            var row;
            while(row = this.read()) {
                console.log(row);
            }
        })
        .on('end', function() {
            //Stream ended
            console.log("Stream ended");
            cassie.close();
        })
        .on('error', function(err) {
            //Stream error
            console.log(err);
        });

```

Timing, Debugging, and Logging
----------
Cassie supports timing and debugging capabilities (including a prettyDebug mode which prints using colored text to a supported terminal and is far more human readable than standard debugging). These options are supported on almost all Cassie queries (timing is not supported on sync tables because it should really only be called once after preloading all your schemas). To use the options, simply pass the following object to a query as part of its options:

```

    var options = {debug: true, timing: true, prettyDebug: true};
    
    //Examples
    
    //User.find({}, options, callback);

    //var user = new User({name: 'Steve'});
    //user.save(options, callback);
    
    //var query = user.save();
    //query.exec(options, callback);

```

You can also pass a logger like [winston](https://github.com/flatiron/winston) in by providing the winston object in the "logger" property.

```
    var winston = require('winston');
    var options = {debug: true, timing: true, logger: winston};
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

Advanced Table Creation Options
----------
There are a few queries that can be efficiently executed if you use on-disk sorting of columns when creating tables. Cassie allows you to specify options for creating tables when defining your schemas. See "Data Modeling Notes" for more information on efficient client queries. See [Using Clustering Order](http://www.datastax.com/documentation/cql/3.1/cql/cql_reference/refClstrOrdr.html) for Clustering Order option. Cassie only supports the clustering order option at the moment (adding all table properties is on the roadmap, you can modify them manually currently using CQL's ALTER TABLE command).

See [CQL Create Table documentation](http://www.datastax.com/documentation/cql/3.1/cql/cql_reference/create_table_r.html) and [CQL Table Properties](http://www.datastax.com/documentation/cql/3.1/cql/cql_reference/tabProp.html) for all the advanced options. 

```

var EventSchema = new Schema({
        event_type: String,
        insertion_time: cassie.types.Timestamp,
        event: cassie.types.Blob
    },
    {
        primary: ['event_type', 'insertion_time'],
        create_options: {
            clustering_order: {'insertion_time': -1}
        }
    });

```


Keyspace Replication Strategy and Production notes
----------

By default, cassie assumes that you are developing locally and creates keyspaces with a "Simple Replication Strategy" and a replication factor of 1. This is not ideal for a production setup. A production Cassandra cluster will generally have a minimum of 3 nodes, a "Network Topology Replication Strategy" and a replication factor of 3. What this means is that you have 3 instances of Cassandra running (generally on separate servers). This allows you to survive the loss of one of the servers without losing your data (and once a third node is added back, Cassandra will automatically populate the node with the data it needs). Since cassie can create keyspaces, it needs to know what strategy to use when creating the keyspace. It does this by checking for options in your connection configuration. Specifically, it checks for a field "replication" that contains an object with the replication options. See the example below for the default setting and for a standard "Network Topology with replication factor of 3" setting.

```

    //Standard setting (passed to cassie)
    config {
        hosts: ['127.0.0.1', '127.0.0.2', '127.0.0.3'],
        keyspace: 'mykeyspace',
        replication: {
            strategy: 'SimpleStrategy', //Default is 'SimpleStrategy', NOTE: Use 'NetworkTopologyStrategy' for production
            replication_factor: 1, //Default is 1 (only used with SimpleStrategy). Not used for 'NetworkTopologyStrategy'
            strategy_options: { //Strategy options is only used for NetworkTopologyStrategy, not for SimpleStrategy
                '0': 3
                // '10':3,
                // '20':3
            }
    }
    
    //Strategy options is only taken into account for NetworkTopologyStrategy - if not specified, then throws error if trying to sync. The key specified in strategy options is your database name (which varies based on what "Snitch" you set in your cassandra.yaml file. For a file property based snitch, you would define it to be your database name. The '0' here is specified if you use a RankInferringSnitch and your database is located at an internal IP of xxx.0.xxx.xxx (see Cassandra Documentation for more information).
    

```

Common Issues using Cassandra
----------
 
You can't sort or use greater than or less than operators on a non-composite primary key column (see example below on what you can sort on). Partition keys can only be searched using equality or "IN". The way to get around this is to use composite primary keys with the appropriate columns. Because of this, you need to design your data models differently (full normalization is generally not a good idea, your data needs to be partially denormalized for good consistent performance - see Data modeling notes for more information).
  
According to some Datastax documentation, secondary indices are usually only good when you have fields that are common across many rows. A good example is when you have a list of people, each containing state and country information. You would put a secondary index on the state field and on the country field if you wanted to query "What users are located in this state" or "What users are located in this country". You can only use equality operators on secondary indices (see example below)
  
Unlike MySQL, PostgreSQL, or other Relational Databases, you can't do JOINs across tables in Cassandra. This also means that its not a good idea to fully normalize your data (see "Data Modeling Notes". 
  
Unlike MongoDB (or recent versions of PostgreSQL), you can't put arbitrary JSON data into Cassandra (must define a schema - although you can always add columns later). Note that you can put blobs/buffers into Cassandra, but its generally not a good idea to consistently use Blobs. Cassie relaxes schema definitions significantly by auto syncing your tables and warning you when your schema may be missing columns that are defined in the database.
   
Unlike MongoDB and Riak, Cassandra doesn't come with full text search built-in. You would need to use Apache Solr, Elastic Search, or any other full text search indexing engine to support full text search (Datastax Enterprise is built on top of Cassandra and has Apache Solr integration; you can also achieve something similar by writing an Elastic Search river that pulls data from Cassandra / is pushed data from your app or a Cassandra 2.1 Trigger). Note that with any full-text search indexing solution that is not directly tied to your primary data store, you can end up with consistency issues. The tradeoff is that by not directly tying your search indices in your database, you can scale each component separately (and deal with the consistency issue by manually pushing/pulling data into your search index).
   
Cassandra is not a graph database like neo4j or OrientDB, but you can apparently integrate Titan with Cassandra for Graph / Geolocation type queries.

Cassandra does not come with Map Reduce capabilities built in, but you can integrate with Apache Spark / Apache Hadoop for advanced Map Reduce queries / operations (Datastax Enterprise apparently comes with integrations for Hadoop).

See Data Modeling Notes and Common Examples for how to model common use cases (One-to-many modeling, Many-to-many modeling, transactions, pagination, etc.) and how to use Cassandra effectively.

```

    //Can't sort on name
    var UserSchema = new Schema({user_id: Number, name: String}, {primary: ['user_id']});
    var User = cassie.model('User', UserSchema);
    User.find({user_id: [1000, 1001, 1002, 1003]}).sort({name: 1}).exec(callback);
    
    //Can't sort on name
    var UserSchema = new Schema({user_id: Number, name: String}, {primary: ['user_id']});
    UserSchema.index('name');
    var User = cassie.model('User', UserSchema);
    User.find({user_id: [1000, 1001, 1002, 1003]}).sort({name: 1}).exec(callback);

    //Can sort on name (Composite primary key)
    var UserSchema = new Schema({user_id: Number, name: String}, {primary: ['user_id', 'name']});
    var User = cassie.model('User', UserSchema);
    User.find({user_id: [2000, 2001, 2002, 2003]}).limit(10).sort({name: 1}).exec(callback);
    
    //Secondary index can only use '=' operator
    var UserSchema = new Schema({user_id: Number, name: String}, {primary: ['user_id']});
    UserSchema.index('name');
    var User = cassie.model('User', UserSchema);
    User.find({name: 'smith'}, callback); //Works
    User.find({name: ['smith', 'bob']}, callback); //Doesn't work
    User.find({name: {$gt: 'bob', $lt: 'smith'}}, callback) //Doesn't work


```

Why Cassandra
----------

Cassandra provides a truly distributed, fault tolerant design (kind of like an auto-sharded, auto-replicated, master-master database). Cassandra is designed so that if any one node goes down, you can create another node, attach it to the cluster, and retrieve the "lost" data without any downtime (based on your cluster settings). Cassandra provides linearly scalable reads and writes based on the number of nodes in a cluster (and is highly optimized for write throughput). In other words, when you need more reads/sec or writes/sec, you can simply add another node to the cluster. This means that your database can scale automatically similarly to how your API layer can (with good data modeling practices, some initialization scripts & virtual machine tweaks of course).
 
 If you follow good data modeling practices, (see "Data Modeling Notes"), you can do most queries that you would normally do in SQL databases or MongoDB using just CQL (some exceptions are full-text search, graph queries, map reduce jobs - see Elastic Search / Solr for search, Titan for graph queries, Apache Spark / Hadoop for map reduce jobs).
 
 In addition, Cassandra is built with multi-datacenter support (across Wide Area Networks (WAN)).
 
 Also see [this](http://planetcassandra.org/what-is-apache-cassandra/).
 
Data Modelling Notes
----------

Datastax has tutorials on data modeling:

[Datastax Data Modeling](http://www.datastax.com/resources/data-modeling)

In particular, see this one for common examples from traditional SQL Data modeling (One-to-many, Many-to-many, transactions): [Link](https://www.youtube.com/watch?v=px6U2n74q3g)

Its highly recommended that you view at least the above video and read these two tutorials on Cassandra Data Modeling before designing your models.

[Cassandra Data Modeling Best Practices Part 1 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/07/16/cassandra-data-modeling-best-practices-part-1/#.U7YP_Y1dU_Q)
[Cassandra Data Modeling Best Practices Part 2 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/08/14/cassandra-data-modeling-best-practices-part-2/#.U7YQGI1dU_Q)

This is a powerpoint based on the above articles [Cassandra Data Modeling Best Practices](http://www.slideshare.net/jaykumarpatel/cassandra-data-modeling-best-practices).

In addition, take a look at some of Datastax's other tutorials:

[Datastax Cassandra Tutorials](http://www.datastax.com/dev/tutorials)

Not yet supported (on roadmap)
----------

Cassie Side:
* Hinting - node-cassandra-cql supports hinting (if you need to use it, use the node-cassandra-cql connection to make your query)
* Optional - specify table name when creating (in schema options - should automatically sync to use that tableName)
* Collections - collection modifications - (UPDATE/REMOVE in single query with IN clause is supported, but Cassie doesn't do collection manipulation yet)
* Proper collection updates - list & map do not update accurately using Cassie (must manually use CQL for updates) - see [this video](https://www.youtube.com/watch?v=qphhxujn5Es) from 10-16 minutes.
* Queries loaded from external CQL files - [node-priam](https://github.com/godaddy/node-priam) supports this currently, it also supports Fluent syntax for manual cql creation, and some other options for retry handling.
* Counters are not supported by Cassie (alternative is to use Integers)
* Change type of defined columns - should be possible, but need a translation layer between Cassandra's Java Marshaller classes and Cassie types
* Stream rows - node-cassandra-cql supports it, but it was failing in Cassie's tests, so its not included at the moment (stream is included though and performs a similar function)
* Advanced table creation options - Not currently supported by cassie (alternative is to use ALTER TABLE in cqlsh or create table manually in cqlsh)
* Paging - Generic Paging support is not quite ready yet (to use client side paging, see "Data Modeling Notes", "Common Examples", and "Table Creation Options"). Also see driver issue below.

* Testing Update with TTL
* Migrating all tests to automated testing with Mocha / Istanbul (see readme-tests)

* Not on roadmap: Connecting to multiple keyspaces (ie keyspace multi-tenancy with one app) - Can currently use a new connection and manually run CQL, but can't sync over multiple keyspaces because schemas and models are tied to a single cassie instance. Current way to deal with this is to use a separate server process (ie a different express/nodejs server process) and don't do multitenancy over multiple keyspaces in the same server process.

Driver Side:
* Paging - Cassie supports rudimentary client side paging where the token and a count is provided, but the node-cassandra-cql driver doesn't seem to have support for native paging yet (as of v0.5.0). It seems to be in node-cassandra-cql master on github, but not in released versions.
* Input Streaming - not supported by node-cassandra-cql yet
* SSL Connections - not supported by node-cassandra-cql yet
* Auto determine other hosts - not supported by node-cassandra-cql yet
* "Smart connections" - Only send CQL request to the hosts that contain the data (requires knowing about how the data is sharded, apparently Netflix uses something like this) - this might have to be based on your Schemas & how Cassandra is handling the sharding based on partition key
* Possibly switch to officially supported native C/C++ driver when out of beta (would need to test performance, wrap C functions in javascript, and possibly do Javascript type to C type conversions / hinting in Cassie) - https://github.com/datastax/cpp-driver and see Apache JIRA for project

Testing & Development
----------
Pre-reqs:
Nodejs installed and a Cassandra server running on localhost:9042
Clone the repository and run the following from command line:

```

    npm install && npm test

```

Note: 'npm test' creates a keyspace "cassietest" on your local Cassandra server then deletes it when done.

Get code coverage reports by running 'npm run test-coverage' (coverage reports will go into /coverage directory - these reports are not exactly accurate because they don't take into account tests in the /readme-tests directory).

Submit pull requests for any bug fixes!

More information about Cassandra including Installation Guides, Production Setups, and Data Modeling Best Practices
----------

For information on Cassandra, go to the [Apache Cassandra homepage](http://cassandra.apache.org/).

For information on CQL, see [Cassandra 2.0 CQL Reference](http://www.datastax.com/documentation/cql/3.1/cql/cql_intro_c.html)

For information on Cassandra's fault-tolerant, distributed architecture, see [the original Facebook whitepaper on Cassandra annotated with differences](http://www.datastax.com/documentation/articles/cassandra/cassandrathenandnow.html). Alternatively, also read Google's [BigTable architecture whitepaper](http://static.googleusercontent.com/media/research.google.com/en/us/archive/bigtable-osdi06.pdf) and [Amazon's Dynamo whitepaper](http://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) as Cassandra's design was influenced by both.

For helpful tips on data modeling in Cassandra (particularly if you come from a SQL background), see these links:
* [Datastax Data Modeling](http://www.datastax.com/resources/data-modeling)
* [Datastax Cassandra Tutorials](http://www.datastax.com/dev/tutorials)
* [Cassandra Data Modeling Best Practices Part 1 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/07/16/cassandra-data-modeling-best-practices-part-1/#.U7YP_Y1dU_Q)
* [Cassandra Data Modeling Best Practices Part 2 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/08/14/cassandra-data-modeling-best-practices-part-2/#.U7YQGI1dU_Q)

Other databases to look at if Cassandra doesn't fit your data needs: MySQL, PostgreSQL, MongoDB, Riak, neo4j.

Some options to use if Cassandra doesn't support your query needs: Elastic Search / Solr for search indices, Titan for graph queries, Apache Spark / Apache Hadoop for map reduce operations, Apache Storm for general distributed data processing.
