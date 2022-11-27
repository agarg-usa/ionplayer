import Player from './player'
import Loading from './ui/loading'
import {secondsToTimestamp} from './util'
import './playbar.css'

class Track{
	constructor(){
		this.container = new Element('ion-playbar-track-container');
		this.image_container = new Element('ion-element', 'ion-playbar-track-image-container');
		this.image = new Element('img');
		this.details = new Element('ion-element', 'ion-playbar-track-details');
		this.title = new Element('ion-text', 'ion-playbar-track-title');
		this.author = new Element('ion-text', 'ion-playbar-track-author');
		this.details.appendChild(this.title, this.author);
		this.container.appendChild(this.image_container, this.details);
		this.image.setAttribute('referrerpolicy', 'no-referrer');
	}

	setWide(wide){
		if(wide)
			this.container.addClass('wide');
		else
			this.container.removeClass('wide');
	}

	load(track){
		this.setWide(track.platform == 'youtube');
		this.image_container.empty();

		const images = track.thumbnails;

		if(images.length){
			var index = 0;

			for(var i = 0; i < images.length; i++)
				if(images[i].height >= 54){
					index = i;

					break;
				}
			this.image.setAttribute('src', images[index].url);
			this.image_container.appendChild(this.image);
		}

		this.title.empty();
		this.title.setText(track.title);

		this.author.empty();
		this.author.setText(track.author_name);
	}

	setLoading(){
		this.image.setAttribute('src', '');
		this.title.setText('');
		this.author.setText('');
		this.image_container.empty();
		this.image_container.appendChild(Loading.createLoading());
		this.title.appendChild(Loading.createLoadingText());
		this.author.appendChild(Loading.createLoadingText());
	}
}

class Button extends EventEmitter{
	constructor(name){
		super();

		this.element = new Element('ion-playbar-button', name);
		this.icon = new Element('ion-icon');
		this.svg = new SVGElement('svg');
		this.path = new SVGElement('path');

		this.svg.appendChild(this.path);
		this.icon.appendChild(this.svg);
		this.element.appendChild(this.icon);

		this.svg.setViewbox(0, 0, 36, 36);

		this.disabled = false;

		this.element.on('click', (e) => {
			if(!this.disabled)
				this.emit('click');
		});
	}

	setDisabled(disabled){
		this.disabled = disabled;

		if(disabled)
			this.element.addClass('disabled');
		else
			this.element.removeClass('disabled');
	}
}

class PlayButton extends Button{
	constructor(name){
		super(name);

		this.paused = false;
		this.loading = false;
		this.is_loading = false;
		this.element.setClass('playpause playing');

		this.change_state = null;
		this.rotating = null;
		this.rotating_start = 0;
		this.reset = null;
	}

	setPaused(paused){
		this.paused = paused;

		if(this.is_loading)
			return;
		if(paused)
			this.element.setClass('playpause paused');
		else
			this.element.setClass('playpause playing');
	}

	rotate(){
		this.element.setStyle('animation', '');
		this.element.domElement.offsetWidth;
		this.element.setStyle('animation', 'playpause-rotate 0.5s linear');

		this.last_rotate = Date.now();
	}

	startLoading(){
		if(this.rotating)
			clearInterval(this.rotating);
		this.rotating_start = Date.now();
		this.rotate();
		this.rotating = setInterval(() => {
			this.rotate();
		}, 500);

		if(this.paused)
			this.element.setClass('playpause pausedc');
		else
			this.element.setClass('playpause playingc');
		this.path.setStyle('transition', 'none');
		this.path.domElement.getBBox();
		this.path.setStyle('transition', '');
		this.element.setClass('playpause loading');
	}

	stopLoading(){
		if(this.rotating){
			clearInterval(this.rotating);

			this.rotating = null;

			if(Date.now() - this.last_rotate < 50)
				this.element.setStyle('animation', '');
		}

		if(this.paused)
			this.element.setClass('playpause pausedc');
		else
			this.element.setClass('playpause playingc');
		this.reset = setTimeout(() => {
			this.rotating = null;
			this.reset = null;
			this.loading = false;

			this.setPaused(this.paused);

			this.path.setStyle('transition', 'none');
			this.path.domElement.getBBox();
			this.path.setStyle('transition', '');
		}, 200);
	}

	setLoading(loading){
		if(this.loading == loading)
			return;
		this.loading = loading;

		if(this.change_state){
			clearTimeout(this.change_state);

			this.change_state = null;
		}

		if(this.is_loading == this.loading)
			return;
		if(this.reset){
			clearTimeout(this.reset);

			this.reset = null;
		}

		if(loading)
			this.change_state = setTimeout(() => {
				this.change_state = null;
				this.is_loading = true;
				this.startLoading();
			}, 200);
		else{
			var time = 450 - (Date.now() - this.rotating_start) % 500;

			if(time < 0)
				time += 500;
			this.change_state = setTimeout(() => {
				this.change_state = null;
				this.is_loading = false;
				this.stopLoading();
			}, time);
		}
	}
}

class Controls extends EventEmitter{
	constructor(){
		super();

		this.container = new Element('ion-playbar-controls-container');
		this.buttons_container = new Element('ion-playbar-buttons-container');
		this.prev = new Button('prev');
		this.play = new PlayButton('playpause');
		this.next = new Button('next');
		this.buttons_container.appendChild(this.prev.element, this.play.element, this.next.element);
		this.prev.setDisabled(true);
		this.next.setDisabled(true);
		this.time = new Element('ion-playbar-time');
		this.time_now = new Element('ion-text', 'ion-playbar-time-text');
		this.time_duration = new Element('ion-text', 'ion-playbar-time-text');
		this.playhead_box = new Element('ion-playbar-playhead-box');
		this.playhead_container = new Element('ion-playbar-playhead-container');
		this.playhead = new Element('ion-playbar-playhead');
		this.seekpoint = new Element('ion-playbar-playhead-seekpoint');
		this.playhead_container.appendChild(this.playhead);
		this.playhead_box.appendChild(this.playhead_container, this.seekpoint);
		this.time.appendChild(this.time_now, this.playhead_box, this.time_duration);
		this.container.appendChild(this.buttons_container, this.time);

		this.time_now.setText(secondsToTimestamp(0));
		this.time_duration.setText(secondsToTimestamp(0));

		this.playhead_active = false;
		this.playhead_percent = 0;

		this.prev.on('click', () => {
			this.emit('prev');
		});

		this.play.on('click', () => {
			this.emit('play');
		});

		this.next.on('click', () => {
			this.emit('next');
		});

		this.playhead_box.on('mousedown', (e) => {
			this.playhead_active = true;
			this.changed(e);
			this.playhead_box.addClass('active');
		});

		document.addEventListener('mousemove', (e) => {
			if(this.playhead_active)
				this.changed(e);
		});

		document.addEventListener('mouseup', () => {
			if(this.playhead_active){
				this.playhead_active = false;
				this.playhead_box.removeClass('active');
				this.emit('seeked', this.playhead_percent);
			}
		});
	}

	changed(e){
		const box = this.playhead_container.domElement.getBoundingClientRect();
		var p = (e.clientX - box.left) / box.width;

		if(p < 0)
			p = 0;
		else if(p > 1)
			p = 1;
		this.setPlayhead(p);
		this.playhead_percent = p;
		this.emit('seeking', p);
	}

	setPlayhead(p){
		p *= this.playhead_container.domElement.offsetWidth;

		this.seekpoint.setStyle('left', (p - 6) + 'px');
		this.playhead.setStyle('transform', 'translateX(' + p + 'px)')
	}

	setCurrentTime(sec){
		this.time_now.setText(secondsToTimestamp(sec));
	}

	setDuration(sec){
		this.time_duration.setText(secondsToTimestamp(sec));
	}
}

class VolumeButton extends Button{
	constructor(){
		super('volume');

		this.path.setClipPath('ion-playbar-volume-slicemask');
		this.defs = new SVGElement('defs');
		this.sliceMask = new SVGElement('clipPath');
		this.sliceMask.setId('ion-playbar-volume-slicemask');
		this.sliceMask.appendChild(new SVGElement('path', 'ion-playbar-volume-slicemask-top'));
		this.sliceMask.appendChild(new SVGElement('path', 'ion-playbar-volume-slicemask-bottom'));
		this.sliceMask.appendChild(new SVGElement('path', 'ion-playbar-volume-slicemask-slice'));
		this.slashMask = new SVGElement('clipPath');
		this.slashMask.setId('ion-playbar-volume-slashmask');
		this.slashMask.appendChild(new SVGElement('path', 'ion-playbar-volume-slashmask-path'));
		this.defs.appendChild(this.sliceMask, this.slashMask);
		this.svg.appendChild(this.defs);
		this.slashPath = new SVGElement('path', 'ion-playbar-volume-slash');
		this.slashPath.setClipPath('ion-playbar-volume-slashmask');
		this.svg.appendChild(this.slashPath);
	}

	setMuted(muted){
		if(muted)
			this.element.addClass('muted');
		else
			this.element.removeClass('muted');
	}

	setQuiet(quiet){
		if(quiet)
			this.element.addClass('quiet');
		else
			this.element.removeClass('quiet');
	}
}

class Volume extends EventEmitter{
	constructor(){
		super();

		this.container = new Element('ion-playbar-volume');
		this.button = new VolumeButton();
		this.slider_box = new Element('ion-playbar-volume-slider-box');
		this.slider_container = new Element('ion-playbar-volume-slider-container');
		this.slider = new Element('ion-playbar-volume-slider');
		this.circle = new Element('ion-playbar-volume-slider-circle');
		this.slider_container.appendChild(this.slider);
		this.slider_box.appendChild(this.slider_container, this.circle);
		this.container.appendChild(this.button.element, this.slider_box);
		this.slider_active = false;

		this.button.on('click', () => {
			this.emit('togglemute');
		});

		this.slider_box.on('mousedown', (e) => {
			this.slider_active = true;
			this.slider_box.addClass('active');
			this.changed(e);
		});

		document.addEventListener('mousemove', (e) => {
			if(this.slider_active)
				this.changed(e);
		});

		document.addEventListener('mouseup', () => {
			if(this.slider_active){
				this.slider_active = false;
				this.slider_box.removeClass('active');
			}
		});
	}

	changed(e){
		const box = this.slider_container.domElement.getBoundingClientRect();
		var p = (e.clientX - box.left) / box.width;

		if(p < 0)
			p = 0;
		else if(p > 1)
			p = 1;
		this.emit('volumechange', p);
	}

	set(vol){
		this.button.setMuted(vol == 0);
		this.button.setQuiet(vol < 0.5 && vol > 0);

		const width = this.slider_container.domElement.offsetWidth * vol;

		this.circle.setStyle('left', (width - 6) + 'px');
		this.slider.setStyle('transform', 'translateX(' + width + 'px)');
	}
}

class QueueItem{
	constructor(){
		this.element = new Element('ion-playbar-queue-item');
		this.image_container = new Element('ion-playbar-queue-item-image-container');
		this.image = new Element('img');
		this.image_container.appendChild(this.image);
		this.details = new Element('ion-playbar-queue-item-details');
		this.title = new Element('ion-text', 'ion-playbar-queue-item-title');
		this.author = new Element('ion-text', 'ion-playbar-queue-item-author');
		this.details.appendChild(this.title, this.author);
		this.element.appendChild(this.details, this.image_container);
	}

	setWide(wide){
		if(wide)
			this.element.addClass('wide');
		else
			this.element.removeClass('wide');
	}

	load(track){
		this.setWide(track.platform == 'youtube');

		if(!track.loaded){
			this.title.setText('Could not load');
			this.author.setText('This track');

			return;
		}

		const images = track.thumbnails;

		var index = 0;

		for(var i = 0; i < images.length; i++)
			if(images[i].height >= 32){
				index = i;

				break;
			}
		this.image.setAttribute('src', images[index].url);
		this.title.setText(track.title);
		this.author.setText(track.author_name);
	}
}

class MiniQueue{
	constructor(){
		this.container = new Element('ion-playbar-queue-container');
	}

	update(){
		this.container.empty();

		for(let i = Math.max(Player.queue_index - 100, 0); i < Math.min(Player.queue.length, Player.queue_index + 100); i++){
			const item = new QueueItem();

			item.load(Player.queue[i]);
			item.element.on('click', () => {
				Player.setQueueIndex(i);
			});

			this.container.appendChild(item.element);
		}

		this.container.domElement.scrollTop = Math.min(Player.queue_index, 100) * 36;
	}
}

const playbar = new (class extends EventEmitter{
	constructor(){
		super();

		this.element = new Element('ion-playbar');
		this.track = new Track();
		this.controls = new Controls();
		this.volume = new Volume();
		this.mini_queue = new MiniQueue();
		this.element.appendChild(this.track.container, this.controls.container, this.volume.container, this.mini_queue.container);

		this.init();
		this.volume.set(1);
		this.setHidden(true);
	}

	init(){
		this.controls.on('prev', () => {
			Player.prev();
		});

		this.controls.on('play', () => {
			Player.setPaused(!Player.paused);
		});

		this.controls.on('next', () => {
			Player.next();
		});

		this.controls.on('seeking', (p) => {
			if(Player.duration)
				this.controls.setCurrentTime(p * Player.duration);
			else
				this.controls.setCurrentTime(0);
		});

		this.controls.on('seeked', (p) => {
			if(Player.duration){
				this.controls.setPlayhead(p);
				this.controls.setCurrentTime(p * Player.duration);

				Player.seek(p * Player.duration);
			}else{
				this.controls.setPlayhead(0);
				this.controls.setCurrentTime(0);
			}
		});

		this.volume.on('volumechange', (p) => {
			this.volume.set(p);

			Player.setVolume(p * p);
		});

		this.volume.on('togglemute', () => {
			if(Player.volume == 0){
				Player.setVolume(1);

				this.volume.set(1);
			}else{
				Player.setVolume(0);

				this.volume.set(0);
			}
		});

		Player.on('fetch', (track) => {
			this.track.setWide(track.platform == 'youtube');
			this.track.setLoading();
			this.setHidden(false);
		});

		Player.on('fetchend', () => {
			if(Player.playing)
				this.track.load(Player.playing);
			else
				/* TODO show error track instead */
				this.setHidden(true);
		});

		Player.on('track', (track) => {
			if(!track)
				return void this.track.setLoading();
			this.track.load(track);
			this.setHidden(false);
		});

		Player.on('play', () => {
			this.controls.play.setPaused(false);
		});

		Player.on('pause', () => {
			this.controls.play.setPaused(true);
		});

		Player.on('waiting', () => {
			/* stop playbar update? */
			this.controls.play.setLoading(true);
		});

		Player.on('canplay', () => {
			this.controls.play.setLoading(false);
		});

		Player.on('playing', () => {
			/* begin playbar update? */
		});

		Player.on('timeupdate', () => {
			/* playbar update */
			if(this.controls.playhead_active)
				return;
			if(Player.duration)
				this.controls.setPlayhead(Player.currentTime / Player.duration);
			else
				this.controls.setPlayhead(0);
			this.controls.time_now.setText(secondsToTimestamp(Player.currentTime));
		});

		Player.on('durationchange', () => {
			this.controls.setDuration(Player.duration);
		});

		Player.on('volumechange', () => {
			this.volume.set(Math.sqrt(Player.volume));
		});

		Player.on('queuechange', () => {
			this.controls.prev.setDisabled(!Player.canPrev());
			this.controls.next.setDisabled(!Player.canNext());
			this.mini_queue.update();
		});
	}

	setHidden(hidden){
		this.emit('hidden', hidden);
	}
});

window.playbar = playbar;

export default playbar;