const StreamData = require('./StreamData');

module.exports = async function(stream, limit){
	return (await StreamData(stream, limit)).toString();
};