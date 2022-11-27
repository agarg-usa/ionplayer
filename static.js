const mime = require('mime-types');
const fs = require('fs/promises');
const {createReadStream} = require('fs');

async function serve(stat, extension, req, res, path, buffer){
	if(stat.isDirectory()){
		res.writeHead(404); /* 404 NOT FOUND */
		res.end();

		return;
	}

	const length = stat.size;
	const modified = stat.mtime;
	const type = extension ? mime.lookup(extension) : null;

	if(type)
		res.setHeader('Content-Type', type);
	res.setHeader('Last-Modified', modified.toGMTString());
	res.setHeader('Accept-Ranges', 'bytes');
	res.setHeader('X-Content-Type-Options', 'nosniff');

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
			var start = parseInt(range[1], 10);
			var end = range[2] ? parseInt(range[2], 10) : stat.length - 1;

			if(!Number.isFinite(start))
				start = 0;
			else{
				if(start > stat.length - 1)
					start = stat.length - 1;
				else if(start < 0)
					start = 0;
			}

			if(!Number.isFinite(end))
				end = stat.length - 1;
			else{
				if(end > stat.length - 1)
					end = stat.length - 1;
				else if(end < 0)
					end = 0;
			}

			res.setHeader('Content-Length', end - start + 1);
			res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + length);
			res.writeHead(206); /* 206 PARTIAL CONTENT */

			if(buffer)
				res.end(buffer.subarray(start, end + 1));
			else
				createReadStream(path, {start, end}).pipe(res);
			return;
		}
	}

	/* pipe file */
	res.setHeader('Content-Length', length);
	res.writeHead(200); /* 200 OK */

	if(buffer)
		res.end(buffer);
	else
		createReadStream(path).pipe(res);
}

module.exports = {
	async file(path, extension, req, res){
		/* load file stats */
		const stat = await fs.stat(path);

		await serve(stat, extension, req, res, path, null);
	},

	create(path, extension){
		return new (class{
			constructor(path, extension){
				this.stats = this.load(path);
				this.extension = extension;
				this.data = null;
			}

			async load(path){
				const stats = await fs.stat(path);

				if(!stats.isDirectory())
					this.data = await fs.readFile(path);
				return stats;
			}

			async serve(req, res){
				/* load file stats */
				const stat = await this.stats;

				await serve(stat, this.extension, req, res, null, this.data);
			}
		})(path, extension);
	}
};