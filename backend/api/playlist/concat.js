const APIManager = require("../../APIManager");
const Playlist = require("../../db/Playlist");
const JSONStream = require("../../util/JSONStream");
const Database = require("../../db/Database");
const StringCheck = require('../../util/StringCheck');
const Import = require('./importutil');

const {StreamError} = require("../../Errors");

module.exports = {
	api: {
		path: {
			max: 1,
			min: 1
		},

		requires: {
			body: true,
			authorization: true
		},

		async handle(stream){
			if(stream.request.method != 'POST')
				return void stream.error(StreamError.METHOD_NOT_ALLOWED);
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

			const jsonStream = new JSONStream(stream.response);
			const {platform, id} = stream.body;

			if(!StringCheck.isString(platform, id))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			const {list, title, description} = await Import(jsonStream, platform, id);

			APIManager.toShort(list);

			const last_updated = Date.now();

			var added;

			try{
				added = await Database.playlist.pushTracks(playlist, list);
			}catch(e){
				stream.error(StreamError.DATABASE_ERROR);

				throw e;
			}

			jsonStream.end({added});

			if(!added)
				return;
			try{
				await Database.playlist.update(playlist, {last_updated});
			}catch(e){
				throw e;
			}
		}
	}
};