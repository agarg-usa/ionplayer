const Database = require('./db/Database');

const {DatabaseError} = require('./Errors');

module.exports = (new class{
	constructor(){
		this.collections = {};

		this.initplatforms = null;
		this.initializing = null;
		this.initializing_error = null;
	}

	async create(platforms){
		/* create platforms as necessary */
		const collections = await Database.cache.listCollections();

		for(const collection of collections)
			this.collections[collection.collectionName] = collection;
		for(const platform of platforms){
			if(!this.collections[platform])
				this.collections[platform] = await Database.cache.createCollection(platform);
			await this.collections[platform].createIndex({id: 1});
		}
	}

	init(platforms){
		if(this.initplatforms)
			throw new Error('init called twice');
		this.initplatforms = platforms;
	}

	async _init(){
		if(this.initializing)
			return;
		this.initializing = this.create(this.initplatforms);

		try{
			await this.initializing;
		}catch(e){
			this.initializing_error = e;
			this.initializing = null;
		}
	}

	async ready(){
		await Database.ready();

		if(this.initializing)
			await this.initializing;
		else{
			await this._init();

			if(!this.initializing)
				throw this.initializing_error;
		}
	}

	async get(platform, id){
		await this.ready();
		/* api manager should check that the platform is valid before calling this */
		return await Database.cache.get(this.collections[platform], id);
	}

	async getMany(platform, ids){
		await this.ready();

		return await Database.cache.getMany(this.collections[platform], ids);
	}

	async store(platform, data){
		await this.ready();

		if(!data.playable)
			/* don't update other fields if it is now unplayable, so that it doesn't e.g delete the thumbnails or title */
			await Database.cache.update(this.collections[platform], data, data.unplayableEntries());
		else
			await Database.cache.store(this.collections[platform], data);
	}

	async storeMany(platform, items){
		await this.ready();

		const collection = this.collections[platform];
		const operation = collection.initializeUnorderedBulkOp();

		for(const item of items){
			if(!item.playable)
				operation.find({id: item.id}).updateOne({$set: item.unplayableEntries()});
			else
				operation.find({id: item.id}).upsert().updateOne({$set: item});
		}

		try{
			await operation.execute();
		}catch(e){
			throw new DatabaseError(e);
		}
	}
});