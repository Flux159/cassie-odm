These files aren't put into automated testing because they are literally just copy pastes from the readme. To make them into automated tests, it would require changing some of them to run code in callbacks, use async, etc. which is kind of a pain. They are run manually mostly to check that the readme examples work correctly. Eventually it would be a good idea to put them into the test suite (and it would definitely help with code-coverage).

Run each of these individually by running: node ./path/to/test
