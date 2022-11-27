const WebSocket = require('ws');
const Database = require('./backend/db/Database');

const WebSocketOPCodes = {
	DISPATCH: 0,
	HELLO: 1,
	HEARTBEAT: 2,
	HEARTBEAT_ACK: 3,
	IDENTIFY: 4,
	STATUS_UPDATE: 5,
	RESUME: 6,
	INVALID_SESSION: 7
};

const WebSocketHeartbeatInterval = 45000;

class WebSocketHandler{
	constructor(ws){
		this.ws = ws;
		this.heartbeat_timeout = null;
		this.seq = 0;

		this.closed = false;
		this.identified = false;
		this.identify_timeout = null;

		this.init();
		this.hello();
	}

	init(){
		this.ws.on('message', (data) => {
			try{
				data = JSON.parse(data);
			}catch(e){
				this.close();

				return;
			}

			this.handleMessage(data);
		});

		this.ws.on('close', () => {
			this.close();
		});

		this.identify_timeout = setTimeout(() => {
			this.identify_timeout = null;
			this.close();
		}, 40000);
	}

	send(op, type, data){
		const seq = this.seq++;

		if(this.seq >= 2 ** 32)
			this.seq = 0;
		if(op == WebSocketOPCodes.DISPATCH)
			data = {op, t: type, d: data, s: seq};
		else
			data = {op, d: type, s: seq};
		this.ws.send(JSON.stringify(data));
	}

	hello(){
		this.send(WebSocketOPCodes.HELLO, {heartbeat_interval: WebSocketHeartbeatInterval});
		this.setHeartbeatTimeout(WebSocketHeartbeatInterval * 2);
	}

	setHeartbeatTimeout(timeout){
		if(this.heartbeat_timeout)
			clearTimeout(this.heartbeat_timeout);
		this.heartbeat_timeout = setTimeout(() => {
			this.heartbeat_timeout = null;
			this.close();
		}, timeout);
	}

	handleMessage(msg){
		switch(msg.op){
			case WebSocketOPCodes.HEARTBEAT:
				this.setHeartbeatTimeout(WebSocketHeartbeatInterval * 2);
				this.send(WebSocketOPCodes.HEARTBEAT_ACK);

				break;
			case WebSocketOPCodes.IDENTIFY:
				if(this.identify_timeout){
					clearTimeout(this.identify_timeout);

					this.identify_timeout = null;
				}

				this.identify(msg.d);

				break;
			default:
				this.close();

				break;
		}
	}

	identify(data){
		if(!data || this.identified){
			this.close();

			return;
		}

		this.identified = true;

		if(!data.token || typeof data.token != 'string'){
			this.send(WebSocketOPCodes.IDENTIFY, {status: 400, error: 'Invalid token'});
			this.close();

			return;
		}

		this.tryIdentify(data.token);
	}

	async tryIdentify(token){
		var user;

		try{
			user = await Database.user.getByToken(token);
		}catch(e){
			if(this.closed)
				return;
			this.send(WebSocketOPCodes.IDENTIFY, {status: 500, error: 'Server error, try again later'});
			this.close();

			return;
		}

		if(this.closed)
			return;
		if(user){
			const res = user.publicEntries();

			res.verified = user.verified;

			this.send(WebSocketOPCodes.IDENTIFY, {status: 200, user: res});

			if(!user.verified)
				this.close();
		}else{
			this.send(WebSocketOPCodes.IDENTIFY, {status: 400, error: 'Invalid token'});
			this.close();
		}
	}

	close(){
		if(this.closed)
			return;
		this.ws.close();
		this.closed = true;

		if(this.heartbeat_timeout){
			clearTimeout(this.heartbeat_timeout);

			this.heartbeat_timeout = null;
		}

		if(this.identify_timeout){
			clearTimeout(this.identify_timeout);

			this.identify_timeout = null;
		}
	}
}

const WebSocketServer = new (class{
	constructor(){
		this.wss = new WebSocket.Server({noServer: true});
	}

	handle(req, socket, head){
		this.wss.handleUpgrade(req, socket, head, (ws) => {
			new WebSocketHandler(ws);
		});
	}
});

module.exports = WebSocketServer;