import './toast.css'

class Toast{
	constructor(){
		this.element = new Element('toast');
		this.message = new Element('ion-text', 'toast-message');
		this.element.appendChild(this.message);
		this.progress = null;
		this.show_timeout = null;
	}

	setProgress(p){
		if(!this.progress){
			this.progress = new Element('toast-progress');
			this.element.appendChild(this.progress);
		}

		this.progress.setAttribute('width', (100 * p) + '%');
	}

	setText(text){
		this.message.setText(text);
	}
}

function setToastPosition(toast, index){
	toast.element.setStyle('transform', 'translateY(' + (index * -64) + 'px)');
}

const toasts = new (class{
	constructor(){
		this.container = new Element('toast-container');
		this.showingToasts = [];
	}

	createToast(){
		return new Toast();
	}

	hideToast(toast){
		if(toast.show_timeout){
			clearTimeout(toast.show_timeout);

			toast.show_timeout = null;
		}

		for(var i = 0; i < this.showingToasts.length; i++)
			if(this.showingToasts[i] == toast){
				this.showingToasts.splice(i, 1);

				for(; i < this.showingToasts.length; i++)
					setToastPosition(this.showingToasts[i], i);
				toast.element.setStyle('transform', 'translateY(100px)');
				toast.element.setStyle('z-index', '-1');

				toast.remove_timeout = setTimeout(() => {
					toast.remove_timeout = null;

					this.container.removeChild(toast.element);
				}, 200);

				break;
			}
	}

	showToast(toast, dur){
		if(toast.remove_timeout){
			clearTimeout(toast.remove_timeout);

			toast.remove_timeout = null;

			toast.element.setStyle('transform', '');
			toast.element.domElement.offsetWidth;
			toast.element.setStyle('z-index', '');
		}

		if(toast.show_timeout){
			clearTimeout(toast.show_timeout);

			toast.show_timeout = null;
		}else{
			this.showingToasts.push(toast);
			this.container.appendChild(toast.element);

			setToastPosition(toast, this.showingToasts.length - 1);

			toast.element.setStyle('animation', '');
			toast.element.domElement.offsetWidth;
			toast.element.setStyle('animation', 'toast-enter 0.2s ease');
		}

		if(dur)
			toast.show_timeout = setTimeout(() => {
				toast.show_timeout = null;

				this.hideToast(toast);
			}, dur);
	}

	showMessage(msg, dur){
		const toast = new Toast();

		toast.setText(msg);

		this.showToast(toast, dur);
	}
});

window.toasts = toasts;

export default toasts;