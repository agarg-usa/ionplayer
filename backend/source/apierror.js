const errors = {
	NETWORK_ERROR: {
		code: 1,
		message: 'Network error'
	},

	INVALID_JSON_RESPONSE: {
		code: 2,
		message: 'Invalid JSON response from server'
	},

	INTERNAL_API_ERROR: {
		code: 3,
		message: 'Internal API error'
	},

	NOT_FOUND: {
		code: 4,
		message: 'Not found'
	},

	NO_STREAMS: {
		code: 5,
		message: 'No supported streams found'
	}
};

const codeMap = {};

class APIError{
	constructor(code, detailed_message){
		this.code = code;

		if(detailed_message)
			this.detailed_message = detailed_message;
	}

	get fatal(){
		if(this.code == errors.NETWORK_ERROR.code)
			return false;
		return true;
	}

	get message(){
		if(this.detailed_message)
			return this.detailed_message;
		return codeMap[this.code].message;
	}
}

for(const name in errors){
	codeMap[errors[name].code] = errors[name];

	APIError[name] = errors[name].code;
}

module.exports = APIError;