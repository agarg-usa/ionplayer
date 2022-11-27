const themes = new (class{
	constructor(){
		this.knownThemes = {
			darktheme_white: 'darktheme_white',
			lighttheme_white: 'lighttheme_white',
			darkbluetheme_white: 'darkbluetheme_white',
			darktheme_dark: 'darktheme_dark'
		};

		this.load();
	}

	set(theme){
		if(this.knownThemes.hasOwnProperty(theme)){
			document.body.classList.value = theme;

			localStorage.theme = theme;
		}
	}

	load(){
		if(localStorage.theme && this.knownThemes.hasOwnProperty(localStorage.theme))
			this.set(localStorage.theme);
		else
			this.set('darktheme_white');
	}
});

window.themes = themes;