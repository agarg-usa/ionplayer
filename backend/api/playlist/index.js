const createPlaylist = require("./create");
const playlist = require('./playlist');

const {StreamError} = require("../../Errors");

module.exports = {
	api: {
		path: {
			max: 2,
			min: 0
		},

		requires: {
			authorization: true
		},

		async handle(stream){
			if(stream.path.length){
				await playlist.handle(stream);

				return;
			}

			switch(stream.request.method){
				case 'POST':
					await createPlaylist.handle(stream);

					break;
				default:
					stream.error(StreamError.METHOD_NOT_ALLOWED);

					break;
			}
		}
	}
};