var Prefs = {};

function DBClass() {
}

	/*
	 // CRAP.  All that and it doesn't look like palm has implemented the changeVersion method
	 // for db objects yet.  Which means, I have to manage my schema changes manually.  BOOO.
	var currentVerIndex = 0;
	do {
		var ver = this.dbVersions[currentVerIndex];
		try {
			this.db = openDatabase(this.dbName, ver.version);
		} catch (e) {
			if (e.code === e.INVALID_STATE_ERR) {
				currentVerIndex++;
			} else {
				Mojo.Log.error("Exception opening db: %s", e.message);
				// setTimeout only works with assistants
				//setTimeout("Util.showError('Exception opening db', '"+e.message+"');", 1000);
				currentVerIndex = 99;
			}
		}
	} while (!this.db && currentVerIndex <= this.dbVersions.length);

	Mojo.Log.error("db:%j", this.db);

	if (currentVerIndex > 0) {
		ver = this.dbVersions[currentVerIndex];
		var latestVersion = this.dbVersions[0].version;

		Mojo.Log.error("We need to upgrade from v%s using [%s]", ver.version, ver.migrationSql);
		Mojo.Log.error("version:%s, latestVersion:%s", ver.version, latestVersion);
		Mojo.Log.error("migrationSql.length: %s", ver.migrationSql.length);
		this.db.changeVersion(ver.version, latestVersion,
			// callback
			function(transaction) {
				Mojo.Log.error("Upgrading db");
				for (var i=0; i<ver.migrationSql.length; i++) {
					transaction.executeSql(ver.migrationSql[i], [],
						function(transaction, results) {
							Mojo.Log.error("Successfully executed migration statement %d", i);
						},
						function(transaction, error) {
							Mojo.Log.error("Error executing migration statement %d: %j", i, error);
						});
				}
				Mojo.Log.error("Finished upgrading db");
			},
			//errorCallback
			function(transaction, error) {
				Mojo.Log.error("Error upgrading db: %j", error);
			},
			// successCallback
			function() {
				Mojo.Log.info("Migration complete!");
				this.loadFeeds();
			}.bind(this)
		);
		Mojo.Log.error("changeVersion done");
	} else {
		this.initDB(this.loadFeeds.bind(this));
	}
	*/

DBClass.prototype.waitForFeeds = function(callback) {
	this.callback = callback;
	this.readPrefs();

	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "updateLoadingMessage", message: "Opening Database"});
	this.db = openDatabase(this.dbName, "0.2"); // can't change the version until db.changeVersion works
	if (!this.db) {
		// setTimeout only works with assistants
		//this.controller.window.setTimeout(Util.showError.bind(this, 'Error opening db', 'There was an unknown error opening the feed db'), 1000);
		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "updateLoadingMessage", message: "Error Opening Database"});
		Mojo.Log.error("Error opening feed db");
	} else {
		this.db.transaction(function(transaction) {
			transaction.executeSql("SELECT version FROM version", [],
				function(transaction, results) {
					var version;
					if (results.rows.length > 0) {
						version = results.rows.item(0).version;
					}
					Mojo.Log.info("DB Version: %s", version);
					// check if version is latest
					if (this.dbVersions[0].version === version) {
						Mojo.Controller.getAppController().sendToNotificationChain({
							type: "updateLoadingMessage", message: "Loading"});
						this.loadFeeds();
					} else {
						Mojo.Controller.getAppController().sendToNotificationChain({
							type: "updateLoadingMessage", message: "Upgrading Database"});
						// dbInfo.version = this.dbVersions[0].version;
						// dbCookie.put(dbInfo);
					}
				}.bind(this),
				function(transaction, error) {
					Mojo.Log.error("Error getting db version: %j", error);
					// call init
					Mojo.Controller.getAppController().sendToNotificationChain({
						type: "updateLoadingMessage", message: "Creating Database"});
					this.initDB();
				}.bind(this));
		}.bind(this));
	}
};

DBClass.prototype.dbName = "ext:PrePodFeeds";

// db version number, followed by the sql statements required to bring it up to the latest version
DBClass.prototype.dbVersions = [
	{version: "0.4", migrationSql: []}
	//{version: "0.2", migrationSql: ["ALTER TABLE feed ADD COLUMN replacements TEXT"]}
];


DBClass.prototype.initDB = function() {
	var createFeedTable = "CREATE TABLE IF NOT EXISTS 'feed' " +
	                      "(id INTEGER PRIMARY KEY, " +
	                      "displayOrder INTEGER, " +
	                      "title TEXT, " +
	                      "url TEXT, " +
	                      "albumArt TEXT, " +
	                      "autoDelete BOOLEAN, " +
	                      "autoDownload BOOLEAN, " +
	                      "maxDownloads INTEGER, " +
	                      "interval INTEGER, " +
	                      "lastModified TEXT, " +
						  "replacements TEXT, " +
						  "maxDisplay INTEGER)";
	var createEpisodeTable = "CREATE TABLE IF NOT EXISTS 'episode' " +
	                         "(id INTEGER PRIMARY KEY, " +
							 "feedId INTEGER, " +
							 "displayOrder INTEGER, " +
	                         "title TEXT, " +
	                         "description TEXT, " +
	                         "enclosure TEXT, " +
	                         "guid TEXT, " +
	                         "link TEXT, " +
	                         "position REAL, " +
	                         "pubDate TEXT, " +
	                         "downloadTicket INTEGER, " +
	                         "downloaded BOOLEAN, " +
	                         "listened BOOLEAN, " +
	                         "file TEXT, " +
	                         "length REAL, " +
							 "type TEXT)";
	var alterFeedTable = "ALTER TABLE feed ADD COLUMN replacements TEXT";
	var alterEpisodeTable = "ALTER TABLE episode ADD COLUMN type TEXT";
	var alterFeedTable2 = "ALTER TABLE feed ADD COLUMN maxDisplay INTEGER";
	var alterFeedTable3 = "ALTER TABLE feed ADD COLUMN viewFilter TEXT";
	var alterFeedTable4 = "ALTER TABLE feed ADD COLUMN username TEXT";
	var alterFeedTable5 = "ALTER TABLE feed ADD COLUMN password TEXT";
	// should put in a line to create an 'All' and 'Favorites' playlist
	var createVersionTable = "CREATE TABLE version (version TEXT)";
	var populateVersionTable = "INSERT INTO version (version) VALUES ('0.4')";
	var allPlaylist = "INSERT INTO feed (title, url, albumArt, viewFilter) VALUES " +
	                  "('All', 'drPodder://'," +
	                  "'/var/usr/palm/applications/com.palm.drnull.prepod/images/playlist-icon.png', 'New')";
	var loadFeeds = this.loadFeeds.bind(this);
	this.db.transaction(function(transaction) {
		transaction.executeSql(createFeedTable, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table created");
			},
			function(transaction, error) {Mojo.Log.error("Error creating feed table: %j", error);});
		transaction.executeSql(createEpisodeTable, [],
			function(transaction, results) {
				Mojo.Log.info("Episode table created");
			},
			function(transaction, error) {Mojo.Log.error("Error creating episode table: %j", error);});
		transaction.executeSql(alterFeedTable2, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table altered");
				transaction.executeSql("UPDATE feed SET maxDisplay=20", [],
					function(transaction, results) {
						Mojo.Log.info("Updating maxDisplay=20");
					},
					function(transaction, error) {Mojo.Log.error("Error updating maxDisplay: %j", error);});
			},
			function(transaction, error) {
				if (error.message === "duplicate column name: maxDisplay") {
					Mojo.Log.info("Feed table previously altered");
				} else {
					Mojo.Log.error("Error altering feed table: %j", error);
				}
			});
		transaction.executeSql(alterEpisodeTable, [],
			function(transaction, results) {
				Mojo.Log.info("Episode table altered");
			},
			function(transaction, error) {
				if (error.message === "duplicate column name: type") {
					Mojo.Log.info("Feed table previously altered");
				} else {
					Mojo.Log.error("Error altering episode table: %j", error);
				}
			});
		transaction.executeSql(alterFeedTable, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table altered");
				transaction.executeSql("UPDATE feed SET maxDownloads=1", [],
					function(transaction, results) {
						Mojo.Log.info("Updating maxDownloads=1");
					},
					function(transaction, error) {Mojo.Log.error("Error updating maxDownloads: %j", error);});
			},
			function(transaction, error) {
				if (error.message === "duplicate column name: replacements") {
					Mojo.Log.info("Feed table previously altered");
				} else {
					Mojo.Log.error("Error altering feed table: %j", error);
				}
			});
		transaction.executeSql(alterFeedTable3, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table altered");
				transaction.executeSql("UPDATE feed SET viewFilter='New'", [],
					function(transaction, results) {
						Mojo.Log.info("Updating viewFilter='New'");
					},
					function(transaction, error) {Mojo.Log.error("Error updating viewFilter: %j", error);});
			},
			function(transaction, error) {
				if (error.message === "duplicate column name: viewFilter") {
					Mojo.Log.info("Feed table previously altered");
				} else {
					Mojo.Log.error("Error altering feed table: %j", error);
				}
			});
		transaction.executeSql(alterFeedTable4, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table altered");
			},
			function(transaction, error) {
				if (error.message === "duplicate column name: username") {
					Mojo.Log.info("Feed table previously altered");
				} else {
					Mojo.Log.error("Error altering feed table: %j", error);
				}
			});
		transaction.executeSql(alterFeedTable5, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table altered");
			},
			function(transaction, error) {
				if (error.message === "duplicate column name: password") {
					Mojo.Log.info("Feed table previously altered");
				} else {
					Mojo.Log.error("Error altering feed table: %j", error);
				}
			});
		transaction.executeSql(createVersionTable, [],
			function(transaction, results) {
				Mojo.Log.info("Version table created");
			},
			function(transaction, error) {
				Mojo.Log.error("Error creating version table");
			});
		transaction.executeSql(populateVersionTable, [],
			function(transaction, results) {
				Mojo.Log.info("Version table populated");
			},
			function(transaction, error) {
				Mojo.Log.error("Error populating version table");
			});
		transaction.executeSql(allPlaylist, [],
			function(transaction, results) {
				Mojo.Log.info("Created all playlist");
				loadFeeds();
			},
			function(transaction, error) {
				Mojo.Log.error("Error creating all playlist");
			});
	});
};

DBClass.prototype.loadFeeds = function() {
	var loadSQL = "SELECT * FROM feed ORDER BY displayOrder";
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "updateLoadingMessage", message: "Loading Feeds"});

	/*
	var playlist = new Feed();
	playlist.id = 1000000;
	playlist.title = "All";
	playlist.albumArt = "/var/usr/palm/applications/com.palm.drnull.prepod/images/playlist-icon.png";
	playlist.playlist = true;
	playlist.displayOrder = 0;
	playlist.feedIds = [];
	playlist.playlists = [];
	playlist.viewFilter = "New";
	playlist.details = undefined;

	feedModel.add(playlist);

	playlist = new Feed();
	playlist.id = 1000001;
	playlist.title = "Favorites";
	playlist.albumArt = "/var/usr/palm/applications/com.palm.drnull.prepod/images/playlist-icon.png";
	playlist.playlist = true;
	playlist.displayOrder = 1;
//	playlist.feedIds = [1,2,3,4,5,6,12,19];
	//playlist.feedIds = [1,2,3,7,8];
	//playlist.feedIds = [1,4,10,12];
	playlist.feedIds = [1,2,3,4,5,6,7];
	playlist.playlists = [];
	playlist.viewFilter = "New";
	playlist.details = undefined;

	feedModel.add(playlist);
	*/

	this.db.transaction(function(transaction) {
		transaction.executeSql(loadSQL, [],
			this.loadFeedsSuccess.bind(this),
			function(transaction, error) {Mojo.Log.error("Error retrieving feeds: %j", error);});
	}.bind(this));
};

DBClass.prototype.loadFeedsSuccess = function(transaction, results) {
	if (results.rows.length > 0) {
		// load the rows into the feedModel
		for (var i=0; i<results.rows.length; i++) {
			var f = new Feed(results.rows.item(i));
			if (f.replacements === null || f.replacements === undefined) {
				f.replacements = "";
			}
			f.downloading = false;
			f.downloadCount = 0;
			f.numNew = 0;
			f.numDownloaded = 0;
			f.numStarted = 0;
			f.episodes = [];
			f.guid = [];
			f.displayOrder = feedModel.items.length;
			feedModel.add(f);
		}
	}
	this.loadEpisodes();
};

DBClass.prototype.getEpisodeDescription = function(e, callback) {
	var sql = "SELECT description FROM episode WHERE id=?";
	this.db.transaction(function(transaction) {
		transaction.executeSql(sql, [e.id],
			function(transaction, results) {
				if (results.rows.length > 0) {
					var item = results.rows.item(0);
					callback(item.description);
				}
			},
			function(transaction, error) {
				Mojo.Log.error("Error retrieving episode description for %d: %j", e.id, error);
				callback("Error loading description from database.  Please restart drPodder.");
			});
	});
};

DBClass.prototype.loadEpisodes = function() {
	//var loadSQL = "SELECT * FROM episode ORDER BY displayOrder"; //feedId, displayOrder";
	var loadSQL = "SELECT id, feedId, displayOrder, title, enclosure, guid, link, position, pubDate, downloadTicket, downloaded, listened, file, length, type FROM episode ORDER BY displayOrder"; //feedId, displayOrder";
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "updateLoadingMessage",
		message: "Loading Episodes"});

	//this.startEpisodeRetrieval = (new Date()).getTime();
	this.db.transaction(function(transaction) {
		transaction.executeSql(loadSQL, [],
			this.loadEpisodesSuccess.bind(this),
			function(transaction, error) {Mojo.Log.error("Error retrieving feeds: %j", error);});
	}.bind(this));
};

DBClass.prototype.loadEpisodesSuccess = function(transaction, results) {
	//Mojo.Log.error("episodeRetrival time: %d", (new Date()).getTime() - this.startEpisodeRetrieval);
	try {
	if (results.rows.length > 0) {
		var oldFeedId = -1;
		var f = null;
		for (var i=0, len=results.rows.length; i<len; ++i) {
			var item = results.rows.item(i);
			var attempts = 0;
			var tryAgain = true;
			while (tryAgain && attempts < 5) {
				try {
					f = feedModel.getFeedById(item.feedId);
					//if (f.episodes.length < f.maxDisplay) {
					if (f) {
						var e = new Episode(item);
						e.feedObject = f;
						e.albumArt = f.albumArt;
						if (e.enclosure === "undefined") {e.enclosure = null;}
						if (e.type === "undefined") {e.type = null;}
						if (e.pubDate === "undefined" || e.pubDate === null) {e.pubDate = new Date();}
						else { e.pubDate = new Date(e.pubDate); }
						if (e.description === "undefined") {e.description = null;}
						f.addToPlaylistsTop(e);
						f.insertEpisodeTop(e);
						//f.episodes.push(e);
						//f.guid[e.guid] = e;
						//if (!e.listened) {++f.numNew;}
						//if (e.downloaded) {++f.numDownloaded;}
						if (e.position !== 0) {
							//++f.numStarted;
							if (e.length) {
								e.bookmarkPercent = 100*e.position/e.length;
							}
						}

						if (e.downloadTicket) {
							e.downloading = true;
							e.downloadActivity();
							//f.downloading = true;
							//f.downloadCount++;
							e.downloadRequest = AppAssistant.downloadService.downloadStatus(null, e.downloadTicket,
								e.downloadingCallback.bind(e));
						}

						e.updateUIElements(true);
					}
					tryAgain = false;
				} catch (episodeException) {
					Mojo.Log.error("Error adding episode(%d): %j", item.id, episodeException);
					attempts++;
					tryAgain = true;
				}
			}
		}
	} else {
		this.defaultFeeds();
	}
	feedModel.items.forEach(function(f) {
		f.sortEpisodes();
	}.bind(this));
	} catch (exceptionCaught) {
		Mojo.Log.error("Error loading episodes: %j", exceptionCaught);
	}
	//Mojo.Log.error("finished episodeRetrival time: %d", (new Date()).getTime() - this.startEpisodeRetrieval);
	this.callback();
};

DBClass.prototype.saveFeeds = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		var feed = feedModel.items[i];
		feed.displayOrder = i;
		this.saveFeed(feed, i);
	}
};

DBClass.prototype.saveFeed = function(f, displayOrder) {
	var saveFeedSQL = "INSERT OR REPLACE INTO feed (id, displayOrder, title, url, albumArt, " +
	                  "autoDelete, autoDownload, maxDownloads, interval, lastModified, replacements, maxDisplay, " +
					  "viewFilter, username, password) " +
					  "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

	if (displayOrder !== undefined) {
		f.displayOrder = displayOrder;
	}

	this.db.transaction(function(transaction) {
		if (f.id === undefined) {f.id = null;}
		if (f.playlist) {
			f.url = "drPodder://" + f.feedIds.join(",");
		}
		transaction.executeSql(saveFeedSQL, [f.id, f.displayOrder, f.title, f.url, f.albumArt,
											 (f.autoDelete)?1:0, (f.autoDownload)?1:0, f.maxDownloads, f.interval, f.lastModified, f.replacements, f.maxDisplay,
											 f.viewFilter, f.username, f.password],
			function(transaction, results) {
				Mojo.Log.error("Feed saved: %s", f.title);
				if (f.id === null) {
					f.id = results.insertId;
					feedModel.ids[f.id] = f;
					if (!f.playlist) {
						f.episodes.forEach(function(e) {
							e.feedId = f.id;
						});
					}
				}
				if (!f.playlist) {
					for (var i=0; i<f.episodes.length; i++) {
						f.episodes[i].displayOrder = i;
						this.saveEpisodeTransaction(f.episodes[i], transaction);
					}
				}
			}.bind(this),
			function(transaction, error) {
				Util.showError("Error Saving Feed", "There was an error saving feed: "+f.title);
				Mojo.Log.error("Feed Save failed: (%s), %j", f.title, error);
			});
	}.bind(this));
};

DBClass.prototype.saveEpisodeSQL = "INSERT OR REPLACE INTO episode (id, feedId, displayOrder, title, description," +
	                     "enclosure, guid, link, pubDate, position, " +
					     "downloadTicket, downloaded, listened, file, length, type) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
DBClass.prototype.saveEpisodeSQLDescription = "INSERT OR REPLACE INTO episode (id, feedId, displayOrder, title, description, " +
	                     "enclosure, guid, link, pubDate, position, " +
					     "downloadTicket, downloaded, listened, file, length, type) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

DBClass.prototype.saveEpisode = function(e, displayOrder) {

	if (displayOrder !== undefined) {
		e.displayOrder = displayOrder;
	}

	if (e.feedId) {
		this.db.transaction(this.saveEpisodeTransaction.bind(this, e));
	}
};

DBClass.prototype.saveEpisodeTransaction = function(e, transaction) {
	var updateSQL            = "UPDATE episode SET feedId=?, displayOrder=?, title=?,                enclosure=?, guid=?, link=?, pubDate=?, position=?, downloadTicket=?, downloaded=?, listened=?, file=?, length=?, type=? WHERE id=?";
	var updateSQLDescription = "UPDATE episode SET feedId=?, displayOrder=?, title=?, description=?, enclosure=?, guid=?, link=?, pubDate=?, position=?, downloadTicket=?, downloaded=?, listened=?, file=?, length=?, type=? WHERE id=?";
	var insertSQL = "INSERT INTO episode (feedId, displayOrder, title, description, " +
	                     "enclosure, guid, link, pubDate, position, " +
					     "downloadTicket, downloaded, listened, file, length, type) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
	if (e.id === undefined) {
		transaction.executeSql(insertSQL, [e.feedId, e.displayOrder, e.title, e.description,
				  e.enclosure, e.guid, e.link, e.pubDate, e.position,
				  e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length, e.type],
			function(transaction, results) {
				Mojo.Log.info("Episode saved: %s", e.title);
				e.id = results.insertId;
				e.description = null;
			},
			function(transaction, error) {
				Mojo.Log.error("Episode Save failed: (%s), %j", e.title, error);
			});
	} else {
		var sql = updateSQL;
		var params = [e.feedId, e.displayOrder, e.title,
				  e.enclosure, e.guid, e.link, e.pubDate, e.position,
				  e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length, e.type, e.id];
		if (e.description) {
			sql = updateSQLDescription;
			params = [e.feedId, e.displayOrder, e.title, e.description,
				  e.enclosure, e.guid, e.link, e.pubDate, e.position,
				  e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length, e.type, e.id];
		}
		transaction.executeSql(sql, params,
			function(transaction, results) {
				Mojo.Log.info("Episode updated: %s", e.title);
				e.description = null;
			},
			function(transaction, error) {
				Mojo.Log.error("Episode update failed: (%s), %j", e.title, error);
			});
	}
};

DBClass.prototype.removeFeed = function(f) {
	var removeFeedSQL = "DELETE FROM feed WHERE id=?";
	var removeEpisodesSQL = "DELETE FROM episode WHERE feedId=?";

	if (f.playlist) {
		f.feedIds.forEach(function(fid) {
			feedModel.getFeedById(fid).removePlaylist(f);
		});
	} else {
		f.episodes.forEach(function(e) {
			if (e.downloading) {
				e.cancelDownload();
			}
			if (e.downloaded) {
				e.deleteFile(false);
			}
		});

		f.playlists.forEach(function(pf) {
			pf.removeFeedFromPlaylist(f);
		});
	}

	this.db.transaction(function(transaction) {
		transaction.executeSql(removeEpisodesSQL, [f.id],
			function(transaction, results) {Mojo.Log.error("Episodes removed for feed %s", f.id);},
			function(transaction, error) { Mojo.Log.error("Episodes remove failed: (%s), %j", f.id, error);});
		transaction.executeSql(removeFeedSQL, [f.id],
			function(transaction, results) {Mojo.Log.error("Feed removed: %s", f.title);},
			function(transaction, error) { Mojo.Log.error("Feed remove failed: (%s), %j", f.title, error);});
	});
};

DBClass.prototype.removeEpisode = function(episode) {
	// this functionality doesn't exist (doesn't need to either)
};

DBClass.prototype.readPrefs = function() {
	var prefsCookie = new Mojo.Model.Cookie("Prefs");
	if (prefsCookie) {
		Prefs = prefsCookie.get();
	}
	if (!Prefs) {
		Prefs = {};
	}
	if (Prefs.enableNotifications === undefined) {Prefs.enableNotifications = true;}
	if (Prefs.autoUpdate === undefined) {Prefs.autoUpdate = false;}
	if (Prefs.updateInterval === undefined) {Prefs.updateInterval = "01:00:00";}
	if (Prefs.enableWifi === undefined) {Prefs.enableWifi = false;}
	if (Prefs.limitToWifi === undefined) {Prefs.limitToWifi = true;}
	if (Prefs.albumArt === undefined) {Prefs.albumArt = true;}
	if (Prefs.simple === undefined) {Prefs.simple = true;}
	if (Prefs.singleTap === undefined) {Prefs.singleTap = true;}
	this.writePrefs();
};

DBClass.prototype.writePrefs = function() {
	var prefsCookie = new Mojo.Model.Cookie("Prefs");
	prefsCookie.put(Prefs);
};

DBClass.prototype.defaultFeeds = function() {
	var feed = new Feed();
	feed.url = "http://leo.am/podcasts/twit";
	feed.title = "TWiT";
	feed.interval = 30000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/TreocentralTreoCast";
	feed.title = "PalmCast";
	feed.interval = 45000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://podcasts.engadget.com/rss.xml";
	feed.title = "Engadget";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.gdgt.com/gdgt/podcast-mp3/";
	feed.title = "gdgt weekly";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/cnet/buzzoutloud";
	feed.title = "Buzz Out Loud";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds2.feedburner.com/javaposse";
	feed.title = "The Java Posse";
	feed.interval = 60000;
	feedModel.add(feed);

	/*
	feed = new Feed();
	feed.url = "http://blog.stackoverflow.com/index.php?feed=podcast";
	feed.title = "Stack Overflow";
	feed.interval = 60000;
	feedModel.add(feed);
	*/

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/podictionary";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://www.merriam-webster.com/word/index.xml";
	feed.interval = 60000;
	feedModel.add(feed);

	this.callback();
	this.saveFeeds();
};

var DB;
