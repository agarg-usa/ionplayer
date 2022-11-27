class Thumbnail{
	constructor(width, height, url){
		this.width = width || 0;
		this.height = height || 0;
		this.url = url || null;
	}
}

class Result{
	constructor(
		author_name, author_avatar,
		title, thumbnails, duration, id, published_date,
		unplayable,
		streams, volume = 1){
		this.author_name = author_name;
		this.author_avatar = author_avatar;
		this.title = title;
		this.thumbnails = thumbnails;
		this.duration = duration;
		this.id = id;
		this.published_date = published_date;
		this.unplayable_reason = unplayable;
		this.streams = streams;
		this.volume = volume;
	}

	publicEntries(){
		return {
			author_name: this.author_name,
			author_avatar: this.author_avatar,
			title: this.title,
			thumbnails: this.thumbnails,
			duration: this.duration,
			id: this.id,
			/* exists only when API Manager sets this on return */
			platform: this.platform
		};
	}

	streamEntries(){
		return {
			author_name: this.author_name,
			author_avatar: this.author_avatar,
			title: this.title,
			thumbnails: this.thumbnails,
			duration: this.duration,
			id: this.id,
			unplayable_reason: this.unplayable_reason,
			streams: this.streams,
			volume: this.volume,
			/* exists only when API Manager sets this on return */
			platform: this.platform
		};
	}
}

Result.Unplayable = class{
	constructor(reason){
		this.unplayable_reason = reason;
	}

	publicEntries(){
		return {};
	}

	streamEntries(){
		return this;
	}
};

Result.Streams = class{
	constructor(unplayable, streams, volume = 1){
		this.unplayable_reason = unplayable;
		this.streams = streams;
		this.volume = volume;
	}

	publicEntries(){
		return {};
	}

	streamEntries(){
		return this;
	}
};

Result.YYMMDD = function(str){
	str = str.split('-');

	var y, m = 0, d = 0;

	y = parseInt(str[0], 10);

	if(!Number.isFinite(y))
		return -1;
	if(str.length > 0){
		m = parseInt(str[1], 10);

		if(!Number.isFinite(m))
			return -1;

		if(str.length > 1){
			d = parseInt(str[2], 10);

			if(!Number.isFinite(d))
				return -1;
		}
	}

	const date = new Date(0);

	date.setFullYear(y);
	date.setMonth(m - 1);
	date.setDate(d);

	return date.getTime();
}

Result.Thumbnail = Thumbnail;

module.exports = Result;