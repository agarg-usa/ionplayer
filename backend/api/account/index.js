const update = require('./update');

const {StreamError} = require('../../Errors');

module.exports = {
	api: {
		path: {
			max: 0,
		},

		requires: {
			authorization: true,
			body: true
		},

		async handle(stream){
			switch(stream.request.method){
				case 'PATCH':
					await update.handle(stream);

					break;
				default:
					stream.error(StreamError.METHOD_NOT_ALLOWED);

					break;
			}
		}
	}
}