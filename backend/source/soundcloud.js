const APIUtil = require('./apiutil');
const APIError = require('./apierror');
const debug = require('../../debug');
const Result = require('./result');
const Logger = debug.getLogger('SOUNDCLOUD');
const {Parser} = require('m3u8-parser');
const Streams = require('../Streams');


// var t, r = this._data, n = {
// 	version: null,
// 	type: s.PlaylistType.LIVE,
// 	mediaSequence: null,
// 	targetDuration: null,
// 	totalDuration: 0,
// 	ended: !1
// }, i = [], u = {
// 	method: o.NONE
// }, c = null, d = null;
// E.lastIndex = 0;
// for (var f = 0, p = !1; null !== (t = E.exec(e)); ) {
// 	var h = t.filter((function(e, t) {
// 		return 0 !== t && void 0 !== e
// 	}
// 	)).map((function(e, t) {
// 		return 0 === t ? e.toLowerCase() : e
// 	}
// 	))
// 	  , g = h[0]
// 	  , y = h.slice(1);
// 	if (0 === f) {
// 		if ("extm3u" !== g)
// 			throw new l("First line did not contain EXTM3U tag.")
// 	} else {
// 		if (!p)
// 			switch (g) {
// 			case "playlist-type":
// 				if (n.type !== s.PlaylistType.LIVE)
// 					throw new l("Already have playlist type.");
// 				switch (y[0].toLowerCase()) {
// 				case "vod":
// 					n.type = s.PlaylistType.VOD;
// 					break;
// 				case "event":
// 					n.type = s.PlaylistType.EVENT;
// 					break;
// 				default:
// 					throw new l("Invalid playlist type.")
// 				}
// 				break;
// 			case "media-sequence":
// 				if (null !== n.mediaSequence)
// 					throw new l("Already have media sequence number.");
// 				var m = parseInt(y[0], 10);
// 				if (m + "" !== y[0])
// 					throw new l("Invalid media sequence number.");
// 				n.mediaSequence = m;
// 				break;
// 			case "targetduration":
// 				if (null !== n.targetDuration)
// 					throw new l("Already have target duration.");
// 				var v = parseInt(y[0], 10);
// 				if (v + "" !== y[0] || v < 0)
// 					throw new l("Invalid target duration.");
// 				n.targetDuration = 1e3 * v;
// 				break;
// 			case "version":
// 				if (null !== n.version)
// 					throw new l("Already have version.");
// 				var b = parseInt(y[0], 10);
// 				if (b + "" !== y[0])
// 					throw new l("Invalid version.");
// 				if (b < 3)
// 					throw new l("HLS version must be 3 or above.");
// 				n.version = b;
// 				break;
// 			default:
// 				p = !0
// 			}
// 		if (p)
// 			switch (g) {
// 			case "key":
// 				var w = "method"in (P = T(y[0])) ? P.method.toLowerCase() : null
// 				  , S = "uri"in P ? _.buildAbsoluteUrl(this._url, P.uri) : null
// 				  , I = "iv"in P ? M(P.iv) : null;
// 				if (!w)
// 					throw new l("Missing encryption method.");
// 				if (!S && "none" !== w)
// 					throw new l("Missing key url.");
// 				switch (w) {
// 				case "none":
// 					if (null !== S)
// 						throw new l("Key url not allowed.");
// 					if (null !== I)
// 						throw new l("IV not allowed.");
// 					u = {
// 						method: o.NONE
// 					};
// 					break;
// 				case "aes-128":
// 					if (!S)
// 						throw new l("Key url required.");
// 					u = {
// 						method: o.AES_128,
// 						keyUrl: S,
// 						iv: I
// 					};
// 					break;
// 				case "sample-aes":
// 					if (!S)
// 						throw new l("Key url required.");
// 					u = {
// 						method: o.SAMPLE_AES,
// 						keyUrl: S,
// 						iv: I
// 					};
// 					break;
// 				default:
// 					throw new l("Unknown encryption method.")
// 				}
// 				break;
// 			case "map":
// 				var P;
// 				if (!("uri"in (P = T(y[0]))))
// 					throw new l("URI missing from EXT-X-MAP tag.");
// 				if ("byterange"in P)
// 					throw new l("BYTERANGE in EXT-X-MAP tag is currently unsupported.");
// 				c = P.uri ? _.buildAbsoluteUrl(this._url, P.uri) : null;
// 				break;
// 			case "inf":
// 				if (!y[0].match(A))
// 					throw new l("Invalid segment duration.");
// 				d = 1e3 * parseFloat(y[0]);
// 				break;
// 			case "":
// 				if (n.ended)
// 					throw new l("Already received ENDLIST tag.");
// 				if (null === d)
// 					throw new l("Not received segment duration.");
// 				var x = _.buildAbsoluteUrl(this._url, y[0]);
// 				i.push({
// 					url: x,
// 					timeRange: new a.TimeRange(n.totalDuration,d),
// 					initDataUrl: c,
// 					encryptionData: u
// 				}),
// 				n.totalDuration += d,
// 				d = null;
// 				break;
// 			case "endlist":
// 				if (n.ended)
// 					throw new l("Already had ENDLIST tag.");
// 				n.ended = !0;
// 				break;
// 			default:
// 				this._logger.warn("Unable to parse playlist line.", g)
// 			}
// 	}
// 	f++
// }
// var k = n.version
//   , C = n.type
//   , D = n.mediaSequence
//   , O = n.targetDuration
//   , R = n.ended
//   , L = n.totalDuration;
// if (null === k)
// 	throw new l("Missing version.");
// if (null === O)
// 	throw new l("Missing target duration.");
// if (R && C === s.PlaylistType.LIVE)
// 	throw new l("Cannot be ended if type is LIVE.");
// if (!R && C === s.PlaylistType.VOD)
// 	throw new l("Must be ended if type is VOD.");
// if (null === D && (D = 0),
// r) {
// 	if (r.type !== C)
// 		throw new l("Playlist type has changed since last update.");
// 	if (r.type === s.PlaylistType.EVENT && D !== r.mediaSequence)
// 		throw new l("Media sequence number has changed. Not valid for EVENT playlist.");
// 	var N = r.segments[D - r.mediaSequence];
// 	if (!N)
// 		throw new l("Tracking lost. The last segment of the previous playlist is no longer in the new one.");
// 	var j = N.timeRange.start;
// 	i.forEach((function(e) {
// 		var t = e.timeRange;
// 		e.timeRange = new a.TimeRange(t.start + j,t.duration)
// 	}
// 	)),
// 	L += j
// }
// return {
// 	version: k,
// 	type: C,
// 	mediaSequence: D,
// 	targetDuration: O,
// 	totalDuration: L,
// 	ended: R,
// 	segments: i
// }

const soundcloudInterface = (new class{
	constructor(){
		this.clientId = null;

		this.reload();
	}

	async reload(){
		if(this.data)
			return;
		for(var i = 0; i < 2; i++){
			this.data = this.do();

			try{
				await this.data;
			}catch(e){
				Logger.error('LOAD', 'Could not load client id', e);

				if(!e.fatal)
					continue;
			}

			break;
		}

		this.data = null;
	}

	async fetch(){
		if(this.data)
			await this.data;
	}

	async do(){
		const {res, body} = await APIUtil.get('https://a-v2.sndcdn.com/assets/47-1b8214ca-3.js');

		const id = /client_id:"([a-z0-9_-]+?)"/i.exec(body);

		if(!id || !id[1])
			throw new Error('Could not find client id');
		this.clientId = id[1];
	}

	async abspathRequest(path, query = {}){
		query.client_id = this.clientId;

		const qarr = [];

		for(const name in query)
			qarr.push(name + '=' + query[name]);
		return await APIUtil.getJSON(path + '?' + qarr.join('&'));
	}

	async makeRequest(path, query){
		return await this.abspathRequest('https://api-v2.soundcloud.com/' + path, query);
	}
});

var api = new (class{
	createResult(track){
		const sizes = [20, 50, 120, 200, 500];
		const visualSizes = [[1240, 260], [2480, 520]];
		const regex = /^.*\/(\w+)-([-a-zA-Z0-9]+)-([a-z0-9]+)\.(jpg|png|gif).*$/i;

		const thumb = track.artwork_url || track.user.avatar_url;
		const rres = regex.exec(thumb);
		const thumbs = [];

		if(rres){
			const type = rres[1];
			const size = rres[3];

			if(type == 'visuals')
				for(const sz of visualSizes)
					thumbs.push({
						width: sz[0],
						height: sz[1],
						url: thumb.replace(size, 't' + sz[0] + 'x' + sz[1])
					});
			else
				for(const sz of sizes){
					var rep;

					if(type == 'artworks' && sz == 20)
						rep = 'tiny';
					else
						rep = 't' + sz + 'x' + sz;
					thumbs.push({
						width: sz,
						height: sz,
						url: thumb.replace(size, rep)
					});
				}
		}else
			/* default image */
			thumbs.push({
				url: thumb,
				width: 0,
				height: 0
			});

		//track.permalink_url
		return new Result(track.user.username, track.user.avatar_url, track.title, thumbs, track.duration / 1000, track.id + '', -1, null);
	}

	_fetchTracks(tracks, callback){
		var tr = [];

		for(var i = 0; i < tracks.length; i++)
			tr.push(tracks[i].id);
		request({method: 'GET', url: 'https://api-v2.soundcloud.com/tracks?ids=' + tr.join(encodeURIComponent(',')) + '&client_id=' + this.clientId}, (err, resp, body) => {
			if(err)
				callback(err, null);
			if(resp.statusCode < 200 || resp.statusCode >= 400)
				return callback(new Error('Error ' + resp.statusCode), null);
			var data = JSON.parse(body);

			for(var i = 0; i < data.length; i++)
				data[i] = this._makeResultFromTrack(data[i]);
			callback(null, data);
		});
	}

	// get(url, callback){
	// 	request({method: 'GET', url: 'https://api-v2.soundcloud.com/resolve?url=' + encodeURIComponent(url) + '&client_id=' + this.clientId}, (err, resp, body) => {
	// 		if(err)
	// 			return callback(err, null);
	// 		if(resp.statusCode < 200 || resp.statusCode >= 400)
	// 			return callback(new Error('Error ' + resp.statusCode), null);
	// 		var data = JSON.parse(body);

	// 		if(data.kind == 'track')
	// 			callback(null, {track: this._makeResultFromTrack(data)});
	// 		else if(data.tracks){
	// 			var results = [];
	// 			var rf = [];

	// 			for(var i = 0; i < data.tracks.length; i++)
	// 				if(data.tracks[i].user && data.tracks[i].id)
	// 					results.push(this._makeResultFromTrack(data.tracks[i]));
	// 				else
	// 					rf.push(data.tracks[i]);
	// 			if(rf.length)
	// 				this._fetchTracks(rf, (err, data) => {
	// 					if(err)
	// 						return callback(err, null);
	// 					callback(null, {playlist: results.concat(data)});
	// 				})
	// 			else
	// 				callback(null, {playlist: results});
	// 		}else
	// 			callback(new Error('Unsupported soundcloud type ' + data.kind), null);
	// 	});
	// }

	async search(query, limit = 20){
		const {res, body} = await soundcloudInterface.makeRequest('search/tracks', {q: encodeURIComponent(query), limit, offset: 0});

		try{
			const data = body.collection;
			const results = [];

			for(const item of data)
				results.push(this.createResult(item));
			return {results};
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}
	}

	async get(id){
		const {res, body} = await soundcloudInterface.makeRequest('tracks/' + id);

		var result;

		try{
			result = this.createResult(body);
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}

		for(const Stream of body.media.transcodings)
			// if(stream.format.protocol == 'progressive'){
			// 	const {resp, body} = await soundcloudInterface.abspathRequest(stream.url);

			// 	result.streams = [{url: body.url}];

			// 	break;
			// }

			if(Stream.format.protocol == 'hls'){
				var mime = /(audio)\/([a-zA-Z0-9]{3,4})(?:;(?:\+| )?codecs="(.*?)")?/.exec(Stream.format.mime_type);

				const stream = {};

				stream.type = {stream: mime[1], container: mime[2], codecs: mime[3]};
				stream.mime = Stream.format.mime_type;
				stream.duration = Stream.duration / 1000;

				var data = await soundcloudInterface.abspathRequest(Stream.url);

				stream.url = data.body.url;

				// var data = await APIUtil.get(url);

				// const parser = new Parser();

				// parser.push(data);
				// parser.end();

				// var dash = true;

				// for(const segment of parser.segments)
				// 	if(!/https:\/\/[^]+?\/media\/[0-9]+?\/[0-9]+?\/[^]/.exec(segment.uri)){
				// 		dash = false;

				// 		break;
				// 	}

				result.streams = [stream];

				break;
			}
		if(!result.streams)
			throw new APIError(APIError.NO_STREAMS);
		return result;
	}
});

api.Handler = new (class{
	async stream(req, res, url){
		var data = await APIUtil.get(url);

		res.end(data.body.replaceAll(/(https:\/\/[^]+?)\r?\n/g, (match, url) => {
			return Streams.create(url) + '\r\n';
		}));
	}
});

module.exports = api;