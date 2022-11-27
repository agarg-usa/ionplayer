const Database = require('../../db/Database');
const APIManager = require('../../APIManager');
const Playlist = require('../../db/Playlist');

const {StreamError, ServerError} = require('../../Errors');

const MAX_LIMIT = 100;

module.exports = {
	async handle(stream, isTracks){
		var projection;

		if(isTracks){
			var offset = parseInt(stream.query.get('offset'), 10),
				limit = parseInt(stream.query.get('limit'), 10);
			if(!Number.isFinite(offset) || offset < 0)
				offset = 0;
			else if(offset > Number.MAX_SAFE_INTEGER)
				offset = Number.MAX_SAFE_INTEGER;
			if(!Number.isFinite(limit) || limit < 0 || limit > MAX_LIMIT)
				limit = MAX_LIMIT;
			projection = new Playlist.TrackSliceProjection(offset, limit);
		}

		var playlist;

		try{
			playlist = await Database.playlist.getById(stream.path[0], projection);
		}catch(e){
			stream.error(StreamError.DATABASE_ERROR);

			throw e;
		}

		if(!playlist)
			return void stream.error(StreamError.PLAYLIST_NOT_FOUND);
		if(playlist.owner != stream.client.id && playlist.privacy == Playlist.PRIVATE)
			return void stream.error(StreamError.PLAYLIST_NOT_FOUND);
		var user;

		try{
			user = await Database.user.getById(playlist.owner);
		}catch(e){
			stream.error(StreamError.DATABASE_ERROR);

			throw e;
		}

		if(projection){
			playlist.tracksFromDB();

			APIManager.fromShort(playlist.tracks);

			var resolved;

			try{
				resolved = await APIManager.fromCacheMany(playlist.tracks);
			}catch(e){
				if(e instanceof ServerError)
					stream.error(e);
				else
					stream.error(StreamError.INTERNAL_SERVER_ERROR);
				throw e;
			}

			/* the tracks that weren't found in the database will be null,
				the client will show a TrackResultNotFound if it is null */
			const repair = [];

			for(var i = 0; i < resolved.length; i++)
				if(resolved[i])
					resolved[i] = resolved[i].publicEntries();
				else
					repair.push(playlist.tracks[i]);
			stream.setStatus(200).end(resolved);

			try{
				/* attempt to repair missing cache entries */
				await APIManager.patchMany(repair);
			}catch(e){
				/* stream has already ended, just some after-response cleanup work */
				throw e;
			}
		}else{
			const res = playlist.publicEntries();

			if(!user)
				/* the user account was deleted, or the id was malformed by something else */
				res.owner = null;
			else
				res.owner = user.publicEntries();
			stream.setStatus(200).end(res);
		}
	}
};