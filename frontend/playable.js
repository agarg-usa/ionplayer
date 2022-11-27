import playbar from './playbar';
import Player from './player'

export const States = {
	NONE: 0,
	PLAYING: 1,
	PAUSED: 2,
	LOADING: 3, /* playing but slow internet */
	FETCHING: 4 /* acquiring the track */
};

const Types = {
	TRACK: 0,
	LIST: 1
};

const Manager = new (class{
	constructor(){
		this.list = null;
		this.track = null;
		this.fetching = null;
		this.tracks = [];
		this.lists = [];
		this.init();
		this.state = States.NONE;
		this.list_state = States.NONE;
		this.fetching_state = States.NONE;
	}

	init(){
		Player.on('track', (track) => {
			if(this.track)
				this.signalTracks(this.track, States.NONE);
			this.track = track;

			if(track){
				this.signalTracks(track, States.PLAYING);
				this.state = States.PLAYING;
			}else
				this.state = States.NONE;
			this.fetching = null;
		});

		Player.on('list', (list) => {
			if(this.list)
				this.signalLists(this.list, States.NONE);
			this.list = list;

			if(list){
				this.signalLists(list, States.PLAYING);
				this.list_state = States.PLAYING;
			}else
				this.list_state = States.NONE;
		});

		Player.on('fetch', (track) => {
			if(this.fetching)
				this.signalTracks(this.fetching, States.NONE);
			this.fetching = track;

			if(track){
				this.signalTracks(track, States.FETCHING);
				this.fetching_state = States.FETCHING;
			}else
				this.fetching_state = States.NONE;
		});

		Player.on('fetchend', () => {
			if(this.fetching)
				this.signalTracks(this.fetching, States.NONE);
			this.fetching = null;
			this.fetching_state = States.NONE;
		});

		Player.on('play', () => {
			if(this.track)
				this.signalTracks(this.track, States.PLAYING);
			if(this.list)
				this.signalLists(this.list, States.PLAYING);
			this.state = States.PLAYING;
			this.list_state = States.PLAYING;
		});

		Player.on('pause', () => {
			if(this.track)
				this.signalTracks(this.track, States.PAUSED);
			if(this.list)
				this.signalLists(this.list, States.PAUSED);
			this.state = States.PAUSED;
			this.list_state = States.PAUSED;
		});

		Player.on('waiting', () => {
			if(this.track)
				this.signalTracks(this.track, States.LOADING);
			if(this.list)
				this.signalLists(this.list, States.LOADING);
			this.state = States.LOADING;
			this.list_state = States.LOADING;
		});

		Player.on('canplay', () => {
			this.state = Player.paused ? States.PAUSED : States.PLAYING;
			this.list_state = this.state;

			if(this.track)
				this.signalTracks(this.track, this.state);
			if(this.list)
				this.signalLists(this.list, this.state);
		});
	}

	remove(list, item){
		list.splice(list.indexOf(item), 1);
	}

	subscribe(playable){
		if(playable.type == Types.TRACK)
			this.tracks.push(playable);
		else if(playable.type == Types.LIST)
			this.lists.push(playable);
		this.changed(playable);
	}

	unsubscribe(playable){
		if(playable.type == Types.TRACK)
			this.remove(this.tracks, playable);
		else if(playable.type == Types.LIST)
			this.remove(this.lists, playable);
	}

	setState(playable, state){
		playable.state = state;
		playable.setState(state);
	}

	matches(playable, item){
		return item && playable.platform !== undefined && playable.id !== undefined &&
			playable.id == item.id && playable.platform == item.platform;
	}

	signalTrack(ptrack, track, state, unset){
		if(this.matches(ptrack, track))
			this.setState(ptrack, state);
		else if(unset)
			this.setState(ptrack, States.NONE);
	}

	signalTracks(track, state){
		for(const ptrack of this.tracks)
			this.signalTrack(ptrack, track, state);
	}

	signalList(plist, list, state, unset){
		if(this.matches(plist, list))
			this.setState(plist, state);
		else if(unset)
			this.setState(plist, States.NONE);
	}

	signalLists(list, state){
		for(const plist of this.lists)
			this.signalList(plist, list, state);
	}

	changed(playable){
		if(playable.type == Types.TRACK)
			this.signalTrack(playable, this.track, this.state, true);
		else if(playable.type == Types.LIST)
			this.signalList(playable, this.list, this.list_state, true);
	}

	setPlaying(playable, playing, forceplay){
		do{
			if(playable.type == Types.TRACK){
				if(this.track && playable.platform !== undefined && playable.id !== undefined &&
					playable.id == this.track.id && playable.platform == this.track.platform)
					break;
			}else if(playable.type == Types.LIST){
				if(this.list && playable.platform !== undefined && playable.id !== undefined &&
					playable.id == this.list.id && playable.platform == this.list.platform)
					break;
			}

			if(forceplay && playable.state == States.NONE)
				if(playable.type == Types.TRACK)
					Player.playTrack(playable.data);
				else if(playable.type == Types.LIST)
					Player.playPlaylist(playable.data);
			return;
		}while(false);

		if(playing)
			Player.play();
		else
			Player.pause();
	}

	play(playable){
		this.setPlaying(playable, true);
	}

	pause(playable){
		this.setPlaying(playable, false);
	}

	toggle(playable){
		this.setPlaying(playable, Player.paused);
	}

	toggleOrPlay(playable){
		this.setPlaying(playable, Player.paused, true);
	}
});

class Playable{
	constructor(type){
		this.type = type;
		this.state = States.NONE;
		this.data = null;
		this._subscribed = false;
	}

	get platform(){
		return this.data ? this.data.platform : undefined;
	}

	get id(){
		return this.data ? this.data.id : undefined;
	}

	setState(state){

	}

	changed(){
		Manager.changed(this);
	}

	subscribe(){
		if(!this._subscribed){
			Manager.subscribe(this);

			this._subscribed = true;
		}
	}

	unsubscribe(){
		if(this._subscribed){
			Manager.unsubscribe(this);

			this._subscribed = false;
		}
	}

	play(){
		Manager.play(this);
	}

	pause(){
		Manager.pause(this);
	}

	toggle(){
		Manager.toggle(this);
	}

	toggleOrPlay(){
		Manager.toggleOrPlay(this);
	}
}

class track{
	constructor(data){
		this.copyFrom(data);
	}

	copyFrom(data){
		if(data.platform === undefined || !data.id)
			throw new Error('Invalid Track');
		this.author_name = data.author_name;
		this.author_avatar = data.author_avatar;
		this.title = data.title;
		this.thumbnails = data.thumbnails;
		this.duration = data.duration;
		this.id = data.id;
		this.unplayable_reason = data.unplayable_reason;
		this.streams = data.streams;
		this.volume = data.volume;
		this.loaded = data.loaded;
		this.platform = data.platform;
	}
}

class playlist{
	constructor(data){
		this.copyFrom(data);
	}

	copyFrom(data){
		if(data.platform === undefined || !data.id)
			throw new Error('Invalid Playlist');
		this.id = data.id;
		this.platform = data.platform;
		this.tracks = data.tracks;
		this.length = data.length;
	}
}

export class PlayableTrack extends Playable{
	constructor(data){
		super(Types.TRACK);

		if(data)
			this.set(data);
	}

	set(data){
		this.data = new track(data);

		if(this._subscribed)
			this.changed();
	}
}

export class PlayableList extends Playable{
	constructor(data){
		super(Types.LIST); /* playlist, album, anything list */

		if(data)
			this.set(data);
	}

	set(data){
		this.data = new playlist(data);

		if(this.subscribed)
			this.changed();
	}
}

export class Playlist extends PlayableList{
	constructor(data){
		super(data);
	}

	set(data){
		if(data.platform !== null && data.platform !== undefined)
			throw new Error('Playlist cannot have platform');
		data.platform = null;

		super.set(data);
	}
}