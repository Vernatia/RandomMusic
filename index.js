const { User, Server } = require('discord.io');
var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
const SQLite = require("sqlite3");
const db = new SQLite.Database('music.sqlite');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'warn';

/**
 * 
 * @param {int} min 
 * @param {int} max 
 */
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * @param {string} channelID 
 * @param {string} keyword 
 * @param {[]} rows 
 */
function outputSong(channelID, keyword, rows) {
	if (rows.length == 0) {
		bot.sendMessage({
			to: channelID,
			message: 'You have no songs tagged with the keyword "' + keyword + '"'
		});
	} else {
		let i = getRandomInt(0, rows.length);
		if (i == rows.length) {
			i = rows.length - 1;
		}
		bot.sendMessage({
			to: channelID,
			embed: {
				title: 'Song requested: "' + keyword + '"',
				color: 11111119,
				fields: [
					{
						name: 'Rythm bot:',
						value: '!play ' + rows[i].url
					}, {
						name: 'Groovy bot:',
						value: '-play ' + rows[i].url
					}, {
						name: 'Just the song:',
						value: rows[i].url
					}
				]
			}
		});
	}
}

/**
 * @param {string} channelID 
 */
function saveSong(channelID) {
	bot.sendMessage({
		to: channelID,
		message: 'Song has been saved'
	});
}

/**
 * @param {string} channelID
 * @param {[]} rows
 */
function removeSong(channelID, rows) {
	if (rows.length != 1) {
		bot.sendMessage({
			to: channelID,
			message: 'Song could not be removed'
		});
	} else {
		bot.deleteOneStatement.run(
			{
				$musicID: rows[0].id
			},
			function (err) {
				bot.sendMessage({
					to: channelID,
					message: 'Song has been removed'
				});
			}
		)
	}
}

/**
 * 
 * @param {string} channelID
 * @param {string} keyword
 * @param {[]} rows 
 */
function displaySongs(channelID, keyword, rows) {
	if (rows.length == 0) {
		bot.sendMessage({
			to: channelID,
			message: 'You have no songs tagged with the keyword "' + keyword + '"'
		});
	} else {
		var embedField = {
			name: 'URLs:',
			value: ''
		};
		for (let i = 0; i < rows.length; i++) {
			if (i > 0) embedField.value += "\n";
			embedField.value += rows[i].id + ': ' + rows[i].url;
		}

		bot.sendMessage({
			to: channelID,
			embed: {
				title: 'Items assigned to keyword "' + keyword + '"',
				color: 11111119,
				fields: [embedField]
			}
		});
	}
}

/**
 * 
 * @param {string} channelID
 * @param {[]} rows 
 */
function displayKeywords(channelID, rows) {
	if (rows.length == 0) {
		bot.sendMessage({
			to: channelID,
			message: 'You have not saved any songs'
		});
	} else {
		var embedField = {
			name: 'Keywords:',
			value: ''
		};
		for (let i = 0; i < rows.length; i++) {
			if (i > 0) embedField.value += "\n";
			embedField.value += rows[i].keyword + ' (' + rows[i].count + ' song' + (rows[i].count == 1 ? '' : 's') + ')';
		}

		bot.sendMessage({
			to: channelID,
			embed: {
				title: 'Keywords you have used:',
				color: 11111119,
				fields: [embedField]
			}
		});
	}
}

/**
 * 
 * @param {string} channelID 
 * @param {string} keyword 
 * @param {[]} rows 
 */
function clearSongs(channelID, keyword, rows) {
	if (rows.length == 0) {
		bot.sendMessage({
			to: channelID,
			message: 'You have no songs tagged with the keyword "' + keyword + '"'
		});
	} else {
		let userID = rows[0].user_id;
		bot.deleteStatement.run(
			{
				$userID: userID,
				$keyword: keyword
			},
			function (err) {
				bot.sendMessage({
					to: channelID,
					message: 'Cleared all songs assigned to keyword "' + keyword + '"'
				});
			}
		);
	}
}

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.messageIdentifier = '~';
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
	logger.info(bot.username + ' - (' + bot.id + ')');
	
	db.serialize(function() {
		bot.dbExists = false;
		db.each("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'music'", function(err, row) {
			if (row.count == 0) {
				db.run("CREATE TABLE music (id INT PRIMARY KEY AUTOINCREMENT, user_id TEXT, keyword TEXT, url TEXT)");
			}

			bot.dbExists = true;
		});

		// create a bunch of default commands as needed
		bot.insertStatement = db.prepare("INSERT OR REPLACE INTO music (user_id, keyword, url) VALUES ($userID, $keyword, $url);");
		bot.deleteStatement = db.prepare("DELETE FROM music WHERE user_id = $userID AND keyword = $keyword");
		bot.deleteOneStatement = db.prepare("DELETE FROM music WHERE id = $musicID");
		bot.selectStatement = db.prepare("SELECT * FROM music WHERE user_id = $userID AND keyword = $keyword;");
		bot.selectOneStatement = db.prepare("SELECT * FROM music WHERE user_id = $userID AND id = $musicID;");
		bot.selectKeywordsStatement = db.prepare("SELECT keyword, COUNT(*) AS count FROM music WHERE user_id = $userID GROUP BY keyword");
	});

	bot.clearMusic = function (channelID, userID, keyword) {
		bot.selectStatement.all(
			{
				$userID: userID,
				$keyword: keyword
			},
			function (err, rows) {
				clearSongs(channelID, keyword, rows);
			}
		);
		return false;
	};

	bot.getMusic = function (channelID, userID, keyword) {
		bot.selectStatement.all(
			{
				$userID: userID,
				$keyword: keyword
			}, function (err, rows) {
				outputSong(channelID, keyword, rows);
			}
		);
		return false;
	};
	
	bot.setMusic = function (channelID, userID, keyword, url) {
		bot.insertStatement.run(
			{
				$userID: userID,
				$keyword: keyword,
				$url: url
			},
			function (err) {
				saveSong(channelID);
			}
		)
		return false;
	};
	
	bot.removeMusic = function (channelID, userID, musicID) {
		bot.selectOneStatement.all(
			{
				$userID: userID,
				$musicID: musicID
			}, function (err, rows) {
				removeSong(channelID, rows);
			}
		);
		return false;
	};
	
	bot.listMusic = function(channelID, userID, keyword) {
		bot.selectStatement.all(
			{
				$userID: userID,
				$keyword: keyword
			},
			function (err, rows) {
				displaySongs(channelID, keyword, rows);
			}
		);
		return false;
	};
	
	bot.listKeywords = function(channelID, userID) {
		bot.selectKeywordsStatement.all(
			{
				$userID: userID
			},
			function (err, rows) {
				displayKeywords(channelID, rows);
			}
		);
		return false;
	};
});

/**
 * @param string user			The name of the user who typed the message
 * @param string userID			The ID of the user who typed the message
 * @param string channelID		The ID of the channel the message is in
 * @param string message		The message the user typed
 * @param WebSocketEvent evt	A thingamabob
 */
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == bot.messageIdentifier) {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
		var keyword = args[1];
		var url = args[2];
		
        switch(cmd) {
			case 'clear':
				if (args.length != 2 || !keyword.trim()) {
					bot.sendMessage({
						to: channelID,
						message: 'Usage: ' + bot.messageIdentifier + 'clear <keyword>'
					});
				} else {
					bot.clearMusic(channelID, userID, keyword);
				}
				break;
			case 'help':
				bot.sendMessage({
					to: channelID,
					embed: {
						title: 'Actions that can be performed',
						description: 'These are the actions that the ' + bot.username + ' bot can perform',
						color: 11111119,
						fields: [
							{
								'name': 'Clear',
								'value': 'Clears all songs assigned to a keyword' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'clear <keyword>'
							}, {
								'name': 'Help',
								'value': 'Displays all the commands' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'help'
							}, {
								'name': 'Keywords',
								'value': 'Displays all keywords you have assigned songs to' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'keywords'
							}, {
								'name': 'List',
								'value': 'Displays all songs and IDs assigned to a keyword' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'list <keyword>'
							}, {
								'name': 'Ping',
								'value': 'Returns a message to test for connectivity' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'ping'
							}, {
								'name': 'Play',
								'value': 'Returns a singular, random, options assigned to a keyword' + "\n" 
									+ 'There will be options for Rythm and Groovy bot commands for ease of use' + "\n"
									+ 'Usage: ' + bot.messageIdentifier + 'play <keyword>'
							}, {
								'name': 'Store',
								'value': 'Saves a song against a keyword' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'store <keyword> <url>'
							}, {
								'name': 'Remove',
								'value': 'Removes a song' + "\n" 
									+ 'Usage: ' + bot.messageIdentifier + 'remove <id>' + "\n"
									+ 'The ID can be obtained from List'
							}
						]
					}
				});
				break;
			case 'keyword':
			case 'keywords':
				if (args.length != 1) {
					bot.sendMessage({
						to: channelID,
						message: 'Usage: ' + bot.messageIdentifier + 'keyword'
					});
				} else {
					bot.listKeywords(channelID, userID);
				}
				break;
			case 'list':
				if (args.length != 2 || !keyword.trim()) {
					bot.sendMessage({
						to: channelID,
						message: 'Usage: ' + bot.messageIdentifier + 'list <keyword>'
					});
				} else {
					bot.listMusic(channelID, userID, keyword);
				}
				break;
            case 'ping':
				bot.sendMessage({
                    to: channelID,
                    message: '!play <https://www.youtube.com/watch?v=dQw4w9WgXcQ>'
				});
				break;
			case 'play':
				if (args.length != 2 || !keyword.trim()) {
					bot.sendMessage({
						to: channelID,
						message: 'Usage: ' + bot.messageIdentifier + 'play <keyword>'
					});
				} else {
					bot.getMusic(channelID, userID, keyword);
				}
				break;
			case 'store':
				if (args.length != 3 || !keyword.trim() || !url.trim()) {
					bot.sendMessage({
						to: channelID,
						message: 'Usage: ' + bot.messageIdentifier + 'store <keyword> <url>'
					});
				} else {
					bot.setMusic(channelID, userID, keyword, url);
				}
				break;
			case 'remove':
				if (
					args.length != 2
					|| !parseInt(args[1])
					|| parseInt(args[1]).toString() != args[1]
				) {
					bot.sendMessage({
						to: channelID,
						message: 'Usage: ' + bot.messageIdentifier + 'remove <id>'
					});
				} else {
					bot.removeMusic(channelID, userID, args[1]);
				}
				break;
			default:
            	break;
        }
	}
});
