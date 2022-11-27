const APIError = require('./apierror');
const fetch = require('../../fetch');

module.exports = (new class{
	async getResponse(url, options){
		var res;

		try{
			res = await fetch(url, options);
		}catch(e){
			throw new APIError(APIError.NETWORK_ERROR);
		}

		return {res};
	}

	async get(url, options){
		const {res} = await this.getResponse(url, options);

		var body;

		try{
			body = await res.text();
		}catch(e){
			if(!res.ok)
				throw new APIError(APIError.INTERNAL_API_ERROR);
			throw new APIError(APIError.NETWORK_ERROR);
		}

		if(!res.ok)
			throw new APIError(APIError.INTERNAL_API_ERROR, body);
		return {res, body};
	}

	async getJSON(url, options){
		const data = await this.get(url, options);

		try{
			data.body = JSON.parse(data.body);
		}catch(e){
			throw new APIError(APIError.INVALID_JSON_RESPONSE);
		}

		return data;
	}

	async getBuffer(url, options){
		const {res} = await this.getResponse(url, options);

		var body;

		try{
			body = await res.buffer();
		}catch(e){
			if(!res.ok)
				throw new APIError(APIError.INTERNAL_API_ERROR);
			throw new APIError(APIError.NETWORK_ERROR);
		}

		if(!res.ok)
			throw new APIError(APIError.INTERNAL_API_ERROR, body.toString('utf8'));
		return {res, body};
	}
});