class User{
	constructor(email, username, password, token){
		this.email = email;
		this.username = username;
		this.password = password;
		this.token = token;
		this.description = '';
		this.avatar_id = null;
		this.verified = false;
		this.friend_requests = [];
		this.friends = [];
	}

	fromDB(user){
		this._id = user._id;
		this.email = user.email;
		this.username = user.username;
		this.password = user.password;
		this.description = user.description;
		this.avatar_id = user.avatar_id;
		this.token = user.token;
		this.verified = user.verified;
		this.friend_requests = user.friend_requests;
		this.friends = user.friends;

		return this;
	}

	get id(){
		return this._id.toHexString();
	}

	publicEntries(){
		return {
			id: this.id,
			username: this.username,
			avatar_id: this.avatar_id,
			description: this.description
		};
	}
}

User.fromDB = function(user){
	if(user)
		return new User().fromDB(user);
	return null;
};

module.exports = User;