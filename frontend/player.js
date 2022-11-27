import {Parser} from './lib/m3u8-parser.min'
import toasts from './toast'

class Segments{
	constructor(player, stream){
		this.player = player;
		this.stream = stream;
		this.timescale = -1;
		this.length = -1;
		this.time = null;
		this.ready = false;
	}

	fetchInit(){}

	load(data){}

	fetch(num){}
}

class DASHSegments extends Segments{
	constructor(player, stream){
		super(player, stream);

		this.byte = null;
	}

	get(start, end){
		return this.player.fetchMedia(this.stream.url, start, end);
	}

	fetchInit(){
		return this.get(0, this.stream.index.end);
	}

	load(data){
		this.init = data;

		if(this.stream.seektables)
			this.loadSeektables();
		else
			this.parseSegments(this.init);
		this.ready = true;
	}

	fetch(num){
		return this.get(this.byte[num], this.byte[num + 1] - 1);
	}

	loadSeektables(){
		this.time = this.stream.seektables.time;
		this.byte = this.stream.seektables.byte;
		this.timescale = this.stream.seektables.timescale;
		this.length = this.stream.seektables.length;
	}

	parseSegments(init){
		var offset;

		if(this.stream.type.container == 'mp4'){
			function readInt16(){
				const int = (init[offset] << 8) + init[offset + 1];

				offset += 2;

				return int;
			}

			function readInt32(){
				const int = (init[offset] << 24) + (init[offset + 1] << 16) + (init[offset + 2] << 8) + init[offset + 3];

				offset += 4;

				return int;
			}

			function readInt64(){
				return (2 ** 32) * readInt32() + readInt32();
			}

			offset = this.stream.index.start;
			offset += 8;

			const version = init[offset++];

			offset += 3;
			offset += 4;

			const timescale = readInt32();

			var curbyte = this.stream.index.end + 1;
			var curtime;

			if(version){
				curtime = readInt64();
				curbyte += readInt64();
			}else{
				curtime = readInt32();
				curbyte += readInt32();
			}

			offset += 2;

			const segments = readInt16();
			const byte = new Array(segments + 1);
			const time = new Array(segments + 1);

			byte[0] = curbyte;
			time[0] = curtime;

			for(var i = 0; i < segments; i++){
				curbyte += readInt32() & 0x7fffffff;
				curtime += readInt32();

				byte[i + 1] = curbyte;
				time[i + 1] = curtime;

				offset += 4;
			}

			this.timescale = timescale;
			this.time = time;
			this.byte = byte;
			this.length = segments;
		}else if(this.stream.type.container == 'webm'){
			function readVint(){
				var number = init[offset++];
				var leadingZeros = 8;

				for(var i = 7; i >= 0; i--)
					if((number >> i) & 1){
						leadingZeros = 7 - i;

						break;
					}
				if(leadingZeros == 0)
					number &= 0x7f;
				else{
					number = 256 * number + init[offset++];
					number &= 0x7fff >> leadingZeros;

					for(var i = 1; i < leadingZeros; i++)
						number = number * 256 + init[offset++];
				}

				return number;
			}

			function readInt(bytes){
				var num = 0;

				for(var i = 0; i < bytes; i++)
					num = 256 * num + init[offset++];
				return num;
			}

			offset = 0;

			var type, size;
			var segment_offset, bytelength, timescale = -1, duration = -1;

			while(offset < init.length){
				type = readVint(), size = readVint();

				if(type != 139690087)
					offset += size;
				else
					break;
			}

			segment_offset = offset;
			bytelength = offset + size;

			while(offset < init.length){
				type = readVint(), size = readVint();

				if(type != 88713574)
					offset += size;
				else
					break;
			}

			while(offset < init.length){
				type = readVint(), size = readVint();

				if(type == 710577)
					timescale = readInt(size);
				else if(type == 1161){
					const view = new DataView(init.buffer, offset);

					if(size == 8)
						duration = view.getFloat64(0);
					else
						duration = view.getFloat32(0);
					if(duration == -1)
						duration = 0;
					offset += size;
				}else
					offset += size;
				if(timescale != -1 && duration != -1)
					break;
			}

			offset = this.stream.index.start;

			readVint();

			const end = readVint() + offset;

			const byte = [];
			const time = [];
			var length = 0;

			while(offset < end){
				if(readVint() != 59)
					break;
				const elEnd = readVint() + offset;

				if(readVint() != 51)
					break;
				const timecode = readInt(readVint());

				if(readVint() != 55)
					break;
				const e = readVint() + offset;
				var position = 0;

				while(offset < e){
					const id = readVint();
					const sz = readVint();
					const ee = offset + sz;

					if(id == 113){
						position = readInt(sz);

						break;
					}

					offset = ee;
				}

				offset = elEnd;
				byte.push(position + segment_offset);
				time.push(timecode);
				length++;
			}

			byte.push(bytelength);
			time.push(duration);

			this.timescale = 1e9 / timescale;
			this.byte = byte;
			this.time = time;
			this.length = length;
		}
	}
}

class HLSSegments extends Segments{
	constructor(player, stream){
		super(player, stream);

		this.segments = null;
	}

	fetchInit(){
		return this.player.fetchManifest(this.stream.url);
	}

	load(data){
		this.ready = true;
		this.parseSegments(data);
	}

	fetch(num){
		return this.player.fetchMedia(this.segments[num]);
	}

	parseSegments(init){
		const parser = new Parser();

		parser.push(init);
		parser.end();

		this.timescale = 1000000;
		this.length = parser.manifest.segments.length;
		this.time = new Array(this.length + 1);
		this.segments = new Array(this.length);

		this.time[0] = 0;

		for(var i = 0; i < this.length; i++){
			this.time[i + 1] = this.time[i] + parser.manifest.segments[i].duration * 1000000;
			this.segments[i] = parser.manifest.segments[i].uri;
		}
	}
}

const MediaPlayer = (new class{
	constructor(){
		this.playId = 0;

		this.audio = new Audio();
		this.mediaSource = null;
		this.audioBuffer = null;
		this.fetching = {license: null, media: null, track: null, certificate: null};
		this.data = null;

		this.update_clock = null;
		this.seeked = false;
		this.append_chunk = 0;
		this.fetch_chunk = 0;
		this.data_size = 0;
		this.data_chunks = 0;
		this.max_data_size = 16 * 1024 * 1024; /* 16MB */
		this.min_time_preload = 30; /* 60 seconds */

		this.playing = null;
		this.last_reload = null;

		this.configs = {};
		this.keySystem = null;
		this.certificate = null;
		this.fetching_certificate = null;
		this.detecting = null;
		this.session = null;
		this.session_expired = false;
		this.protection = null;

		this.log = debug.getLogger('PLAYER');
		this.init();
	}

	size(bytes){
		if(bytes == 0)
			return '0B';
		const pbm = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];

		var s = 0;

		while(bytes >= 1000){
			bytes = Math.floor(bytes) / 1000;
			s++;
		}

		return bytes + pbm[s] + 'B';
	}

	async _fetch(obj){
		var err = null, data = null;

		do{
			var resp;

			try{
				resp = await obj.request;
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			obj.response = resp;

			var p;

			if(obj.format == 'text' || obj.format == 'json')
				p = resp.text();
			else
				p = resp.arrayBuffer();
			try{
				data = await p;
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			if(obj.format == 'uintbuffer')
				data = new Uint8Array(data);
			else if(obj.format == 'json')
				try{
					data = JSON.parse(data);
				}catch(e){
					err = new Error('Invalid server response');
				}
		}while(false);

		if(!obj.aborted){
			if(this.fetching[obj.type] != obj)
				this.log.warn('FETCH', 'Request finished is not equal to the current fetch');
			else
				this.fetching[obj.type] = null;
		}else{
			this.log.error('FETCH', 'Aborted a request for', obj.type);

			throw null;
		}

		if(err){
			this.log.error('FETCH', 'An error occured while fetching data', err);

			throw err;
		}

		return data;
	}

	fetch(type, format, path, options = {}){
		const controller = new AbortController();

		options.signal = controller.signal;

		const obj = {type, format, options, controller, aborted: false, request: fetch(path, options)};

		obj.result = this._fetch(obj);

		this.fetching[type] = obj;

		return obj;
	}

	async _fetchCertificate(){
		var req = this.fetch('certificate', 'buffer', '/api/media/track/spotify/CERTIFICATE', {headers: {authorization: client.token}});

		try{
			req = await req.result;
		}catch(e){
			this.certificate = null;

			return;
		}

		this.certificate = req;
	}

	fetchCertificate(){
		if(this.fetching_certificate)
			return this.fetching_certificate;
		this.fetching_certificate = this._fetchCertificate();

		this.fetching_certificate.then(() => {
			this.fetching_certificate = null;
		});

		return this.fetching_certificate;
	}

	fetchLicense(path, body){
		return this.fetch('license', 'buffer', path, {method: 'POST', headers: {authorization: client.token}, body});
	}

	mediaPath(path){
		return 'https://media.' + location.host + '/' + path + '?authorization=' + encodeURIComponent(client.token);
	}

	fetchMedia(path, start, end){
		path = this.mediaPath(path);

		if(start != null){
			path += '&range=' + start + '-';

			if(end != null)
				path += end;
		}

		return this.fetch('media', 'uintbuffer', path);
	}

	fetchManifest(path){
		path = this.mediaPath(path);

		return this.fetch('media', 'text', path);
	}

	async fetchTrack(track){
		const req = this.fetch('track', 'json', '/api/media/track/' + track.platform + '/' + track.id + '/streams', {headers: {authorization: client.token}});

		return await req.result;
	}

	stopRequest(type){
		if(this.fetching[type]){
			this.fetching[type].aborted = true;
			this.fetching[type].controller.abort();
			this.fetching[type] = null;
		}
	}

	stopAllRequests(){
		this.stopRequest('license');
		this.stopRequest('media');
		this.stopRequest('track');
	}

	async detectEMEConfigs(){
		const mediaKeySystems = {
			WIDEVINE: {
				commonName: 'widevine',
				name: 'com.widevine.alpha'
			}
		};

		const mediaKeyConfig = [{
			label: 'audio-sw-crypto',
			initDataTypes: ['cenc'],
			audioCapabilities: [{
				contentType: 'audio/mp4; codecs="mp4a.40.2"',
				robustness: 'SW_SECURE_CRYPTO'
			}],
			videoCapabilities: [],
			distinctiveIdentifier: 'optional',
			persistentState: 'optional',
			sessionTypes: ['temporary']
		}];

		const pending_system = [];
		var pending_promise = [];

		for(const system in mediaKeySystems){
			const keySystem = mediaKeySystems[system];

			pending_promise.push(navigator.requestMediaKeySystemAccess(keySystem.name, mediaKeyConfig));
			pending_system.push(keySystem);
		}

		pending_promise = await Promise.allSettled(pending_promise);

		for(var i = 0; i < pending_promise.length; i++){
			if(pending_promise[i].status != 'fulfilled')
				/* unsupported config */
				continue;
			this.configs[pending_system[i].name] = pending_promise[i].value;
		}

		if(this.configs[mediaKeySystems.WIDEVINE.name]){
			this.keySystem = this.configs[mediaKeySystems.WIDEVINE.name];
			this.protection = 'cenc';
		}

		// else if(this.configs[mediaKeySystems.PLAYREADY.name])
		// 	this.keySystem = this.configs[mediaKeySystems.PLAYREADY.name];
		// else if(this.configs[mediaKeySystems.PLAYREADY_HARDWARE.name])
		// 	this.keySystem = this.configs[mediaKeySystems.PLAYREADY_HARDWARE.name];
		// else if(this.configs[mediaKeySystems.FAIRPLAY.name])
		// 	this.keySystem = this.configs[mediaKeySystems.FAIRPLAY.name];
		//	this.protection = 'hls'
	}

	init(){
		this.detecting = this.detectEMEConfigs();

		this.audio.addEventListener('play', () => {
			this.update();
			this.setUpdateClock(true);

			if(this.session_expired){
				this.session_expired = false;
				this.handleEncrypted();
			}
		});

		this.audio.addEventListener('pause', () => {
			this.update();
			this.setUpdateClock(false);
		});

		this.audio.addEventListener('seeking', () => {
			this.seeked = true;
		});

		this.audio.addEventListener('waiting', () => {
			this.update();
		});

		this.audio.addEventListener('playing', () => {
			this.update();
		});

		this.audio.addEventListener('error', () => {
			if(this.audio.error.code == 3){
				this.log.error('PLAYBACK', this.audio.error.message);
				this.stop();
			}
		});
	}

	async handleEncrypted(){
		const playId = this.playId;

		await this.detecting;

		if(this.playId != playId)
			return;
		if(!this.keySystem){
			this.log.error('ERROR', 'No encrypted media extensions key system found'); /* TODO show an error message to the user */
			this.stop();

			return;
		}

		if(!this.audio.mediaKeys){
			var keys;

			try{
				keys = await this.keySystem.createMediaKeys();
			}catch(e){
				this.log.error('ERROR', 'Could not create media keys');
				this.stop();

				return;
			}

			if(this.playId != playId)
				return;
			try{
				await this.audio.setMediaKeys(keys);
			}catch(e){
				this.log.error('ERROR', 'Could not set media keys');
				this.stop();

				return;
			}

			if(this.playId != playId)
				return;
			do{
				if(this.certificate)
					try{
						await this.audio.mediaKeys.setServerCertificate(this.certificate);

						break;
					}catch(e){

					}
				if(this.playId != playId)
					return;
				await this.fetchCertificate();

				if(this.playId != playId)
					return;
				if(!this.certificate){
					this.log.error('ERROR', 'Could not get certificate');
					this.stop();

					return;
				}

				try{
					await this.audio.mediaKeys.setServerCertificate(this.certificate);
				}catch(e){
					this.log.error('ERROR', 'Could not set certificate');
					this.stop();

					return;
				}
			}while(false);

			if(this.playId != playId)
				return;
		}

		if(this.session)
			this.session.close();
		const session = this.audio.mediaKeys.createSession();

		this.session = session;
		this.session_expired = false;

		this.session.addEventListener('message', async (event) => {
			if(this.playId != playId || this.session != session)
				return;
			var data;

			if(this.fetching.license)
				this.stopRequest('license');
			try{
				data = await this.fetchLicense('/api/media/track/spotify/LICENSE', event.message).result;
			}catch(e){
				if(e != null)
					this.log.error('FETCH', 'Could not fetch license', e);
				return;
			}

			if(this.playId != playId || this.session != session)
				return;
			try{
				await this.session.update(data);
			}catch(e){
				this.log.error('LICENSE', 'Could not set license', e.message);
			}
		});

		this.session.addEventListener('keystatuseschange', () => {
			if(playId != this.playId || this.session != session)
				return;
			var hasUnexpired = false;

			this.session.keyStatuses.forEach((status) => {
				if(status == 'usable')
					hasUnexpired = true;
			});

			if(!hasUnexpired){
				this.session.close();
				this.session = null;
				this.session_expired = false;

				if(this.audio.paused)
					this.session_expired = true;
				else
					this.handleEncrypted();
			}
		});

		const pssh = atob(this.stream.pssh);
		const buffer = new Uint8Array(pssh.length);

		for(var i = 0; i < pssh.length; i++)
			buffer[i] = pssh.charCodeAt(i);
		this.session.generateRequest(this.stream.protection || this.protection, buffer.buffer);
	}

	play(){
		this.audio.play().catch(() => {});
	}

	pause(){
		this.audio.pause();
	}

	stop(){
		this.stopAllRequests();
		this.audio.src = '';
		this.mediaSource = null;
		this.audioBuffer = null;
		this.playing = null;
		this.data = null;
		this.stream = null;
		this.segments = null;
		this.append_chunk = 0;
		this.fetch_chunk = 0;
		this.data_size = 0;
		this.data_chunks = 0;
		this.seeked = false;
		this.last_reload = null;
		this.setUpdateClock(false);
	}

	setVolume(v){
		this.audio.volume = v;
	}

	setUpdateClock(playing){
		if(playing){
			if(!this.update_clock)
				this.update_clock = setInterval(() => {
					this.update(true);
				}, 4000);
		}else{
			if(this.update_clock){
				clearInterval(this.update_clock);

				this.update_clock = null;
			}
		}
	}

	update(clock){
		if(!this.audioBuffer || !this.segments.ready || this.fetching.track)
			return;
		var time = this.audio.currentTime;
		var buffer_end = -1;
		var need_data = false;

		for(var i = 0; i < this.audioBuffer.buffered.length; i++){
			const start = this.audioBuffer.buffered.start(i), end = this.audioBuffer.buffered.end(i);

			if(start <= time && end >= time)
				buffer_end = end;
		}

		if(this.seeked){
			this.seeked = false;

			var timecode;

			if(buffer_end != -1)
				timecode = Math.round(buffer_end * this.segments.timescale);
			else
				timecode = time * this.segments.timescale;
			var l = 0, r = this.segments.length, mid;

			while(l < r){
				mid = Math.floor((l + r + 1) / 2);

				if(this.segments.time[mid] > timecode)
					r = mid - 1;
				else
					l = mid;
			}

			this.append_chunk = l;
			this.fetch_chunk = l;

			this.log.verbose('Seeked to', time, 'segment', l, 'with start time', this.segments.time[l], this.segments.time[l] / this.segments.timescale);

			while(this.fetch_chunk < this.segments.length && this.data[this.fetch_chunk].buffer)
				this.fetch_chunk++;
			if(this.fetching.media && this.fetching.media.segment != this.fetch_chunk)
				this.stopRequest('media');
		}

		if(buffer_end == -1 || buffer_end - time <= this.min_time_preload)
			if(this.append_chunk < this.segments.length)
				need_data = true;
		if(!this.audioBuffer.updating){
			if(this.append_chunk < this.segments.length){
				if(need_data && this.data[this.append_chunk].buffer){
					if(this.playing.platform == 'soundcloud')
						this.audioBuffer.timestampOffset = this.segments.time[this.append_chunk] / this.segments.timescale;
					this.audioBuffer.appendBuffer(this.data[this.append_chunk++].buffer);
				}
			}else if(this.mediaSource.readyState != 'ended')
				this.mediaSource.endOfStream();
		}

		if(this.data_size >= this.max_data_size && this.fetch_chunk < this.segments.length){
			var l = 0;

			for(var i = this.fetch_chunk - 1; i >= 0; i--)
				if(!this.data[i].buffer){
					l = i + 1;

					break;
				}
			/* we should fetch more if append chunk is closer to fetch chunk than the beginning of the segments
				or the chunks in these segments is less than a third of the total */
			if(this.fetch_chunk <= this.append_chunk || this.fetch_chunk - this.append_chunk < this.append_chunk - l || this.fetch_chunk - l < this.data_chunks / 3){
				var index = -1;

				for(var i = 0; i < l; i++)
					if(this.data[i].buffer){
						index = i;

						break;
					}
				if(index == -1)
					for(var i = this.segments.length - 1; i > this.fetch_chunk; i--)
						if(this.data[i].buffer){
							index = i;

							break;
						}
				if(index == -1)
					index = l;
				const len = this.data[index].buffer.length;

				this.data_size -= len;
				this.data_chunks--;
				this.data[index].buffer = null;

				this.log.verbose('DATA', 'Deleted segment #' + index, 'of', this.size(len));
			}
		}

		while(this.fetch_chunk < this.segments.length && this.data[this.fetch_chunk].buffer)
			this.fetch_chunk++;
		if(this.data_size < this.max_data_size && this.fetch_chunk < this.segments.length && !this.fetching.media && (need_data || clock))
			this.fetchSegment(this.fetch_chunk);
	}

	async fetchSegment(seg){
		this.log.verbose('FETCH', 'Fetching segment #' + seg);

		const fetch = this.segments.fetch(seg);

		fetch.segment = seg;

		var data;

		try{
			data = await fetch.result;
		}catch(e){
			if(e != null){
				this.log.error('FETCH', 'Could not fetch segment #' + seg);

				this.data[seg].fetching = false;
			}

			return;
		}

		if(!fetch.response.ok){
			this.reload();

			return;
		}

		this.log.success('FETCH', 'Fetched segment #' + seg, 'total size', this.size(data.length));

		this.data_size += data.length;
		this.data_chunks++;
		this.fetch_chunk++;
		this.data[seg].buffer = data;
		this.data[seg].fetching = false;

		this.update();
	}

	checkReady(){
		if(this.segments.ready && this.audioBuffer){
			if(this.segments.init)
				this.audioBuffer.appendBuffer(this.segments.init);
			else
				this.update();
			this.play();

			if(this.playing.platform == 'soundcloud')
				this.mediaSource.duration = this.stream.duration;
		}
	}

	async _load(data){
		this.mediaSource = new MediaSource();
		this.audioBuffer = null;
		this.data = null;

		this.audio.currentTime = 0;
		this.audio.src = URL.createObjectURL(this.mediaSource);

		this.playing = data;
		this.stream = null;
		this.segments = null;
		this.append_chunk = 0;
		this.fetch_chunk = 0;
		this.data_size = 0;
		this.data_chunks = 0;
		this.seeked = false;

		if(this.session)
			this.session.close();
		this.session = null;
		this.session_expired = false;

		this.mediaSource.addEventListener('sourceopen', () => {
			if(this.audioBuffer)
				return;
			this.log.verbose('MEDIA', 'Source opened');

			this.audioBuffer = this.mediaSource.addSourceBuffer(this.stream.mime);
			this.audioBuffer.addEventListener('updateend', () => {
				this.update();
			});

			this.checkReady();
		});

		this.stream = data.streams[0];

		if(data.platform == 'youtube')
			for(const stream of data.streams)
				if(stream.type.container == 'webm')
					this.stream = stream;
		if(data.platform == 'spotify')
			this.handleEncrypted();
		this.log.log('FETCH', 'Loading segments...');

		if(data.platform == 'youtube' || data.platform == 'spotify')
			this.segments = new DASHSegments(this, this.stream);
		else if(data.platform == 'soundcloud')
			this.segments = new HLSSegments(this, this.stream);

		const fetch = this.segments.fetchInit();
		var data;

		try{
			data = await fetch.result;
		}catch(e){
			if(e == null)
				return;
			this.log.error('ERROR', 'Could not load segments', e);

			return;
		}

		if(!fetch.response.ok){
			this.reload();

			return;
		}

		this.segments.load(data);

		this.log.success('FETCH', 'Loaded', this.segments.length, 'segments')
		this.data = new Array(this.segments.length);

		for(var i = 0; i < this.data.length; i++)
			this.data[i] = {buffer: null, fetching: false};
		this.checkReady();
	}

	load(data){
		this.stopAllRequests();
		this.last_reload = null;
		this.playId++;

		if(this.playId > Number.MAX_SAFE_INTEGER)
			this.playId = 0;
		this._load(data);
	}

	async _reload(){
		this.log.verbose('RELOAD', 'Reloading track streams...');

		var data;

		try{
			data = await this.fetchTrack(this.playing);
		}catch(e){
			if(e != null)
				this.log.error('RELOAD', 'Could not reload track information', e);
			return;
		}

		if(data.error){
			this.log.error('RELOAD', 'Could not reload track information, received server error', data.error);

			return;
		}

		if(data.unplayable_reason){
			this.log.error('RELOAD', 'Could not reload track information, received track error', data.unplayable_reason);

			return;
		}

		this.playing.streams = data.streams;
		this.playing.volume = data.volume;

		if(false && this.segments.ready && this.segments instanceof DASHSegments) /* TODO if also equal streams */{
			this.stream = data.streams[0];
			this.segments.stream = this.stream;
		}else{
			const cont = this.audio.currentTime;

			this.load(data);
			this.last_reload = Date.now();
			this.audio.currentTime = cont;
		}
	}

	reload(){
		if(!this.playing)
			return;
		if(this.last_reload != null && Date.now() - this.last_reload < 60000){
			this.log.error('RELOAD', 'Cannot play this track');
			this.stop();

			return;
		}

		this.stopAllRequests();
		this._reload();
	}

	reset(){
		/* todo */
	}

	on(name, callback){
		this.audio.addEventListener(name, callback);
	}
});

const Player = new (class extends EventEmitter{
	constructor(){
		super();

		this.volumes = null;
		this.fetching = {track: null, list: null};
		this.queue = [];
		this.queue_index = 0;
		this.playing = null;
		this.list = null;
		this.fetching_track = null;
		this.fetching_list = null;

		/* internal fetching mechanisms for playlist and track */
		/* player can handle track reloading, calling load stops reloads */
		/* emit list when playing a list and only a list, not a shuffled bunch of list, maybe..? */
		/* emit playing when playing a new track */
		/* player will emit track playability status */
		/* emits fetch when fetching a new track */
		this.log = debug.getLogger('QUEUE');
		this.init();
	}

	loadSettings(){
		var volume = localStorage.volume;

		if(volume)
			try{
				volume = JSON.parse(volume);
			}catch(e){
				volume = {};
			}
		else
			volume = {};
		const platforms = ['youtube', 'soundcloud', 'spotify'];

		for(const name of platforms){
			if(!Number.isFinite(volume[name]))
				volume[name] = 1;
			else if(volume[name] > 1)
				volume[name] = 1;
			else if(volume[name] < 0)
				volume[name] = 0;
		}

		this.volumes = volume;
	}

	init(){
		this.loadSettings();

		MediaPlayer.on('ended', () => {
			this.next();
		});

		MediaPlayer.on('play', () => {
			this.emit('play');
		});

		MediaPlayer.on('pause', () => {
			this.emit('pause');
		});

		MediaPlayer.on('waiting', () => {
			this.emit('waiting');
		});

		MediaPlayer.on('canplay', () => {
			this.emit('canplay');
		});

		MediaPlayer.on('playing', () => {
			this.emit('playing');
		});

		MediaPlayer.on('timeupdate', () => {
			this.emit('timeupdate');
		});

		MediaPlayer.on('durationchange', () => {
			this.emit('durationchange');
		});
	}

	async _fetch(obj){
		var err = null, data = null;

		do{
			var resp;

			try{
				resp = await obj.request;
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			obj.response = resp;

			try{
				data = await resp.text();
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			try{
				data = JSON.parse(data);
			}catch(e){
				err = new Error('Invalid server response');
			}
		}while(false);

		if(!obj.aborted){
			if(this.fetching[obj.type] != obj)
				this.log.warn('FETCH', 'Request finished is not equal to the current fetch');
			else
				this.fetching[obj.type] = null;
		}else{
			this.log.error('FETCH', 'Aborted a request for', obj.type);

			throw null;
		}

		if(err){
			this.log.error('FETCH', 'An error occured while fetching data', err);

			throw err;
		}

		return data;
	}

	fetch(type, path, options = {}){
		const controller = new AbortController();

		options.signal = controller.signal;

		const obj = {type, options, controller, aborted: false, request: fetch(path, options)};

		obj.result = this._fetch(obj);

		this.fetching[type] = obj;

		return obj;
	}

	async _fetchTrack(track, req){
		const data = await req.result;

		if(!data.error && !data.unplayable_reason){
			if(!track.loaded)
				this.copyTrack(track, data);
			else{
				track.streams = data.streams;
				track.volume = data.volume;
			}
		}

		return data;
	}

	fetchTrack(track){
		var path = '/api/media/track/' + track.platform + '/' + track.id;

		if(track.loaded){
			path += '/streams';

			this.log.log('LOAD', 'Track streams', track);
		}else
			this.log.log('LOAD', 'Track', track);
		const req = this.fetch('track', path, {headers: {authorization: client.token}});

		return this._fetchTrack(track, req);
	}

	stopRequests(){
		if(this.fetching.track){
			this.fetching.track.aborted = true;
			this.fetching.track.controller.abort();
			this.fetching.track = null;
		}

		if(this.fetching.list){
			this.fetching.list.aborted = true;
			this.fetching.list.controller.abort();
			this.fetching.list = null;
		}
	}

	setPaused(paused){
		if(paused)
			this.pause();
		else
			this.play();
	}

	get paused(){
		return MediaPlayer.audio.paused;
	}

	get volume(){
		if(!this.playing)
			return 1;
		return this.volumes[this.playing.platform];
	}

	setVolume(v){
		if(this.playing){
			if(!Number.isFinite(v))
				v = 1;
			else if(v > 1)
				v = 1;
			else if(v < 0)
				v = 0;
			this.volumes[this.playing.platform] = v;

			MediaPlayer.setVolume(this.playing.volume * v);

			localStorage.volume = JSON.stringify(this.volumes);
		}
	}

	get duration(){
		return MediaPlayer.audio.duration;
	}

	get currentTime(){
		return MediaPlayer.audio.currentTime;
	}

	seek(time){
		MediaPlayer.audio.currentTime = time;
	}

	copyTrack(destination, source){
		destination.author_name = source.author_name;
		destination.author_avatar = source.author_avatar;
		destination.title = source.title;
		destination.thumbnails = source.thumbnails;
		destination.duration = source.duration;
		destination.id = source.id;
		destination.unplayable_reason = source.unplayable_reason;
		destination.streams = source.streams;
		destination.volume = source.volume;
		destination.loaded = source.loaded;
		destination.platform = source.platform;

		return destination;
	}

	cloneTrack(track){
		return this.copyTrack({}, track);
	}

	clonePlaylist(playlist){
		return {
			id: playlist.id,
			platform: playlist.platform,
			length: playlist.length,
			tracks: playlist.tracks
		};
	}

	async _playTrack(data){
		this._play(data, true);
	}

	async _play(data, push){
		if(!data.loaded || !data.streams){
			this.emit('fetch', data);
			this.fetching_track = data;

			var resp;

			try{
				resp = await this.fetchTrack(data);
			}catch(e){
				if(e != null){
					this.fetching_track = null;
					this.emit('fetchend');
					this.log.error('LOAD', 'Could not load track information', e);

					toasts.showMessage('Could not load the track', 4000);
				}

				return;
			}

			if(resp.error){
				this.fetching_track = null;
				this.emit('fetchend');
				this.log.error('LOAD', 'Could not load track information, received server error', resp.error);

				toasts.showMessage('Could not load the track', 4000);

				return;
			}

			if(resp.unplayable_reason){
				this.fetching_track = null;
				this.emit('fetchend');
				this.log.error('LOAD', 'Could not play track, unplayable because', resp.unplayable_reason);

				toasts.showMessage(resp.unplayable_reason, 4000);

				return;
			}
		}

		this.fetching_track = null;

		MediaPlayer.load(data);
		MediaPlayer.setVolume(data.volume * this.volumes[data.platform]);

		if(push){
			this.queue_index = this.queue.length;
			this.queue.push(data);
			this.list = null;
			this.emit('list', null);
		}

		this.playing = data;
		this.emit('track', data);
		this.emit('volumechange');
		this.emit('queuechange');
		this.emit('waiting');
	}

	playTrack(track){
		if(!track || !track.platform || !track.id)
			throw new Error('Invalid track received');
		track = this.cloneTrack(track);

		if(this.fetching_track && this.fetching_track.platform == track.platform && this.fetching_track.id == track.id)
			return;
		this.stopRequests();
		this._playTrack(track);
	}

	async _playPlaylist(playlist){
		this.log.log('LOAD', 'Playlist', playlist);
		this.fetching_list = playlist;

		var tracks = [];
		var offset = playlist.tracks.length;

		for(const track of playlist.tracks)
			tracks.push(this.cloneTrack(track));
		while(true){
			var data;

			try{
				data = await this.fetch('list', '/api/playlist/' + playlist.id + '/tracks?limit=100&offset=' + offset, {headers: {authorization: client.token}}).result;
			}catch(e){
				this.fetching_list = null;
				this.log.error('LOAD', 'Could not load playlist', e);

				return;
			}

			if(data.error){
				this.fetching_list = null;
				this.log.error('LOAD', 'Could not load playlist because of server error', data.error);

				return;
			}

			if(!data.length)
				break;
			for(const track of data)
				if(track)
					tracks.push(track);
			offset += data.length;
		}

		this.fetching_list = null;

		if(!tracks.length)
			return;
		for(const track of tracks)
			track.loaded = true;
		for(var i = 0; i < tracks.length; i++){
			var index = i + Math.floor(Math.random() * (tracks.length - i));
			var tmp = tracks[index];

			tracks[index] = tracks[i];
			tracks[i] = tmp;
		}

		this.queue_index = this.queue.length;
		this.queue = this.queue.concat(tracks);
		this._play(this.queue[this.queue_index]);
		this.list = playlist;
		this.emit('list', playlist);
	}

	playPlaylist(playlist){
		if(!playlist || !playlist.id || playlist.platform === undefined)
			throw new Error('Invalid playlist received');
		playlist = this.clonePlaylist(playlist);

		if(this.fetching_list && this.fetching_list.platform == playlist.platform && this.fetching_list.id == playlist.id)
			return;
		this.stopRequests();
		this._playPlaylist(playlist);
	}

	next(){
		if(this.queue_index + 1 < this.queue.length)
			this.setQueueIndex(this.queue_index + 1);
	}

	prev(){
		if(this.queue_index > 0)
			this.setQueueIndex(this.queue_index - 1);
	}

	setQueueIndex(index){
		this.queue_index = index;

		const data = this.queue[this.queue_index];

		this.stopRequests();
		this._play(data);
	}

	play(){
		if(this.playing)
			MediaPlayer.play();
	}

	pause(){
		if(this.playing)
			MediaPlayer.pause();
	}

	stop(){
		if(this.playing){
			MediaPlayer.stop();

			this.playing = null;
		}
	}

	canPrev(){
		return this.queue_index > 0;
	}

	canNext(){
		return this.queue_index + 1 < this.queue.length;
	}
});

Player.MediaPlayer = MediaPlayer;

window.Player = Player;

export default Player;