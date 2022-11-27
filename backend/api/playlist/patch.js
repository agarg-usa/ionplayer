const StringCheck = require("../../util/StringCheck");
const Playlist = require("../../db/Playlist");
const Database = require("../../db/Database");

const {StreamError} = require("../../Errors");

module.exports = {
	async handle(stream){
		if(!(await stream.validBody()))
			return;
		const {title, description, privacy, thumbnail} = stream.body;

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

		const update = {};
		var updated = false;

		if(title){
			if(!StringCheck.isString(title))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableUnicode(title))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			update.title = title;
			updated = true;
		}

		if(description){
			if(!StringCheck.isString(description))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableUnicode(description))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			update.description = description;
			updated = true;
		}

		if(privacy !== undefined){
			if(!Number.isFinite(privacy) || Playlist.PRIVATE > privacy || privacy > Playlist.PUBLIC)
				return void stream.error(StreamError.INVALID_FORM_BODY);
			update.privacy = privacy;
			updated = true;
		}

		if(updated){
			/* your choice if you want to not change the modified date if only changing the name or description */
			update.last_updated = Date.now();

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