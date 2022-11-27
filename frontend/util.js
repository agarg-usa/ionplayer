export function secondsToTimestamp(sec)
{
	var min = sec / 60;
	var hr = min / 60;

	sec = Math.floor(sec) % 60;
	min = Math.floor(min) % 60;
	hr = Math.floor(hr);

	var str = [];

	if(hr)
		str.push(hr);
	str.push((min < 10) ? '0' + min : min);
	str.push((sec < 10) ? '0' + sec : sec);

	return str.join(':');
}

export const monthArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function bestThumbnail(arrOfThumbnail, lowerBound = 150)
{
	let bestURL;
	let bestRes = 0;
	for(const thumbnail of arrOfThumbnail)
	{
		if(thumbnail.width > bestRes)
		{
			bestRes = thumbnail.width;
			bestURL = thumbnail.url;
		}
		if(thumbnail.width > lowerBound)
		{
			break;
		}
	}

	return bestURL;
}