import layout from './layout'
import Track from './ui/track'
import './search.css'

class SearchPage extends Page{
	constructor(platform){
		super();

		this.element.addClass('center');
		this.searchContainer = new Element('ion-platform-search-container');
		this.input = new Element('input', 'ion-platform-search-input ion-text');
		this.input.setAttribute('placeholder', 'Search ' + platform);
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('spellcheck', false);
		this.results = new Element('ion-platform-results-container');
		this.element.appendChild(this.searchContainer, this.results);
		this.searchContainer.appendChild(this.input);
		this.padding = new Element('ion-page-padding');
		this.element.appendChild(this.padding);
		this.platform = platform.toLowerCase();
		this.platformUpper = platform;
		this.subscribed = [];

		layout.buttons[this.platform].element.on('click', () => {
			client.navigate({page: this.name});
		});

		layout.buttons[this.platform].a.setAttribute('href', this.baseURL);

		this.input.on('keyup', (e) => {
			if(e.keyCode == 13)
				client.navigate({page: this.platform, data: {query: this.input.domElement.value}});
		});
	}

	async load(query){
		var load;

		try{
			load = await client.load(this, '/api/media/search/' + this.platform + '?q=' + encodeURIComponent(query));
		}catch(e){
			if(e == null)
				return;
			throw e;
		}

		if(!load.res.ok)
			return client.navigate({page: 'error', data: {message: 'Could not load the page'}});
		var data = load.body.results;

		this.loadData(data);

		client.setState(this, {endpoint: {query, data}, url: this.baseURL + '?q=' + query});
	}

	loadData(data){
		this.results.empty();

		for(const subscribed of this.subscribed)
			subscribed.unsubscribe();
		this.subscribed = [];

		for(const item of data){
			const track = new Track();

			item.loaded = true;

			track.load(item);

			this.results.appendChild(track.container);
			this.subscribed.push(track);

			track.subscribe();
		}
	}

	navigated(endpoint){
		layout.buttons[this.platform].setSelected(true);

		var url = this.baseURL;

		if(endpoint.data)
			this.loadData(endpoint.data);
		else if(endpoint.query){
			this.load(endpoint.query);

			this.results.empty();

			for(const subscribed of this.subscribed)
				subscribed.unsubscribe();
			this.subscribed = [];

			for(var i = 0; i < 20; i++){
				const track = new Track();

				if(this.platform == 'youtube')
					track.setWide(true);
				track.setLoading();

				this.results.appendChild(track.container);
			}
		}

		if(endpoint.query)
			url += '?q=' + encodeURIComponent(endpoint.query);
		return {title: this.platformUpper + ' Search', url, endpoint};
	}

	hidden(){
		layout.buttons[this.platform].setSelected(false);
	}

	parse(path, query){
		if(path.length)
			return null;
		return {query: query.get('q')};
	}

	get name(){
		return this.platform;
	}

	get baseURL(){
		return '/search/' + this.platform;
	}
}

PageManager.registerPage(new SearchPage('Youtube'));
PageManager.registerPage(new SearchPage('Spotify'));
PageManager.registerPage(new SearchPage('Soundcloud'));