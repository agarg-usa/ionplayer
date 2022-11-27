const Cache = require("../backend/db/Cache");
const db = require("../backend/db/Database");
const Playlist = require("../backend/db/Playlist");

cringe = async function() {

	console.log(await db.cache.getByIdentifier(Cache.YOUTUBE, "dQw4w9WgXcQ"));


/*
	let playlist = new Playlist("title" , "desc", 3, "");
	playlist = await db.playlist.add(playlist);
	console.log(playlist);
	console.log(await db.playlist.getById(playlist._id));
 */
};
cringe();

//  fetch("/api/v0/playlist/create",
//  {method: 'POST', body: JSON.stringify(
// {title: 'My Music', description : "desk", privacy : 0})})
//  .then(resp => resp.json()).then(console.log);
//
// fetch("/api/playlist/create",
// 	{
// 		headers: {authorization: "ELDvf9+EPWIySfC0HQfiBop7hreczQmRvxP9gdolXxkbvNcmYnLLRPmN6MI+X/Njx5s9aXfMGP+NpiQHXypUQA=="},
// 		method: "POST",
// 		body : JSON.stringify(
// 			{title: 'My Music', description : "desk", privacy : 0}
// 		)
// 	})
// 	.then(resp => resp.json()).then(console.log);
