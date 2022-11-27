console.log('%cJavaScript!!', 'font-weight: bold; font-size: 50px; color: red; text-shadow: 3px 3px 0 rgb(217,31,38), 6px 6px 0 rgb(226,91,14), 9px 9px 0 rgb(245,221,8), 12px 12px 0 rgb(5,148,68), 15px 15px 0 rgb(2,135,206), 18px 18px 0 rgb(4,77,145), 21px 21px 0 rgb(42,21,113)');

window.debug = {
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
	}
};

/* utility function for asserting that {param instanceof Class} is true */
function ClassAssert(param, Class){
	if(!(param instanceof Class))
		throw new TypeError('Parameter must be instanceof', Class);
}

/* this class provides essential utility functions for general usage
	and wraps the element created through {document.createElement}

	{Instance: ElementPrototype.domElement} = the element created through {document.createElement}
*/
class ElementPrototype{
	addChildren(elements){
		/* add an array of child elements that are all {ElementPrototype} */
		ClassAssert(elements, Array)

		for(const element of elements){
			ClassAssert(element, ElementPrototype)

			this.domElement.appendChild(element.domElement);
		}

		return this;
	}

	removeChildren(elements){
		/* remove an array of child elements that are all {ElementPrototype} */
		ClassAssert(elements, Array)

		for(const element of elements){
			ClassAssert(element, ElementPrototype)

			this.domElement.removeChild(element.domElement);
		}
	}

	appendChild(...elements){
		/* add a list of child elements that are all {ElementPrototype} */
		this.addChildren(elements);

		return this;
	}

	removeChild(...elements){
		/* remove a list of child elements that are all {ElementPrototype} */
		this.removeChildren(elements);

		return this;
	}

	empty(){
		/* remove all child elements */
		while(this.domElement.lastChild)
			this.domElement.removeChild(this.domElement.lastChild);
		return this;
	}

	on(type, callback){
		/* add an event listener to the {domElement} */
		this.domElement.addEventListener(type, callback);

		return this;
	}

	removeEventListener(type, callback){
		/* remove an event listener to the {domElement} */
		this.domElement.removeEventListener(type, callback);

		return this;
	}

	setAttribute(name, value){
		/* wrapper function for setAttribute */
		this.domElement.setAttribute(name, value);

		return this;
	}

	setAttributes(attributes){
		/* utility function for setting multiple attributes at the same time */
		for(const name in attributes)
			this.domElement.setAttribute(name, attributes[name]);
		return this;
	}

	setStyle(name, value){
		/* wrapper function for editing inline css styles */
		this.domElement.style[name] = value;

		return this;
	}

	setStyles(styles){
		/* utility function for setting multiple styles at the same time */
		for(const name in styles)
			this.domElement.style[name] = styles[name];
		return this;
	}

	setClass(className){
		/* wrapper function to set the class for this element */
		this.domElement.classList.value = className;

		return this;
	}

	addClasses(classes){
		/* utility function to add multiple classes */
		ClassAssert(classes, Array)

		for(const className of classes)
			this.domElement.classList.add(className);
		return this;
	}

	removeClasses(classes){
		/* utility function to remove multiple classes */
		ClassAssert(classes, Array);

		for(const className of classes)
			this.domElement.classList.remove(className);
		return this;
	}

	hasClasses(classes){
		/* utility function to check if the element has these classes */
		ClassAssert(classes, Array);

		for(const className of classes)
			if(!this.domElement.classList.contains(className))
				return false;
		return true;
	}

	toggleClasses(classes){
		/* utility function to toggle these classes of the element */
		ClassAssert(classes, Array);

		for(const className of classes)
			this.domElement.classList.toggle(className);
		return this;
	}

	addClass(...classes){
		/* wrapper function to add a list of classes to the element */
		this.addClasses(classes);

		return this;
	}

	removeClass(...classes){
		/* wrapper function to remove a list of classes to the element */
		this.removeClasses(classes);

		return this;
	}

	hasClass(...classes){
		/* wrapper function to check the element if it has this list of classes */
		return this.hasClasses(classes);
	}

	toggleClass(...classes){
		/* wrapper function to toggle a list of classes of the element */
		this.toggleClasses(classes);

		return this;
	}

	setId(id){
		/* wrapper function to set the HTML ID of an element */
		this.domElement.id = id;

		return this;
	}

	get parent(){
		return this.domElement.parentElement;
	}
}

/* Element class, for everything but SVGs */
class Element extends ElementPrototype{
	constructor(type, className){
		super();

		this.domElement = document.createElement(type);

		if(className)
			this.setClass(className);
	}

	setText(text){
		/* wrapper function to set the text content */
		this.domElement.textContent = text;

		return this;
	}
}

class SVGElement extends ElementPrototype{
	constructor(type, className){
		super();

		this.domElement = document.createElementNS('http://www.w3.org/2000/svg', type);

		if(className)
			this.setClass(className);
	}

	setViewbox(x, y, w, h){
		/* wrapper function to set the viewbox of an svg */
		this.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);

		return this;
	}

	setPath(d){
		/* wrapper function to set the path of a PATH element */
		this.setAttribute('d', d);

		return this;
	}

	setFill(f){
		/* wrapper function to set the fill color */
		this.setAttribute('fill', f);

		return this;
	}

	setStroke(s){
		/* wrapper function to set the stroke color */
		this.setAttribute('stroke', s);

		return this;
	}

	setClipPath(id){
		this.setAttribute('clip-path', 'url(#' + id + ')');
	}
}

/* Page class */
class Page{
	constructor(){
		/* create a page element, which will be displayed when navigated to */
		/* add all your UI elements to {this.element} */
		this.element = new Element('ion-page');
	}

	navigated(endpoint){
		/* this page was navigated to, information about endpoint in {endpoint}
			this could be called when the user navigates the history of the tab
			or when a link is clicked

			EXAMPLE:
				the navigated page was the user page
				endpoint = {
					id: '3f8d09bacd',
					username: '...',
					...
				}

			this is for quick loading of certain information while we wait for all other information to load
		*/

		/* optional return value:
			{title: 'Title of this page', url: '/URL_of_this_page', endpoint: endpoint}

			the {url} field MUST begin with a '/'
			the title field indicates the page title, e.g {title: endpoint.username + "'s profile"}

			the {endpoint} field indicates what information to save when calling {history.pushState} for navigation
				IF LEFT EMPTY, IT MEANS THIS PAGE CANNOT BE NAVIGATED TO
				OTHERWISE JUST LEAVE IT AS DEFAULT VALUE {endpoint: endpoint}
		*/
	}

	hidden(){
		/* this function is called when the page is hidden (navigated away from) */
	}

	parse(path, query){
		/* parse url to endpoint */

		/* EXAMPLE:
			current tab url: '/user/theIdOfAUser/'

			{this.baseURL} = '/user'

			this page is the user page and the function was called with ['theIdOfAUser']

			return {null} to redirect to the home page
			return {page: this.name, data: {id: 'theIdOfAUser', ...otherfields}} to indicate that this is a page that you can process
		*/
	}

	scrolled(event, info){

	}

	get name(){
		/* the name of your page. Duplicates will cause an error */
		return null;
	}

	get baseURL(){
		/* the base url of your page. return {null} if you dont want your {parse} function to be called */
		return null;
	}
}

/* manages essential pages */
const PageManager = new (class{
	constructor(){
		/* map to keep track of all [page.name, page] */
		this.pages = new Map();
		/* paths to keep track of all [page.baseURL, page] */
		this.paths = new Map();

		/* default names of essential pages */
		this.ERROR = 'error';
		this.HOME = 'home';
		this.AUTHENTICATION = 'authentication';
		this.UNVERIFIED = 'unverified';
		this.LOADING = 'loading';

		/* a specific string to indicate the end of a {this.paths} branch. Your page name cannot be equal to this */
		this.paths_end_str = 'DEFAULT_PATH_END';
	}

	registerPage(...pages){
		/* registers each page you pass in, accounting for its {page.name} and {page.baseURL} */
		for(const page of pages){
			if(!(page instanceof Page))
				throw new Error('Invalid Page');
			if(!page.name || page.name == this.paths_end_str)
				throw new ErrorPage('Page has no name');
			if(this.pages.has(page.name))
				throw new Error('Duplicate page');
			this.pages.set(page.name, page);

			if(page.baseURL){
				const path = page.baseURL.split('/');
				var branch = this.paths;

				for(var j = 1; j < path.length; j++){
					const name = path[j];

					if(branch.has(name))
						branch = branch.get(name);
					else{
						const map = new Map();

						branch.set(name, map);
						branch = map;
					}
				}

				if(branch.has(this.paths_end_str))
					throw new Error('Duplicate base url');
				branch.set(this.paths_end_str, page);
			}
		}
	}

	get(name){
		/* wrapper function to get a page by its name */
		return this.pages.get(name);
	}

	resolve(endpoint){
		/* turns a {url} into a page's parsed endpoint */
		const path = endpoint.url.split('/');
		const query = new URLSearchParams(endpoint.search);
		var nav = null;

		if(path.length > 1){
			var branch = this.paths;

			var i;
			for(i = 1; i < path.length; i++){
				const name = path[i];

				if(branch.has(name))
					branch = branch.get(name);
				else
					break;
			}

			const page = branch.get(this.paths_end_str);

			if(page){
				nav = page.parse(path.slice(i), query);

				if(nav)
					nav = {page: page.name, data: nav};
			}
		}

		if(!nav)
			nav = {page: PageManager.HOME};
		return nav;
	}
});

/* here begins 4 essential pages */
PageManager.registerPage(new (class LoadingPage extends Page{
	constructor(){
		super();

		this.svg = new SVGElement('svg', 'initial-loader');
		this.element.addClass('center');
		this.element.appendChild(this.svg);
		this.generateGradient(this.svg, {gradient: 'spinning-gradient', mask: 'spinning-mask'}, [
			{
				offset: '0%',
				color: '#3699ff'
			},
			{
				offset: '100%',
				color: '#00ff00'
			}
		], [
			new SVGElement('circle').setAttributes({
				cx: 50,
				cy: 50,
				r: 40
			})
		]);
	}

	generateGradient(svg, ids, stops, maskch = []){
		const gradient = new SVGElement('linearGradient').setId(ids.gradient).setAttributes({'x1': '0%', 'y1': '0%', 'x2': '100%', 'y2': '100%'});

		for(const stop of stops)
			gradient.appendChild(new SVGElement('stop').setAttributes({offset: stop.offset, 'stop-color': stop.color}));
		svg.appendChild(new SVGElement('defs').appendChild(gradient));
		svg.appendChild(new SVGElement('mask').setId(ids.mask).addChildren(maskch));
		svg.appendChild(new SVGElement('g').setStyles({mask: 'url(#' + ids.mask + ')'}).appendChild(
			new SVGElement('rect').setAttributes({x: '-10%', y: '-10%', width: '120%', height: '120%', fill: 'url(#' + ids.gradient + ')'})
		));
	}

	get name(){
		return PageManager.LOADING;
	}
}));

PageManager.registerPage(new (class AuthenticationPage extends Page{
	constructor(){
		super();

		this.isModeLogin = false;
		this.disabled = false;

		this.element.addClass('center');

		this.form = new Element('ion-login-form');

		this.title = new Element('ion-element', 'ion-login-form-title');
		this.form.appendChild(this.title);

		this.entries = new Element('ion-login-form-entries');

		this.username = this.createEntry('username', 'text');
		this.entries.appendChild(this.username.entry);
		this.email = this.createEntry('email', 'email');
		this.entries.appendChild(this.email.entry);
		this.password = this.createEntry('password', 'password');
		this.entries.appendChild(this.password.entry);

		this.form.appendChild(this.entries);

		this.button = new Element('ion-element', 'ion-login-button');
		this.form.appendChild(this.button);

		this.error = this.createErrorText();
		this.form.appendChild(this.error.element);

		this.modesContainer = new Element('ion-element', 'ion-login-change-container');
		this.modePrompt = new Element('ion-element', 'ion-login-change-text');
		this.modeButton = new Element('ion-element', 'ion-login-change-button');

		this.modesContainer.appendChild(this.modePrompt);
		this.modesContainer.appendChild(this.modeButton);
		this.form.appendChild(this.modesContainer);

		this.element.appendChild(this.form);

		this.modeButton.on('click', () => {
			this.setMode(!this.isModeLogin);
		});

		this.button.on('click', () => {
			this.submit();
		});
	}

	createErrorText(){
		const element = new Element('ion-element', 'ion-login-form-entry-error');

		return {
			element,
			setText(text){
				element.setText(text);
				element.setStyle('display', '');
			},

			clear(){
				element.setStyle('display', 'none');
			}
		};
	}

	createEntry(name, type){
		const entry = new Element('ion-login-form-entry', name);
		const cont = new Element('ion-element', 'ion-login-form-entry-input-container');
		const field = new Element('input', 'ion-login-form-entry-input').setAttributes({placeholder: 'enter your ' + name, type, spellcheck: false});
		const error = this.createErrorText();
		const icon = new Element('ion-icon');
		const svg = new SVGElement('svg');

		entry.appendChild(new Element('ion-element').setText(name));

		svg.appendChild(new SVGElement('path'));
		icon.appendChild(svg);
		cont.appendChild(icon);

		cont.appendChild(field);
		cont.appendChild(new Element('ion-element', 'ion-login-form-entry-input-focus-visualizer ion-login-gradient'));
		entry.appendChild(cont);
		entry.appendChild(error.element);

		field.on('keyup', (e) => {
			if(e.keyCode == 13)
				this.submit();
		});

		return {
			entry,
			error,

			get value(){
				return field.domElement.value;
			},

			setVisible(visible){
				if(visible)
					entry.setStyle('display', '');
				else
					entry.setStyle('display', 'none');
			},

			setDisabled(bool){
				field.domElement.disabled = bool;
			},

			clear(){
				field.domElement.value = '';
				error.clear();
			}
		};
	}

	setMode(isModeLogin){
		if(this.disabled)
			return;
		this.isModeLogin = isModeLogin;

		this.error.clear();

		if(isModeLogin){
			this.modePrompt.setText('don\'t have an account?');
			this.modeButton.setText('sign up');
			this.button.setText('login');
			this.title.setText('login');
			this.username.setVisible(false);
		}else{
			this.modePrompt.setText('have an account already?');
			this.modeButton.setText('log in');
			this.button.setText('sign up');
			this.title.setText('sign up');
			this.username.setVisible(true);
		}
	}

	disable(){
		this.email.setDisabled(true);
		this.password.setDisabled(true);
		this.username.setDisabled(true);
		this.button.addClass('disabled');
		this.modeButton.addClass('disabled');
		this.disabled = true;
	}

	end(error){
		this.email.setDisabled(false);
		this.password.setDisabled(false);
		this.username.setDisabled(false);
		this.button.removeClass('disabled');
		this.modeButton.removeClass('disabled');
		this.disabled = false;

		if(error)
			this.error.setText(error);
	}

	checkUsername(){
		const username = this.username.value;

		this.username.error.clear();

		if(this.isModeLogin)
			return false;
		if(!username.length){
			this.username.error.setText('enter a username');

			return true;
		}

		if(username.length < 3){
			this.username.error.setText('username must be atleast 3 characters');

			return true;
		}

		if(username.length > 32){
			this.username.error.setText('username can be atmost 32 characters');

			return true;
		}

		return false;
	}

	checkEmail(){
		const email = this.email.value;

		const pi = email.lastIndexOf('.'),
			ai = email.indexOf('@');
		this.email.error.clear();

		if(!email.length){
			this.email.error.setText('enter a valid email');

			return true;
		}

		if(this.isModeLogin)
			return false;
		if(ai < 1 || pi <= ai + 1 || pi + 1 == email.length){
			this.email.error.setText('enter a valid email');

			return true;
		}

		if(email.length > 64){
			this.email.error.setText('email must be atmost 64 characters');

			return true;
		}

		return false;
	}

	checkPassword(){
		const password = this.password.value;

		this.password.error.clear();

		if(!password.length){
			this.password.error.setText('enter a password');

			return true;
		}

		if(this.isModeLogin)
			return false;
		if(password.length < 8){
			this.password.error.setText('password must be atleast 8 characters');

			return true;
		}

		if(password.length > 64){
			this.password.error.setText('password must be atmost 64 characters');

			return true;
		}

		return false;
	}

	submit(){
		if(this.disabled)
			return;
		this.error.clear();

		if(this.checkUsername() | this.checkEmail() | this.checkPassword())
			return;
		if(this.isModeLogin)
			client.login(this.email.value, this.password.value);
		else
			client.signup(this.username.value, this.email.value, this.password.value);
	}

	navigated(){
		this.email.clear();
		this.password.clear();
		this.username.clear();
		this.error.clear();

		this.setMode(true);

		return {title: 'Login', url: '/login'};
	}

	get name(){
		return PageManager.AUTHENTICATION;
	}
}));

PageManager.registerPage(new (class UnverifiedPage extends Page{
	constructor(){
		super();

		this.element.addClass('center');
		this.text = new Element('ion-poppins').setText('Please wait for your account to be verified');
		this.logout = new Element('ion-poppins', 'ion-unverified-logout').setText('logout');
		this.element.appendChild(this.text, this.logout);

		this.logout.on('click', () => {
			client.logout();
		});
	}

	navigated(){
		return {title: 'Unverified', url: '/'};
	}

	get name(){
		return PageManager.UNVERIFIED;
	}
}));

PageManager.registerPage(new (class ErrorPage extends Page{
	constructor(){
		super();

		this.element.addClass('center');
		this.text = new Element('ion-poppins');
		this.element.appendChild(this.text);
	}

	navigated(endpoint){
		if(endpoint.message)
			this.text.setText(endpoint.message);
		else
			this.text.setText('An error has occurred, try again later :(');
		return {title: 'Error'};
	}

	get name(){
		return PageManager.ERROR;
	}
}));

/* here ends the 4 essential pages */

/* similar to node js's {EventEmitter} class except */
class EventEmitter{
	constructor(){
		this._events = {};
	}

	on(name, cb){
		if(this._events[name])
			this._events[name].push(cb);
		else
			this._events[name] = [cb];
	}

	emit(name, ...args){
		queueMicrotask(() => {
			var evt = this._events[name];

			if(evt)
				for(const callback of evt)
					callback.apply(this, args);
			else if(evt == 'error')
				throw args[0];
		});
	}
}

/* websocket class for identifying the user from a token */
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

class ClientWebSocket extends EventEmitter{
	constructor(client){
		super();

		this.client = client;
		this.ws = null;
		this.closed = false;
		this.connect_timeout = null;
		this.connect_delay = 8;

		this.log = debug.getLogger('GATEWAY');

		this.connect();
	}

	connect(){
		if(this.closed)
			return;
		this.log.log('CONNECTING');

		this.ws = new WebSocket('wss://gateway.' + location.host);
		this.heartbeat = null;
		this.hello_timeout = null;
		this.last_seq = -1;
		this.ping = -1;
		this.last_heartbeat_acked = true;
		this.last_heartbeat_time = -1;
		this.identified = false;

		this.ws.addEventListener('open', () => {
			this.log.log('CONNECTED');
			this.connect_delay = 8;
			this.identify(this.client.token);

			this.hello_timeout = setTimeout(() => {
				this.hello_timeout = null;
				this.error(new Error('Never received hello'));
			}, 20000);
		});

		this.ws.addEventListener('message', (e) => {
			var data;

			try{
				data = JSON.parse(e.data);
			}catch(e){
				this.log.error('ERROR', 'Invalid ws message', e.message, 'ignoring');

				return;
			}

			this.processMessage(data);
		});

		this.ws.addEventListener('close', () => {
			this.log.log('CLOSED');
			this.reconnect();
		});

		this.ws.addEventListener('error', (e) => {
			this.error(e);
		});
	}

	processMessage(data){
		this.log.verbose('MESSAGE', data);

		if(!Number.isFinite(data.s) || data.s <= this.last_seq || data.s != this.last_seq + 1){
			this.error(new Error('Received invalid sequence'));

			return;
		}

		this.last_seq++;

		switch(data.op){
			case WebSocketOPCodes.HELLO:
				if(this.hello_timeout){
					clearTimeout(this.hello_timeout);

					this.hello_timeout = null;
				}else{
					this.error(new Error('Received double hello'));

					break;
				}

				if(!data.d){
					this.destroy(new Error('No heartbeat interval from hello'));

					break;
				}

				const interval = data.d.heartbeat_interval;

				if(!Number.isFinite(interval) || interval < 1000 || interval > 90000){
					this.destroy(new Error('Invalid heartbeat interval from hello ' + interval));

					break;
				}

				this.heartbeat = setInterval(() => {
					this.sendHeartbeat();
				}, interval);

				break;
			case WebSocketOPCodes.IDENTIFY:
				if(this.identified){
					this.error(new Error('Received duplicate identify packet'));

					break;
				}

				this.identified = true;

				if(!data.d || (data.d.status == 200 && !data.d.user)){
					this.destroy(new Error('Received invalid identify packet'));

					break;
				}

				this.emit('identified', data.d);

				break;
			case WebSocketOPCodes.HEARTBEAT_ACK:
				if(this.last_heartbeat_acked || this.last_heartbeat_time == -1){
					this.error(new Error('Unexpected heartbeat ack'));

					break;
				}

				this.last_heartbeat_acked = true;

				const now = Date.now();

				this.ping = now - this.last_heartbeat_time;

				break;
			default:
				this.error(new Error('Received unknown OPCODE'));

				break;
		}
	}

	send(op, type, data){
		if(op == WebSocketOPCodes.DISPATCH)
			data = {op, t: type, d: data};
		else
			data = {op, d: type};
		this.log.verbose('SEND', data);
		this.ws.send(JSON.stringify(data));
	}

	sendHeartbeat(){
		if(!this.last_heartbeat_acked){
			this.error(new Error('Connection lost'));

			return;
		}

		this.last_heartbeat_acked = false;
		this.last_heartbeat_time = Date.now();
		this.send(WebSocketOPCodes.HEARTBEAT);
	}

	identify(token){
		this.send(WebSocketOPCodes.IDENTIFY, {token});
	}

	destroy(e){
		this.emit('error', e);
		this.close();
	}

	error(e){
		this.log.error('ERROR', e);
		this.reconnect();
	}

	reconnect(){
		if(this.closed || this.connect_timeout)
			return;
		this.close(false);

		this.connect_delay *= 2;

		if(this.connect_delay > 30)
			this.connect_delay = 30;
		this.connect_timeout = setTimeout(() => {
			this.connect_timeout = null;
			this.connect();
		}, this.connect_delay * 1000);
	}

	close(end = true){
		if(this.closed)
			return;
		if(this.ws){
			this.ws.close();
			this.ws = null;
		}

		if(this.hello_timeout){
			clearTimeout(this.hello_timeout);

			this.hello_timeout = null;
		}

		if(this.heartbeat){
			clearTimeout(this.heartbeat);

			this.heartbeat = null;
		}

		if(this.connect_timeout){
			clearTimeout(this.connect_timeout);

			this.connect_timeout = null;
		}

		if(end){
			this.closed = true;
			this.emit('close');
		}
	}
}

/* client master class */
const client = new (class extends EventEmitter{
	constructor(){
		super();

		/* will contain the {page.element} and swap it out with other pages upon navigation */
		this.container = new Element('ion-page-container');
		this.ws = null;
		this.token = null;
		this.account = null;
		this.authenticating = false;
		this.loaded = false;

		this.page = null;
		this.endpoint = null;
		this.continue = null;
		this.pageLoad = [];
		this.asyncRequests = [];

		this.log = debug.getLogger('CLIENT');

		this.container.on('scroll', (e) => {
			this.scrolled(e);
		});

		document.body.appendChild(this.container.domElement);

		window.addEventListener('popstate', (e) => {
			/* the window was navigated through the back or forward arrows */
			if(e.state){
				/* did we save endpoint information for this page? */

				if(this.continue)
					/* continue to this page after authentication */
					this.continue = {endpoint: e.state};
				else
					/* navigate here now */
					this.navigate(e.state, false);
			}else{
				/* there was no endpoint information for this page, try to obtain an endpoint through PageManager.resolve */
				const loc = {url: location.pathname, search: location.search};

				if(this.continue)
					/* continue to this page after authentication */
					this.continue = loc;
				else
					/* navigate here now */
					this.navigateURL(loc, false);
			}
		});

		window.addEventListener('error', (evt) => {
			if(evt.error){
				this.log.error('ERROR', 'At', evt.filename + ':' + evt.lineno + ':' + evt.colno, evt.error.stack);

				evt.preventDefault();
			}
		});
	}

	setState(page, data, push = false){
		if(this.page != page){
			this.log.error('Set state called from page that is not currently being shown');

			throw new Error('Invalid State');
		}

		/* does the page have a title? */
		if(data.title)
			document.title = data.title;

		/* does the page have a url? */
		if(data.url){
			var endpoint = null;

			if(data.endpoint){
				this.endpoint.data = data.endpoint;

				endpoint = this.endpoint;
			}

			if(push)
				history.pushState(endpoint, data.title, data.url);
			else
				history.replaceState(endpoint, data.title, data.url);
		}
	}

	navigate(endpoint, push = true){
		this.log.log('NAV', 'Navigating to', endpoint);
		this.endpoint = endpoint;

		/* kill page loads */
		this.abortLoads();

		/* navigates to the page indicated by {endpoint} */
		/* {push} is {true} when a link is clicked, {false} when navigated by back or forward arrows */

		/* get the page by its name */
		const page = PageManager.get(endpoint.page);

		/* is it a different page? */
		if(this.page != page){
			/* swap the page */
			if(this.page){
				this.container.removeChild(this.page.element);
				this.page.hidden();
			}

			this.page = page;
			this.container.appendChild(page.element);
		}

		/* tell the page we navigated to it */
		const data = page.navigated(endpoint.data || {});

		if(data)
			this.setState(page, data, push);
	}

	navigateURL(url, push = true){
		/* navigates to the endpoint indicated by {url} */
		this.navigate(PageManager.resolve(url), push);
	}

	navigateContinue(){
		const cont = this.continue;

		this.continue = null;

		/* continue to the page we left off */
		if(cont.endpoint)
			this.navigate(cont.endpoint);
		else
			this.navigateURL(cont, false);
	}

	scrolled(e){
		if(this.page)
			this.page.scrolled(e, {
				containerHeight: e.target.offsetHeight,
				scroll: e.target.scrollTop,
				pageHeight: this.page.element.domElement.offsetHeight
			});
	}

	filePath(path){
		return '/' + path + '?authorization=' + encodeURIComponent(this.token);
	}

	async loadCss(path){
		const element = document.createElement('link');

		element.href = this.filePath(path);
		element.setAttribute('rel', 'stylesheet');
		element.setAttribute('type', 'text/css');

		await new Promise((resolve, reject) => {
			element.onload = resolve;
			element.onerror = reject;
			document.head.appendChild(element);
		});

		return element;
	}

	async loadScript(path){
		/* load a js file */
		const element = document.createElement('script');

		element.src = this.filePath(path);

		await new Promise((resolve, reject) => {
			element.onload = resolve;
			element.onerror = reject;
			document.body.appendChild(element);
		});

		return element;
	}

	authenticate(){
		if(this.ws)
			return;
		/* attempt to authenticate with an existing token by opening a websocket */
		this.ws = new ClientWebSocket(this);

		this.ws.on('identified', (data) => {
			this.identified(data);
		});

		this.ws.on('error', (e) => {
			this.navigate({page: PageManager.ERROR});
		});

		this.ws.on('close', () => {
			this.ws = null;
		});
	}

	identified(data){
		if(this.account){
			if(data.status != 200 && data.status != 500)
				this.logout();
			return;
		}

		/* callback function for once we receive a response from the websocket */
		if(data.status == 400){
			delete localStorage.token;

			this.navigate({page: PageManager.AUTHENTICATION});
			this.ws.close();

			return;
		}

		if(data.status != 200){
			this.navigate({page: PageManager.ERROR});
			this.ws.close();

			return;
		}

		this.account = data.user;

		if(!this.account.verified){
			this.navigate({page: PageManager.UNVERIFIED});
			this.ws.close();

			return;
		}

		this.log.success('AUTHENTICATED', this.account);

		if(!this.loaded){
			this.loaded = true;
			this.init();
		}else{
			this.emit('loaded');
			this.navigateContinue();
		}
	}

	async init(){
		/* load js and css files that can only be acquired after authentication */
		this.log.log('INIT', 'Loading files...');

		var ls = this.loadScript('base.js'),
			lc = this.loadCss('base.css');
		try{
			await Promise.all([ls, lc]);
		}catch(e){
			this.log.error('INIT', 'Could not load files', e);
			this.navigate({page: PageManager.ERROR});

			return;
		}

		this.log.success('INIT', 'Successfully loaded files');
		this.navigateContinue();
	}

	async authRequest(path, body){
		/* make a login or signup request */
		var res;

		try{
			res = await fetch('/api/account/' + path, {method: 'POST', body: JSON.stringify(body)});
		}catch(e){
			return {error: 'Network error'};
		}

		const ok = res.ok;

		try{
			res = await res.text();
		}catch(e){
			return {error: 'Network error'};
		}

		try{
			res = JSON.parse(res);
		}catch(e){
			return {error: 'Invalid server response, try again later'};
		}

		if(ok){
			if(!res.token)
				res.error = 'Invalid server response, try again later';
		}else{
			if(!res.error)
				res.error = 'Unknown error';
		}

		return res;
	}

	async auth(path, body){
		/* attempt to obtain an account and its token through the login page */
		if(this.authenticating || this.ws)
			return;
		this.authenticating = true;

		const authPage = PageManager.get(PageManager.AUTHENTICATION);

		authPage.disable();

		const data = await this.authRequest(path, body);

		this.authenticating = false;

		authPage.end(data.error);

		if(data.error)
			return;
		localStorage.token = data.token;

		this.token = data.token;

		if(!data.verified){
			this.account = data;
			this.navigate({page: PageManager.UNVERIFIED});

			return;
		}

		this.navigate({page: PageManager.LOADING});
		this.authenticate();
	}

	login(email, password){
		/* wrapper function to log in */
		this.auth('login', {email, password});
	}

	signup(username, email, password){
		/* wrapper function to create an account */
		this.auth('create', {username, email, password});
	}

	logout(){
		if(!this.account)
			return;
		if(this.ws)
			this.ws.close();
		delete localStorage.token;

		this.account = null;
		this.token = null;

		if(this.endpoint.data)
			this.continue = {endpoint: this.endpoint};
		else
			this.continue = {endpoint: {page: 'home'}};
		this.abortLoads();
		this.navigate({page: 'authentication'});

		this.emit('reload');
	}

	async request(path, options = {}){
		if(options.body)
			options.body = JSON.stringify(options.body);
		if(!options.headers)
			options.headers = {};
		options.headers.authorization = this.token;

		const res = await fetch(path, options);

		if(res.status == 401){
			this.logout();

			throw new Error('Unauthorized');
		}

		return res;
	}

	async _load(obj){
		var err = null, data = null;

		do{
			var res;

			try{
				res = await this.request(obj.path, obj.options);
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			var body;

			try{
				body = await res.text();
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			try{
				body = JSON.parse(body);
			}catch(e){
				err = new Error('Invalid server response, try again later');

				break;
			}

			data = {res, body};
		}while(false);

		if(!obj.aborted){
			const index = this.pageLoad.indexOf(obj);

			if(index == -1){
				this.log.warn('LOADFUNCTION', 'Could not find ', obj, ' in page load list');

				return;
			}

			this.pageLoad.splice(index, 1);
		}else{
			this.log.error('LOAD', 'Aborted request', {path: obj.path, options: obj.options}, 'from page', obj.page);

			throw null;
		}

		if(err){
			this.log.error('LOAD', 'Request', {path: obj.path, options: obj.options}, 'from page', obj.page, 'resulted in an error', err);

			throw err;
		}

		this.log.success('LOAD', 'Successfully loaded', {path: obj.path, options: obj.options}, 'from page', obj.page, 'data:', data);

		return data;
	}

	abortLoads(){
		for(const loading of this.pageLoad){
			loading.controller.abort();
			loading.aborted = true;
		}

		this.pageLoad = [];
	}

	/* rejects with NULL if page was navigated,
		even if it's the same page name, E.G
		someone was on a user page, clicked on one of their friends,
		decided that they no longer want to load this friend's information
		and clicked the back arrow in chrome, it would reject */
	load(page, path, options = {}){
		if(this.page != page){
			this.log.error('Load called from page that is not currently being shown');

			throw new Error('Invalid State');
		}

		this.log.verbose('LOAD', {path, options}, 'from page', page);

		const controller = new AbortController();

		options.signal = controller.signal;

		const obj = {path, options, controller, page, aborted: false};

		this.pageLoad.push(obj);

		return this._load(obj);
	}

	async _async(obj){
		var err = null, data = null;

		do{
			var res;

			try{
				res = await this.request(obj.path, obj.options);
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			var body;

			try{
				body = await res.text();
			}catch(e){
				if(e.name != 'AbortError')
					err = new Error('Network error');
				break;
			}

			if(obj.aborted)
				break;
			try{
				body = JSON.parse(body);
			}catch(e){
				err = new Error('Invalid server response, try again later');

				break;
			}

			data = {res, body};
		}while(false);

		if(!obj.aborted){
			const index = this.asyncRequests.indexOf(obj);

			if(index == -1){
				this.log.warn('ASYNCFUNCTION', 'Could not find ', obj, ' in page load list');

				return;
			}

			this.asyncRequests.splice(index, 1);
		}else{
			this.log.error('ASYNC', 'Aborted request', {path: obj.path, options: obj.options}, 'from page', obj.page);

			throw null;
		}

		if(err){
			this.log.error('ASYNC', 'Request', {path: obj.path, options: obj.options}, 'from page', obj.page, 'resulted in an error', err);

			throw err;
		}

		this.log.success('ASYNC', 'Successfully loaded', {path: obj.path, options: obj.options}, 'from page', obj.page, 'data:', data);

		return data;
	}

	abortAsyncRequests(){
		for(const loading of this.asyncRequests)
			this.stopAsyncRequest(loading);
		this.asyncRequests = [];
	}

	stopAsyncRequest(obj){
		obj.controller.abort();
		obj.aborted = true;
	}

	asyncRequest(page, path, options = {}){
		this.log.verbose('ASYNC', {path, options}, 'from page', page);

		const controller = new AbortController();

		if(options.body)
			options.body = JSON.stringify(options.body);
		options.signal = controller.signal;

		const obj = {path, options, controller, page, aborted: false};

		this.asyncRequests.push(obj);

		obj.result = this._async(obj);

		return obj;
	}

	start(){
		/* called at the very beginning, never again */
		const token = localStorage.token;

		/* continue here once authorized */
		this.continue = {url: location.pathname, search: location.search};

		if(token){
			/* show the loading page */
			this.navigate({page: PageManager.LOADING});

			/* authenticate */;
			this.token = token;
			this.authenticate();

			return;
		}

		/* no token was stored, show the login page */
		this.navigate({page: PageManager.AUTHENTICATION});
	}
});

client.start();