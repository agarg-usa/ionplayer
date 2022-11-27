import './ionbuttons.css'

export class IonPlatformButton{
	constructor(className){
		this.element = new Element('ion-column-platform-button', className);
		this.a = new Element('a');
		this.icon = new Element('ion-icon');
		this.select = new Element('ion-select-indicator');
		this.svg = new SVGElement('svg');

		this.icon.appendChild(this.svg);
		this.a.appendChild(this.select, this.icon);
		this.element.appendChild(this.a);

		this.a.on('click', (e) => {
			e.preventDefault();
		});
	}

	setSelected(selected){
		this.selected = selected;

		if(selected)
			this.element.addClass('selected');
		else
			this.element.removeClass('selected');
	}
}

export class IonNavigationButton{
	constructor(className){
		this.element = new Element('ion-column-nav-button', className);
		this.a = new Element('a');
		this.icon = new Element('ion-icon');
		this.svg = new SVGElement('svg');

		this.icon.appendChild(this.svg);
		this.a.appendChild(this.icon);
		this.element.appendChild(this.a);

		this.a.on('click', (e) => {
			e.preventDefault();
		});
	}

	setSelected(selected){
		this.selected = selected;

		if(selected)
			this.element.addClass('selected');
		else
			this.element.removeClass('selected');
	}
}

export class YoutubeButton extends IonPlatformButton{
	constructor(){
		super('youtube');

		this.svg.setViewbox(129, 0, 595, 595);
		this.svg.appendChild(new SVGElement('path', 'highlight'));
		this.svg.appendChild(new SVGElement('path', 'play'));
	}
}

export class SpotifyButton extends IonPlatformButton{
	constructor(){
		super('spotify');

		this.svg.setViewbox(0, 0, 512, 512);
		this.svg.appendChild(new SVGElement('path', 'symbol'));
	}
}

export class SoundcloudButton extends IonPlatformButton{
	constructor(){
		super('soundcloud');

		this.svg.setViewbox(0, 0, 512, 512);
		this.svg.appendChild(new SVGElement('path', 'symbol'));
	}
}

export class HomeButton extends IonNavigationButton{
	constructor(){
		super('home');

		this.svg.setViewbox(0, 0, 16, 16);
		this.svg.appendChild(new SVGElement('path', 'body'));
		this.svg.appendChild(new SVGElement('path', 'roof'));
	}
}

export class FavoritesButton extends IonNavigationButton{
	constructor(){
		super('heart');

		this.svg.setViewbox(0, 0, 16, 16);
		this.svg.appendChild(new SVGElement('path', 'heart'));
	}
}

export class SettingsButton extends IonNavigationButton{
	constructor(){
		super('settings');

		this.svg.setViewbox(0, 0, 16, 16);
		this.svg.appendChild(new SVGElement('path', 'gear'));
	}
}