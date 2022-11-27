import layout from './layout'

class FavoritesPage extends Page{
	constructor(){
		super();

		this.element.addClass('center');
		this.element.appendChild(new Element('ion-poppins').setText('Favorites page'));

		layout.buttons.heart.element.on('click', () => {
			client.navigate({page: this.name});
		});

		layout.buttons.heart.a.setAttribute('href', this.baseURL);
	}

	navigated(endpoint){
		layout.buttons.heart.setSelected(true);

		return {title: 'Favorites', url: this.baseURL, endpoint};
	}

	hidden(){
		layout.buttons.heart.setSelected(false);
	}

	parse(){
		return {page: this.name};
	}

	get name(){
		return 'favorites';
	}

	get baseURL(){
		return '/favorites';
	}
}

PageManager.registerPage(new FavoritesPage());