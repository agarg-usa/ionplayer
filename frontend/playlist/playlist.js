import "./playlist.css"
import Loading from "../ui/loading";
import Player from "../player"
import {monthArr, secondsToTimestamp, bestThumbnail} from "../util"
import {States, PlayableTrack, Playlist} from '../playable'


//todo: add shuffle button, delete playlist button, edit, (optional: add song)
//todo some bugs while clicking directly on the icon of the pause button colors
class PlaylistPage extends Page{
	constructor(){
		super();
		this.element.addClass("playlist-page");
		this.mainPicContainer = new Element("ion-element").addClass("playlist-img-container", "position-relative");
		this.title = new Element("ion-text", "playlist-title-text");
		this.description = new Element("ion-text", "playlist-description-text");
		this.authorAndLength = new Element("ion-text", "playlist-metadata-text").addClass("playlist-link");

		this.authorAndLength.on("click", () =>
		{
			if(!this.loading && this.authorID)
			{
				client.navigate({page : "user", data : {id : this.authorID}});
			}
		});

		this.lastUpdated = new Element("ion-text", "playlist-metadata-text");

		const titleAndDescContainer = new Element("ion-element", "playlist-title-container");
		titleAndDescContainer.appendChild(this.description, this.lastUpdated, this.authorAndLength, this.title,
			new Element("ion-text", "playlist-metadata-text").setText("Playlist"));

		const titleDescAndImgContainer = new Element("ion-element", "playlist-title-and-img-container");
		titleDescAndImgContainer.appendChild(this.mainPicContainer, titleAndDescContainer);
		this.element.appendChild(titleDescAndImgContainer);

		this.playButton = new PlayButton();
		this.element.appendChild(this.playButton.element);
		this.trackHolder = new Element("ion-element");
		this.element.appendChild(this.trackHolder);


		this.spinner = new Element("ion-element", "playlist-spinner-container")
			.appendChild(new Element("ion-icon","playlist-spinner"));
		this.element.appendChild(this.spinner);

		this.element.appendChild(new Element("ion-page-padding"));

		this.maxNumOfSongs = 0;
		this.numOfSongsLoaded = 0;
		this.loading = false;
		this.playlistID = "";
		this.finishedLoadingAllSongs = false;
		this.authorID = "";
		this.subscribedTracks = [];
		this.manager = null;

	}

	setSpinnerVisible()
	{
		this.spinner.setStyle("display", "block");
	}

	setSpinnerInvisible()
	{
		this.spinner.setStyle("display", "none");
	}

	empty()
	{
		this.title.empty();
		this.description.empty();
		this.mainPicContainer.empty();
		this.lastUpdated.empty();
		this.authorAndLength.empty();
		this.trackHolder.empty();

		this.title.setText("");
		this.lastUpdated.setText("");
		this.description.setText("");
		this.authorAndLength.setText("");
		client.setState(this, {title : "Playlist Page"})
		this.numOfSongsLoaded = 0;
		this.maxNumOfSongs = 0;
		this.loading = false;
		this.finishedLoadingAllSongs = false;
		this.playlistID = "";
		this.authorID = "";
		this.manager = null;
		this.setSpinnerInvisible();

		for(const track of this.subscribedTracks)
		{
			track.unsubscribe();
		}

		this.subscribedTracks = [];
	}

	setLoading()
	{
		this.mainPicContainer.appendChild(Loading.createLoading());
		this.title.appendChild(Loading.createLoadingText());
		this.description.appendChild(Loading.createLoadingText());
		this.lastUpdated.appendChild(Loading.createLoadingText());
		this.authorAndLength.appendChild(Loading.createLoadingText());

		this.setSpinnerVisible();
		client.setState(this, {title : "Loading..."});
		this.loading = true;
	}

	async loadInitial()
	{
		let load;
		try{
			load = await client.load(this, "/api/playlist/" + encodeURIComponent(this.playlistID));
		}catch(e){
			if(e == null)
				return;
			throw e;
		}

		if(!load.res.ok)
			return client.navigate({page: 'error', data: {message: 'Could not load the page'}});
		let data = load.body;

		this.playlist = {
			id: data.id,
			length: data.length,
			tracks: []
		};

		const tempPlaylistID = this.playlistID;
		this.empty();
		this.playlistID = tempPlaylistID;

		let authorData = data.owner;
		this.authorID = authorData.id;

		client.setState(this, {title : data.title});
		this.title.setText(data.title);
		this.description.setText(data.description);
		this.authorAndLength.setText(authorData.username + " • " + data.length + " songs");
		const lastUpdatedDate = new Date(data.last_updated);
		this.lastUpdated.setText("Last Updated • " + lastUpdatedDate.getDate() + " " +
			monthArr[lastUpdatedDate.getMonth()] + " " + lastUpdatedDate.getFullYear());

		this.maxNumOfSongs = data.length;

		if(data.thumbnail)
		{
			this.mainPicContainer.appendChild(
				new Element("img").setAttribute("src", "//cdn." + location.host + "/playlists/" + data.thumbnail + ".webp"));
		}
		else
		{
			const svg = new SVGElement('svg');
			const path = new SVGElement('path');

			svg.setViewbox(0, 0, 80, 81);
			svg.appendChild(path);

			this.mainPicContainer.appendChild(svg);
		}

		this._loadSongs();

		this.manager = new PlaylistStateManager(this.playlist);
		this.manager.subscribe();
	}

	async loadSongs(limit = 100, offset = this.numOfSongsLoaded)
	{
		let load;
		try{
			load = await client.load(this, "/api/playlist/" + encodeURIComponent(this.playlistID)
			+ "/tracks?limit=" + encodeURIComponent(limit) + "&offset=" + encodeURIComponent(offset));
		}catch(e){
			if(e == null)
				return;
			throw e;
		}

		if(!load.res.ok)
			return client.navigate({page: 'error', data: {message: 'Could not load the page'}});
		let data = load.body;
		if(data.length)
		{
			this.addSongsToList(data);
		}
		else
		{
			this.finishedLoadingAllSongs = true;
		}
	}

	async _loadSongs(){
		this.loading = true;
		this.setSpinnerVisible();

		try{
			await this.loadSongs();
		}catch(e){
			console.error(e);
		}finally{
			this.loading = false;
			this.setSpinnerInvisible();
		}
	}

	addSongsToList(songsArr)
	{
		for(let i = 0; i < songsArr.length; i++)
		{
			let mySong = songsArr[i];

			if(!mySong)
				mySong = {
					title: 'Track could not be loaded or is unplayable',
					author_name: 'unplayable',
					thumbnails: [],
					duration: 0,
					playable: false
				};

			this.playlist.tracks.push(mySong);

			mySong.loaded = true;
			let title = mySong.title;
			let author = mySong.author_name;
			let duration = mySong.duration;
			let thumbnail;
			if(!mySong.thumbnails)
			{
				thumbnail = "//cdn." + location.host + "/songs/default.png";
			}
			else
			{
				thumbnail = bestThumbnail(mySong.thumbnails);
			}

			if(!duration)
				duration = 0;
			if(!title)
				title = "TITLE NOT FOUND"
			if(!author)
				author = "AUTHOR NOT FOUND"
			if(!mySong.playable)
				title += "\t❗"; //tab character doesnt work

			this.trackHolder.appendChild(
				new PlaylistTrack(i+1+this.numOfSongsLoaded, thumbnail, title,
					author, duration, mySong).mainElem);
		}

		this.numOfSongsLoaded += songsArr.length;
		if(this.numOfSongsLoaded == this.maxNumOfSongs)
		{
			this.finishedLoadingAllSongs = true;
		}
	}


	scrolled(e, info){
		if(!this.loading && !this.finishedLoadingAllSongs)
		{
			// info.containerHeight; //the height in pixels of the page's container
			// info.scroll; //the amount of pixels scrolled down by
			const BUFFER_PIXELS = 500;

			if(info.containerHeight + info.scroll + BUFFER_PIXELS >= info.pageHeight)
			{
				this.loading = true;
				this.setSpinnerVisible();
				this._loadSongs();
			}
		}
	}

	navigated(endpoint){
		this.empty();
		this.setLoading();
		if(endpoint.id)
		{
			this.playlistID = endpoint.id;
			this.loadInitial(endpoint.id)
				.catch((e) => {console.error(e);})
				.finally(() => {this.loading = false;});

		}
		else
		{
			return client.navigate({page: 'error', data: {message: 'Not Found'}});
		}
		return {url: '/playlist/' + endpoint.id , endpoint: endpoint};
	}

	hidden()
	{
		this.empty();
	}

	parse(path, query){
		if(path.length == 1)
		{
			return {
				id: path[0]
			}
		}
		else
		{
			return {}
		}
	}

	get name(){
		return "playlist";
	}

	get baseURL(){
		return "/playlist";
	}
}

class PlaylistStateManager extends Playlist
{
	constructor(data)
	{
		super(data);
	}

	setState(state)
	{
		if(this.data.id != myPage.playlistID)
		{
			return;
		}
		switch (state){
			case States.NONE:
			case States.PAUSED:
			{
				myPage.playButton.createPlaySVG();
				break;
			}
			case States.PLAYING:
			{
				myPage.playButton.createPauseSVG();
				break;
			}
		}
	}

}

class PlaylistTrack extends PlayableTrack
{
	constructor(number, img, title, author, duration, data)
	{
		if(data.playable)
			super(data);
		else
			super();
		duration = secondsToTimestamp(duration);

		this.mainElem = new Element("ion-element", "playlist-track-container");

		if(number == 1)
		{
			this.mainElem.setStyle("margin-top", 0);
		}

		this.playlistOrder = number;
		this.playlistOrderContainer =
			new Element("ion-element", "playlist-vertical-container")
			.appendChild(new Element("ion-text", "playlist-track-text-centered").setText(number));
		this.author =
			new Element("ion-text", "playlist-track-author").setText(author);
		this.title =
			new Element("ion-text", "playlist-track-text").setText(title);
		this.duration = new Element("ion-text", "playlist-track-text-centered").setText(duration);
		this.thumbnail = new Element("img").setAttributes({"src" : img, "loading" : "lazy"});

		this.mainElem.appendChild(this.playlistOrderContainer);
		const imgAndTitleElem = new Element("ion-element", "flex-horizontal");
		imgAndTitleElem.appendChild(new Element("ion-element", "playlist-vertical-container")
			.appendChild(this.thumbnail));
		imgAndTitleElem.appendChild(
			new Element("ion-element", "playlist-track-title-container")
				.appendChild(this.author, this.title));
		this.mainElem.appendChild(imgAndTitleElem);
		this.mainElem.appendChild(new Element("ion-element", "playlist-vertical-container")
			.appendChild(this.duration));

		this.mainElem.on("click", () =>
		{
			this.toggleOrPlay();
		});

		this.subscribe();

		this.mainElem.on("mouseenter", () =>
		{
			if(this.state == States.NONE)
			{
				this.playlistOrderContainer.empty();
				const svg = new SVGElement("svg").setViewbox(0,0,25,25);
				svg.appendChild(new SVGElement('path', 'playlist-playingbutton'));

				this.playlistOrderContainer
					.appendChild(
						new Element("ion-icon")
						.setStyles({width : "27px", height : "24px"})
							.appendChild(svg));
			}
			else if(this.state == States.PLAYING)
			{
				this.playlistOrderContainer.empty();

				const svg = new SVGElement("svg")
				.setStyles({height : "22px", width : "22px"});

				svg.appendChild(new SVGElement("rect")
					.setAttributes({x : 5, y : 3, width : 4, height: 18, fill : "white"}));
				svg.appendChild(new SVGElement("rect")
					.setAttributes({x : 15, y : 3, width : 4, height: 18, fill : "white"}));

				this.playlistOrderContainer
					.appendChild(new Element("ion-icon").appendChild(svg));
			}
		});

		this.mainElem.on("mouseleave", () =>
		{
			this.setState(this.state);
		});

		//TODO
		//on hover, add trashcan
		//something like https://open.scdn.co/cdn/images/equaliser-animated-green.73b73928.gif
	}

	//if a track can not load
	setState(state)
	{
		switch (state){
			case States.NONE:
			{
				this.playlistOrderContainer.empty();
				this.playlistOrderContainer
					.appendChild(
						new Element("ion-text", "playlist-track-text-centered")
						.setText(this.playlistOrder));
				break;
			}
			case States.PLAYING:
			{
				this.playlistOrderContainer.empty();
				//this shits kinda a scuffed way to do this, kinda just copy and pasted some random svg i found
				//cause idk how to make svg / svg animations
				//also might just be a chrome being cringe but sometimes it randomly bugs out for a second or too
					//this happens about 50% of the time
				this.playlistOrderContainer.domElement.innerHTML = "<svg height=\"40px\" viewBox=\"0 0 100 100\">\n" +
                "<g transform=\"rotate(180 50 50)\"><rect x=\"15\" y=\"21.125\" width=\"10\" height=\"40\" fill=\"#ffffff\">\n" +
                "  <animate attributeName=\"height\" calcMode=\"spline\" values=\"38.5;57.75;7.7;38.5\" times=\"0;0.33;0.66;1\" dur=\"0.9615384615384615s\" keySplines=\"0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1\" repeatCount=\"indefinite\" begin=\"-0.7211538461538461s\"></animate>\n" +
                "</rect><rect x=\"35\" y=\"21.125\" width=\"10\" height=\"40\" fill=\"#ffffff\">\n" +
                "  <animate attributeName=\"height\" calcMode=\"spline\" values=\"38.5;57.75;7.7;38.5\" times=\"0;0.33;0.66;1\" dur=\"0.9615384615384615s\" keySplines=\"0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1\" repeatCount=\"indefinite\" begin=\"-0.4807692307692307s\"></animate>\n" +
                "</rect><rect x=\"55\" y=\"21.125\" width=\"10\" height=\"40\" fill=\"#ffffff\">\n" +
                "  <animate attributeName=\"height\" calcMode=\"spline\" values=\"38.5;57.75;7.7;38.5\" times=\"0;0.33;0.66;1\" dur=\"0.9615384615384615s\" keySplines=\"0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1\" repeatCount=\"indefinite\" begin=\"-0.24038461538461536s\"></animate>\n" +
                "</rect><rect x=\"75\" y=\"21.125\" width=\"10\" height=\"40\" fill=\"#ffffff\">\n" +
                "  <animate attributeName=\"height\" calcMode=\"spline\" values=\"38.5;57.75;7.7;38.5\" times=\"0;0.33;0.66;1\" dur=\"0.9615384615384615s\" keySplines=\"0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1\" repeatCount=\"indefinite\" begin=\"0s\"></animate>\n" +
                "</rect></g>\n" +
                "</svg>";


				break;
			}
			case States.PAUSED:
			{
				this.playlistOrderContainer.empty();
				const svg = new SVGElement("svg").setViewbox(0,0,25,25);
				svg.appendChild(new SVGElement('path', 'playlist-playingbutton'));

				this.playlistOrderContainer
					.appendChild(
						new Element("ion-icon")
						.setStyles({width : "27px", height : "24px"})
							.appendChild(svg));

				break;
			}
			case States.LOADING:
			case States.FETCHING:
			{
				this.playlistOrderContainer.empty();
				this.playlistOrderContainer
					.appendChild(new Element("ion-element", "playlist-spinner-mini"));
				break;
			}
		}
	  }
}

class PlayButton
{
	constructor()
	{
		this.element = new Element('ion-button', "playlist-playbutton");
		this.svg = new SVGElement('svg', "playlist-playbutton-background");
		this.svg.setViewbox(-6, -6, 36, 36);

		this.element.appendChild(new Element("ion-icon").appendChild(this.svg));
		this.createPlaySVG();

		this.element.on('click', (e) => {
			if(myPage.manager)
			{
				myPage.manager.toggleOrPlay();
			}
		});
	}

	createPlaySVG()
	{
		this.svg.empty();
		this.svg.appendChild(new SVGElement('path', 'playlist-playingbutton'));
	}

	createPauseSVG()
	{
		this.svg.empty();
		this.svg.appendChild(new SVGElement("rect")
			.setAttributes({x : 5, y : 3, width : 4, height: 18, fill : "white"}));
		this.svg.appendChild(new SVGElement("rect")
			.setAttributes({x : 15, y : 3, width : 4, height: 18, fill : "white"}));
	}

}

var myPage = new PlaylistPage();

PageManager.registerPage(myPage);

window.importPlaylist = async function(platform, id){
	const resp = await fetch('/api/playlist/import', {headers: {authorization: localStorage.token}, body: JSON.stringify({platform, id}), method: 'POST'});
	const body = resp.body.getReader();
	const decoder = new TextDecoder('utf-8');
	var buffer = "";
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

					throw e;
				}

				if(json.id)
					client.navigate({page: 'playlist', data: {id: json.id}});
				console.log(json);
			}

			buffer = buffer.substring(i + 1);
			i = buffer.indexOf('\n');
		}

		if(done)
			break;
	}
};

window.concatenatePlaylist = async function(pid, platform, id){
	const resp = await fetch('/api/playlist/concat/' + pid, {headers: {authorization: localStorage.token}, body: JSON.stringify({platform, id}), method: 'POST'});
	const body = resp.body.getReader();
	const decoder = new TextDecoder('utf-8');
	var buffer = "";
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

					throw e;
				}

				if(json.id)
					client.navigate({page: 'playlist', data: {id: json.id}});
				console.log(json);
			}

			buffer = buffer.substring(i + 1);
			i = buffer.indexOf('\n');
		}

		if(done)
			break;
	}
};

window.addSong = async function(playlist, platform, id){
	return await fetch('/api/playlist/' + playlist + '/tracks', {headers: {authorization: localStorage.token}, body: JSON.stringify(
		{
			platform,
			id
		}
	), method: 'POST'});
};

window.createPlaylist = async function(title, description, privacy = 0){
	const resp = await fetch('/api/playlist', {headers: {authorization: localStorage.token}, body: JSON.stringify(
		{
			title,
			description,
			privacy
		}
	), method: 'POST'});

	const data = await resp.json();

	client.navigate({page: 'playlist', data: {id: data.id}});
}