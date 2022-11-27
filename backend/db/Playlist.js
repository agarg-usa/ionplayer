const { ObjectId } = require("mongodb");

class Playlist{
	constructor(title, description, privacy, owner, last_updated = -1){
		this.tracks = [];
		this.title = title;
		this.description = description;
		this.last_updated = last_updated;
		this.thumbnail = null;
		this.owner = owner;
		this.privacy = privacy;
	}

	fromDB(playlist){
		this._id = playlist._id;
		this.tracks = playlist.tracks;
		this.title = playlist.title;
		this.description = playlist.description;
		this.last_updated = playlist.last_updated;
		this.thumbnail = playlist.thumbnail;
		this.owner = playlist.owner;
		this.privacy = playlist.privacy;
		/* a mongodb aggregation field that is not actually in the database
			this playlist must not be re-inserted to the database in anyway otherwise
			this field will be written too */
		this.length = playlist.length;

		return this;
	}

	tracksFromDB(){
		for(var i = 0; i < this.tracks.length; i++)
			this.tracks[i] = Playlist.Track.fromDB(this.tracks[i])
	}

	get id(){
		return this._id.toHexString();
	}

	publicEntries(){
		return{
			id: this.id,
			title: this.title,
			description: this.description,
			last_updated: this.last_updated,
			thumbnail: this.thumbnail,
			owner: this.owner,
			length: this.length
		};
	}
}

Playlist.fromDB = function(playlist){
	if(playlist)
		return new Playlist().fromDB(playlist);
	return null;
};


Playlist.fromDBMany = function(results){
	for(var i = 0; i < results.length; i++)
		results[i] = Playlist.fromDB(results[i]);
	return results;
};

Playlist.Track = class Track{
	constructor(track, time){
		this.p = track.platform;
		this.i = track.id;
		this.d = time;
		this._id = new ObjectId();
	}

	get platform(){
		return this.p;
	}

	set platform(p){
		this.p = p;
	}

	get id(){
		return this.i;
	}

	set id(i){
		this.i = i;
	}

	get date_added(){
		return this.d;
	}

	set date_added(d){
		this.d = d;
	}

	fromDB(track){
		this.p = track.p;
		this.i = track.i;
		this.d = track.d;
		this._id = track._id;

		return this;
	}

	publicEntries(){
		return {
			platform: this.p,
			id: this.i
		};
	}

	query(){
		return {
			p: this.p,
			i: this.i
		};
	}
};

Playlist.Track.fromDB = function(track){
	if(track)
		return new Playlist.Track({}).fromDB(track);
	return null;
};

Playlist.DefaultProjection = class DefaultProjection{
	constructor(){
		this.length = {$size: '$tracks'};

		this._id = 1;
		this.title = 1;
		this.description = 1;
		this.last_updated = 1;
		this.thumbnail = 1;
		this.owner = 1;
		this.privacy = 1;
	}
};

Playlist.TrackSliceProjection = class TrackSliceProjection extends Playlist.DefaultProjection{
	constructor(offset, limit){
		super();

		this.tracks = {$slice: [offset, limit]};
	}
};

Playlist.AllTracksProjection = class AllTracksProjection extends Playlist.DefaultProjection{
	constructor(){
		super();

		this.tracks = 1;
	}
};

Playlist.PUBLIC = 2;
Playlist.UNLISTED = 1;
Playlist.PRIVATE = 0;

module.exports = Playlist;