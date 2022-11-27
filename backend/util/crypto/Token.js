const crypto = require('crypto');

module.exports = {
	generate(bytes = 64){
		return crypto.randomBytes(bytes);
	},

	generateB64(bytes){
		return this.generate(bytes).toString('base64');
	},

	generateHex(bytes){
		return this.generate(bytes).toString('hex');
	}
};

