const StreamError = {
	INTERNAL_API_ERROR: {
		message: 'Internal API error',
		status: 500
	},

	INVALID_JSON_BODY: {
		message: 'Invalid JSON body',
		status: 400
	},

	INVALID_FORM_BODY: {
		message: 'Invalid form body',
		status: 400
	},

	INVALID_CHARACTERS: {
		message: 'Fields may not contain special characters',
		status: 400
	},

	INVALID_EMAIL: {
		message: 'An account with this email does not exist',
		status: 400
	},

	BAD_EMAIL: {
		message: 'Invalid email',
		status: 400
	},

	INVALID_PASSWORD: {
		message: 'That password didn\'t work, try again',
		status: 400
	},

	INVALID_EMAIL_OR_PASSWORD: {
		message: 'Invalid email or password',
		status: 400
	},

	DATABASE_ERROR: {
		message: 'Database error',
		status: 500
	},

	NOT_FOUND: {
		message: 'Not found',
		status: 404
	},

	REQUEST_BODY_EXCEEDS: {
		message: 'Request body too large',
		status: 413
	},

	FORBIDDEN: {
		message: 'Access forbidden',
		status: 403
	},

	UNAUTHORIZED: {
		message: 'Unauthorized',
		status: 401
	},

	DUPLICATE_EMAIL: {
		message: 'An account with this email already exists',
		status: 400
	},

	DUPLICATE_USERNAME: {
		message: 'Username already taken',
		status: 400
	},

	INVALID_EMAIL_PASSWORD_OR_USERNAME: {
		message: 'Invalid email, password, or username',
		status: 400
	},

	INVALID_IMAGE_FORMAT: {
		message: 'Unsupported image format',
		status: 400
	},

	SYSTEM_FILE_ERROR: {
		message: 'Internal I/O error',
		status: 500
	},

	PLAYLIST_NOT_FOUND: {
		message: 'Playlist not found',
		status: 404
	},

	TRY_AGAIN_LATER: {
		message: 'An internal error occurred, try again later',
		status: 500
	},

	TRACK_NOT_FOUND: {
		message: 'Track not found or unplayable',
		status: 404
	},

	PLATFORM_NOT_SUPPORTED: {
		message: 'Unknown platform',
		status: 400
	},

	METHOD_NOT_ALLOWED: {
		message: 'Method not allowed',
		status: 405
	},

	ALREADY_FRIENDS: {
		message: 'Unable to send request as you are already friends',
		status: 400
	},

	API_NOT_FOUND: {
		message: 'API not found',
		status: 404
	},

	INTERNAL_SERVER_ERROR: {
		message: 'Internal server error',
		status: 500
	},

	FEATURE_NOT_IMPLEMENTED: {
		message: 'Feature not implemented',
		status: 501
	}
};

class ServerError extends Error{
	constructor(streamError){
		super();

		this.status = streamError.status;
		this.message = streamError.message;
	}
}

class DatabaseError{
	constructor(err){
		this.message = err.message;
		this.code = err.code;
		this.keyPattern = err.keyPattern;
		this.stack = err.stack;
		this.err = err;
	}
}

module.exports = {StreamError, ServerError, DatabaseError};