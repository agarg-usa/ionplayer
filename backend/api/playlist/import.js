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
			max: 0
		},

		requires: {
			body: true,
			authorization: true
		},

		async handle(stream){
			if(stream.request.method != 'POST')
				return void stream.error(StreamError.METHOD_NOT_ALLOWED);
			const jsonStream = new JSONStream(stream.response);
			const {platform, id} = stream.body;

			if(!StringCheck.isString(platform, id))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			var {list, title, description} = await Import(jsonStream, platform, id);

			APIManager.toShort(list);

			if(!title)
				title = 'New Playlist';
			if(!description)
				description = '';
			const ids = new Map();
			var index = list.length;

			for(var i = 0; i < index; i++){
				if(ids.has(list[i].id)){
					const tmp = list[i];

					index--;
					list[i] = list[index];
					list[index] = tmp;

					continue;
				}

				ids.set(list[i].id, true);
			}

			const playlist = new Playlist(title, description, Playlist.PUBLIC, stream.client.id, Date.now());

			playlist.tracks = list.slice(0, index);
			playlist.length = index;

			try{
				await Database.playlist.add(playlist);
			}catch(e){
				jsonStream.end(StreamError.DATABASE_ERROR);

				throw e;
			}

			jsonStream.end(playlist.publicEntries());
		}
	}
};