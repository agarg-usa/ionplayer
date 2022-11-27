const Hasher = require("../../util/crypto/Hasher");
const ImageIO = require("../../util/io/ImageIO");
const StringCheck = require("../../util/StringCheck");
const Database = require("../../db/Database");
const CDN = require("../../util/io/CDNUtil");

const account = require('./account');

const {StreamError} = require("../../Errors");

module.exports = {
	async handle(stream){
		const {description, password, avatar, username, email} = stream.body;

		const update = {};

		var updated = false;

		if(username){
			if(!StringCheck.isString(username))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableAscii(username))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			update.username = username;
			updated = true;
		}

		if(email){
			if(!StringCheck.isString(email))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableAscii(email))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			update.email = email;
			updated = true;
		}

		/* allows check for empty description, for when a user wants to clear it */
		if(description){
			if(!StringCheck.isString(description))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableUnicode(description))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			update.description = description;
			updated = true;
		}

		if(password){
			/* this is generally fine but for safety you should check that {typeof password == "object"} */
			const {old_password, new_password} = password;

			if(!StringCheck.isString(old_password, new_password))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			if(StringCheck.hasNonPrintableAscii(new_password))
				return void stream.error(StreamError.INVALID_CHARACTERS);
			var matches;

			try{
				matches = await Hasher.bCheck(old_password, stream.client.password);
			}catch(e){
				stream.error(StreamError.TRY_AGAIN_LATER);

				throw e;
			}

			if(!matches)
				return void stream.error(StreamError.INVALID_PASSWORD);
			update.password = new_password;
			update.token = Database.user.generateToken();
			updated = true;
		}

		var error = account.check(update);

		if(error)
			return void stream.error(error);
		/* check avatar last as it is the most computationally intensive, if we return from the first two we save cpu time */
		if(avatar){
			if(!StringCheck.isString(avatar))
				return void stream.error(StreamError.INVALID_FORM_BODY);
			const new_avatar_id = Database.generateUniqueID();

			/* skip check that the string is base 64 as the {Buffer.from} ignores non base 64 characters */
			var img;

			try{
				img = await ImageIO.loadImage(Buffer.from(avatar, 'base64'));
			}catch(e){
				stream.error(StreamError.INVALID_IMAGE_FORMAT);

				throw e;
			}

			try{
				await CDN.createAvatar(new_avatar_id, 'webp', await ImageIO.toWebP(img));
			}catch(e){
				stream.error(StreamError.SYSTEM_FILE_ERROR);

				throw e;
			}

			try{
				await CDN.createAvatar(new_avatar_id, 'png', await ImageIO.toPNG(img));
			}catch(e){
				CDN.deleteAvatar(new_avatar_id, 'webp');

				stream.error(StreamError.SYSTEM_FILE_ERROR);

				throw e;
			}

			update.avatar_id = new_avatar_id;
			updated = true;
		}

		if(!updated)
			return void stream.setStatus(200).end(stream.client.publicEntries());
		if(update.password)
			try{
				update.password = await Hasher.bHash(update.password);
			}catch(e){
				stream.error(StreamError.TRY_AGAIN_LATER);

				throw e;
			}
		var old_avatar_id = null;

		if(update.avatar_id)
			old_avatar_id = stream.client.avatar_id;
		try{
			await Database.user.update(stream.client, update);
		}catch(e){
			var error = null, shouldThrow = false;

			if(e.code == 11000){
				if(e.keyPattern.email)
					error = StreamError.DUPLICATE_EMAIL;
				else if(e.keyPattern.username)
					error = StreamError.DUPLICATE_USERNAME;
				else if(e.keyPattern.token){
					/* shouldn't be possible */
					if(update.token)
						error = StreamError.TRY_AGAIN_LATER;
					else{
						shouldThrow = true;
						error = StreamError.DATABASE_ERROR;
					}
				}

				if(!error){
					/* shouldn't be possible */
					error = StreamError.DATABASE_ERROR;
					shouldThrow = true;
				}
			}else{
				shouldThrow = true;
				error = StreamError.DATABASE_ERROR;
			}

			if(update.avatar_id){
				CDN.deleteAvatar(update.avatar_id, 'png');
				CDN.deleteAvatar(update.avatar_id, 'webp');
			}

			stream.error(error);

			if(shouldThrow)
				throw e;
			return;
		}

		if(old_avatar_id){
			CDN.deleteAvatar(old_avatar_id, 'png');
			CDN.deleteAvatar(old_avatar_id, 'webp');
		}

		const user = stream.client.publicEntries();

		if(update.token)
			user.token = update.token;
		if(update.email)
			user.email = update.email;
		stream.setStatus(200).end(user);

		return;
	}
};