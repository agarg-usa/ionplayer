const APIManager = require('../../APIManager');
const Playlist = require('../../db/Playlist');

const {ServerError} = require('../../Errors');

module.exports = async function(jsonStream, platform, id){
	var list = [];
	var title = null;
	var description = null;
	var continuation = null;

	do{
		var result;

		try{
			result = await APIManager.playlistOnceCache(platform, id, continuation);
		}catch(e){
			if(e instanceof ServerError)
				jsonStream.end(e);
			else
				jsonStream.end(StreamError.INTERNAL_SERVER_ERROR);
			throw e;
		}

		/* if this is the first iteration, then the playlist name is {result.title} and description is {result.description} */
		if(!continuation){
			title = result.title;
			description = result.description;
		}

		const time = Date.now();

		for(const item of result.results)
			if(!item.unplayable_reason)
				list.push(new Playlist.Track(item, time));
		continuation = result.continuation;

		jsonStream.write({progress: list.length});
	}while(continuation);

	return {list, title, description};
}