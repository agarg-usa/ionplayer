const HARD_LIMIT = 1000000;

module.exports = async function(stream, limit = HARD_LIMIT){
	const chunks = [];
	var total = 0;

	for await(const chunk of stream){
		chunks.push(chunk);
		total += chunk.length;

		if(total > limit)
			return null;
	}

	return Buffer.concat(chunks);
};