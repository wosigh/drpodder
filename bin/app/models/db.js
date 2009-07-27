function DBClass() {
	this.initDB(this.loadFeeds.bind(this));
}

//DBClass.prototype.depotOptions = { name: "feed", replace: false };

DBClass.prototype.dbName = "ext:PrePodFeeds";
DBClass.prototype.dbVersion = "0.2";
DBClass.prototype.feedsReady = false;

DBClass.prototype.db = openDatabase(DBClass.prototype.dbName, DBClass.prototype.dbVersion);

// need a conversion method that converts the old depot db to the new one and
// then calls demoDepot.removeAll();

// should have array and hash based access to these:
// array for display
// hash for lookups

/*
feed.title
feed.url
feed.albumArt
feed.autoDelete
feed.autoDownload
feed.maxDownloads
feed.interval
feed.lastModified
###feed.numDownloaded
###feed.numEpisodes
###feed.numNew
###feed.numStarted
###feed.details
###feed.episodes
###feed.updating
*/
/*
episode.title
episode.description
episode.enclosure
episode.guid
episode.link
episode.position
episode.pubDate
episode.downloadTicket
episode.downloaded
episode.listened
episode.file
episode.length
###episode.feedObject

*/


DBClass.prototype.initDB = function(callback) {
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
	                      "lastModified TEXT)";
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
	                         "length REAL)";
	this.db.transaction(function(transaction) {
		transaction.executeSql(createFeedTable, [],
			function(transaction, results) {
				Mojo.Log.info("Feed table created");
				transaction.executeSql(createEpisodeTable, [],
					function(transaction, results) {
						Mojo.Log.info("Episode table created");
						callback();
					},
					function(transaction, error) {Mojo.Log.error("Error creating episode table: %j", error);});
			},
			function(transaction, error) {Mojo.Log.error("Error creating feed table: %j", error);});
	});
};

DBClass.prototype.loadFeeds = function() {
	var loadSQL = "SELECT * FROM feed ORDER BY displayOrder";

	this.db.transaction(function(transaction) {
		transaction.executeSql(loadSQL, [],
			this.loadFeedsSuccess.bind(this),
			function(transaction, error) {Mojo.Log.error("Error retrieving feeds: %j", error);});
	}.bind(this));

	/*
	this.db.transaction(function(transaction) {
		transaction.executeSql("DROP TABLE 'feed'", [],
			function(transaction, results) { Mojo.Log.error("drop Feed table: %j", results);},
			function(transaction, error) {Mojo.Log.error("Error dropping feed table: %j", error);});
		transaction.executeSql("DROP TABLE 'episode'", [],
			function(transaction, results) { Mojo.Log.error("drop Episode table: %j", results);},
			function(transaction, error) {Mojo.Log.error("Error dropping episode table: %j", error);});
		callback();
	});
	*/
};

DBClass.prototype.loadFeedsSuccess = function(transaction, results) {
	if (results.rows.length > 0) {
		// load the rows into the feedModel
		for (var i=0; i<results.rows.length; i++) {
			var f = new Feed(results.rows.item(i));
			f.numNew = 0;
			f.numDownloaded = 0;
			f.numStarted = 0;
			f.episodes = [];
			feedModel.items.push(f);
			feedModel.ids[f.id] = f;
		}
		this.loadEpisodes();
	} else {
		this.defaultFeeds();
	}
};

DBClass.prototype.loadEpisodes = function() {
	var loadSQL = "SELECT * FROM episode ORDER BY feedId, displayOrder";

	this.db.transaction(function(transaction) {
		transaction.executeSql(loadSQL, [],
			this.loadEpisodesSuccess.bind(this),
			function(transaction, error) {Mojo.Log.error("Error retrieving feeds: %j", error);});
	}.bind(this));
};

DBClass.prototype.loadEpisodesSuccess = function(transaction, results) {
	if (results.rows.length > 0) {
		for (var i=0; i<results.rows.length; i++) {
			var e = new Episode(results.rows.item(i));
			var f = feedModel.ids[e.feedId];
			if (f.details === undefined) {f.details = e.title;}
			f.episodes.push(e);
			f.numEpisodes++;
			if (!e.listened) {f.numNew++;}
			if (e.downloaded) {f.numDownloaded++;}
			if (e.position !== 0) {f.numStarted++;}
		}

		this.feedsReady = true;
	}
};

DBClass.prototype.saveFeeds = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		this.saveFeed(feedModel.items[i], i);
	}
};

DBClass.prototype.saveFeed = function(f, displayOrder) {
	var saveFeedSQL = "INSERT OR REPLACE INTO feed (id, displayOrder, title, url, albumArt, " +
	                  "autoDelete, autoDownload, maxDownloads, interval, lastModified) " +
					  "VALUES (?,?,?,?,?,?,?,?,?,?)";

	if (displayOrder !== undefined) {
		f.displayOrder = displayOrder;
	}

	this.db.transaction(function(transaction) {
		if (f.id === undefined) {f.id = null;}
		transaction.executeSql(saveFeedSQL, [f.id, f.displayOrder, f.title, f.url, f.albumArt,
											 (f.autoDelete)?1:0, (f.autoDownload)?1:0, f.maxDownloads, f.interval, f.lastModified],
			function(transaction, results) {
				Mojo.Log.error("Feed saved: %s", f.title);
				if (f.id === null) {
					f.id = results.insertId;
					for (var j=0; j<f.episodes.length; j++) {
						f.episodes[j].feedId = f.id;
					}
				}
				for (var i=0; i<f.episodes.length; i++) {
					this.saveEpisode(f.episodes[i], i);
				}
			}.bind(this),
			function(transaction, error) { Mojo.Log.error("Feed Save failed: (%s), %j", f.title, error);});
	}.bind(this));
};

DBClass.prototype.saveEpisode = function(e, displayOrder) {
	var saveEpisodeSQL = "INSERT OR REPLACE INTO episode (id, feedId, displayOrder, title, description, " +
	                     "enclosure, guid, link, pubDate, position, " +
					     "downloadTicket, downloaded, listened, file, length) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

	if (displayOrder !== undefined) {
		e.displayOrder = displayOrder;
	}

	this.db.transaction(function(transaction) {
		if (e.id === undefined) {e.id = null;}
		transaction.executeSql(saveEpisodeSQL, [e.id, e.feedId, e.displayOrder, e.title, e.description,
											    e.enclosure, e.guid, e.link, e.pubDate, e.position,
												e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length],
			function(transaction, results) {
				Mojo.Log.info("Episode saved: %s, %d", e.title, e.listened);
				if (e.id === null) {
					e.id = results.insertId;
				}
			},
			function(transaction, error) { Mojo.Log.error("Episode Save failed: (%s), %j", e.title, error);});
	}.bind(this));
};

DBClass.prototype.removeFeed = function(f) {
	var removeFeedSQL = "DELETE FROM feed WHERE id=?";
	var removeEpisodesSQL = "DELETE FROM episode WHERE feedId=?";

	this.db.transaction(function(transaction) {
		transaction.executeSql(removeFeedSQL, [f.id],
			function(transaction, results) {Mojo.Log.error("Feed removed: %s", f.title);},
			function(transaction, error) { Mojo.Log.error("Feed remove failed: (%s), %j", f.title, error);});
		transaction.executeSql(removeEpisodesSQL, [f.id],
			function(transaction, results) {Mojo.Log.error("Episodes removed: %s", f.id);},
			function(transaction, error) { Mojo.Log.error("Episodes remove failed: (%s), %j", f.id, error);});
	});
};

DBClass.prototype.removeEpisode = function(episode) {
	// this functionality doesn't exist (doesn't need to either)
};










// OLD DEPOT
/*
DBClass.prototype.saveFeeds = function() {
	//Mojo.Log.error("DBClass.saveFeeds");
	this.demoDepot.simpleAdd("feeds",
			feedModel.items,
			function() {Mojo.Log.error("Feed save successful!");},
			function() {Mojo.Log.error("Feed save ERROR!");});
};

DBClass.prototype.depotLoadFeedSuccess = function(response) {
	if (Object.values(response).size() > 0) {
		for (var i=0; i<response.length; i++) {
			var f = new Feed(response[i]);
			feedModel.items.push(f);
			feedModel.ids[f.id] = f;
			for (var j=0; j<f.episodes.length; j++) {
				var e = f.episodes[j];
				if (e.file === undefined) {e.file = null;}
				if (e.downloadTicket === undefined) {e.downloadTicket = null;}
				if (e.downloaded === undefined) {e.downloaded = false;}
				if (e.listened === undefined) {e.listened = false;}
				if (e.length === undefined) {e.length = 0;}
				if (e.position === undefined) {e.position = 0;}
				Mojo.Log.error("pubDate:", e.pubDate);
				Mojo.Log.error("pubDate.toString():", e.pubDate.toString());
				Mojo.Log.error("pubDate.toUTCString():", e.pubDate.toUTCString());
			}
		}
		this.feedsReady = true;
		this.saveFeeds();
	} else {
		this.defaultFeeds();
	}
};
*/

DBClass.prototype.defaultFeeds = function() {
	var feed = new Feed();
	feed.url = "http://leo.am/podcasts/twit";
	feed.title = "TWiT";
	feed.interval = 30000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/TreocentralTreoCast";
	feed.title = "PalmCast";
	feed.interval = 45000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://feeds.gdgt.com/gdgt/podcast-mp3/";
	feed.title = "gdgt weekly";
	feed.interval = 60000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/cnet/buzzoutloud";
	feed.title = "Buzz Out Loud";
	feed.interval = 60000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://feeds2.feedburner.com/javaposse";
	feed.title = "The Java Posse";
	feed.interval = 60000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://blog.stackoverflow.com/index.php?feed=podcast";
	feed.title = "Stack Overflow";
	feed.interval = 60000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/podictionary";
	feed.interval = 60000;
	feedModel.items.push(feed);

	feed = new Feed();
	feed.url = "http://www.merriam-webster.com/word/index.xml";
	feed.interval = 60000;
	feedModel.items.push(feed);

	this.feedsReady = true;
	this.saveFeeds();
};
var DB = new DBClass();
