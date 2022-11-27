const StringCheck = require("../../util/StringCheck");
const db = require("../../db/Database");

const {StreamError} = require("../../Errors");

module.exports = {
	api: {
		path: {
			max: 1,
			min: 0
		},

		requires: {
			authorization: true,
			body: true
		},

		async handle(stream)
		{
			const {id} = stream.body;
			let user;
			try
			{
				user = await db.user.getById(id);
			}
			catch (e)
			{
				Logger.log("DB ERROR", e);
				stream.error(StreamError.DATABASE_ERROR);
				return;
			}
			if (!user)
			{
				stream.error(StreamError.NOT_FOUND);
				return;
			}
			if (user.friends.includes(stream.client.id))
			{
				stream.error(StreamError.ALREADY_FRIENDS);
				return;
			}

			if (stream.request.method === "POST")
			{
				//if current user already has a friend request from the user he is trying to request
				//todo this could possibly create some atomic issues where if they both send friend requests at the same time
				// both will have a pending on it
				if (stream.client.friend_requests.includes(stream.client.id))
				{
					try
					{
						await db.user.addFriend(stream.client, user);
						await db.user.removeFriendRequest(stream.client, user.id);
						await db.user.removeFriendRequest(user, stream.client.id);
					}
					catch (e)
					{
						Logger.log("DB ERROR", e);
						stream.error(StreamError.DATABASE_ERROR);
						return;
					}

					stream.setStatus(200).end({message : "now friends"});
					return;
				}

				try
				{
					await db.user.addFriendRequest(user, stream.client.id);
				}
				catch (e)
				{
					Logger.log("DB ERROR", e);
					stream.error(StreamError.DATABASE_ERROR);
					return;
				}
				stream.setStatus(200).end({message : "request sent"});
			}
			else if (stream.request.method === "DELETE")
			{
				try
				{
					await db.user.removeFriendRequest(user, stream.client.id);
				}
				catch (e)
				{
					Logger.log("DB ERROR", e);
					stream.error(StreamError.DATABASE_ERROR);
					return;
				}
				stream.setStatus(200).end({message : "request deleted"});
			}
			else
			{
				stream.error(StreamError.METHOD_NOT_ALLOWED);
			}

		}
	}
}