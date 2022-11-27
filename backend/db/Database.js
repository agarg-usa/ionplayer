const {MongoClient, ObjectId} = require('mongodb');

const {DatabaseError} = require('../Errors');

const User = require('./User');
const Playlist = require("./Playlist");
const Cache = require("./Cache");
const Token = require('../util/crypto/Token');

const debug = require('../../debug');

const Database = new (class{
	constructor(){
		this.log = debug.getLogger('DATABASE');

		this.client = null;
		this.initializing = null;
		this.initializing_error = null;
		this.connect_attempt = null;
		this.connecting = this.init();
	}

	async connect(){
		const url = 'mongodb://localhost:27017';
		var tries = 0;

		while(true){
			this.log.log('CONNECT', 'Connecting to mongodb database at', url);

			this.client = new MongoClient(url, {useUnifiedTopology: true});
			this.connect_attempt = this.client.connect();

			try{
				await this.connect_attempt;
			}catch(e){
				this.log.error('CONNECT', 'Connection failed', e.message, 'trying again...');

				tries++;

				continue;
			}

			this.connect_attempt = null;
			this.log.success('CONNECT', 'Connected to mongodb database after', tries, 'tries');

			break;
		}
	}

	async setup_users(){
		/* set up indexes for email, username, and token that guarantee uniqueness */
		try{
			await this.users.createIndex({email: 1}, {unique: true});
			await this.users.createIndex({username: 1}, {unique: true});
			await this.users.createIndex({token: 1}, {unique: true});
		}catch(e){
			throw new Error('Could not create user indices');
		}
	}

	async setup_playlists(){
		/* find by owner faster using an index */
		try{
			await this.playlists.createIndex({owner: 1});
			await this.playlists.createIndex({'tracks.i': 1, 'tracks.p': 1});
		}catch(e){
			throw new Error('Could not create playlist index');
		}
	}

	async setup(){
		const collections = await this.main.collections();

		var hasUsers = false, hasPlaylists = false;

		for(const collection of collections)
			if(collection.collectionName == 'users')
				hasUsers = true;
			else if(collection.collectionName == 'playlists')
				hasPlaylists = true;
		var arr = [];

		if(!hasUsers)
			arr.push(this.main.createCollection('users'));
		if(!hasPlaylists)
			arr.push(this.main.createCollection('playlists'));
		if(arr.length)
			try{
				/* await promises at the same time */
				await Promise.all(arr);
			}catch(e){
				throw new Error('Could not create collections');
			}
		await this.setup_users();
		await this.setup_playlists();
	}

	async _setup(){
		if(this.initializing)
			return;
		this.initializing = this.setup();

		try{
			await this.initializing;
		}catch(e){
			this.initializing_error = e;
			this.initializing = null;
		}
	}

	async init(){
		await this.connect();

		this.main = this.client.db('ion');

		this.users = this.main.collection('users');
		this.playlists = this.main.collection('playlists');

		this.cache = this.client.db('cache');

		this._setup();
	}

	async ready(){
		if(this.connect_attempt)
			try{
				await this.connect_attempt;
			}catch(e){
				throw new DatabaseError(e);
			}
		if(this.connecting)
			await this.connecting;
		if(this.initializing)
			await this.initializing;
		else{
			await this._setup();

			if(!this.initializing)
				throw new DatabaseError(this.initializing_error);
		}
	}

	async handleCommand(cmd){
		/* OPTIONAL set a 30 second timeout to reject the promise in case of an indefinite wait, however this comes with its own consequences
			such as a user signing up, receiving an error, then their signup completes even though the 30 seconds passed */
		try{
			return await cmd;
		}catch(e){
			throw new DatabaseError(e);
		}
	}

	async find(db, query, projection, {offset, limit} = {}){
		const cursor = db.find(query, {projection});

		if(offset)
			cursor.skip(offset);
		if(limit)
			cursor.limit(limit);
		return await this.handleCommand(cursor.toArray());
	}

	async findOne(db, query, projection){
		return await this.handleCommand(db.findOne(query, {projection}));
	}

	async findOneById(db, id, projection){
		assertString(id);

		if(!ObjectId.isValid(id))
			return null;
		return await this.findOne(db, {_id: ObjectId(id)}, projection);
	}

	async insertOne(db, data){
		return await this.handleCommand(db.insertOne(data));
	}

	async deleteOne(db, data){
		return await this.handleCommand(db.deleteOne({_id: data._id}));
	}

	async replaceOne(db, data){
		return await this.handleCommand(db.replaceOne({_id: data._id}, data));
	}

	async pushOne(db, data, array, item, mod){
		await this.handleCommand(db.updateOne({_id: data._id}, {$push: {[array]: item}}));

		if(mod)
			data[array].push(item);
	}

	async addToSet(db, data, array, item, mod){
		const res = await this.handleCommand(db.updateOne({_id : data._id}, {$addToSet: {[array]: item}}));

		if(res.result.nModified && mod)
			data[array].push(item);
		return res.result.nModified;
	}

	async addToSetMany(db, data, array, items, mod){
		const res = await this.handleCommand(db.updateOne({_id : data._id}, {$addToSet: {[array]: {$each: items}}}));

		if(res.result.nModified && mod)
			/* may contain duplicates */
			data[array] = data[array].concat(items);
		return res.result.nModified;
	}

	async addToSetQuery(db, data, array, item, mod){
		const res = await this.handleCommand(db.updateOne({_id: data._id, [array]: {$not: {$elemMatch: item.query}}}, {$push: {[array]: item.data}}));

		if(res.result.nModified && mod)
			data[array].push(item);
		return res.result.nModified;
	}

	/* extremely slow */
	async addToSetManyQuery(db, data, array, items){
		for(var i = 0; i < items.length; i++){
			await this.addToSetQuery(db, data, array, items[i]);

			console.log(i);
		}
		// const op = db.initializeUnorderedBulkOp();

		// for(var i = 0; i < items.length; i++)
		// 	op.find({_id: data._id, [array]: {$not: {$elemMatch: items[i].query}}}).updateOne({$push: {[array]: items[i].data}});
		// const res = await this.handleCommand(op.execute());

		return 1;
	}

	pullOne_Object(array, item){
		for(var i = 0; i < array.length; i++){
			const elem = array[i];

			var matches = true;

			for(var name in item)
				if(elem[name] !== item[name]){
					matches = false;

					break;
				}
			if(matches){
				array.slice(i, 1);

				break;
			}
		}
	}

	pullOne_Primitive(array, item){
		for(var i = 0; i < array.length; i++)
			if(array[i] === item){
				array.slice(i, 1);

				break;
			}
	}

	async pullOne(db, data, array, item, mod){
		const res = await this.handleCommand(db.updateOne({_id : data._id}, {$pull: {[array]: item}}));

		if(res.result.nModified && mod)
			switch(typeof item){
				case 'object':
					this.pullOne_Object(data[array], item);

					break;
				default:
					this.pullOne_Primitive(data[array], item);

					break;
			}
		return res.result.nModified;
	}

	async updateOne(db, data, fields, mod = true){
		await this.handleCommand(db.updateOne({_id: data._id}, {$set: fields}));

		if(mod)
			for(const name in fields)
				data[name] = fields[name];
	}

	async upsertOne(db, query, data){
		return await this.handleCommand(db.updateOne(query, {$set: data}, {upsert: true}));
	}
});

function assertString(str){
	if(typeof str != 'string')
		throw new TypeError('Function parameter not a string');
}

function assertClass(param, clazz){
	if(!(param instanceof clazz))
		throw new TypeError('Function parameter must be instanceof', clazz);
}

const api = {
	async ready(){
		await Database.ready();
	},

	user: {
		async add(user){
			assertClass(user, User);

			await Database.ready();
			await Database.insertOne(Database.users, user);;
		},

		async getById(id){
			assertString(id);

			await Database.ready();

			return User.fromDB(await Database.findOneById(Database.users, id));
		},

		async getByEmail(email){
			assertString(email);

			await Database.ready();

			return User.fromDB(await Database.findOne(Database.users, {email}));
		},

		async getByToken(token){
			assertString(token);

			await Database.ready();

			return User.fromDB(await Database.findOne(Database.users, {token}));
		},

		async getByUsername(username){
			assertString(username);

			await Database.ready();

			return User.fromDB(await Database.findOne(Database.users, {username}));
		},

		async replace(user){
			assertClass(user, User);

			await Database.ready();
			await Database.replaceOne(Database.users, user);
		},

		async update(user, fields){
			assertClass(user, User);

			await Database.ready();
			await Database.updateOne(Database.users, user, fields);
		},

		async addFriendRequest(recipient, sender){
			assertClass(recipient, User);
			assertClass(sender, User);

			await Database.ready();
			await Database.addToSet(Database.users, recipient, 'friend_requests', sender.id);
		},

		async removeFriendRequest(recipient, sender){
			assertClass(recipient, User);
			assertClass(sender, User);

			await Database.ready();
			await Database.pullOne(Database.users, recipient, 'friend_requests', sender.id);
		},

		async addFriend(a, b){
			assertClass(a, User);
			assertClass(b, User);

			await Database.ready();
			await Database.addToSet(Database.users, a, "friends", b.id);
			await Database.addToSet(Database.users, b, "friends", a.id);
		},

		async removeFriend(a, b){
			assertClass(a, User);
			assertClass(b, User);

			await Database.ready();
			await Database.pullOne(Database.users, a, "friends", b.id);
			await Database.pullOne(Database.users, b, "friends", a.id);
		},

		generateToken(){
			const unique = new ObjectId().toHexString();
			const random = Token.generateHex();

			return Buffer.from(unique + random, 'hex').toString('base64');
		}
	},

	playlist: {
		async add(playlist){
			assertClass(playlist, Playlist);

			await Database.ready();
			await Database.insertOne(Database.playlists, playlist);
		},

		async getById(id, projection = new Playlist.DefaultProjection()){
			assertString(id);

			await Database.ready();

			return Playlist.fromDB(await Database.findOneById(Database.playlists, id, projection));
		},

		async findByOwner(owner, privacy, projection = new Playlist.DefaultProjection(), options){
			assertString(owner);

			await Database.ready();

			if(!ObjectId.isValid(owner))
				return [];
			return Playlist.fromDBMany(await Database.find(Database.playlists, {owner, privacy: {$gte: privacy}}, projection, options));
		},

		async update(playlist, fields){
			assertClass(playlist, Playlist);

			await Database.ready();
			await Database.updateOne(Database.playlists, playlist, fields);
		},

		async pushTrack(playlist, track){
			assertClass(playlist, Playlist);
			assertClass(track, Playlist.Track);

			await Database.ready();

			return await Database.addToSetQuery(Database.playlists, playlist, 'tracks', {query: {p: track.p, i: track.i}, data: {_id: new ObjectId(), p: track.p, i: track.i, d: Date.now()}})
		},

		async pushTracks(playlist, tracks){
			assertClass(playlist, Playlist);

			await Database.ready();

			const items = new Array(tracks.length);

			for(var i = 0; i < tracks.length; i++)
				items[i] = {query: tracks[i].query(), data: tracks[i]};
			return await Database.addToSetManyQuery(Database.playlists, playlist, 'tracks', items);
		},

		async pullTrack(playlist, track){
			assertClass(playlist, Playlist);
			assertClass(track, Playlist.Track);

			await Database.ready();

			return await Database.pullOne(Database.playlists, playlist, 'tracks', track.query());
		},

		async delete(playlist){
			assertClass(playlist, Playlist);

			await Database.ready();

			return await Database.deleteOne(Database.playlists, playlist);
		}
	},

	cache: {
		/* no need to await initializing here because the CacheManager's init is awaited before this is ever called */
		async listCollections(){
			return await Database.handleCommand(Database.cache.collections());
		},

		async createCollection(name){
			return await Database.handleCommand(Database.cache.createCollection(name));
		},

		async get(collection, id){
			return Cache.fromDB(await Database.findOne(collection, {id}));
		},

		async getMany(collection, ids){
			return Cache.fromDBMany(await Database.find(collection, {id: {$in: ids}}));
		},

		async update(collection, data, fields){
			assertClass(data, Cache);

			await Database.updateOne(collection, {id: data.id}, fields, false);
		},

		async store(collection, data){
			assertClass(data, Cache);

			if(data._id)
				/* if we have an {_id} already, it means we fetched it from the database */
				/* left here incase it's ever needed, but a cache in theory should never be fetched, written to, then sent back to the database */
				await Database.replaceOne(collection, data);
			else
				await Database.upsertOne(collection, {id: data.id}, data);
		},

		async updateIfDirty(collection, data, fields, timestamp){
			/* updates the cache document if CacheItem.cache_date < timestamp */

			assertClass(data, Cache);

			await Database.updateOne(collection, {id: data.id, cache_date: {$lt: timestamp}}, fields, false);
		}
	},

	generateUniqueID(){
		return new ObjectId().toHexString();
	}
};

module.exports = api;