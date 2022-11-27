import './track.css'

import Loading from './loading'
import {PlayableTrack, States} from '../playable'

class Track extends PlayableTrack{
	constructor(){
		super();

		this.container = new Element('ion-track-container');
		this.imageContainer = new Element('ion-track-image-container');
		this.image = new Element('img');
		this.details = new Element('ion-track-details');
		this.title = new Element('ion-text', 'ion-track-title');
		this.author = new Element('ion-text', 'ion-track-author');
		this.details.appendChild(this.title, this.author);
		this.container.appendChild(this.imageContainer, this.details);
		this.image.setAttribute('referrerpolicy', 'no-referrer');
		this.icon = new Element('ion-icon');
		this.svg = new SVGElement('svg');
		this.path = new SVGElement('path');
		this.shadow = new SVGElement('path', 'shadow');
		this.svg.appendChild(this.shadow, this.path);
		this.icon.appendChild(this.svg);
		this.prevstate = States.NONE;

		this.image.on('load', () => {
			this.imageContainer.empty();
			this.imageContainer.appendChild(this.image);
			this.imageContainer.appendChild(this.icon);
		});

		this.image.on('error', () => {
			if(!this.data)
				return;
			this.imageContainer.empty();
			this.imageContainer.appendChild(this.icon);
		});

		this.container.on('click', () => {
			if(this.data && !this.trackpage)
				client.navigate({page: 'track', data: {
					platform: this.data.platform,
					id: this.data.id,
					data: this.data
				}});
		});

		this.svg.setViewbox(0, 0, 36, 36);
		this.icon.on('click', (e) => {
			e.stopPropagation();

			this.toggleOrPlay();
		});

		this.loading = new SVGElement('svg', 'initial-loader');
		this.loading_icon = new Element('ion-icon');
		this.loading_icon.appendChild(this.loading);
		this.generateGradient(this.loading, {gradient: 'spinning-gradient', mask: 'spinning-mask'}, [
			{
				offset: '0%',
				color: '#00f'
			},
			{
				offset: '100%',
				color: '#f00'
			}
		], [
			new SVGElement('circle').setAttributes({
				cx: 50,
				cy: 50,
				r: 40
			})
		]);
	}

	setWide(wide){
		if(wide)
			this.container.addClass('wide');
		else
			this.container.removeClass('wide');
	}

	setSmall(small){
		if(small)
			this.container.addClass('small');
		else
			this.container.removeClass('small');
	}

	load(result){
		this.setWide(result.platform == 'youtube');

		const images = result.thumbnails;

		this.imageContainer.empty();
		this.imageContainer.appendChild(Loading.createLoading());
		this.imageContainer.appendChild(this.image);
		this.imageContainer.appendChild(this.icon);

		var index = 0;

		for(var i = 0; i < images.length; i++)
			if(images[i].height >= 180){
				index = i;

				break;
			}
		this.image.setAttribute('src', images[index].url);

		this.title.empty();
		this.title.setText(result.title);

		this.author.empty();
		this.author.setText(result.author_name);

		result.loaded = true;

		this.set(result);
	}

	setLoading(){
		this.image.setAttribute('src', '');
		this.title.setText('');
		this.author.setText('');
		this.imageContainer.empty();
		this.imageContainer.appendChild(Loading.createLoading());
		this.title.appendChild(Loading.createLoadingText());
		this.author.appendChild(Loading.createLoadingText());
	}

	setState(state){
		var className;

		switch(state){
			case States.NONE:
				className = 'none';

				break;
			case States.PLAYING:
				className = 'play';

				break;
			case States.PAUSED:
				className = 'pause';

				break;
			case States.LOADING:
				className = 'load';

				break;
			case States.FETCHING:
				className = 'load';

				break;
		}

		if(!this.icon.parent)
			this.imageContainer.appendChild(this.icon);
		if(state == States.LOADING || state == States.FETCHING){
			if(!this.loading_icon.parent)
				this.imageContainer.appendChild(this.loading_icon);
			if(this.prevstate == States.NONE)
				this.icon.setClass('pause');
		}else{
			if(this.loading_icon.parent)
				this.imageContainer.removeChild(this.loading_icon);
			this.icon.setClass(className);
		}

		this.prevstate = state;
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
}

export default Track;