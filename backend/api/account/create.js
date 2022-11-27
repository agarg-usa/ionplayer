
const Database = require('../../db/Database');
const User = require('../../db/User');
const StringCheck = require('../../util/StringCheck');
const Hasher = require('../../util/crypto/Hasher');

const account = require('./account');

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
			/* extract the email, username, and password fields from the body */
			const {email, username, password} = stream.body;

			if(!StringCheck.isString(email, username, password))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableAscii(email, username, password))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			const error = account.check({
				email,
				password,
				username
			});

			if(error)
				return void stream.error(error);
			/* run both requests in parallel */
			var query = [Database.user.getByEmail(email), Database.user.getByUsername(username)];

			try{
				query = await Promise.all(query);
			}catch(e){
				stream.error(StreamError.DATABASE_ERROR);

				throw e;
			}

			if(query[0])
				return void stream.error(StreamError.DUPLICATE_EMAIL);
			if(query[1])
				return void stream.error(StreamError.DUPLICATE_USERNAME);
			var hashed;

			try{
				hashed = await Hasher.bHash(password);
			}catch(e){
				stream.error(StreamError.TRY_AGAIN_LATER);

				throw e;
			}

			const user = new User(email, username, hashed, Database.user.generateToken());

			try{
				await Database.user.add(user);
			}catch (e){
				if(e.code == 11000){
					/* error code 11000 means duplicate! but only one duplicate pattern will be triggered, never both even if both are duplicate */

					if(e.keyPattern.email)
						/* did we have a duplicate email? */
						return void stream.error(StreamError.DUPLICATE_EMAIL);
					if(e.keyPattern.username)
						/* did we have a duplicate username? */
						return void stream.error(StreamError.DUPLICATE_USERNAME);
					if(e.keyPattern.token){
						/* should not be possible */
						stream.error(StreamError.TRY_AGAIN_LATER);

						throw e;
					}

					/* if it hasn't returned by now we made a serious booboo */
				}

				stream.error(StreamError.DATABASE_ERROR);

				throw e;
			}

			const entries = user.publicEntries();

			entries.token = user.token;
			entries.verified = user.verified;
			stream.setStatus(201); /* 201 CREATED */
			stream.end(entries);
		}
	}
};