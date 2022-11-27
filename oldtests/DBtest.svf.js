const User = require("./User-class.svf");
const mongo = require("./db.svf");

async function test()
{
	const test = await mongo.getUserById("5fd559cfb31f2805b51ffdc4");
	console.log(test);
}

test();


const myUser = new User("epic@gmail.com", "slayer");

mongo.addUser(myUser).then(() => {console.log(myUser)});

// module.exports = {
// 	async handleRequest(req, {path, query}, resp){
// 		console.log(req);
// 		console.log(path);
// 		console.log(query.get("a"));
// 		console.log(resp);
//
// 		resp.writeHead(200);
// 		resp.end();
// 	}
// }
//
// //to start a mongodb server:
// //cd C:\Program Files\MongoDB\Server\4.2\bin
// //mongod -dbpath (db folder here)
// ///https://stackoverflow.com/questions/20796714/how-do-i-start-mongo-db-from-windows
//
// const MongoClient = require("mongodb").MongoClient;
//
// const url = "mongodb://localhost:27017/mydb";
//
//
// class Database
// {
// 	constructor(urlI = url)
// 	{
// 		this.MongoClient = MongoClient;
//
// 		this.MongoClient.connect(urlI, (err, db) =>
// 		{
// 			if (err) throw err;
//
// 			this.db = db;
// 			this.url = urlI;
// 		});
// 	}
//
// 	//only use once if you want to  to initialize your local database
// 	initialize()
// 	{
// 		let dbo = db.db("Cario");
// 		dbo.createCollection("Users", function (err, res) {
// 			if (err)
// 			{
// 				console.error(err);
// 			}
// 			console.log("Users collection created.")
// 		});
// 	}
//
//
// }
//
// //console.log(MongoClient);
// //
// // MongoClient.connect(url,
// //	 function (err, db)
// //	 {
// //		 if (err) throw err;
// //		 console.log("db created!");
// //		 const dbo = db.db("testDB");
// //		 dbo.createCollection("testCollection",
// //			 function(err,res)
// //			 {
// //				 if (err) throw err;
// //				 console.log("Collection Created!");
// //				 db.close();
// //			 });
// //	 }
// // );
//
//
//
