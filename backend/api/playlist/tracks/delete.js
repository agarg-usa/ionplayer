const StringCheck = require("../../../util/StringCheck");
const APIManager = require("../../../APIManager");
const Playlist = require("../../../db/Playlist");
const Database = require("../../../db/Database");

const {StreamError} = require("../../../Errors");

module.exports = {
	async handle(stream){
		if(!(await stream.validBody()))
			return;
		const {platform, id} = stream.body;

		if(!StringCheck.isString(platform, id))
			return void stream.error(StreamError.INVALID_FORM_BODY);
		var playlist = null;

		try{
			playlist = await Database.playlist.getById(stream.path[0]);
		}catch(e){
			stream.error(StreamError.DATABASE_ERROR);

			throw e;
		}

		if(!playlist)
			return void stream.error(StreamError.PLAYLIST_NOT_FOUND);
		if(playlist.owner != stream.client.id){
			if(playlist.privacy == Playlist.PRIVATE)
				stream.error(StreamError.NOT_FOUND);
			else
				stream.error(StreamError.FORBIDDEN);
			return;
		}

		const last_updated = Date.now();
		const track = new Playlist.Track({platform, id});

		APIManager.toShortOne(track);

		var removed;

		try{
			removed = await Database.playlist.pullTrack(playlist, track);
		}catch(e){
			stream.error(StreamError.DATABASE_ERROR);

			throw e;
		}

		stream.setStatus(200).end({removed});

		if(!removed)
			return;
		try{
			await Database.playlist.update(playlist, {last_updated});
		}catch(e){
			throw e;
		}
	}
};