var UPDATECHECK_INVALID = -1;
var UPDATECHECK_NOUPDATES = 0;
var UPDATECHECK_UPDATES = 1; // maybe number of updates would be better?

function Feed(init) {
	if (init) {
		this.id = init.id;
		this.displayOrder = init.displayOrder;
		this.url = init.url;
		this.title = init.title;
		this.albumArt = init.albumArt;
		this.maxDisplay = init.maxDisplay;
		this.autoDownload = init.autoDownload;
		this.autoDelete = init.autoDelete;
		this.maxDownloads = init.maxDownloads;
		this.episodes = init.episodes;
		this.guid = init.guid;
		this.interval = init.interval;
		this.lastModified = init.lastModified;
		this.details = init.details;
		this.replacements = init.replacements;
		this.downloading = init.downloading;
		this.downloadCount = init.downloadCount;

		this.numEpisodes = init.numEpisodes;
		this.numNew = init.numNew;
		this.numDownloaded = init.numDownloaded;
		this.numStarted = init.numStarted;
	} else {
		this.url = null;
		this.title = null;
		this.albumArt = null;
		this.maxDisplay = 20;
		this.autoDownload = false;
		this.autoDelete = true;
		this.maxDownloads = 1;
		this.episodes = [];
		this.guid = [];
		this.interval = 60000;
		this.lastModified = null;
		this.details = null;
		this.replacements = "";
		this.downloading = false;
		this.downloadCount = 0;

		this.numEpisodes = 0;
		this.numNew = 0;
		this.numDownloaded = 0;
		this.numStarted = 0;
	}
}

Feed.prototype.update = function(callback, url) {
	this.updating = true;
	this.updated();
	/*
	if (Mojo.Host.current === Mojo.Host.mojoHost) {
		// same original policy means we need to use the proxy on mojo-host
		this.url = "/proxy?url=" + encodeURIComponent(this.url);
	}
	*/
	if (!url) {
		url = this.url;
	}

	var feedTitle = (this.title)?this.title:"Unknown feed title";
	Util.dashboard(DrPodder.DashboardStageName, "Updating Feed", feedTitle, true);

	Mojo.Log.error("making ajax request [%s]", url);
	var req = new Ajax.Request(url, {
		method: 'get',
		evalJSON : "false",
		evalJS : "false",
		onFailure: this.checkFailure.bind(this, callback),
		onSuccess: this.checkSuccess.bind(this, callback)
	});
	//Mojo.Log.error("finished making ajax request");
};

Feed.prototype.checkFailure = function(callback, transport) {
	Mojo.Log.error("Failed to request feed:", this.title, "(", this.url, ")");
	this.updating = false;
	this.updated();
	this.updatedEpisodes();
	callback();
};

Feed.prototype.checkSuccess = function(callback, transport) {
	//Mojo.Log.error("check success %d", (new Date()).getTime()-this.ajaxStartDate);
	var location = transport.getHeader("Location");
	if (location) {
		Mojo.Log.error("Redirection location=%s", location);
		this.update(callback, location);
	} else {
		this.updateCheck(transport);
		this.updating = false;
		this.updated();
		this.updatedEpisodes();
		DB.saveFeed(this);
		callback();
	}
};

Feed.prototype.validateXML = function(transport){
	// Convert the string to an XML object
	if (!transport.responseXML) {
		//var start = (new Date()).getTime();
		transport.responseXML = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
		//Mojo.Log.error("document parse: %d", (new Date()).getTime() - start);
	}
};

Feed.prototype.getTitle = function(transport) {
	var titlePath = "/rss/channel/title";
	this.validateXML(transport);

	var title;
	try {
		var nodes = document.evaluate(titlePath, transport.responseXML, null, XPathResult.ANY_TYPE, null);
		if (nodes) {
			var node = nodes.iterateNext();
			if (node) {
				var firstChild = node.firstChild;
				if (firstChild) {
					title = firstChild.nodeValue;
					Mojo.Log.error("title: %s", title);
				}
			}
		}
	} catch (e) {
		// bring this back once feed add dialog is its own page
		if (this.gui) {
			Util.showError("Error parsing feed", "Could not find title in feed: " + this.url);
		}
		Mojo.Log.error("Error finding feed title: %o", e);
	}
	if (!title) {
		if (this.gui) {
			Util.showError("Error parsing feed", "Could not find title in feed: " + this.url);
		}
		Mojo.Log.error("Error finding feed title for feed: %s", this.url);
	}
	return title;
};

Feed.prototype.getAlbumArt = function(transport) {
	var imagePath = "/rss/channel/image/url";
	this.validateXML(transport);

	try {
		var nodes = document.evaluate(imagePath, transport.responseXML, null, XPathResult.ANY_TYPE, null);
		var imageUrl = "";
		var node = nodes.iterateNext();
		if (node === undefined || node === null) {
			// ugh, nonstandard rss, try to find the itunes image
			var xpe = transport.responseXML.ownerDocument || transport.responseXML;
			var nsResolver = xpe.createNSResolver(xpe.documentElement);
			//var nsResolver = document.createNSResolver( transport.responseXML.ownerDocument === null ? transport.responseXML.documentElement : transport.responseXML.ownerDocument.documentElement );
			imagePath = "/rss/channel/itunes:image/@href";
			nodes = document.evaluate(imagePath, transport.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
			node = nodes.iterateNext();
		}
		if (node) {
			var firstChild = node.firstChild;
			if (firstChild) {
				imageUrl = firstChild.nodeValue;
			}
		}
	} catch (e) {
		Mojo.Log.error("Error finding feed image: %o", e);
	}

	return imageUrl;
};

Feed.prototype.updateCheck = function(transport, callback) {
	var lastModified = transport.getHeader("Last-Modified");
	var updateCheckStatus = UPDATECHECK_NOUPDATES;

	/*
	if (lastModified !== null && this.lastModified === lastModified) {
		return updateCheckStatus;
	}
	*/

	this.lastModified = lastModified;
	var itemPath = "/rss/channel/item";

	// this isn't the best way to keep things unique, maybe should use guid
	var topEpisodeTitle = "-a-title-that-will-never-match-anything-";
	if (this.episodes.length > 0) {topEpisodeTitle = this.episodes[0].title;}

	this.validateXML(transport);

	if (this.title === undefined || this.title === null || this.title === "") {
		this.title = this.getTitle(transport);
		if (!this.title) {
			return UPDATECHECK_INVALID;
		}
	}

	if (this.albumArt === undefined || this.albumArt === null || this.albumArt === "") {
		this.albumArt = this.getAlbumArt(transport);
	}

	if (this.albumArt !== undefined && this.albumArt !== null &&
		this.albumArt.indexOf("http://") === 0) {
		// if we currently point to a picture on the net, download it so we can resize on display
		var ext = ".JPG";
		if (this.albumArt.toLowerCase().indexOf(".jpg") > 0) {ext=".JPG";}
		if (this.albumArt.toLowerCase().indexOf(".bmp") > 0) {ext=".BMP";}
		if (this.albumArt.toLowerCase().indexOf(".png") > 0) {ext=".PNG";}
		if (this.albumArt.toLowerCase().indexOf(".gif") > 0) {ext=".GIF";}
		var newAlbumArt = Util.escapeSpecial(this.title) + ext;
		this.downloadRequest = AppAssistant.downloadService.download(
			null, this.albumArt, ".albumArt", newAlbumArt,
			function(event) {
				if (event.completed) {
					Mojo.Controller.getAppController().sendToNotificationChain({
						type: "feedUpdated", feed: this});
				}
			}.bind(this));
		this.albumArt = "/media/internal/PrePod/.albumArt/" + newAlbumArt;
	}


	Mojo.Log.error("Update: ", this.title, "(", this.url, ")");

	//need to evaluate difference between iterator processing and xpath processing
	// although, the real slowdown seems to be in getting the xml from the server (probably the parsing of the xml)
	//var numItems = Util.xpath("/rss/channel/item[last()]/@index", transport.responseXML).value;
	// how would I get the number of item entries?


	//var start = (new Date()).getTime();
	nodes = document.evaluate(itemPath, transport.responseXML, null, XPathResult.ANY_TYPE, null);
	//Mojo.Log.error("document evaluate: %d", (new Date()).getTime() - start);

	if (!nodes) {
		// bring this back once feed add dialog is its own page
		//Util.showError("Error parsing feed", "No items found in feed");
		return UPDATECHECK_INVALID;
	}

	var result = nodes.iterateNext();
	var newEpisodeCount = 0;
	var noEnclosureCount = 0;
	// debugging, we only want to update 5 or so at a time, so that we can watch the list grow
	//var newToKeep = Math.floor(Math.random()*4+1);
	// end debugging
	//while (result && this.episodes.length < this.maxDisplay) {

	while (result) {
		// construct a new Episode based on the current item from XML
		var episode = new Episode();
		//var start2 = (new Date()).getTime();
		episode.loadFromXML(result);
		//Mojo.Log.error("loadFromXML: %d", (new Date()).getTime() - start2);


		// what really needs to happen here:
		// check based on guid each of the episodes, add new ones to the top of the array
		// update information for existing ones
		var e = this.guid[episode.guid];
		if (e === undefined) {
			episode.feedId = this.id;
			episode.feedObject = this;
			// record the title of the topmost episode
			if (newEpisodeCount === 0) {
				this.details = episode.title;
			}
			// insert the new episodes at the head of the list
			this.episodes.splice(newEpisodeCount, 0, episode);
			this.guid[episode.guid] = episode;
			if (!episode.enclosure) {episode.listened = true; noEnclosureCount++;}
			episode.updateUIElements(true);
			newEpisodeCount++;
			updateCheckStatus = UPDATECHECK_UPDATES;
		} else {
			// it already exists, check that the enclosure url is up to date
			e.title = episode.title;
			e.pubDate = episode.pubDate;
			e.description = episode.description;
			e.link = episode.link;
			e.enclosure = episode.enclosure;
			e.type = episode.type;
		}
		result = nodes.iterateNext();
	}
	//Mojo.Log.error("documentProcessing: %d", (new Date()).getTime() - start);

	//this.episodes.splice(this.maxDisplay);

	// debugging
	//if (newEpisodeCount > newToKeep) {
		//this.episodes.splice(0, newEpisodeCount-newToKeep);
		//this.lastModified = null;
		//newEpisodeCount = newToKeep;
	//}
	// end debugging

	this.numNew += newEpisodeCount;
	this.numNew -= noEnclosureCount;

	return updateCheckStatus;
};

Feed.prototype.downloadCallback = function(episode, event) {
	if (event.returnValue) {
		episode.downloadTicket = event.ticket;
	}
};

Feed.prototype.replace = function(title) {
	var arr = this.getReplacementsArray();
	for (var i=0; i<arr.length; i++) {
		if (!arr[i].fromRegexp) {
			arr[i].fromRegexp = new RegExp(arr[i].from, "g");
		}
		title = title.replace(arr[i].fromRegexp, arr[i].to);
	}
	return title;
};

Feed.prototype.getReplacementsArray = function() {
	var arr = [];
	if (this.replacements) {
		var spl = this.replacements.split(",");
		if (spl.length % 2 === 1) {
			Mojo.Log.error("error parsing replacements string: %s", this.replacements);
		} else {
			for (var i=0; i<spl.length; i+=2) {
				arr.push({from: spl[i].replace(/#COMMA#/g, ","), to: spl[i+1].replace(/#COMMA#/g, ",")});
			}
		}
	}
	return arr;
};


Feed.prototype.setReplacements = function(arr) {
	var replacements;
	this.replacements = "";
	for (var i=0; i<arr.length; i++) {
		if (arr[i].from.length > 0) {
			if (this.replacements.length > 0) { this.replacements += ",";}
			this.replacements += arr[i].from.replace(/,/g,"#COMMA#") + "," +
			                     arr[i].to.replace(/,/g,"#COMMA#");
		}
	}
};

Feed.prototype.listened = function(ignore) {
	for (var i=0; i<this.episodes.length; i++) {
		this.episodes[i].setListened(true);
	}
	if (!ignore) {
		this.updated();
		this.updatedEpisodes();
	}
	this.save();
};

Feed.prototype.unlistened = function(ignore) {
	for (var i=0; i<this.episodes.length; i++) {
		this.episodes[i].setUnlistened(true);
	}
	if (!ignore) {
		this.updated();
		this.updatedEpisodes();
	}
	this.save();
};

Feed.prototype.downloadingEpisode = function(ignore) {
	this.downloadCount++;
	this.downloading = true;
	if (!ignore) {this.updated();}
};

Feed.prototype.downloadFinished = function(ignore) {
	this.downloadCount--;
	this.downloading = (this.downloadCount > 0);
	if (!ignore) {this.updated();}
};

Feed.prototype.episodeListened = function(ignore) {
	this.numNew--;
	if (!ignore) {this.updated();}
};

Feed.prototype.episodeUnlistened = function(ignore) {
	this.numNew++;
	if (!ignore) {this.updated();}
};

Feed.prototype.episodeDownloaded = function(ignore) {
	this.numDownloaded++;
	if (!ignore) {this.updated();}
};

Feed.prototype.episodeDeleted = function(ignore) {
	this.numDownloaded--;
	if (!ignore) {this.updated();}
};

Feed.prototype.episodeBookmarked = function(ignore) {
	this.numStarted++;
	if (!ignore) {this.updated();}
};

Feed.prototype.episodeBookmarkCleared = function(ignore) {
	this.numStarted--;
	if (!ignore) {this.updated();}
};

Feed.prototype.save = function() {
	DB.saveFeed(this);
};

Feed.prototype.updated = function() {
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "feedUpdated", feed: this});
};

Feed.prototype.updatedEpisodes = function() {
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "feedEpisodesUpdated", feed: this});
};


var FeedUtil = new Feed();

function FeedModel(init) {
}

FeedModel.prototype.items = [];
FeedModel.prototype.ids = [];

FeedModel.prototype.add = function(feed) {
	this.items.push(feed);
	this.ids[feed.id] = feed;
	// fire the NEWFEED event
};

FeedModel.prototype.getFeedById = function(id) {
	return this.ids[id];
};

FeedModel.prototype._enableWifiIfDisabled = function(status) {
	if (status.returnValue && status.status === "serviceDisabled") {
		this.enabledWifi = true;
		AppAssistant.wifiService.setState(null, "enabled");
	}
};

FeedModel.prototype.updateFeeds = function(feedIndex) {
	if (!feedIndex) {
		this.enabledWifi = false;
		if (false && Prefs.enableWifi) {
			AppAssistant.wifiService.getStatus(null, this._enableWifiIfDisabled.bind(this));
		}

		// first time through
		Util.banner("Updating drPodder Feeds");
		AppAssistant.powerService.activityStart(null, "FeedsUpdating");
		this.updatingFeeds = true;
		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "feedsUpdating", value: true});
		feedIndex = 0;
	}
	if (feedIndex < this.items.length) {
		var feed = this.items[feedIndex];
		feed.update(function() {
			this.updateFeeds(feedIndex+1);
		}.bind(this));
	} else {
		this.updatingFeeds = false;
		this.download();
		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "feedsUpdating", value: false});
		AppAssistant.powerService.activityEnd(null, "FeedsUpdating");
	}
};

FeedModel.prototype.getEpisodesToDownload = function() {
	var eps = [];
	for (var i=0, len=this.items.length; i<len; ++i) {
		var feed = this.items[i];
		if (feed.autoDownload) {
			var downloaded = 0;
			for (var j=0, len2=feed.episodes.length; j<len2; ++j) {
				var e = feed.episodes[j];
				if (e.downloaded) {
					if (feed.maxDownloads > 0 && downloaded > feed.maxDownloads &&
						!e.position) {
						e.deleteFile();
					} else {
						++downloaded;
					}
				} else if (e.downloading) {
					++downloaded;
				} else if ((feed.maxDownloads == "0" || downloaded < feed.maxDownloads) &&
						   !e.listened && !e.downloadTicket && e.enclosure) {
					eps.push(e);
					++downloaded;
				}
			}
		}
	}
	return eps;
};

FeedModel.prototype.download = function() {
	var eps = this.getEpisodesToDownload();

	if (eps.length) {
		if (Prefs.limitToWifi) {
			AppAssistant.wifiService.isWifiConnected(null, this._wifiCheck.bind(this, eps));
		} else {
			this._doDownload(eps);
		}
	} else {
		Util.closeDashboard(DrPodder.DashboardStageName);
		if (this.enabledWifi) {
			AppAssistant.wifiService.setState(null, "disabled");
		}
	}

};

FeedModel.prototype._wifiCheck = function(eps, wifiConnected) {
	if (wifiConnected) {
		this._doDownload(eps);
	} else {
		// popup banner saying that we couldn't download episodes
		// because wifi wasn't enabled, maybe even do a "click to retry"
		Mojo.Log.error("Skipping %d episode download because wifi isn't connected", eps.length);
		Util.banner(eps.length + " Download" + ((eps.length===1)?"":"s") +
				            " pending WiFi");
		Util.dashboard(DrPodder.DashboardStageName, "Downloads pending WiFi",
						eps.map(function(e){return e.title;}), true);
	}
};

FeedModel.prototype._doDownload = function(eps) {
	for (var i=0, len=eps.length; i<len; ++i) {
		var e = eps[i];
		e.download();
	}
	Util.closeDashboard(DrPodder.DashboardStageName);
};

var feedModel = new FeedModel();
