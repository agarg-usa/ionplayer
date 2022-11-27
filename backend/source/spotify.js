const fetch = require('../../fetch');
const APIError = require('./apierror');
const APIUtil = require('./apiutil');
const Result = require('./result');
const WebSocket = require('ws');
const crypto = require('crypto');
const debug = require('../../debug');

function generateDeviceId(){
	return crypto.randomBytes(20).toString('hex');
}

const default_codec = {
	type: {stream: 'audio', container: 'mp4', codecs: 'mp4a.40.2'},
	mime: 'audio/mp4; codecs="mp4a.40.2"'
};

const unprotected_codec = {
	type: {stream: 'audio', container: 'mpeg', codecs: 'mp3'},
	mime: 'audio/mpeg; codecs="mp3"'
};

const formats = [
	{
		name: 'file_ids_mp4',
		format: 'mp4'
	}, {
		name: 'file_ids_mp4_dual',
		format: 'mp4'
	}, {
		name: 'file_ids_mp4_cbcs',
		format: 'mp4_cbcs'
	}, {
		name: 'file_urls_mp3',
		format: 'mp3'
	}, {
		name: 'file_urls_external',
		format: 'mp3'
	}/*, {
		name: 'manifest_ids_video',
		format: 'manifest'
	}*/
];

const deviceId = generateDeviceId();

const webSocket = (new class{
	constructor(){
		this.ws = null;
		this.log = debug.getLogger('SPOTIFY WEBSOCKET');

		this.heartbeat_interval = null;
		this.heartbeat_acked = true;
		this.reconnecting = false;
	}

	connect(){
		if(this.ws)
			return;
		this.ws = new WebSocket('wss://guc-dealer.spotify.com/?access_token=' + stateMachine.token);

		this.ws.on('open', () => {
			this.log.log('CONNECTED');

			this.heartbeat_acked = true;
			this.heartbeat_interval = setInterval(() => {
				this.sendHeartbeat();
			}, 30 * 1000);
		});

		this.ws.on('close', () => {
			this.log.log('CLOSED');
			this.reconnect();
		});

		this.ws.on('message', (msg) => {
			var data;

			try{
				data = JSON.parse(msg);
			}catch(e){
				this.log.error('WEBSOCKET', 'Invalid packet received', msg, 'ignoring', e);

				return;
			}

			this.log.verbose('PACKET', data);

			switch(data.type){
				case 'message':
					this.handleMessage(data);

					break;
				case 'pong':
					this.heartbeat_acked = true;

					break;
			}
		});

		this.ws.on('error', (e) => {
			this.log.error('ERROR', e);
			this.reconnect();
		});
	}

	send(data){
		this.ws.send(JSON.stringify(data));
	}

	sendHeartbeat(){
		if(!this.heartbeat_acked){
			this.log.error('ERROR', 'Connection lost');
			this.reconnect();

			return;
		}

		this.heartbeat_acked = false;
		this.send({type: 'ping'});
	}

	handleMessage(data){
		if(data.payloads)
			for(const payload of data.payloads)
				this.handlePayload(payload);
		if(data.headers && data.headers['Spotify-Connection-Id'])
			this.registerDevice(data.headers['Spotify-Connection-Id']);
	}

	registerDevice(connection_id){
		const body = {
			device:{
				brand: "spotify",
				capabilities:{
					change_volume: true,
					enable_play_token: true,
					supports_file_media_type: true,
					play_token_lost_behavior: "pause",
					disable_connect: false,
					audio_podcasts: true,
					video_playback: true,
					manifest_formats: [
						"file_urls_mp3",
						"manifest_ids_video",
						"file_urls_external",
						"file_ids_mp4",
						"file_ids_mp4_dual"
					]
				},

				device_id: deviceId,
				device_type: "computer",
				metadata: {},
				model: "web_player",
				name: "Web Player (Chrome)",
				platform_identifier: "web_player linux undefined;chrome 84.0.4147.125;desktop"
			},

			connection_id: connection_id,
			client_version: "harmony:4.11.0-af0ef98",
			volume: 65535
		};

		stateMachine.makeRequest2('https://guc-spclient.spotify.com/track-playback/v1/devices', {method: 'POST', body})
			.then(() => {
				stateMachine.ready();
			}).catch(() => {
				this.destroy(new Error('Could not register device'));
			});
	}

	handlePayload(payload){
		if(payload.type == 'replace_state'){
			if(payload.state_machine && payload.state_machine.tracks)
				for(const track of payload.state_machine.tracks)
					if(track.content_type == 'TRACK')
						stateMachine.handleTrack(track);
		}
	}

	destroy(e){
		this.log.error('FATAL ERROR', e);
		this.close();
	}

	reconnect(){
		if(this.closed || this.reconnecting)
			return;
		stateMachine.unready();

		this.close(false);
		this.reconnecting = true;

		stateMachine.reload().then(() => {
			this.connect();
		}).catch(() => {

		}).finally(() => {
			this.reconnecting = false;
		});
	}

	close(end){
		if(this.closed)
			return;
		if(this.ws){
			this.ws.close();
			this.ws = null;
		}

		if(this.heartbeat_interval){
			clearTimeout(this.heartbeat_interval);

			this.heartbeat_interval = null;
		}

		if(end)
			this.closed = true;
	}
});

const stateMachine = (new class{
	constructor(){
		this.token = null;
		this.data = null;
		this._ready = false;
		this.readyCallbacks = [];
		this.pendingTrackStreams = new Map();
		this.licenseUrl = null;

		this.account_data = {
			'cookie': ''
		};

		this.start();
	}

	async start(){
		try{
			await this.do();
		}catch(e){
			console.error(e, e && e.stack);

			return;
		}

		webSocket.connect();
	}

	waitForTrackFiles(id, callback){
		if(this.pendingTrackStreams.has(id))
			this.pendingTrackStreams.get(id).push(callback);
		else
			this.pendingTrackStreams.set(id, [callback]);
	}

	handleTrack(track){
		const id = track.metadata.context_uri.substring('spotify:track:'.length);

		const manifest = track.manifest;
		const array = this.pendingTrackStreams.get(id);

		if(!array)
			return;
		this.pendingTrackStreams.delete(id);

		for(const fmt of formats){
			const man = manifest[fmt.name];

			if(!man || !man.length)
				continue;
			const info = man[0];

			if(!info.file_id && !info.file_url)
				continue;
			for(const callback of array)
				callback(null, info);
			return;
		}

		for(const callback of array)
			callback(new Error('No compatible streams found'));
	}

	fetchTrackFiles(id){
		if(this.pendingTrackStreams.has(id))
			return;
		const body = {
			"command": {
				"context":{
					"uri":"spotify:track:" + id,
					"url":"context://spotify:track:" + id,
					"metadata":{}
				}, "play_origin":{
					"feature_identifier":"harmony",
					"feature_version":"4.11.0-af0ef98"
				}, "options":{
					"license":"persistent-license",
					"skip_to":{},
					"player_options_override":{
						"repeating_track":false,
						"repeating_context":false
					}
				}, "endpoint":"play"
			}
		};

		this.makeRequest('https://guc-spclient.spotify.com/connect-state/v1/player/command/from/' + deviceId + '/to/' + deviceId, {method: 'POST', body}).catch((e) => {
			const array = this.pendingTrackStreams.get(id);

			this.pendingTrackStreams.delete(id);

			for(const callback of array)
				callback(new Error('Error negotiating with spotify'));
		});
	}

	async do(){
		var resp = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {headers: this.account_data});

		if(!resp.ok)
			throw new Error('Error negotiating with spotify');
		var body;

		try{
			body = await resp.json();
		}catch(e){
			throw new Error('Error negotiating with spotify');
		}

		if(!body.accessToken)
			throw new Error('Error negotiating with spotify');
		this.token = body.accessToken;

		resp = await fetch('https://guc-spclient.spotify.com/melody/v1/license_url?keysystem=com.widevine.alpha&mediatype=audio&sdk_name=harmony&sdk_version=4.11.0', {headers: {authorization: 'Bearer ' + this.token}});

		if(!resp.ok)
			throw new Error('Error negotiating with spotify');
		body;

		try{
			body = await resp.json();
		}catch(e){
			throw new Error('Error negotiating with spotify');
		}

		this.licenseUrl = 'https://guc-spclient.spotify.com/' + body.uri;
	}

	fetch(){
		if(this.data)
			return this.data;
		this.data = this.do();

		return this.data;
	}

	reload(){
		this.data = null;

		return this.fetch();
	}

	wready(){
		if(this._ready)
			return Promise.resolve();
		return new Promise((resolve, reject) => {
			if(this._ready)
				return resolve();
			this.readyCallbacks.push(resolve);
		});
	}

	unready(){
		this._ready = false;
		this.pendingTrackStreams.forEach((value, key) => {
			this.pendingTrackStreams.delete(key);

			for(const callback of value)
				callback(new Error('Unready event'));
		});
	}

	ready(){
		this._ready = true;

		for(const callback of this.readyCallbacks)
			callback();
		this.readyCallbacks = [];
	}

	async makeRequest2(path, options = {}, retries = 0){
		await this.fetch();

		if(!options.headers)
			options.headers = {};
		options.headers.authorization = 'Bearer ' + this.token;

		if(options.body)
			options.body = JSON.stringify(options.body);
		const resp = await fetch(path, options);

		if(resp.status == 401){
			if(retries)
				throw new Error('Error negotiating with spotify');
			this.reload();

			return await this.makeRequest2(path, options, retries + 1);
		}

		if(!resp.ok)
			throw new Error('Resp not ok: ' + await resp.text());
		var body;

		try{
			body = await resp.json();
		}catch(e){
			throw new Error('Error negotiating with spotify');
		}

		return body;
	}

	async makeRequest(path, options = {}, retries = 0){
		await this.wready();

		if(!options.headers)
			options.headers = {};
		options.headers.authorization = 'Bearer ' + this.token;

		if(options.body)
			options.body = JSON.stringify(options.body);
		const resp = await fetch(path, options);

		if(resp.status == 401){
			if(retries)
				throw new Error('Error negotiating with spotify');
			await this.reload();

			return await this.makeRequest(path, options, retries + 1);
		}

		if(!resp.ok)
			throw new Error('Resp not ok: ' + await resp.text());
		var body;

		try{
			body = await resp.json();
		}catch(e){
			throw new Error('Error negotiating with spotify');
		}

		return body;
	}

	async makeApiRequest(path, options){
		return await this.makeRequest('https://api.spotify.com/v1/' + path, options);
	}
});

class Continuable{
	constructor(){
		this.results = [];
		this.continuation = null;
	}

	push(result){
		this.results.push(result);
	}
}

class Playlist extends Continuable{
	constructor(){
		super();

		this.title = null;
		this.description = null;
	}
}

const api = new (class{
	constructor(){}

	async getArtist(id){
		const data = await stateMachine.makeApiRequest('artists/' + id);

		return {
			name: data.name,
			avatar: data.images[0].url
		};
	}

	async get(id){
		const data = await stateMachine.makeApiRequest('tracks/' + id);

		/* TODO use last artist */
		const author = data.artists[0];

		var artist = this.getArtist(author.id);

		var fileId = new Promise((resolve, reject) => {
			stateMachine.fetchTrackFiles(data.id);
			stateMachine.waitForTrackFiles(data.id, (err, fileId) => {
				if(err)
					reject(err);
				else
					resolve(fileId);
			});
		});

		/* TODO promise.all */
		try{
			artist = await artist;
		}catch(e){
			throw e;
		}

		fileId = (await fileId).file_id;

		var streams = stateMachine.makeRequest('https://guc-spclient.spotify.com/storage-resolve/files/audio/interactive/' + fileId + '?version=10000000&product=9&platform=39&alt=json');
		var seektables = stateMachine.makeRequest('https://seektables.scdn.co/seektable/' + fileId + '.json');

		var arr = await Promise.all([streams, seektables]);

		streams = arr[0];
		seektables = arr[1];

		const pssh = seektables.pssh || seektables.pssh_widevine;//|| seektables.pssh_playready || seektables.pssh_fairplay;
		const codec = pssh ? default_codec : unprotected_codec;

		var curbyte = seektables.offset, curtime = 0;
		const byte = new Array(seektables.segments.length + 1), time = new Array(seektables.segments.length + 1);

		byte[0] = curbyte;
		time[0] = curtime;

		for(var i = 0; i < seektables.segments.length; i++){
			curbyte += seektables.segments[i][0];
			curtime += seektables.segments[i][1];

			byte[i + 1] = curbyte;
			time[i + 1] = curtime;
		}

		return new Result(artist.name, artist.avatar, data.name, data.album.images, data.duration_ms / 1000, data.id, Result.YYMMDD(data.album.release_date), null, [{
			url: streams.cdnurl[0],
			mime: codec.mime,
			type: codec.type,
			index: {start: 0, end: seektables.offset - 1},
			pssh,
			protection: seektables.protection,
			duration: curtime / seektables.timescale,
			seektables: {
				byte, time,
				timescale: seektables.timescale,
				length: seektables.segments.length
			}
		}]);
	}

	async getStreams(id, retries = 0){
		var fileId = new Promise((resolve, reject) => {
			stateMachine.fetchTrackFiles(id);
			stateMachine.waitForTrackFiles(id, (err, fileId) => {
				if(err)
					reject(err);
				else
					resolve(fileId);
			});
		});

		try{
			fileId = (await fileId).file_id;
		}catch(e){
			if(retries)
				throw e;
			await stateMachine.reload();

			return this.getStreams(id, retries + 1);
		}

		var streams = stateMachine.makeRequest('https://guc-spclient.spotify.com/storage-resolve/files/audio/interactive/' + fileId + '?version=10000000&product=9&platform=39&alt=json');
		var seektables = stateMachine.makeRequest('https://seektables.scdn.co/seektable/' + fileId + '.json');

		var arr = await Promise.all([streams, seektables]);

		streams = arr[0];
		seektables = arr[1];

		const pssh = seektables.pssh || seektables.pssh_widevine;//|| seektables.pssh_playready || seektables.pssh_fairplay;
		const codec = pssh ? default_codec : unprotected_codec;

		var curbyte = seektables.offset, curtime = 0;
		const byte = new Array(seektables.segments.length + 1), time = new Array(seektables.segments.length + 1);

		byte[0] = curbyte;
		time[0] = curtime;

		for(var i = 0; i < seektables.segments.length; i++){
			curbyte += seektables.segments[i][0];
			curtime += seektables.segments[i][1];

			byte[i + 1] = curbyte;
			time[i + 1] = curtime;
		}

		return new Result.Streams(null, [{
			url: streams.cdnurl[0],
			mime: codec.mime,
			index: {start: 0, end: seektables.offset - 1},
			type: codec.type,
			pssh,
			duration: curtime / seektables.timescale,
			seektables: {
				byte, time,
				timescale: seektables.timescale,
				length: seektables.segments.length
			}
		}]);
	}

	async getLicense(buffer, retries = 0){
		await stateMachine.fetch();

		const resp = await fetch(stateMachine.licenseUrl, {method: 'POST', headers: {authorization: 'Bearer ' + stateMachine.token}, body: buffer});

		if(resp.status == 401){
			if(retries)
				throw new Error('Error negotiating with spotify');
			await stateMachine.reload();

			return await this.getLicense(buffer, retries + 1);
		}

		if(!resp.ok)
			throw new Error('Error negotiating with spotify ' + await resp.text() + ' status ' + resp.status);
		const body = await resp.buffer();

		return body;
	}

	async getCertificate(){
		const {res, body} = await APIUtil.getBuffer('https://spclient.wg.spotify.com/widevine-license/v1/application-certificate');

		if(!res.ok)
			throw new Error('Error negotiating with spotify ' + body.toString() + ' status ' + resp.status);
		return body;
	}

	async search(query){
		const data = await stateMachine.makeApiRequest('search/?type=track&q=' + encodeURIComponent(query) + '&decorate_restrictions=false&include_external=audio&limit=20&offset=0');
		const results = [];

		for(const result of data.tracks.items){
			const author = result.artists[0];

			results.push(new Result(author.name, null, result.name, result.album.images, result.duration_ms / 1000, result.id, Result.YYMMDD(result.album.release_date)));
		}

		return {results};
	}

	async playlistOnce(id, continuation){
		var cont;

		if(!continuation){
			const data = await stateMachine.makeApiRequest('playlists/' + id);

			cont = new Playlist();

			cont.description = data.description;
			cont.title = data.name;
			continuation = 0;
		}else
			cont = new Continuable();
		const data = await stateMachine.makeApiRequest('playlists/' + id + '/tracks?offset=' + continuation + '&limit=100');

		for(const item of data.items){
			if(item.track && !item.track.is_local)
				cont.push(new Result(
					item.track.artists[0].name, null,
					item.track.name, item.track.album.images, item.track.duration_ms / 1000, item.track.id,
					Result.YYMMDD(item.track.album.release_date)
				));
		}

		if(data.items.length >= 100)
			cont.continuation = continuation + data.items.length;
		return cont;
	}
});

module.exports = api;