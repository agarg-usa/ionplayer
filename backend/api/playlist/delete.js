const Database = require('../../db/Database');
const Playlist = require('../../db/Playlist');

const {StreamError} = require('../../Errors');

module.exports = {
	async handle(stream){
		var playlist;

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

		try{
			await Database.playlist.delete(playlist);
		}catch(e){
			stream.error(StreamError.DATABASE_ERROR);

			throw e;
		}

		stream.setStatus(200).end({});
	}
};