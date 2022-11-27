import layout from './layout'
import Loading from './ui/loading'
import Track from './ui/track'
import './home.css'

class HomePage extends Page{
	constructor(){
		super();

		this.title = new Element('ion-text', 'ion-home-large-text').setText('Home');
		this.contents = new Element('ion-home-contents');
		this.padding = new Element('ion-page-padding');

		this.element.appendChild(new Element('ion-element', 'ion-home-top-padding'));
		this.element.appendChild(this.title);
		this.element.appendChild(new Element('ion-element', 'ion-home-separator'));
		this.element.appendChild(this.contents);
		this.element.appendChild(this.padding);
		this.subscribed = [];

		layout.buttons.home.element.on('click', () => {
			client.navigate({page: this.name});
		});

		layout.buttons.home.a.setAttribute('href', this.baseURL);
	}

	create(){
		const container = new Element('ion-home-category');
		const title = new Element('ion-text', 'ion-home-category-text');
		const items = new Element('ion-home-category-items');

		title.appendChild(Loading.createLoadingText());

		for(var i = 0; i < 6; i++){
			const track = new Track();

			track.setLoading();
			track.setSmall(true);
			items.appendChild(track.container);
		}

		container.appendChild(title, items);

		this.contents.appendChild(container);
	}

	async load(){
		var data;

		try{
			data = await client.load(this, '/api/home');
		}catch(e){
			if(e == null)
				return;
			throw e;
		}

		if(!data.res.ok)
			return client.navigate({page: 'error', data: {message: 'Could not load the page'}});
		data = data.body;

		this.contents.empty();

		for(const subscribed of this.subscribed)
			subscribed.unsubscribe();
		this.subscribed = [];

		for(const category of data){
			const container = new Element('ion-home-category');
			const title = new Element('ion-text', 'ion-home-category-text').setText(category.name);
			const items = new Element('ion-home-category-items');

			for(const item of category.items){
				const track = new Track();

				track.load(item);
				track.setSmall(true);

				items.appendChild(track.container);
				track.subscribe();

				this.subscribed.push(track);
			}

			container.appendChild(title, items);

			this.contents.appendChild(container);
			this.contents.appendChild(new Element('ion-element', 'ion-home-separator'));
		}
	}

	navigated(endpoint){
		layout.buttons.home.setSelected(true);

		this.contents.empty();

		for(const subscribed of this.subscribed)
			subscribed.unsubscribe();
		this.subscribed = [];

		for(var i = 0; i < 2; i++){
			this.create();
			this.contents.appendChild(new Element('ion-element', 'ion-home-separator'));
		}

		this.load();

		return {title: 'Home', url: this.baseURL, endpoint};
	}

	hidden(){
		layout.buttons.home.setSelected(false);
	}

	get name(){
		return PageManager.HOME;
	}

	get baseURL(){
		return '/';
	}
}

PageManager.registerPage(new HomePage());