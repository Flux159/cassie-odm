'use strict';

module.exports = {
    cassandra: {
        options: {
          	hosts: [
              "127.0.0.1:9042"
          	],
            keyspace: "mykeyspace",
						//username: 'testuser',
						//password: 'test1234',
						staleTime: 100, //Time in milliseconds before trying to reconnect to a node
						maxExecuteRetries: 3, //The maximum amount of times an execute can be retried in case server is unhealthy
						poolSize: 5 //Number of connections to open for each host: Default is 1 - I think I should change this in cassie to be 5 as default
            }
    },
}
