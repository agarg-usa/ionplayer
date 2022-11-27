const StringCheck = require("../../../util/StringCheck");
const Playlist = require("../../../db/Playlist");
const Database = require("../../../db/Database");

const {StreamError} = require("../../../Errors");
const APIManager = require("../../../APIManager");

const Action = {
	FIRST: 0,
	SORT: 1,
	MOVE: 2,
	LAST: 3
};

module.exports = {
	async handle(stream){
		if(!(await stream.validBody()))
			return;
		const {actions} = stream.body;

		var playlist = null;

		try{
			playlist = await Database.playlist.getById(stream.path[0], new Playlist.AllTracksProjection());
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

		if(actions){
			/* we can't really sort by date added since we can't store any custom information in a Playlist's tracks array
				otherwise mongodb $addToSet would not work */
			/* we also can't use mongodb to move array elements, so we have to do it in javascript */
			if(!(actions instanceof Array))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			playlist.tracksFromDB();

			APIManager.fromShort(playlist.tracks);

			for(const action of actions){
				if(action.constructor != Object)
					return void stream.error(StreamError.INVALID_FORM_BODY);
				if(!Number.isFinite(action.action) || Action.FIRST >= action.action || Action.LAST <= action.action)
					return void stream.setStatus(400).errorMessage('Unknown action ' + action.action);
				switch(action.action){
					case Action.SORT:
						break;
					case Action.MOVE:
						/* move track of {target_platform, target_id} before track {before_platform, before_id} */
						const target_platform = action.target_platform, target_id = action.target_id,
							before_platform = action.before_platform, before_id = action.before_id;
						if(!StringCheck.isString(target_platform, target_id))
							return void stream.error(StreamError.INVALID_FORM_BODY);
						if(!APIManager.validPlatform(target_platform))
							return void stream.error(StreamError.PLATFORM_NOT_SUPPORTED);
						if(before_id !== null){
							if(!StringCheck.isString(before_platform, before_id))
								return void stream.error(StreamError.INVALID_FORM_BODY);
							if(!APIManager.validPlatform(before_platform))
								return void stream.error(StreamError.PLATFORM_NOT_SUPPORTED);
						}

						var before_index = -1;

						if(before_id === null)
							before_index = playlist.tracks.length;
						else{
							for(var i = 0; i < playlist.tracks.length; i++)
								if(playlist.tracks[i].platform == before_platform && playlist.tracks[i].id == before_id){
									before_index = i;

									break;
								}
							if(before_index == -1)
								return void stream.error(StreamError.TRACK_NOT_FOUND);
						}

						var target_index = -1;

						for(var i = 0; i < playlist.tracks.length; i++)
							if(playlist.tracks[i].platform == target_platform && playlist.tracks[i].id == target_id){
								target_index = i;

								break;
							}
						if(target_index == -1)
							return void stream.error(StreamError.TRACK_NOT_FOUND);
						if(before_index != target_index){
							const item = playlist.tracks[target_index];

							playlist.tracks.splice(target_index, 1);

							if(target_index < before_index)
								before_index--;
							playlist.tracks.splice(before_index, 0, item);
						}

						break;
				}
			}

			APIManager.toShort(playlist.tracks);

			const update = {};

			/* your choice if you want to not change the modified date if moving a track */
			update.last_updated = Date.now();
			update.tracks = playlist.tracks;

			try{
				await Database.playlist.update(playlist, update);
			}catch(e){
				stream.error(StreamError.DATABASE_ERROR);

				throw e;
			}
		}

		return void stream.setStatus(200).end(playlist.publicEntries());
	}
};