const StreamString = require('../util/StreamString.svf');
const Errors = require('../util/Errors.svf');
const youtube = require('./source/youtube.svf');

module.exports = {
	async handleRequest(req, query, res){
		var data = await StreamString(req);

		if(data == null){
			res.writeHead(400);
			res.end(Errors.toJSONError(Errors.REQUEST_BODY_EXCEEDS));

			return;
		}

		res.setHeader('Content-Type', 'application/json');

		try{
			data = JSON.parse(data);
		}catch(e){
			res.writeHead(400);
			res.end(Errors.toJSONError(Errors.INVALID_JSON_BODY));

			return;
		}

		var result = null, error = null;

		do{
			if(data.platform == 'youtube'){
				if(data.id){
					try{
						result = await youtube.get(data.id);
						result.platform = 'youtube';
					}catch(e){
						error = 'API Error';
					}
				}else
					break;
			}

			if(result){
				res.writeHead(200);
				res.end(JSON.stringify({track: result}));
			}else if(error){
				res.writeHead(500);
				res.end(JSON.stringify({error}));
			}

			return;
		}while(false);

		res.writeHead(400);
		res.end(Errors.toJSONError('Invalid platform'));
	}
}