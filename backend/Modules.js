const {StreamError} = require('./Errors');

const Database = require('./db/Database');
const StreamString = require('./util/StreamString');
const debug = require('../debug');
const fs = require('fs');

function fspath(path){
	return __dirname + '/' + path;
}

class Stream{
	constructor(req, path, query, res){
		this.request = req;
		this.path = path;
		this.query = query;
		this.response = res;

		this.client = null;
		this.body = null;
	}

	setStatus(status){
		this.response.writeHead(status);

		return this;
	}

	write(data){
		this.response.write(JSON.stringify(data));

		return this;
	}

	end(data){
		if(data)
			this.response.end(JSON.stringify(data));
		else
			this.response.end();
	}

	error(error){
		this.setStatus(error.status);
		this.end({error: error.message});
	}

	errorMessage(error){
		this.end({error});
	}

	async isAuthorized(){
		const token = this.request.headers.authorization;

		do{
			if(!token)
				break;
			var client;

			try{
				client = await Database.user.getByToken(token);
			}catch(e){
				this.error(StreamError.DATABASE_ERROR);

				return false;
			}

			if(!client || !client.verified)
				break;
			this.client = client;

			return true;
		}while(false);

		this.error(StreamError.UNAUTHORIZED);

		return false;
	}

	async validBody(){
		var body;

		try{
			body = await StreamString(this.request);
		}catch(e){
			return false;
		}

		if(body == null){
			this.error(StreamError.REQUEST_BODY_EXCEEDS);

			return false;
		}

		try{
			body = JSON.parse(body);
		}catch(e){
			this.error(StreamError.INVALID_JSON_BODY);

			return false;
		}

		/* only permit json that is level 0 object "{}" */
		if(body.constructor != Object){
			this.error(StreamError.INVALID_JSON_BODY);

			return false;
		}

		this.body = body;

		return true;
	}
}

module.exports = new (class{
	constructor(){
		this.log = debug.getLogger('API');
		this.modules = null;
		this.loadModules();
	}

	recurseModules(modules, path, depth){
		var files;

		try{
			files = fs.readdirSync(fspath(path), {withFileTypes: true});
		}catch(e){
			this.log.error('ERROR', 'Could not read directory', e);

			throw e;
		}

		for(const file of files){
			const fpath = path + '/' + file.name;

			if(file.isDirectory()){
				if(depth >= 8){
					this.log.log('READ', 'Not recursing past depth', depth);

					continue;
				}

				this.log.log('READ', 'Recursively searching directory', fpath);
				this.recurseModules(modules, fpath, depth + 1);

				continue;
			}

			var success = false;
			const idx = file.name.indexOf('.');

			do{
				if(idx == -1)
					break;
				const name = file.name.substring(0, idx);
				const ext = file.name.substring(idx + 1);

				if(ext != 'js')
					break;
				const modpath = path + '/' + name;

				this.log.log('READ', 'Found module', modpath);

				const start = Date.now();
				var compiled;
				try{
					compiled = require('./' + modpath);
				}catch(e){
					this.log.error('ERROR', 'Failed to compile', modpath, e);

					throw e;
				}

				const end = Date.now();

				this.log.success('COMPILE', 'Successfully compiled', modpath, 'in', debug.timestamp(end - start));

				if(name == 'index')
					modules.set(path, compiled);
				else
					modules.set(modpath, compiled);
				success = true;
			}while(false);

			if(success)
				continue;
			this.log.log('INFO', 'Skipping non-javascript file', fpath);

			continue;
		}
	}

	loadModules(){
		this.log.warn('WARN', 'LOADING MODULES MAY TAKE A LONG TIME! THE SERVER WILL BE UNRESPONSIVE WHILE THIS HAPPENS');

		const tmpModules = new Map();

		try{
			this.recurseModules(tmpModules, 'api');
		}catch(e){
			this.log.error('LOAD', 'Could not load modules', e);

			return;
		}

		this.log.success('LOAD', 'Completed loading modules');
		this.modules = tmpModules;
	}

	async handle(req, path, query, res){
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
		res.setHeader('X-Content-Type-Options', 'nosniff');

		const stream = new Stream(req, path, query, res);

		if(!this.modules){
			stream.error(StreamError.INTERNAL_SERVER_ERROR);

			return;
		}

		do{
			if(path.length < 2)
				break;
			/* check our api folder for a api module */
			var apipath = 'api';
			var module = null;
			var li = 0;

			for(var i = 1; i < path.length; i++){
				apipath += '/' + path[i];

				/* check if this path is a module */
				if(this.modules.has(apipath)){
					module = this.modules.get(apipath);
					li = i;
				}
			}

			if(!module)
				break;
			path = path.slice(li + 1);
			stream.path = path;

			if(!module.api)
				/* this module does not handle requests */
				break;
			const pathreq = module.api.path;

			if(pathreq.min !== undefined && path.length < pathreq.min)
				break;
			if(pathreq.max !== undefined && path.length > pathreq.max)
				break;
			if(module.api.requires){
				if(module.api.requires.authorization && !(await stream.isAuthorized()))
					return;
				if(module.api.requires.body && !(await stream.validBody()))
					return;
			}

			const start = Date.now();

			try{
				await module.api.handle(stream);
			}catch(e){
				this.log.error('EXECUTE', 'Module failed to execute', e);

				if(!res.writableEnded){
					if(!res.headersSent)
						stream.setStatus(500);
					stream.errorMessage(StreamError.INTERNAL_SERVER_ERROR.message);
				}

				return;
			}

			const end = Date.now();

			if(!res.writableEnded){
				if(!res.headersSent)
					this.log.warn('EXECUTE', 'Module', apipath, 'did not send response headers');
				this.log.warn('EXECUTE', 'Module', apipath, 'did not end response stream');
			}

			this.log.success('EXECUTE', 'Module', apipath, 'took', debug.timestamp(end - start), 'to finish');

			return;
		}while(false);

		const token = stream.request.headers.authorization;

		do{
			if(!token)
				break;
			var client;

			try{
				client = await Database.user.getByToken(token);
			}catch(e){
				stream.error(StreamError.UNAUTHORIZED);

				return;
			}

			if(!client || !client.verified)
				break;
			stream.error(StreamError.API_NOT_FOUND);

			return;
		}while(false);

		stream.error(StreamError.UNAUTHORIZED);

		return;
	}
});