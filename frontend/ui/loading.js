import './loading.css'

class Loading{
	constructor(isText){
		this.container = new Element('ion-loading-container');
		this.shine = new Element('ion-loading-shine');
		this.shine.appendChild(new Element('ion-loading-shine-first'), new Element('ion-loading-shine-last'));
		this.container.appendChild(this.shine);

		if(isText)
			this.container.addClass('text');
	}
}

export default {
	createLoadingText(){
		return new Loading(true).container;
	},

	createLoading(){
		return new Loading().container;
	}
};