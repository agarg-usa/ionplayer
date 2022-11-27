const {StreamError, ServerError, DatabaseError} = require("./Errors");

const StringCheck = require('./util/StringCheck');
const CacheManager = require('./CacheManager');
const Cache = require("./db/Cache");

const platformNames = [];
const platforms = {
	youtube: {
		api: require('./source/youtube'),
		short: 'yt'
	},

	spotify: {
		api: require('./source/spotify'),
		short: 'sp'
	},

	soundcloud: {
		api: require('./source/soundcloud'),
		short: 'sc'
	}
};

const platformsShort = {};

for(const name in platforms){
	platforms[name].name = name;
	platformsShort[platforms[name].short] = name;
	platformNames.push(name);
}

const APIError = require("./source/apierror");

const debug = require('../debug');
const Logger = debug.getLogger("APIs");

const Manager = (new class{
	constructor(){
		CacheManager.init(platformNames);
	}

	async ready(){
		await CacheManager.ready();
	}

	clean(result){
		/* if these fields don't exist, don't overwrite existing ones in the database */
		if(!result.thumbnails)
			delete result.thumbnails;
		if(!result.title)
			delete result.title;
		if(!result.author_name)
			delete result.title;
		if(!result.duration)
			delete result.duration;
		if(!result.author_avatar)
			delete result.author_avatar;
	}

	async tryCache(platform, result, time){
		if(!result.id)
			return;
		result = Cache.fromResult(result, time);

		this.clean(result);

		try{
			await CacheManager.store(platform, result);
		}catch(e){
			Logger.error('ERROR', 'Could not cache item', e);

			if(!(e instanceof DatabaseError))
				throw new ServerError(StreamError.INTERNAL_SERVER_ERROR);
		}
	}

	async tryCacheMany(platform, results, time){
		const list = [];

		for(const item of results){
			if(!item.id)
				continue;
			const cache = Cache.fromResult(item, time);

			this.clean(cache);

			list.push(cache);
		}

		try{
			await CacheManager.storeMany(platform, list);
		}catch(e){
			Logger.error('ERROR', 'Could not cache item', e);

			if(!(e instanceof DatabaseError))
				throw new ServerError(StreamError.INTERNAL_SERVER_ERROR);
		}
	}

	checkPlatform(platform){
		if(!platforms.hasOwnProperty(platform))
			throw new ServerError(StreamError.PLATFORM_NOT_SUPPORTED);
	}

	check(platform, id){
		this.checkPlatform(platform);

		if(!StringCheck.isString(id) || StringCheck.hasNonPrintableAscii(platform))
			throw new ServerError(StreamError.TRACK_NOT_FOUND);
	}

	checkPlaylist(platform, id){
		this.checkPlatform(platform);

		if(!StringCheck.isString(id) || StringCheck.hasNonPrintableAscii(platform))
			throw new ServerError(StreamError.PLAYLIST_NOT_FOUND);
	}

	error(e){
		Logger.error(e);

		if(e instanceof APIError)
			throw new ServerError(StreamError.INTERNAL_API_ERROR);
		throw new ServerError(StreamError.INTERNAL_SERVER_ERROR);
	}

	fill(cache){
		/* fill in cache entries that we could not find, only used on retrieval from database */
		if(!cache.thumbnails)
			cache.thumbnails = [];
		if(!cache.title)
			cache.title = 'Unknown title';
		if(!cache.author_name)
			cache.title = 'Unknown author';
		if(!cache.duration)
			cache.duration = 0;
	}
});

module.exports = new (class{
	validPlatform(platform){
		return platforms.hasOwnProperty(platform);
	}

	async get(platform, id){
		await Manager.ready();

		Manager.check(platform, id);

		platform = platforms[platform];

		const time = Date.now();

		var result;

		try{
			result = await platform.api.get(id);
		}catch(e){
			Manager.error(e);
		}

		result.platform = platform.name;

		if(result && (result.id || result.unplayable_reason)){
			if(result.unplayable_reason && !result.id)
				result.id = id;
			Manager.tryCache(platform.name, result, time);
		}

		return result;
	}

	async getStreams(platform, id){
		await Manager.ready();

		Manager.check(platform, id);

		platform = platforms[platform];

		var result;

		try{
			result = platform.api.getStreams ? await platform.api.getStreams(id) : platform.api.get(id);
		}catch(e){
			Manager.error(e);
		}

		result.platform = platform.name;

		return result;
	}

	async fromCache(platform, id){
		await Manager.ready();

		Manager.check(platform, id);

		var result;

		try{
			result = await CacheManager.get(platform, id);
		}catch(e){
			throw new ServerError(StreamError.DATABASE_ERROR);
		}

		result.platform = platform;

		Manager.fill(result);

		return result;
	}

	async fromCacheMany(tracks){
		const platforms = {};
		var queries = [];

		for(const platform of platformNames)
			platforms[platform] = {ids: [], results: {}};
		for(var i = 0; i < tracks.length; i++)
			platforms[tracks[i].platform].ids.push(tracks[i].id);
		for(const platform in platforms)
			if(platforms[platform].ids.length)
				queries.push(CacheManager.getMany(platform, platforms[platform].ids));
			else
				queries.push(Promise.resolve([]));
		/* propagate this error */
		queries = await Promise.all(queries);

		const resolved = new Array(tracks.length);

		for(const platform in platforms){
			const results = queries.shift();
			const map = platforms[platform].results;

			for(var i = 0; i < results.length; i++){
				Manager.fill(results[i]);

				results[i].platform = platform;
				map[results[i].id] = results[i];
			}
		}

		for(var i = 0; i < resolved.length; i++)
			resolved[i] = platforms[tracks[i].platform].results[tracks[i].id] || null;
		return resolved;
	}

	async patchMany(tracks){
		/* TODO any missing database elements must be resolved through network, use bulkfetch */
		for(const track of tracks)
			this.get(track.platform, track.id);
	}

	async playlistOnce(platform, id, continuation){
		await Manager.ready();

		Manager.checkPlaylist(platform, id);

		if(platform == 'soundcloud')
			throw new ServerError(StreamError.FEATURE_NOT_IMPLEMENTED);
		platform = platforms[platform];

		var continuable;

		try{
			continuable = await platform.api.playlistOnce(id, continuation);
		}catch(e){
			Manager.error(e);
		}

		if(continuable)
			for(const item of continuable.results)
				item.platform = platform.name;
		return continuable;
	}

	async playlistOnceCache(platform, id, continuation){
		const time = Date.now();
		const continuable = await this.playlistOnce(platform, id, continuation);

		if(continuable)
			await Manager.tryCacheMany(platform, continuable.results, time);
		return continuable;
	}

	async search(platform, query, continuation){
		await Manager.ready();

		Manager.checkPlatform(platform);

		platform = platforms[platform];

		var continuable;

		try{
			continuable = await platform.api.search(query, continuation);
		}catch(e){
			Manager.error(e);
		}

		if(continuable)
			for(const item of continuable.results)
				item.platform = platform.name;
		return continuable;
	}

	fromShort(tracks){
		for(const track of tracks)
			this.fromShortOne(track);
	}

	fromShortOne(track){
		if(platformsShort.hasOwnProperty(track.platform))
			track.platform = platformsShort[track.platform];
		else
			track.platform = null;
	}

	toShort(tracks){
		for(const track of tracks)
			this.toShortOne(track);
	}

	toShortOne(track){
		if(platforms.hasOwnProperty(track.platform))
			track.platform = platforms[track.platform].short;
		else
			track.platform = null;
	}
});