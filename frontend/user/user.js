import './user.css'

class UserPage extends Page{
	constructor(){
		super();
		this.userContainer = new Element("ion-user-container");
		this.element.appendChild(this.userContainer);
		this.profileInfoContainer = new Element("ion-profile-info-container");
		this.userContainer.appendChild(this.profileInfoContainer);
		this.profilePictureContainer = new Element("ion-profile-picture-container");
		this.profilePicture = new Element("img");
		this.profilePictureContainer.appendChild(this.profilePicture);
		this.profileInfoContainer.appendChild(this.profilePictureContainer);
		this.descContainer = new Element("ion-desc-container");
		this.profileInfoContainer.appendChild(this.descContainer);
		this.usernameText = new Element("ion-username-text");
		this.descContainer.appendChild(this.usernameText);
		this.descText = new Element("ion-desc-text");
		this.descContainer.appendChild(this.descText);
		this.playlistsContainer = new Element("ion-container").setStyle('flex-direction', 'column');
		this.element.appendChild(this.playlistsContainer);
	}

	createPlaylistSlide(container, title, objArr){
		container.appendChild(new Element("ion-title").setText(title).setClass("playlist-title"));

		const seeAllButton = new Element("ion-button").setClass("see-all").setText("See All").setStyle("float", "right");
		container.appendChild(seeAllButton);
		const playlistContainer = new Element("ion-playlist-list-container");

		seeAllButton.isExpanded = false;
		seeAllButton.playlistContainer = playlistContainer;
		seeAllButton.on("click", () =>
		{
			if (seeAllButton.isExpanded)
			{
				seeAllButton.setText("See All");
				seeAllButton.isExpanded = false;
				playlistContainer.setStyle("height", "255px");} //260px is also hard coded but fits one "row"
				//todo if you want to use this design, the vertical scrolling is pretty annoying because
				//it gets in the way of things, so it would be better if we make it flex-flow coulmn wrap and ajust based
			//on width instead of height
			else
			{
				seeAllButton.setText("See Less");
				seeAllButton.isExpanded = true;
				playlistContainer.setStyle("height", "1000px");
				//1000px is just hardcoded, would probably need to do some math to figure out the correct amount
			}
		});

		container.appendChild(playlistContainer);

		for (let i = 0; i < objArr.length; i++)
		{
			const a = new Element("a").setAttribute("href", "/playlist/" + objArr[i].id);

			if(objArr[i].thumbnail)
				a.appendChild(new Element("img").setAttribute("src", objArr[i].thumbnail));
			else{
				const svg = new SVGElement('svg');
				const path = new SVGElement('path');

				svg.setViewbox(0, 0, 80, 81);
				svg.appendChild(path);

				a.appendChild(svg);
			}

			a.on('click', (e) => {
				e.preventDefault();

				client.navigate({page: 'playlist', data: {id: objArr[i].id}});
			});

			playlistContainer
				.appendChild(
					new Element("ion-playlist-container")
						.appendChild(
							a,
							new Element("ion-text").setClass("center").setText(objArr[i].title))
				);
		}
	}

	async loadPlaylists(id){
		var results;

		try{
			results = await client.load(this, "/api/user/" + id + '/playlists');
		}catch(e){
			if(e == null)
				return;
			throw e;
		}

		let playlistArr = [];

		for(const playlistObj of results.body){
			if (playlistObj.thumbnail)
			{
				playlistObj.thumbnail = "//cdn." + location.host + "/playlists/" + playlistObj.thumbnail + ".webp"
			}

			playlistArr.push(playlistObj);
		}

		this.createPlaylistSlide(this.playlistsContainer, "Playlists", playlistArr);
	}

	navigated(endpoint)
	{
		if(endpoint.id == '@me')
			endpoint.id = client.account.id;
		const thisElem = this;
		let pageUsername = "User Page";

		this.playlistsContainer.empty();

		client.load(this, "/api/user/" + endpoint.id)
			.then((resp) =>
			{
				const data = resp.body;
				if (data.error)
				{
					client.navigate({page: "error", data: {message : resp.status + " " + data.error}});
				}
				else
				{
					let {username, avatar_id, description} = data;
					console.log(data);

					this.profilePictureContainer.empty();

					if (avatar_id)
					{
						thisElem.profilePicture.setAttribute("src", "//cdn." + location.host + "/avatars/" + avatar_id + ".webp");
						this.profilePictureContainer.appendChild(this.profilePicture);
					}else{
						const svg = new SVGElement('svg');
						const path = new SVGElement('path');

						svg.setViewbox(0, 0, 18, 20);
						svg.appendChild(path);
						this.profilePictureContainer.appendChild(svg);
					}

					thisElem.usernameText.setText(username);
					if(description)
					{
						thisElem.descText.setText("\"" + description + "\"");
					}
				}
			})
			.catch(
				(e) => {client.navigate({page: "error", data: {message : e.message}});});
		this.loadPlaylists(endpoint.id);

		//doesnt work atm because this isnt an async function, framework would be updated more l8r
		return {title: pageUsername, url: '/user/' + endpoint.id , endpoint: endpoint};
	}


	hidden(){
		console.log("hidden");
	}

	parse(path){
		//debugger;
		if(path.length == 1) {
			return {
				id: path[0]
			};
		}
	}

	get name(){
		return 'user';
	}

	get baseURL(){
		return '/user';
	}
}

PageManager.registerPage(new UserPage());

window.chooseProfilePicture = function(){
    const element = new Element('input').setAttributes({type: 'file', accept: 'image/*'});

    element.domElement.click();

    element.on('change', (file) => {
        var input = file.target;
        var reader = new FileReader();

        reader.onload = () => {
            var data = reader.result.split(',');

            if(!data[1])
                console.error('Could not load the file');
            data = data[1];

            if(data.length > 990000)
                console.warn('Profile picture may be too big! Trying anyway...');
            client.request('/api/account', {body: {avatar: data}, method: 'PATCH'}).then(resp => resp.json()).then((data) => {
                if(data.error)
                    console.error(data.error);
                else
                    client.navigate({page: 'user', data: {id: data.id}});
            });
        };

        reader.readAsDataURL(input.files[0]);
    });
};