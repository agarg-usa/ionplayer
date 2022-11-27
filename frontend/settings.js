import layout from './layout'

class SettingsPage extends Page{
	constructor(){
		super();

		this.element.addClass('center');
		this.element.appendChild(new Element('ion-poppins').setText('Settings page'));

		layout.buttons.settings.element.on('click', () => {
			client.navigate({page: this.name});
		});

		layout.buttons.settings.a.setAttribute('href', this.baseURL);
	}

	navigated(endpoint){
		layout.buttons.settings.setSelected(true);

		return {title: 'Settings', url: this.baseURL, endpoint};
	}

	hidden(){
		layout.buttons.settings.setSelected(false);
	}

	parse(path){
		return {};
	}

	get name(){
		return 'settings';
	}

	get baseURL(){
		return '/settings';
	}
}

PageManager.registerPage(new SettingsPage());
