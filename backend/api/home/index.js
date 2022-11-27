const {StreamError} = require('../../Errors');

const youtube = require('../../source/youtube');

module.exports = {
	api: {
		path: {
			max: 0
		},

		requires: {
			authorization: true
		},

		async handle(stream){
			var lists = ['PLrEnWoR732-DtKgaDdnPkezM_nDidBU9H', 'PLFgquLnL59alW3xmYiWRaoz0oM3H17Lth'];
			var results = [];

			for(const id of lists){
				var data;

				try{
					data = await youtube.playlistOnce(id);
				}catch(e){
					stream.error(StreamError.INTERNAL_API_ERROR);

					throw e;
				}

				for(const result of data.results)
					result.platform = 'youtube';
				results.push({
					name: data.title,
					items: data.results
				});
			}

			stream.setStatus(200).end(results);
		}
	}
};