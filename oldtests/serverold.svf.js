/* begin logging */

global.debug = {
	raw(source_color, type_color, source, type, ...message){
		console.log(
			'%c' + source + ' %c[' + type + ']',
			'color: #' + source_color, 'color: #' + type_color,
			...message
		);
	},

	log(source, type, ...message){
		this.raw('00bcbf', 'bf0099', source, type, ...message);
	},

	error(source, type, ...message){
		this.raw('f00', 'f00', source, type, ...message);
	},

	warn(source, type, ...message){
		this.raw('fa0', 'fa0', source, type, ...message);
	}
};

global.totalReceived = 0;
global.reqId = 0;

const size = function(bytes){
	if(bytes == 0)
		return '0B';
	var pbm = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
	var s = Math.floor(Math.floor(Math.log10(parseInt(bytes, 10))) / 3);

	return Math.round(bytes * 100 / Math.pow(1000, s)) / 100 + pbm[s] + 'B';
};

function timestamp(ms){
	if(!ms)
		return '0s';
	var sec = ms / 1000;
	var min = sec / 60;
	var hr = min / 60;

	sec = Math.floor(sec) % 60;
	min = Math.floor(min) % 60;
	hr = Math.floor(hr) % 24;
	ms %= 1000;

	var str = [];

	if(hr)
		str.push(hr + 'h');
	if(min)
		str.push(min + 'm');
	if(sec)
		str.push(sec + 's');
	if(ms)
		str.push(ms + 'ms');
	return str.join(' ');
};

function logHTTP(httpModule){
	var request = httpModule.request;

	httpModule.request = function(options, callback){
		const id = ++global.reqId;

		debug.log('HTTP', options.method, '[' + id + '] ' + (options.href || (options.proto + "://" + options.host + options.path)));

		const req = request(options, callback);
		const start = Date.now();

		req.on('response', (resp) => {
			var curRec = 0;

			resp.on('data', (data) => {
				global.totalReceived += data.byteLength;
				curRec += data.byteLength;
			});

			resp.on('end', () => {
				debug.raw('9e42f4', 'ff0', 'HTTP', options.method, '[' + id + '] finished after ' + timestamp(Date.now() - start) + ', received ' + size(curRec));
			});
		});

		return req;
	}
}

logHTTP(require('http'));
logHTTP(require('https'));

/* end logging */

const Module = require('module');
const http = require('http');
const mime = require('mime-types');
const fs = require('fs/promises');
const {createReadStream} = require('fs');

const Static = require('./static.svf');

const modules = new Map();
const apimodules = new Map();
const existscache = new Map();

async function fsexists(path){
	if(!existscache.has(path)){
		var exists;
		try{
			await fs.access(path);

			exists = true;
		}catch(e){
			exists = false;
		}

		existscache.set(path, exists);

		return exists;
	}

	return existscache.get(path);
}

async function execute(module, req, url, res){
	const start = Date.now();

	if(module.load){
		/* module is still loading */
		try{
			await module.load;
		}catch(e){
			/* module failed to load */
			res.writeHead(500); /* 500 INTERNAL SERVER ERROR */
			res.end();

			return;
		}
	}

	if(module.exports.handleRequest){
		try{
			await module.exports.handleRequest(req, url, res);
		}catch(e){
			debug.error('SERVER', 'EXECUTE', 'Module failed to execute', e);

			if(!res.writableEnded){
				if(res._header === null)
					res.writeHead(500);
				res.end();
			}

			return;
		}

		if(!res.writableEnded){
			if(res._header === null)
				debug.warn('SERVER', 'EXECUTE', 'Module', module.path, 'did not send response headers');
			debug.warn('SERVER', 'EXECUTE', 'Module', module.path, 'did not end response stream');
		}

		debug.log('SERVER', 'EXECUTE', 'Module', module.path, 'took', timestamp(Date.now() - start), 'to finish');
	}else{
		/* this module does not handle requests */
		res.writeHead(404); /* 404 NOT FOUND */
		res.end();
	}
}

class SVFModule{
	constructor(dirname, filename){
		debug.log('MODULE', 'LOAD', 'Loading module', filename);

		const start = Date.now();

		filename = dirname + '/' + filename;

		this.path = filename;
		this.exports = null;
		this.error = null;

		this.load = new Promise(async (resolve, reject) => {
			try{
				await this.loadModule(dirname, filename);
			}catch(e){
				this.error = e;

				reject();

				return;
			}

			debug.log('MODULE', 'LOAD', 'Successfully loaded module', this.path, 'after', timestamp(Date.now() - start));
			resolve();
		});
	}

	async loadModule(dirname, filename){
		var data;

		try{
			data = await fs.readFile(filename, 'utf8');
		}catch(e){
			/* file read fail */
			debug.error('MODULE', 'ERROR', 'Failed to read file at', filename, e);

			throw e;
		}

		dirname = __dirname + '/' + dirname;
		filename = __dirname + '/' + filename;

		/* compile the js file */
		const mod = new Module(filename, module);

		mod.filename = filename;
		mod.paths = Module._nodeModulePaths(dirname);

		try{
			mod._compile(data, filename);
		}catch(e){
			/* compile fail */
			debug.error('MODULE', 'ERROR', 'Failed to compile module', this.path, e);

			throw e;
		}

		this._module = mod;
		this.exports = mod.exports;
		this.load = null;
	}
}

const html =
`<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" type="text/css" href="/base.css">
	</head>
	<body>
		<script src="/base.js"></script>
		<script src="/init.js"></script>
	</body>
</html>`;

var mtime;

try{
	mtime = fs.statSync(__filename).mtime;
}catch(e){
	mtime = new Date();
}

http.createServer(async (req, res) => {
	/* deny head requests as we dont support it yet */
	if(req.method == 'HEAD'){
		res.writeHead(405);
		res.end();

		return;
	}

	do{
		/* ignore any bad urls */
		if(!req.url.startsWith('/'))
			break;
		/* delete any consecutive '/' */
		const url = new URL(req.url.replaceAll(/[/]+/g, '/'), 'https://example.com');

		/* delete the first slash */
		const path = url.pathname.substring(1).split('/');

		/* remove any ".." in the path */
		for(var i = path.length - 1; i >= 0; i--)
			if(path[i] == '..')
				path.splice(i, 1);
		/* ignore a slash at the end */
		if(!path[path.length - 1])
			path.splice(path.length - 1, 1);
		debug.log('SERVER', 'INCOMING REQUEST', path.join('/'));

		if(path.length && path[0] == 'api'){
			do{
				/* check our api folder for a api module */
				var apipath, dirname, file;

				if(path.length == 2){
					apipath = path.slice(0, 2).join('/') + '/index';
					dirname = path.slice(0, 2).join('/');
					file = 'index';
				}else if(path.length >= 3){
					apipath = path.slice(0, 3).join('/');
					dirname = path.slice(0, 2).join('/');
					file = path[2];

					if(file.endsWith('.svf.js'))
						break;
				}else
					break;
				/* check if we already have the module loaded */
				if(apimodules.has(apipath)){
					execute(apimodules.get(apipath), req, {path: path.slice(3), query: url.searchParams}, res, path.slice(1));

					return;
				}

				/* check if it exists */
				if(await fsexists(apipath + '.svf.js')){
					/* async compile */
					const module = new SVFModule(dirname, file + '.svf.js');

					apimodules.set(apipath, module);

					execute(module, req, {path: path.slice(3), query: url.searchParams}, res);

					return;
				}
			}while(false);

			res.writeHead(404); /* 404 NOT FOUND */
			res.end();

			return;
		}

		path.splice(0, 0, 'serverfiles');

		const pathStr = path.join('/');

		/* check if we already have the module loaded */
		if(modules.has(pathStr)){
			execute(modules.get(pathStr), req, url.searchParams, res);

			return;
		}

		const exists = {
			file: null, /* does this path point to a file? */
			index: null, /* does this path point to a directory and it has an index module? */
			module: null /* does this path point to a module */
		};

		const fileName = path[path.length - 1];

		/* ignore module file extension */
		if(fileName.endsWith('.svf.js'))
			break;
		/* check for index module */
		const eIndex = fsexists(pathStr + '/index.svf.js'),
			eModule = fsexists(pathStr + '.svf.js'),
			eFile = fsexists(pathStr);
		if(await eIndex)
			exists.index = {
				filename: 'index.svf.js',
				dirname: path.join('/')
			};
		else if(await eModule)
			exists.module = {
				filename: fileName + '.svf.js',
				dirname: path.slice(0, path.length - 1).join('/')
			};
		else if(await eFile)
			exists.file = true;
		const modulePath = exists.index || exists.module;

		if(modulePath){
			/* read the js module,
				instead of using require() which is blocking,
				we read the file asynchronously and compile it after
			*/
			const module = new SVFModule(modulePath.dirname, modulePath.filename);

			modules.set(pathStr, module);

			if(exists.index)
				if(path.length)
					modules.set(pathStr + '/index', module);
				else
					modules.set('index', module);
			execute(module, req, url.searchParams, res);

			return;
		}

		/* get name and extension */
		const idx = fileName.lastIndexOf('.');

		var extension;

		if(idx != -1)
			extension = fileName.substring(idx + 1);
		else
			extension = null;
		if(exists.file){
			/* load file stats */
			var stat;

			try{
				stat = await fs.stat(pathStr);
			}catch(err){
				if(err.errno == -2){
					/* update cache so that we know its missing next time */
					existscache[pathStr] = false;

					break;
				}

				/* other error */
				res.writeHead(500); /* 500 INTERNAL SERVER ERROR */
				res.end();

				return;
			}

			if(stat.isDirectory())
				break;
			const length = stat.size;
			const modified = stat.mtime;
			const type = extension ? mime.lookup(extension) : null;

			if(type)
				res.setHeader('Content-Type', type);
			res.setHeader('Last-Modified', modified.toGMTString());
			res.setHeader('Accept-Ranges', 'bytes');

			modified.setMilliseconds(0);

			/* cache management, dont send a copy back if the client already has one */
			if(req.headers['if-modified-since']){
				const time = new Date(req.headers['if-modified-since']);

				if(time.getTime() == modified.getTime()){
					/* file has not been modified */
					res.writeHead(304); /* 304 NOT MODIFIED */
					res.end();

					return;
				}
			}

			/* if the client requests a certain range of bytes */
			if(req.headers['range']){
				var range = /^bytes=([0-9]+?)-([0-9]*)$/.exec(req.headers['range']);

				if(range){
					var start = Math.min(length - 1, parseInt(range[1], 10));
					var end = (range[2] && Math.min(length - 1, parseInt(range[2]))) || length - 1;

					res.setHeader('Content-Length', end - start + 1);
					res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + length);
					res.writeHead(206); /* 206 PARTIAL CONTENT */
					createReadStream(pathStr, {start, end}).pipe(res);

					return;
				}
			}

			/* pipe file */
			res.setHeader('Content-Length', length);
			res.writeHead(200); /* 200 OK */
			createReadStream(pathStr).pipe(res);

			return;
		}else if(extension && path.length == 2){
			/* client requested a level 0 file with an extension and it was not found */
			res.writeHead(404); /* 404 NOT FOUND */
			res.end();

			return;
		}
	}while(false);

	try{
		Static.string(html, mtime, "html", req, res);
	}catch(e){
		debug.error('SERVER', 'STATIC', 'Failed to serve static file', e);

		if(!res.writableEnded){
			if(res._header === null)
				res.writeHead(500);
			res.end();
		}
	}
}).listen(8080);