function parseResults(results) {
	
	//TODO: Parsed results need to be objects w/ save/delete methods (and probably hold references to connection interally as well then, along w/ _is_dirty flag - need a markModified method), _is_dirty is probably going to need to be an object (because I don't want to update all the fields - probably only the )
	
			//TODO: Need to do dirty flags for save / update / delete (probably going to have to make an object / return objects w/ save / delete methods, etc.)
	
	var parsedResults;
	
	//TODO: Make these Model objects
	if(results) {
		parsedResults = results.rows;
		parsedResults.forEach(function(parsedResult) {
			delete parsedResult.columns;
		});
	}
	
	//This needs save / update / _is_dirty flag
	
	return parsedResults;
}

function Query(queryString, options, connection) {
	
	this.queryString = queryString;
	
	this.limit = function(limitAmount) {
		if(typeof limitAmount !== 'number') {
			throw "Limit argument must be a number";
		}
		//Add limit to query (no execution) - return this
		
		//Remove "ALLOW FILTERING" and add back on
		var appendFiltering = false;
		if(this.queryString.indexOf("ALLOW FILTERING") > -1) {
			this.queryString = this.queryString.replace("ALLOW FILTERING", "");
			appendFiltering = true;
		}
		
		//LIMIT clause
		this.queryString = queryString + "LIMIT " + limitAmount.toString() + " ";
		
		if(appendFiltering) {
			this.queryString = queryString + "ALLOW FILTERING";
		}
		
		return this;
	};
	this.sort = function(sortObject) {
		//sortObject is {field: 1} or {field: -1} (for sorting by Ascending / Descending order)
		
		
		
		//Add sort to query (no execution) - return this
		
		//ORDER BY clause
		
		
	};
	this.exec = function(callback) {
		//Execute saved query (if the user doesn't supply a callback, then it should use nullCallback - ie execute async)
		
		connection.execute(queryString, options, function(err, results, metadata) {
			
			var parsedResults = parseResults(results); 
			
			(callback || nullCallback)(err, parsedResults, metadata);
			// callback(err, parsedResults, metadata);
		});
		
	};
	
}

module.exports = exports = Query;
