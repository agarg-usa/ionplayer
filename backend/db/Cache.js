class Cache {
	constructor(){}

	fromDB(cache){
		this._id = cache._id;
		this.id = cache.id;
		this.title = cache.title;
		this.thumbnails = cache.thumbnails;
		this.duration = cache.duration;
		this.author_name = cache.author_name;
		this.author_avatar = cache.author_avatar;
		this.published_date = cache.published_date;
		this.cache_date = cache.cache_date;
		this.playable = cache.playable;

		return this;
	}

	publicEntries(){
		return {
			id: this.id,
			title: this.title,
			thumbnails: this.thumbnails,
			duration: this.duration,
			author_name: this.author_name,
			author_avatar: this.author_avatar,
			published_date: this.published_date,
			playable: this.playable,
			/* only exists when API Manager writes this field for returning the result to user */
			platform: this.platform
		};
	}

	unplayableEntries(){
		return {
			playable: this.playable,
			cache_date: this.cache_date
		};
	}

	fromResult(result, time){
		this.author_name = result.author_name;
		this.author_avatar = result.author_avatar;
		this.title = result.title;
		this.thumbnails = result.thumbnails;
		this.duration = result.duration;
		this.id = result.id;
		this.published_date = result.published_date;
		this.cache_date = time;
		this.playable = !result.unplayable_reason;

		return this;
	}
}

Cache.fromDB = function(cache){
	if(cache)
		return new Cache().fromDB(cache);
	return null;
};

Cache.fromDBMany = function(results){
	for(var i = 0; i < results.length; i++)
		results[i] = Cache.fromDB(results[i]);
	return results;
};

Cache.fromResult = function(result, time){
	if(result)
		return new Cache().fromResult(result, time);
	return null;
};

module.exports = Cache;