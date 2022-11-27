console.log('%cJavaScript!!', 'font-weight: bold; font-size: 50px; color: red; text-shadow: 3px 3px 0 rgb(217,31,38), 6px 6px 0 rgb(226,91,14), 9px 9px 0 rgb(245,221,8), 12px 12px 0 rgb(5,148,68), 15px 15px 0 rgb(2,135,206), 18px 18px 0 rgb(4,77,145), 21px 21px 0 rgb(42,21,113)');

const debug = require('./debug');

const http = require('http2');
const fs = require('fs');

const WebSocketServer = require('./gateway');
const Modules = require('./backend/Modules');
const Static = require('./static');
const Streams = require('./backend/Streams');
const Database = require('./backend/db/Database');
const Config = require('./config.json');
const SSL = require('./encrypt');

class Server{
	constructor({key, cert}, {host, port}){
		this.log = debug.getLogger('SERVER');

		this.options = {host, port};

		this.hostRegex = new RegExp('^(?:([a-z]+?)\.)?' + host.replace('.', '\\.') + '$');
		this.publicFiles = new Map();
		this.publicFiles.set('dist/client.js', true);
		this.publicFiles.set('dist/client.css', true);
		this.publicFiles.set('dist/icon.svg', true);

		this.exists = new Map();
		this.default = Static.create('index.html', 'html');

		this.server = http.createSecureServer({
			key, cert, allowHTTP1: true
		}, (req, res) => {
			this.handle(req, res);
		});

		this.server.on('error', (e) => {
			this.log.error('CONNECTION', e);
		});

		this.server.on('upgrade', (req, socket, head) => {
			const subdomain = this.getSubdomain(req);

			if(subdomain != 'gateway' || req.url != '/')
				return void socket.destroy();
			WebSocketServer.handle(req, socket, head);
		});

		this.server.listen(port);
	}

	async fileExists(path){
		if(this.exists.has(path))
			return true;
		try{
			await fs.promises.access(path);
		}catch(e){
			return false;
		}

		this.exists.set(path, true);

		return true;
	}

	getSubdomain(req){
		var host;

		if(req.headers.host)
			host = req.headers.host;
		else if(req.headers[':authority'])
			host = req.headers[':authority'];
		else
			return null;
		host = this.hostRegex.exec(host);

		if(!host)
			return null;
		if(host[1] == null)
			return 'default';
		if(host[1] == 'cdn' || host[1] == 'media' || host[1] == 'gateway')
			return host[1];
		return null;
	}

	async isVerified(token){
		if(!token)
			return false;
		const client = await Database.user.getByToken(token);

		if(!client || !client.verified)
			return false;
		return true;
	}

	async serveFile(path, folder, token, noauth, req, res, defmode){
		path.splice(0, 0, folder);

		const pathStr = path.join('/');
		const fileName = path[path.length - 1];

		/* get name and extension */
		const idx = fileName.lastIndexOf('.');

		var extension;

		if(idx != -1)
			extension = fileName.substring(idx + 1);
		else
			extension = null;
		if(!(await this.fileExists(pathStr))){
			if(defmode && path.length == 2 && idx != -1){
				res.writeHead(404); /* NOT FOUND */
				res.end();

				return true;
			}

			return false;
		}

		if(noauth && !noauth.has(pathStr)){
			var verified;

			try{
				verified = await this.isVerified(token);
			}catch(e){
				res.writeHead(500); /* database not working */
				res.end();

				return true;
			}

			if(!verified){
				res.writeHead(401); /* client cannot access this file */
				res.end();

				return true;
			}

			res.setHeader('Cache-Control', 'private');
		}

		try{
			await Static.file(pathStr, extension, req, res);
		}catch(e){
			if(e.errno == -2){
				/* update cache so that we know its missing next time */
				this.exists.delete(pathStr);

				return false;
			}

			this.log.error('STATIC', 'Failed to serve static file', e);

			/* other error */
			res.writeHead(500); /* 500 INTERNAL SERVER ERROR */
			res.end();
		}

		return true;
	}

	async handleDefault(req, res, path, query){
		do{
			if(!path.length)
				break;
			if(path[0] == 'api'){
				await Modules.handle(req, path, query, res);

				return;
			}

			if(await this.serveFile(path, 'dist', query.get('authorization'), this.publicFiles, req, res, true))
				return;
		}while(false);

		try{
			this.default.serve(req, res);
		}catch(e){
			this.log.error('STATIC', 'Failed to serve static file', e);

			res.writeHead(500); /* 500 INTERNAL SERVER ERROR */
			res.end();
		}
	}

	async handleCDN(req, res, path){
		if(await this.serveFile(path, 'cdn', null, null, req, res, false))
			return;
		res.writeHead(404);
		res.end();
	}

	async handleMedia(req, res, path, query){
		const token = query.get('authorization');

		var verified;

		try{
			verified = await this.isVerified(token);
		}catch(e){
			res.writeHead(500);
			res.end();

			return;
		}

		if(!verified){
			res.writeHead(401);
			res.end();

			return;
		}

		await Streams.handle(req, res, path, query);
	}

	async handle(req, res){
		/* deny head requests as we dont support it yet */
		if(req.method == 'HEAD'){
			res.writeHead(405);
			res.end();

			return;
		}

		const subdomain = this.getSubdomain(req);

		if(!subdomain || subdomain == 'gateway'){
			res.writeHead(403);
			res.end();

			return;
		}

		/* ignore any bad urls */
		if(!req.url.startsWith('/')){
			res.writeHead(400);
			res.end();

			return;
		}

		var raw_url = req.url;

		/* remove non-keyboard characters */
		raw_url = raw_url.replaceAll(/[^\x20-\x7e]/g, '');

		/* remove consecutive '/' */
		raw_url = raw_url.replaceAll(/[/]+/g, '/');

		/* parse the url, providing an example host to specify {raw_url} as path */
		const url = new URL(raw_url, 'https://example.com');

		/* delete the first slash */
		const path = url.pathname.substring(1).split('/');

		/* remove any ".." in the path */
		for(var i = path.length - 1; i >= 0; i--)
			if(path[i] == '..')
				path.splice(i, 1);
		/* ignore a slash at the end */
		if(!path[path.length - 1])
			path.splice(path.length - 1, 1);
		this.log.log('INCOMING REQUEST', subdomain + ':/' + path.join('/'));

		switch(subdomain){
			case 'default':
				await this.handleDefault(req, res, path, url.searchParams);

				break;
			case 'cdn':
				await this.handleCDN(req, res, path);

				break;
			case 'media':
				await this.handleMedia(req, res, path, url.searchParams);

				break;
		}
	}
}

global.server = new Server(SSL, Config);