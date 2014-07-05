
//View this table for all types in CQL:
//http://www.datastax.com/documentation/cql/3.0/cql/cql_reference/cql_data_types_c.html

//To support varint, might want to take a look at bignum:
//https://github.com/justmoon/node-bignum

//See this for datatypes: (seems more up to date) http://www.datastax.com/documentation/cassandra/1.2/cassandra/tools/use_about_data_types_c.html

//This is pretty much just a conversion from Javascript types (and Cassie aliases for types) to CQL types

module.exports = {
	ObjectId: 'uuid', //Both of these should be longs
	uuid: 'uuid',
	timeuuid: 'timeuuid',
	Number: 'bigint', //Number's without decimals should be stored as ints/longs, numbers with decimals should be stored as floats/doubles - need to figure out a nice way of doing this...
	Integer: 'varint',
	inet: 'inet', //String
	int: 'int',
	double: 'double',
	float: 'float',
	String: 'varchar',
	text: 'varchar',
	varchar: 'varchar',
	timestamp: 'timestamp',
	BigInteger: 'bigint',
	long: 'bigint',
	Boolean: 'boolean',
	Object: 'map',
	Array: 'list',
	Date: 'timestamp',
	Set: 'set',
	Bignum: 'varint',
	varint: 'varint',
	counter: 'counter',
	blob: 'blob',
	ascii: 'ascii' 
	//ETC TODO: Finish types
};
