const APIError = require('./apierror');
const APIUtil = require('./apiutil');
const Result = require('./result');
const debug = require('../../debug');
const Logger = debug.getLogger('YOUTUBE');

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

/* manages api requests and headers to youtube.com */
const youtubeInterface = new (class{
	constructor(){
		this.player_js = null;

		this.account_data = {
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36',
			'cookie': ''
		};

		this.headers = {};
		this.innertube = {};
		this.reload();
	}

	async reload(){
		/* has our request headers expired? */
		if(this.data)
			return;
		for(var i = 0; i < 2; i++){
			this.data = this.do();

			try{
				await this.data;
			}catch(e){
				Logger.error('STATE', 'Could not load state', e);

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
		Logger.log('STATE', 'Loading youtube state');

		const {res, body} = await APIUtil.get('https://www.youtube.com/', {headers: this.account_data});

		var state = /ytcfg\.set\((\{[\s\S]+?\})\);/.exec(body);

		if(!state)
			throw new APIError(APIError.INTERNAL_API_ERROR, 'Could not find state object');
		try{
			state = JSON.parse(state[1]);
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, 'Could not parse state object');
		}

		this.headers['x-youtube-page-label'] = state.PAGE_BUILD_LABEL;
		this.headers['x-youtube-client-version'] = state.INNERTUBE_CONTEXT_CLIENT_VERSION;
		this.headers['x-youtube-sts'] = state.STS;
		this.headers['x-youtube-client-name'] = state.INNERTUBE_CONTEXT_CLIENT_NAME;
		this.account_data['x-youtube-identity-token'] = state.ID_TOKEN;

		this.innertube.key = state.INNERTUBE_API_KEY;
		this.innertube.context = state.INNERTUBE_CONTEXT;
		this.player_js = state.PLAYER_JS_URL;

		if(!this.headers['x-youtube-page-label'] || !this.headers['x-youtube-client-version'] || !this.headers['x-youtube-sts'] ||
			!this.headers['x-youtube-client-name'] || !this.account_data['x-youtube-identity-token'] || !this.innertube.key ||
			!this.innertube.context || !this.player_js){
				Logger.error('STATE', 'Invalid state', state);

				throw new APIError(APIError.INTERNAL_API_ERROR, 'Missing state fields');
			}
		Logger.log('STATE', 'Loading player js', this.player_js);

		await this.load(this.player_js);

		Logger.success('STATE', 'Successfully loaded youtube api state');
	}

	parse(body){
		var jsVarStr = '[a-zA-Z_\\$][a-zA-Z_0-9]*';
		var jsSingleQuoteStr = '\'[^\'\\\\]*(:?\\\\[\\s\\S][^\'\\\\]*)*\'';
		var jsDoubleQuoteStr = '"[^"\\\\]*(:?\\\\[\\s\\S][^"\\\\]*)*"';
		var jsQuoteStr = '(?:' + jsSingleQuoteStr + '|' + jsDoubleQuoteStr + ')';
		var jsKeyStr = '(?:' + jsVarStr + '|' + jsQuoteStr + ')';
		var jsPropStr = '(?:\\.' + jsVarStr + '|\\[' + jsQuoteStr + '\\])';
		var jsEmptyStr = '(?:\'\'|"")';
		var reverseStr = ':function\\(a\\)\\{' +
			'(?:return )?a\\.reverse\\(\\)' +
			'\\}';
		var sliceStr = ':function\\(a,b\\)\\{' +
			'return a\\.slice\\(b\\)' +
			'\\}';
		var spliceStr = ':function\\(a,b\\)\\{' +
			'a\\.splice\\(0,b\\)' +
			'\\}';
		var swapStr = ':function\\(a,b\\)\\{' +
			'var c=a\\[0\\];a\\[0\\]=a\\[b(?:%a\\.length)\\];a\\[b(?:%a\\.length)?\\]=c(?:;return a)?' +
			'\\}';
		var actionsDef = new RegExp('var (' + jsVarStr + ')=\\{((?:(?:' +
			jsKeyStr + reverseStr + '|' +
			jsKeyStr + sliceStr + '|' +
			jsKeyStr + spliceStr + '|' +
			jsKeyStr + swapStr + '),?\\r?\\n?)+)\\};');
		var actionsExec = new RegExp('function(?: ' + jsVarStr + ')?\\(a\\)\\{a=a\\.split\\(' +
			jsEmptyStr + '\\);\\s*((?:(?:a=)?' + jsVarStr + jsPropStr + '\\(a,\\d+\\);)+)return a\\.join\\(' +
			jsEmptyStr + '\\)\\}');
		var reverseS = new RegExp('(' + jsKeyStr + ')' + reverseStr, 'g');
		var sliceS = new RegExp('(' + jsKeyStr + ')' + sliceStr, 'g');
		var spliceS = new RegExp('(' + jsKeyStr + ')' + spliceStr, 'g');
		var swapS = new RegExp('(' + jsKeyStr + ')' + swapStr, 'g');
		var defs = actionsDef.exec(body);
		var acts = actionsExec.exec(body);
		var obj = defs[1].replace(/\$/g, '\\$');
		var objBody = defs[2].replace(/\$/g, '\\$');
		var funcBody = acts[1].replace(/\$/g, '\\$');
		var result = reverseS.exec(objBody);
		var reverseKey = result ? result[1].replace(/\$/g, '\\$').replace(/\$|^'|^"|'$|"$/g, '') : '';

		result = sliceS.exec(objBody);
		var sliceKey = result ? result[1].replace(/\$/g, '\\$').replace(/\$|^'|^"|'$|"$/g, ''): '';

		result = spliceS.exec(objBody);
		var spliceKey = result ? result[1].replace(/\$/g, '\\$').replace(/\$|^'|^"|'$|"$/g, '') : '';

		result = swapS.exec(objBody);
		var swapKey = result ? result[1].replace(/\$/g, '\\$').replace(/\$|^'|^"|'$|"$/g, '') : '';
		var keys = '(' + [reverseKey, sliceKey, spliceKey, swapKey].join('|') + ')';
		var tokenize = new RegExp('(?:a=)?' + obj + '(?:\\.' + keys + '|\\[\'' + keys + '\'\\]|\\["' + keys + '"\\])\\(a,(\\d+)\\)', 'g');

		while(result = tokenize.exec(funcBody)){
			const key = result[1] || result[2] || result[3];
			const val = result[4];

			if(key == reverseKey)
				this.decodeData.push(0);
			else{
				if(key == swapKey)
					this.decodeData.push(1);
				else if(key == sliceKey)
					this.decodeData.push(2);
				else if(key == spliceKey)
					this.decodeData.push(3);
				this.decodeData.push(parseInt(val, 10));
			}
		}
	}

	async load(path){
		const {res, body} = await APIUtil.get('https://www.youtube.com' + path);

		this.decodeData = [];
		this.parse(body);
	}

	decode(sig){
		sig = sig.split('');

		for(var i = 0; i < this.decodeData.length; i++){
			const key = this.decodeData[i];

			if(key == 0)
				sig.reverse();
			else{
				const value = this.decodeData[++i];

				switch(key){
					case 1:
						const temp = sig[0];

						sig[0] = sig[value];
						sig[value] = temp;

						break;
					case 2:
						sig.slice(value);

						break;
					case 3:
						sig.splice(0, value);

						break;
				}
			}
		}

		return sig.join('');
	}

	async makeRequest(url, options = {}){
		/* regular pbj=1 request to youtube */
		await this.fetch();

		if(options.headers)
			options.headers = {...options.headers, ...this.account_data, ...this.headers};
		else
			options.headers = {...this.account_data, ...this.headers};
		return await APIUtil.get(url, options);
	}

	async makeApiRequest(path, body = {}){
		/* youtube v1 api */
		await this.fetch();

		const options = {};

		body.context = this.innertube.context;
		options.method = 'POST';

		if(options.headers)
			options.headers = {...options.headers, ...this.account_data, ...this.headers};
		else
			options.headers = {...this.account_data, ...this.headers};
		options.headers['Content-Type'] = 'application/json';
		options.body = JSON.stringify(body);

		return await APIUtil.getJSON('https://www.youtube.com/youtubei/v1/' + path + '?key=' + this.innertube.key, options);
	}
});

const getProperty = function(array, prop){
	if(!(array instanceof Array))
		return null;
	for(const item of array)
		if(item && item[prop])
			return item[prop];
	return null;
};

const parseStreamDataStream = function(formats, array){
	for(const fmt of formats){
		/* TODO fact check these */
		if(fmt.type == 'FORMAT_STREAM_TYPE_OTF')
			continue;
		var stream = {
			bitrate: fmt.bitrate,
			itag: fmt.itag,
			lmt: parseInt(fmt.lastModified, 10),
			duration: parseInt(fmt.approxDurationMs, 10) / 1000,
			mime: fmt.mimeType,
			index: {start: parseInt(fmt.indexRange.start, 10), end: parseInt(fmt.indexRange.end, 10)}
		};

		var mime = /(video|audio|text)\/([a-zA-Z0-9]{3,4});(?:\+| )codecs="(.*?)"/.exec(fmt.mimeType);

		stream.type = {stream: mime[1], container: mime[2], codecs: mime[3]};

		var scipher = (fmt.cipher || fmt.signatureCipher);

		if(scipher){
			const cipher = {};
			const cipherArr = scipher.split('&');

			for(var j = 0; j < cipherArr.length; j++){
				var params = cipherArr[j].split('=');

				cipher[params[0]] = decodeURIComponent(params[1]);
			}

			stream.url = cipher.url + '&' + cipher.sp + '=' + youtubeInterface.decode(cipher.s);
		}else
			stream.url = fmt.url;
		array.push(stream);
	}
};

const parseStreamData = function(playerResponse){
	var streams = {adaptive: [], standard: []};

	if(playerResponse.streamingData){
		const formats = playerResponse.streamingData.formats;
		const adaptive = playerResponse.streamingData.adaptiveFormats;

		// if(formats)
		// 	parseStreamDataStream(formats, streams.standard);
		if(adaptive)
			parseStreamDataStream(adaptive, streams.adaptive);
	}

	return streams;
};

const thumbnails = function(arr){
	if(!arr)
		return null;
	for(const thumbnail of arr)
		if(!thumbnail.url || !thumbnail.width || !thumbnail.height)
			throw new APIError(APIError.INTERNAL_API_ERROR, 'Invalid thumbnails');
	return arr;
};

const lastThumbnail = function(arr){
	if(!arr)
		return null;
	thumbnails(arr);

	return arr[arr.length - 1].url;
};

const parseTimestamp = function(str){
	var tokens = str.split(':').map(function(token){
		return parseInt(token, 10);
	});

	var scale = [1, 60, 3600, 86400];
	var seconds = 0;

	for(var i = tokens.length - 1; i >= 0; i--){
		if(!Number.isInteger(tokens[i]))
			return null;
		seconds += tokens[i] * scale[Math.min(3, tokens.length - i - 1)];
	}

	return seconds;
};

const text = function(txt){
	if(!txt)
		return null;
	if(txt.simpleText)
		return txt.simpleText;
	if(txt.runs)
		return txt.runs[0].text;
	return '';
}

function selectStreams(streamingData){
	const streams = [];

	for(const stream of streamingData.adaptive)
		if(stream.type.stream == 'audio')
			streams.push(stream);
	return streams;
}

function getJSON(text){
	/* removes a ")]}'" sometimes placed at the beginning of a response */
	const str = /^\)\]\}'(?:\r)?(?:\n)?/.exec(text);

	if(str)
		return JSON.parse(text.substring(str[0].length));
	return JSON.parse(text);
}

const default_unplayable_reason = 'Video unavailable';

const api = new (class{
	constructor(){}

	async _get(id, retries = 0){
		const {res, body} = await youtubeInterface.makeRequest('https://www.youtube.com/watch?pbj=1&v=' + encodeURIComponent(id));

		if(!/[a-z]+?\/json/.exec(res.headers.get('Content-Type')))
			return new Result.Unplayable(default_unplayable_reason);
		var data;

		try{
			data = getJSON(body);
		}catch(e){
			if(retries)
				throw new APIError(APIError.INTERNAL_API_ERROR);
			youtubeInterface.reload();

			return await this.get(id, retries + 1);
		}

		if(data.reload){
			if(retries)
				throw new APIError(APIError.INTERNAL_API_ERROR);
			youtubeInterface.reload();

			return await this.get(id, retries + 1);
		}

		const response = getProperty(data, 'response');
		const playerResponse = getProperty(data, 'playerResponse');

		if(!response || !playerResponse)
			throw new APIError(APIError.INTERNAL_API_ERROR);
		if(playerResponse.playabilityStatus){
			const {status, reason} = playerResponse.playabilityStatus;

			if(status && status.toLowerCase() !== 'ok')
				return new Result.Unplayable(reason || default_unplayable_reason);
		}

		try{
			const author = getProperty(response.contents.twoColumnWatchNextResults.results.results.contents, 'videoSecondaryInfoRenderer').owner.videoOwnerRenderer;
			const videoDetails = playerResponse.videoDetails;
			const streamingData = parseStreamData(playerResponse);
			const streams = selectStreams(streamingData);

			if(!streams.length)
				return new Result.Unplayable('No streams found');
			return new Result(
				/* author */
				text(author.title), lastThumbnail(author.thumbnail.thumbnails),

				/* metadata */
				videoDetails.title, thumbnails(videoDetails.thumbnail.thumbnails),
				videoDetails.lengthSeconds ? parseInt(videoDetails.lengthSeconds, 10) : null,
				videoDetails.videoId,

				Result.YYMMDD(playerResponse.microformat.playerMicroformatRenderer.publishDate),

				null,

				/* streams */
				streams,

				/* volume */
				Math.min(1, Math.pow(10, (playerResponse.playerConfig.audioConfig.loudnessDb || 0) / -20))
			);
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}
	}

	async get(id){
		Logger.log('GET', id);

		try{
			return await this._get(id);
		}catch(e){
			Logger.error('API', e);

			throw e;
		}
	}

	async _getStreams(id){
		const {res, body} = await youtubeInterface.makeRequest('https://www.youtube.com/watch?pbj=prefetch&frags=pl&v=' + encodeURIComponent(id));

		if(!/[a-z]+?\/json/.exec(res.headers.get('Content-Type')))
			return new Result.Unplayable(default_unplayable_reason);
		var data;

		try{
			data = getJSON(body);
		}catch(e){
			if(retries)
				throw new APIError(APIError.INTERNAL_API_ERROR);
			youtubeInterface.reload();

			return await this.get(id, retries + 1);
		}

		if(data.reload){
			if(retries)
				throw new APIError(APIError.INTERNAL_API_ERROR);
			youtubeInterface.reload();

			return await this.get(id, retries + 1);
		}

		const playerResponse = getProperty(data, 'playerResponse');

		if(!playerResponse)
			throw new APIError(APIError.INTERNAL_API_ERROR);
		if(playerResponse.playabilityStatus){
			const {status, reason} = playerResponse.playabilityStatus;

			if(status && status.toLowerCase() !== 'ok')
				return new Result.Unplayable(reason || default_unplayable_reason);
		}

		try{
			const streamingData = parseStreamData(playerResponse);
			const streams = selectStreams(streamingData);

			if(!streams.length)
				return new Result.Unplayable('No streams found');
			return new Result.Streams(
				null,

				/* streams */
				streams,

				/* volume */
				Math.min(1, Math.pow(10, (playerResponse.playerConfig.audioConfig.loudnessDb || 0) / -20))
			);
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}
	}

	async getStreams(id){
		Logger.log('GET STREAMS', id);

		try{
			return await this._getStreams(id);
		}catch(e){
			Logger.error('API', e);

			throw e;
		}
	}

	async _playlistOnce(id, continuation){
		const continuable = continuation ? new Continuable() : new Playlist();
		const body = {};

		if(continuation)
			body.continuation = continuation;
		else
			body.browseId = 'VL' + id;
		var {res, body: _body} = await youtubeInterface.makeApiRequest('browse', body);

		res = _body;

		if(continuation){
			if(!res.onResponseReceivedActions)
				throw new APIError(APIError.NOT_FOUND, 'Playlist continuation token not found');
			try{
				res = res.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
			}catch(e){
				throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
			}
		}else{
			try{
				const details = getProperty(res.sidebar.playlistSidebarRenderer.items, 'playlistSidebarPrimaryInfoRenderer');

				res = res.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents
				continuable.title = text(details.title);
				continuable.description = text(details.description);
			}catch(e){
				throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
			}
		}

		try{
			for(var item of res){
				if(item.continuationItemRenderer)
					continuable.continuation = item.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
				else if(item.playlistVideoRenderer){
					item = item.playlistVideoRenderer;

					continuable.push(new Result(
						/* author */
						text(item.shortBylineText), null,

						/* metadata */
						text(item.title), thumbnails(item.thumbnail.thumbnails), item.lengthSeconds ? parseInt(item.lengthSeconds, 10) : null, item.videoId, -1,

						/* unplayable reason */
						item.isPlayable ? null : default_unplayable_reason,

						null
					));
				}
			}

			return continuable;
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}
	}

	async playlistOnce(id, continuation){
		Logger.log('PLAYLISTONCE', id, continuation);

		try{
			return await this._playlistOnce(id, continuation);
		}catch(e){
			Logger.error('API', e);

			throw e;
		}
	}

	async _playlist(id, limit){
		var list = [];
		var continuation = null;

		do{
			const result = await this._playlistOnce(id, continuation);

			list = list.concat(result.results);
			continuation = result.continuation;
		}while(continuation && (!limit || list.length < limit));

		return list;
	}

	async playlist(id, limit){
		Logger.log('PLAYLIST', id, limit);

		try{
			return await this._playlist(id, limit);
		}catch(e){
			Logger.error('API', e);

			throw e;
		}
	}

	async _search(query, continuation){
		var {res, body: data} = await youtubeInterface.makeApiRequest('search', continuation ? {continuation} : {query, params: 'EgIQAQ%3D%3D'});

		if(continuation){
			if(!data.onResponseReceivedActions)
				throw new APIError(APIError.NOT_FOUND, 'Search continuation token not found');
			try{
				data = data.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems;
			}catch(e){
				throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
			}
		}else{
			try{
				data = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
			}catch(e){
				throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
			}
		}

		const continuable = new Continuable();

		try{
			for(const item of data){
				if(item.continuationItemRenderer)
					continuable.continuation = item.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
				else if(item.itemSectionRenderer){
					const list = item.itemSectionRenderer.contents;

					for(var video of list)
						if(video.videoRenderer){
							video = video.videoRenderer;

							var thumbs;

							if(video.channelThumbnailSupportedRenderers)
								thumbs = video.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails;
							else if(video.channelThumbnail)
								thumbs = video.channelThumbnail.thumbnails;
							continuable.push(new Result(
								/* author */
								text(video.shortBylineText), lastThumbnail(thumbs),

								/* metadata */
								text(video.title), thumbnails(video.thumbnail.thumbnails), video.lengthText ? parseTimestamp(video.lengthText.simpleText) : null, video.videoId, -1,

								null
							));
						}
				}
			}

			return continuable;
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}
	}

	async search(query, continuation){
		Logger.log('SEARCH', query, continuation);

		try{
			return await this._search(query, continuation);
		}catch(e){
			Logger.error('API', e);

			throw e;
		}
	}

	async _autocomplete(query){
		const {res, body} = await APIUtil.getJSON('https://www.google.com/complete/search?client=youtube&hl=en&xhr=t&q=' + encodeURIComponent(query));

		try{
			const results = [];

			for(const result of body[1])
				results.push(result[0]);
			return results;
		}catch(e){
			throw new APIError(APIError.INTERNAL_API_ERROR, e.message);
		}
	}

	async autocomplete(query){
		Logger.log('AUTOCOMPLETE', query);

		try{
			return await this._autocomplete(query);
		}catch(e){
			Logger.error('API', e);

			throw e;
		}
	}
});

module.exports = api;