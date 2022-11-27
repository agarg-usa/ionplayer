module.exports = class JSONResponse{
	constructor(outstream){
		this.outstream = outstream;
		this.first = true;
	}

	write(json){
		if(this.first){
			this.outstream.write('[\n' + JSON.stringify(json) + ',\n');
			this.first = false;
		}else
			this.outstream.write(JSON.stringify(json) + ',\n');
	}

	end(json){
		if(this.first)
			this.outstream.end('[\n' + JSON.stringify(json) + ']\n');
		else
			this.outstream.end(JSON.stringify(json) + ']\n');
	}
};