const jsonresp = require('./api/v0/util/PartialJSON.svf');

module.exports = {
	async handleRequest(req, query, res){
		const resp = new jsonresp(res);

		res.writeHead(200, {'Content-Type': 'application/json'});

		var i = 0;

		var to = setInterval(function(){
			if(i < 10){
				for(var j = 0; j < 1; j++)
					resp.write({index: i++});
			}else{
				resp.end({end: true});
				clearTimeout(to);
			}
		}, 500);
	}
}