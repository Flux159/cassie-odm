'use strict';

//Example config

module.exports = {
    cassandra: {
        options: {
            //These first options are all node-cassandra-cql options
            hosts: [
                "127.0.0.1:9042"
            ],
            keyspace: "mykeyspace",
            //username: 'testuser',
            //password: 'test1234',
            staleTime: 100, //Time in milliseconds before trying to reconnect to a node
            maxExecuteRetries: 3, //The maximum amount of times an execute can be retried in case server is unhealthy
            poolSize: 5, //Number of connections to open for each host: Default is 1 - I think I should change this in cassie to be 5 as default

            //Cassie specific (sync, create keyspaces, replication strategy)
            sync: true, //Default is true (note that it only creates keyspaces, adds columnfamilies, adds columns, syncing never deletes - use cqlsh manually to delete)
            replication: {
                strategy: 'SimpleStrategy', //Default is 'SimpleStrategy', NOTE: Use 'NetworkTopologyStrategy' for production (assumption is that options is defined inside of a config file that is loaded differently based on environment)
                replication_factor: 1, //Default is 1 (only used with SimpleStrategy)

                strategy_options: { //Strategy options is only taken into account for NetworkTopologyStrategy - if not specified, then throws error if trying to sync.
                    '0': 3
                    // 'us-east':3,
                    // 'us-west':3
                }
            }
        }
    }
};
