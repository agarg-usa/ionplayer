const WebSocket = require('ws');
const {key, cert} = require('../encrypt');
const https = require('https');

const server = https.createServer({key, cert});
const wss = new WebSocket.Server({server});

const OPCodes = {
	DISPATCH: 0,
	HELLO: 1,
	HEARTBEAT: 2,
	HEARTBEAT_ACK: 3,
	IDENTIFY: 4,
	STATUS_UPDATE: 5,
	RESUME: 6,
	INVALID_SESSION: 7
};

wss.on('connection', (ws) => {
	ws.on('message', (data) => {
		console.log(JSON.parse(data));
	});

	ws.send(JSON.stringify({hello: 'a'}))
});

server.listen(8080);