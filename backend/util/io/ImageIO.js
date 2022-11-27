const sharp = require("sharp");

async function processAvatar(buffer){
	const img = sharp(buffer);

	var metadata;

	try{
		metadata = await img.metadata();
	}catch(e){
		throw e;
	}

	const min = Math.min(metadata.height, metadata.width);

	return await img.extract({
		left: Math.floor((metadata.width - min) / 2),
		top: Math.floor((metadata.height - min) / 2),
		width: min,
		height: min
	}).resize(256, 256);
}

module.exports.loadImage = async function(buffer){
	return await processAvatar(buffer);
};

module.exports.toPNG = async function(image){
	return await image.png().toBuffer();
};

module.exports.toWebP = async function(image){
	return await image.webp().toBuffer();
};