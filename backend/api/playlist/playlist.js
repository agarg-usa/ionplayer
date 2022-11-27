const getPlaylist = require("./get");
const addTrack = require("./tracks/add");
const deleteTrack = require("./tracks/delete");
const patchTrack = require('./tracks/patch');
const patch = require('./patch');
const deletePlaylist = require('./delete');

const {StreamError} = require("../../Errors");

module.exports = {
	async handle(stream){
		var isTracks = false;

		if(stream.path.length == 2){
			if(stream.path[1] != 'tracks')
				return void stream.error(StreamError.API_NOT_FOUND);
			isTracks = true;
		}

		switch(stream.request.method){
			case 'GET':
				await getPlaylist.handle(stream, isTracks);

				break;
			case 'POST':
				if(!isTracks)
					return void stream.error(StreamError.API_NOT_FOUND);
				await addTrack.handle(stream);

				break;
			case 'DELETE':
				if(isTracks)
					await deleteTrack.handle(stream);
				else
					await deletePlaylist.handle(stream);
				break;
			case 'PATCH':
				if(isTracks)
					await patchTrack.handle(stream);
				else
					await patch.handle(stream);
				break;
			default:
				stream.error(StreamError.METHOD_NOT_ALLOWED);

				break;
		}
	}
};