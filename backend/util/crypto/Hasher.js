const crypto = require('crypto');
const bcrypt = require('bcrypt');

module.exports = new (class{
	hash(string){
		return Buffer.from(crypto.createHash('sha512').update(string).digest());
	}

	hashB64(string){
		return this.hash(string).toString('base64');
	}

	hashHex(string){
		return this.hash(string).toString('hex');
	}

	async bHash(password){
		return await bcrypt.hash(password, 8);
	}

	async bCheck(password, hashed){
		return await bcrypt.compare(password, hashed);
	}
})