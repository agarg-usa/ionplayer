const Errors = require("../backend/Errors");

module.exports = {
	api: {
		path: {
			max: 1,
			min: 0
		},

		async handle(stream){
			stream.response.writeHead(200, {'Cache-Control': 'no-cache, no-transform'});

			await new Promise((resolve, reject) => {
				setTimeout(resolve, 10000);
			});

			stream.response.end('{}');
		}
	}
};