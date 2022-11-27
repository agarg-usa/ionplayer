const db = require("../backend/db/Database");
const Playlist = require("../backend/db/Playlist");
(async function ()
{
	/*
	console.log(await require("../backend/source/youtube").get("a"));
	console.log(await require("../backend/db/Database").user.getById("epic"));
	console.log(await require("../backend/source/youtube").playlistOnce("asdf",null));
	 */

	const myPlaylist = await db.playlist.getById("5fe7d64d93ce201d5f832c3f");
	await db.playlist.addOneSong(myPlaylist, "i love gaming");
	console.log(myPlaylist);
})();

// let epic = {};
// let nonepic = {cringe : epic.epic};
// console.log(JSON.stringify(nonepic));
// console.log(JSON.stringify());
