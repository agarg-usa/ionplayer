const StringCheck = require('../../util/StringCheck');
const {StreamError} = require('../../Errors');

function error(message){
	return {
		message,
		status: 400
	};
}

function length(name, value, min, max){
	if(value.length > max)
		return error(name + ' can be atmost ' + max + ' characters');
	if(value.length < min)
		return error(name + ' must be atleast ' + min + ' characters');
}

module.exports = (new class{
	constructor(){}

	checkUsername(username){
		return length('Username', username, 3, 32);
	}

	checkEmail(email){
		if(!StringCheck.isValidEmail(email))
			return StreamError.BAD_EMAIL;
		return length('Email', email, 4, 64);
	}

	checkPassword(password){
		return length('Password', password, 8, 64);
	}

	checkDescription(description){
		return length('Description', description, 0, 2048);
	}

	check(fields){
		var err;

		if(fields.username != null){
			err = this.checkUsername(fields.username);

			if(err)
				return err;
		}

		if(fields.email != null){
			err = this.checkEmail(fields.email);

			if(err)
				return err;
		}

		if(fields.password != null){
			err = this.checkPassword(fields.password);

			if(err)
				return err;
		}

		if(fields.description != null){
			err = this.checkDescription(fields.description);

			if(err)
				return err;
		}

		return null;
	}
});