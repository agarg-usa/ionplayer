const Database = require('../../db/Database');
const StringCheck = require('../../util/StringCheck');
const Hasher = require('../../util/crypto/Hasher');

const {StreamError} = require('../../Errors');

module.exports = {
	api: {
		path: {
			max: 0
		},

		requires: {
			body: true
		},

		async handle(stream){
			if(stream.request.method != 'POST')
				return void stream.error(StreamError.METHOD_NOT_ALLOWED);
			/* extract the email and password fields from the body */
			const {email, password} = stream.body;

			if(!StringCheck.isString(email, password))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableAscii(email, password) || !email.length || !password.length)
				return void stream.error(StreamError.INVALID_EMAIL_OR_PASSWORD);
			var user;

			try{
				user = await Database.user.getByEmail(email);
			}catch(e){
				stream.error(StreamError.DATABASE_ERROR);

				throw e;
			}

			if(!user)
				/* user was not found :( */
				return void stream.error(StreamError.INVALID_EMAIL);
			var match;

			try{
				match = await Hasher.bCheck(password, user.password);
			}catch(e){
				stream.error(StreamError.TRY_AGAIN_LATER);

				throw e;
			}

			if(!match)
				return void stream.error(StreamError.INVALID_PASSWORD);
			const entries = user.publicEntries();

			entries.token = user.token;
			entries.verified = user.verified;
			stream.setStatus(200).end(entries);
		}
	}
};