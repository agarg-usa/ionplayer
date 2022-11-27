import Track from './ui/track'
import Player from './player';

class TrackPage extends Page{
	constructor(){
		super();

		this.element.addClass('center');
		this.track = new Track();
		this.track.subscribe();
		this.track.trackpage = true;
		this.element.appendChild(this.track.container);
	}

	async load(endpoint){
		var data;

		try{
			data = await client.load(this, '/api/media/track/' + endpoint.platform + '/' + endpoint.id);
		}catch(e){
			if(e == null)
				return;
			throw e;
		}

		if(!data.res.ok)
			return client.navigate({page: 'error', data: {message: 'Could not load the page'}});
		data = data.body;

		if(data.unplayable_reason)
			return client.navigate({page: 'error', data: {message: data.unplayable_reason}});

		data.loaded = true;

		this.track.load(data);
		this.track.changed();

		endpoint.data = data;

		client.setState(this, {endpoint: {data, platform: data.platform, id: data.id}, url: '/track/' + data.platform + '/' + data.id, title: data.title});

		if(!Player.playing)
			this.track.toggleOrPlay();
	}

	navigated(endpoint){
		this.track.setWide(endpoint.platform == 'youtube');

		if(endpoint.data){
			const data = endpoint.data;

			data.loaded = true;

			this.track.load(data);

			if(!Player.playing)
				this.track.toggleOrPlay();
		}else{
			this.load(endpoint);
			this.track.setLoading();
		}

		return {url: '/track/' + endpoint.platform + '/' + endpoint.id, endpoint, title: endpoint.data ? endpoint.data.title : null};
	}

	parse(path){
		if(path.length == 2)
			if(path[0] == 'youtube' || path[0] == 'soundcloud' || path[0] == 'spotify')
				return {platform: path[0], id: path[1]};
	}

	get name(){
		return 'track';
	}

	get baseURL(){
		return '/track';
	}
}

PageManager.registerPage(new TrackPage());
