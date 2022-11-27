function funcArgAssert(bool){
	if(!bool)
		throw new Error('Invalid parameter');
}

class ElementPrototype{
	addChildren(elements){
		funcArgAssert(elements instanceof Array)

		for(var i = 0; i < elements.length; i++){
			funcArgAssert(elements[i] instanceof ElementPrototype)

			this.domElement.appendChild(elements[i].domElement);
		}

		return this;
	}

	removeChildren(elements){
		funcArgAssert(elements instanceof Array)

		for(var i = 0; i < elements.length; i++){
			funcArgAssert(elements[i] instanceof ElementPrototype)

			this.domElement.removeChild(elements[i].domElement);
		}
	}

	appendChild(...elements){
		this.addChildren(elements);

		return this;
	}

	removeChild(...elements){
		this.removeChildren(elements);

		return this;
	}

	empty(){
		while(this.domElement.lastChild)
			this.domElement.removeChild(this.domElement.lastChild);
		return this;
	}

	on(type, callback){
		this.domElement.addEventListener(type, callback);

		return this;
	}

	removeEventListener(type, callback){
		this.domElement.removeEventListener(type, callback);

		return this;
	}

	setAttribute(name, value){
		this.domElement.setAttribute(name, value);

		return this;
	}

	setAttributes(attributes){
		for(var name in attributes)
			this.domElement.setAttribute(name, attributes[name]);
		return this;
	}

	setStyle(name, value){
		this.domElement.style[name] = value;

		return this;
	}

	setStyles(styles){
		for(var name in styles)
			this.domElement.style[name] = styles[name];
		return this;
	}

	setClass(className){
		this.domElement.classList.value = className;

		return this;
	}

	addClasses(classes){
		funcArgAssert(classes instanceof Array)

		for(var i = 0; i < classes.length; i++)
			this.domElement.classList.add(classes[i]);
		return this;
	}

	removeClasses(classes){
		funcArgAssert(classes instanceof Array);

		for(var i = 0; i < classes.length; i++)
			this.domElement.classList.remove(classes[i]);
		return this;
	}

	addClass(...classes){
		this.addClasses(classes);

		return this;
	}

	removeClass(...classes){
		this.removeClasses(classes);

		return this;
	}

	setId(id){
		this.domElement.id = id;

		return this;
	}
}

class Element extends ElementPrototype{
	constructor(type, className){
		super();

		this.domElement = document.createElement(type);

		if(className)
			this.setClass(className);
	}

	setText(text){
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

	setViewbox(w, h){
		this.setAttribute('viewBox', `0 0 ${w} ${h}`);

		return this;
	}

	setPath(d){
		this.setAttribute('d', d);

		return this;
	}

	setFill(f){
		this.setAttribute('fill', f);

		return this;
	}

	setStroke(s){
		this.setAttribute('stroke', s);

		return this;
	}
}

class Page{
	constructor(){
		this.element = new Element('page');
	}

	showing(){}

	hidden(){}

	load(data){}
}

const pageManager = new (class{
	constructor(){
		this.currentPage = null;
		this.body = new Element('page-container');

		document.body.appendChild(this.body.domElement);
	}

	showPage(page){
		if(this.currentPage != page){
			if(this.currentPage){
				this.body.removeChild(this.currentPage.element);
				this.currentPage.hidden();
			}

			this.currentPage = page;
			this.body.appendChild(page.element);

			page.showing();
		}
	}
});

// window.addEventListener('popstate', (e) => {
// 	this.load(location.href, false);
// });


// load(url, state = true){
// 	if(state)
// 		history.pushState(null, '', url);

const api = new (class{
	constructor(){

	}

	async loadEndpoint(url){
		const resp = await fetch('/api/v0' + url);
		const body = resp.body.getReader();
		const decoder = new TextDecoder('utf-8');
		var buffer = '';
		var first_seen = false;

		while(true){
			const {done, value} = await body.read();
			const chunk = decoder.decode(value);

			var i = chunk.indexOf('\n');

			if(i != -1)
				i += buffer.length;
			buffer += chunk;

			while(i != -1){
				if(!first_seen)
					first_seen = true;
				else{
					var json;

					try{
						json = JSON.parse(buffer.substring(0, i - 1));
					}catch(e){
						/* show error */

						console.error(e);

						return;
					}

					console.log(json);
				}

				buffer = buffer.substring(i + 1);
				i = buffer.indexOf('\n');
			}

			if(done)
				break;
		}
	}
});

function generateGradient(svg, ids, stops, maskch = []){
	const gradient = new SVGElement('linearGradient').setId(ids.gradient).setAttributes({'x1': '0%', 'y1': '0%', 'x2': '100%', 'y2': '100%'});

	for(var i = 0; i < stops.length; i++)
		gradient.appendChild(new SVGElement('stop').setAttributes({offset: stops[i].offset, 'stop-color': stops[i].color}));
	svg.appendChild(new SVGElement('defs').appendChild(gradient));
	svg.appendChild(new SVGElement('mask').setId(ids.mask).addChildren(maskch));
	svg.appendChild(new SVGElement('g').setStyles({mask: 'url(#' + ids.mask + ')'}).appendChild(
		new SVGElement('rect').setAttributes({x: '-10%', y: '-10%', width: '120%', height: '120%', fill: 'url(#' + ids.gradient + ')'})
	));
}

pageManager.showPage(new (class initialLoader extends Page{
	constructor(){
		super();

		this.svg = new SVGElement('svg', 'initial-loader');

		generateGradient(this.svg, {gradient: 'spinning-gradient', mask: 'spinning-mask'}, [
			{
				offset: "0%",
				color: "#3699ff"
			},
			{
				offset: "100%",
				color: "#00ff00"
			}
		], [
			new SVGElement('circle').setAttributes({
				cx: 50,
				cy: 50,
				r: 40
			})
		]);

		this.element.addClass('center');
		this.element.appendChild(this.svg);
	}
}));

api.loadEndpoint(location.pathname);