const debug = {
	count: 0,

	raw(level, source_color, type_color, source, type, ...message){
		console[level](
			`%c{${this.count++}} %c${source} %c${type}`,
			`color: #999`, `color: #${source_color}`, `color: #${type_color}`,
			...message
		);
	},

	verbose(source, type, ...message){
		this.raw('debug', '999', '999', source, type, ...message);
	},

	success(source, type, ...message){
		this.raw('log', '00bcbf', '0f0', source, type, ...message);
	},

	log(source, type, ...message){
		this.raw('log', '00bcbf', 'bf0099', source, type, ...message);
	},

	error(source, type, ...message){
		this.raw('error', 'f00', 'f00', source, type, ...message);
	},

	warn(source, type, ...message){
		this.raw('warn', 'fa0', 'fa0', source, type, ...message);
	},

	getLogger(source){
		const self = this;

		return {
			raw(source_color, type_color, type, ...message){
				self.raw(source_color, type_color, source, type, ...message);
			},

			verbose(type, ...message){
				self.verbose(source, type, ...message);
			},

			success(type, ...message){
				self.success(source, type, ...message);
			},

			log(type, ...message){
				self.log(source, type, ...message);
			},

			error(type, ...message){
				self.error(source, type, ...message);
			},

			warn(type, ...message){
				self.warn(source, type, ...message);
			},
		};
	},

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
	},

	timestamp(ms){
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
	}
};

const HTTPLogger = debug.getLogger('HTTP');

function logHTTP(httpModule){
	const request = httpModule.request;

	httpModule.request = function(options, callback){
		const id = debug.count;

		HTTPLogger.log(options.method, '[' + id + '] ' + (options.href || (options.proto + '://' + options.host + options.path)));

		const req = request(options, callback);
		const start = Date.now();

		req.on('response', (res) => {
			var curRec = 0;

			res.on('data', (data) => {
				curRec += data.byteLength;
			});

			res.on('end', () => {
				HTTPLogger.success(options.method, '[' + id + '] finished after ' + debug.timestamp(Date.now() - start) + ', received ' + debug.size(curRec));
			});
		});

		return req;
	}
}

logHTTP(require('http'));
logHTTP(require('https'));

module.exports = debug;