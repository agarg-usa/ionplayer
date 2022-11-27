const StringCheck = require("../../util/StringCheck");
const Playlist = require("../../db/Playlist");
const Database = require("../../db/Database");

const {StreamError} = require("../../Errors");

module.exports = {
	async handle(stream){
		if(!(await stream.validBody()))
			return;
		const {title, description, privacy} = stream.body;

		if(!StringCheck.isString(title, description) || !Number.isFinite(privacy) || Playlist.PRIVATE > privacy || privacy > Playlist.PUBLIC)
			return void stream.error(StreamError.INVALID_FORM_BODY);
		if(StringCheck.hasNonPrintableUnicode(title, description))
			return void stream.error(StreamError.INVALID_CHARACTERS);
		const playlist = new Playlist(title, description, privacy, stream.client.id, Date.now());

		try{
			await Database.playlist.add(playlist);
		}catch(e){
			stream.end(StreamError.DATABASE_ERROR);

			throw e;
		}

		stream.setStatus(200).end(playlist.publicEntries());
	}
};