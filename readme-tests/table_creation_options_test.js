


var assert = require('assert');

var cassie = require('../lib/cassie'),
    Schema = cassie.Schema;

var connectOptions = {hosts: ["127.0.0.1"], keyspace: "CassieTest"};
cassie.connect(connectOptions);

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

//var EventSchema = new Schema({
//        event_type: String,
//        insertion_time: cassie.types.Timestamp,
//        event: cassie.types.Blob
//    },
//    {
//        primary: ['event_type', 'insertion_time'],
//        create_options: {
//            clustering_order: {'insertion_time': -1},
//            compression: {'sstable_compression' : 'DeflateCompressor', 'chunk_length_kb':64},
//            compaction: {'class': 'SizeTieredCompactionStrategy', 'min_threshold':6}
//        }
//});

var Event = cassie.model('Event', EventSchema);

var options = {debug:true, prettyDebug: true};
cassie.deleteKeyspace(connectOptions, options, function(err) {

    cassie.syncTables(connectOptions, options, function(err) {
        if(err) console.log(err);

        cassie.close();
    });

});

