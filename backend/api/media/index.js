const {StreamError} = require('../../Errors');

const Streams = require('../../Streams');
const APIManager = require('../../APIManager');
const StreamData = require('../../util/StreamData');

const soundcloud = require('../../source/soundcloud');
const spotify = require('../../source/spotify');

async function track(platform, stream, id){
	var streams = false;

	if(stream.path.length == 4){
		if(stream.path[3] == 'streams')
			streams = true;
		else
			return void stream.error(StreamError.API_NOT_FOUND);
	}

	if(!id)
		return void stream.error(StreamError.TRACK_NOT_FOUND);
	if(platform == 'spotify'){
		if(id == 'LICENSE'){
			var payload;

			try{
				payload = await StreamData(stream.request, 20000);
			}catch(e){
				stream.error(StreamError.REQUEST_BODY_EXCEEDS);

				return;
			}

			var license;

			try{
				license = await spotify.getLicense(payload);
			}catch(e){
				stream.error(StreamError.INTERNAL_API_ERROR);

				throw e;
			}

			stream.setStatus(200);
			stream.response.end(license);

			return;
		}

		if(id == 'CERTIFICATE'){
			var license;

			try{
				license = await spotify.getCertificate();
			}catch(e){
				stream.error(StreamError.INTERNAL_API_ERROR);

				throw e;
			}

			stream.setStatus(200);
			stream.response.end(license);

			return;
		}
	}

	var result;

	try{
		result = streams ? await APIManager.getStreams(platform, id) : await APIManager.get(platform, id);
	}catch(e){
		stream.error(StreamError.INTERNAL_API_ERROR);

		throw e;
	}

	result = result.streamEntries();

	if(!result.unplayable_reason)
		for(const stream of result.streams)
			if(platform == 'soundcloud')
				stream.url = Streams.create(stream.url, soundcloud.Handler);
			else
				stream.url = Streams.create(stream.url);
	stream.setStatus(200).end(result);
}

async function search(platform, stream, id){
	if(id)
		return void stream.error(StreamError.API_NOT_FOUND);
	var results;

	try{
		results = await APIManager.search(platform, stream.query.get('q'));
	}catch(e){
		stream.error(StreamError.INTERNAL_API_ERROR);

		throw e;
	}

	stream.end(results);
}

async function playlist(platform, stream, id){
	if(!id)
		return void stream.error(StreamError.PLAYLIST_NOT_FOUND);
	var results;

	try{
		results = await APIManager.playlistOnce(platform, id);
	}catch(e){
		stream.error(StreamError.INTERNAL_API_ERROR);

		throw e;
	}

	stream.end(results);
}

const methods = {
	playlist,
	search,
	track
}

module.exports = {
	api: {
		path: {
			max: 4,
			min: 2
		},

		requires: {
			authorization: true
		},

		async handle(stream){
			if(!methods.hasOwnProperty(stream.path[0])){
				stream.error(StreamError.API_NOT_FOUND);

				return;
			}

			await methods[stream.path[0]](stream.path[1], stream, stream.path[2]);
		}
	}
};