const crypto = require('crypto');
const fetch = require('../fetch');
const Config = require('../config');

module.exports = new (class{
	constructor(){
		this.streams = new Map();
	}

	create(url, handler = this){
		var mix;

		for(var i = 0; i < 10; i++){
			mix = //crypto.createHash('sha512').update(url).digest('hex') +
				crypto.randomBytes(64).toString('hex');
			if(!this.streams.has(mix)){
				this.streams.set(mix, {url, handler});

				return mix;
			}
		}

		return null;
	}

	async stream(req, res, url, range){
		const headers = {};

		/* if the client requests a certain range of bytes */
		if(range)
			/* TODO check this later */
			headers.Range = 'bytes=' + range;
		else if(req.headers.range)
			headers.Range = req.headers.range;

		var resp;
		var abort = new AbortController();

		res.on('close', () => {
			abort.abort();
		});

		try{
			resp = await fetch(url, {signal: abort.signal, headers});
		}catch(e){
			res.writeHead(500);
			res.end();

			return;
		}

		if(!resp.ok){
			res.writeHead(resp.status);
			res.end();

			return;
		}

		res.setHeader('Cache-Control', 'private, no-transform');
		res.setHeader('Content-Type', resp.headers.get('Content-Type'));

		if(resp.headers.get('Last-Modified'))
			res.setHeader('Last-Modified', resp.headers.get('Last-Modified'));
		res.setHeader('Content-Length', resp.headers.get('Content-Length'));

		if(resp.headers.get('Content-Range') && req.headers.range)
			res.setHeader('Content-Range', resp.headers.get('Content-Range'));
		res.setHeader('Accept-Ranges', 'bytes');
		res.setHeader('X-Content-Type-Options', 'nosniff');

		res.writeHead(resp.status);
		resp.body.pipe(res);
	}

	async handle(req, res, path, query){
		var range = query.get('range');

		if(req.headers.origin) // && origin == Config.host //
			res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
		do{
			if(path.length != 1)
				break;
			if(!this.streams.has(path[0]))
				break;
			const stream = this.streams.get(path[0]);

			await stream.handler.stream(req, res, stream.url, range);

			return;
		}while(false);

		res.writeHead(404);
		res.end();
	}
});