var assert = require('assert');

describe('Modeling', function () {
    it('Should run the test successfully (from readme)', function (done) {

        var cassie = require('../../lib/cassie'),
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
                    done(); //Added to complete test (not in modeling documentation)
                });
            });

        });

    });

});
