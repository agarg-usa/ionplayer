const {StreamError} = require('../../Errors');

const Database = require('../../db/Database');
const Playlist = require('../../db/Playlist');
const APIManager = require('../../APIManager');

const MAX_LIMIT = 10;

module.exports = {
	api: {
		path: {
			/* the reason for a minimum path of 0 is that a url with /user/ should resolve to 404 USER NOT FOUND instead of 404 API NOT FOUND */
			max: 2,
			min: 0
		},

		requires: {
			authorization: true
		},

		async handle(stream){
			let error = StreamError.NOT_FOUND;
			let resp = null;
			var isPlaylists = false;

			do{
				if(stream.path.length == 2){
					if(stream.path[1] == 'playlists')
						isPlaylists = true;
					else
						return void stream.error(StreamError.API_NOT_FOUND);
				}else if(stream.path.length != 1)
					break;
				let user;

				try{
					user = await Database.user.getById(stream.path[0]);
				}catch(e){
					error = StreamError.DATABASE_ERROR;

					break;
				}

				if(!user)
					try{
						user = await Database.user.getByUsername(decodeURIComponent(stream.path[0]));
					}catch(e){
						error = StreamError.DATABASE_ERROR;

						break;
					}
				if(!user)
					break;
				if(isPlaylists){
					var offset = parseInt(stream.query.get('offset'), 10),
						limit = parseInt(stream.query.get('limit'), 10);
					if(!Number.isFinite(offset) || offset < 0)
						offset = 0;
					else if(offset > Number.MAX_SAFE_INTEGER)
						offset = Number.MAX_SAFE_INTEGER;
					if(!Number.isFinite(limit) || limit < 0 || limit > MAX_LIMIT)
						limit = MAX_LIMIT;

					var privacy = Playlist.PUBLIC;

					if(user.id == stream.client.id)
						privacy = Playlist.PRIVATE;
					var results;

					try{
						/* limit and offset */
						results = await Database.playlist.findByOwner(user.id, privacy, new Playlist.TrackSliceProjection(0, 20), {offset, limit});
					}catch(e){
						stream.error(StreamError.DATABASE_ERROR);

						throw e;
					}

					for(var i = 0; i < results.length; i++){
						results[i].tracksFromDB();

						const tracks = results[i].tracks;

						APIManager.fromShort(tracks);

						for(var j = 0; j < tracks.length; j++)
							if(tracks[j])
								tracks[j] = tracks[j].publicEntries();
						results[i] = results[i].publicEntries();
						results[i].tracks = tracks;
					}

					error = null;
					resp = results;
				}else{
					error = null;
					resp = user.publicEntries();
				}
			}while(false);

			if(error)
				stream.error(error);
			else{
				stream.setStatus(200);
				stream.end(resp);
			}
		}
	}
};