import {
	YoutubeButton,
	SpotifyButton,
	SoundcloudButton,
	HomeButton,
	FavoritesButton,
	SettingsButton
} from './ui/ionbuttons'

import './layout.css'

import playbar from './playbar';
import toasts from './toast'

const layout = new (class{
	constructor(){
		this.visible = true;
		this.container = new Element('ion-container');

		this.buttons = {
			soundcloud: new SoundcloudButton(),
			youtube: new YoutubeButton(),
			spotify: new SpotifyButton(),
			home: new HomeButton(),
			heart: new FavoritesButton(),
			settings: new SettingsButton()
		}

		this.columns = new Element('ion-columns');
		this.left = new Element('ion-left');
		this.leftButtons = new Element('ion-column-fixed-container');

		this.leftButtons.appendChild(new Element('div', 'flex-vertical'));
		this.leftButtons.appendChild(this.buttons.soundcloud.element);
		this.leftButtons.appendChild(new Element('div', 'expander'));
		this.leftButtons.appendChild(this.buttons.youtube.element);
		this.leftButtons.appendChild(new Element('div', 'expander'));
		this.leftButtons.appendChild(this.buttons.spotify.element);
		this.leftButtons.appendChild(new Element('div', 'flex-vertical'));

		this.left.appendChild(this.leftButtons);

		this.center = client.container;
		this.right = new Element('ion-right');
		this.rightButtons = new Element('ion-column-fixed-container');

		this.rightButtons.appendChild(new Element('div', 'flex-vertical'));
		this.rightButtons.appendChild(this.buttons.home.element);
		this.rightButtons.appendChild(new Element('div', 'expander'));
		this.rightButtons.appendChild(this.buttons.heart.element);
		this.rightButtons.appendChild(new Element('div', 'expander'));
		this.rightButtons.appendChild(this.buttons.settings.element);
		this.rightButtons.appendChild(new Element('div', 'flex-vertical'));

		this.right.appendChild(this.rightButtons);
		this.columns.appendChild(this.left, this.center, this.right);

		this.container.appendChild(this.columns, playbar.element, toasts.container);

		document.body.appendChild(this.container.domElement);

		this.columns.on('scroll', (e) => {
			client.scrolled(e);
		});

		client.on('reload', () => {
			if(!this.visible)
				return;
			this.visible = false;

			document.body.removeChild(this.container.domElement);
			document.body.appendChild(this.center.domElement);

			Player.stop();
			playbar.setHidden(true);
		});

		client.on('loaded', () => {
			if(this.visible)
				return;
			this.visible = true;
			this.columns.appendChild(this.left, this.center, this.right);

			document.body.appendChild(this.container.domElement);
		});

		playbar.on('hidden', (hidden) => {
			if(hidden)
				this.container.removeClass('playbar');
			else
				this.container.addClass('playbar');
		});
	}
});

export default layout;