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
		this.autoDownload = init.autoDownload;
		this.autoDelete = init.autoDelete;
		this.maxDownloads = init.maxDownloads;
		this.episodes = init.episodes;
		this.guid = init.guid;
		this.interval = init.interval;
		this.lastModified = init.lastModified;
		this.details = init.details;

		this.numEpisodes = init.numEpisodes;
		this.numNew = init.numNew;
		this.numDownloaded = init.numDownloaded;
		this.numStarted = init.numStarted;
	} else {
		this.url = null;
		this.title = null;
		this.albumArt = null;
		this.autoDownload = false;
		this.autoDelete = true;
		this.maxDownloads = 5;
		this.episodes = [];
		this.guid = [];
		this.interval = 60000;
		this.lastModified = null;
		this.details = null;

		this.numEpisodes = 0;
		this.numNew = 0;
		this.numDownloaded = 0;
		this.numStarted = 0;
	}
}

Feed.prototype.update = function(assistant) {

	/*
	if (Mojo.Host.current === Mojo.Host.mojoHost) {
		// same original policy means we need to use the proxy on mojo-host
		this.url = "/proxy?url=" + encodeURIComponent(this.url);
	}
	*/

	assistant.updating = true;
	this.updating = true;
	assistant._refresh();

	var req = new Ajax.Request(this.url, {
		method: 'get',
		onFailure: function() {
			Mojo.Log.error("Failed to request feed:", this.title, "(", this.url, ")");
			this.updating = false;
			assistant.refresh();

			assistant.updating = false;
		},
		onComplete: function(transport) {
			// could check return value here and indicate that the feed update failed

			this.updateCheck(transport, assistant);

			this.updating = false;
			assistant.refresh();

			DB.saveFeed(this);
			assistant.updating = false;
		}.bind(this)
	});
};

Feed.prototype.validateXML = function(transport){
	// Convert the string to an XML object
	if (!transport.responseXML) {
		transport.responseXML = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
	}
};

Feed.prototype.getTitle = function(transport) {
	var titlePath = "/rss/channel/title ";
	this.validateXML(transport);

	var nodes = document.evaluate(titlePath, transport.responseXML, null, XPathResult.ANY_TYPE, null);
	var title = nodes.iterateNext().firstChild.nodeValue;
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

Feed.prototype.updateCheck = function(transport) {
	var lastModified = transport.getHeader("Last-Modified");
	var updateCheckStatus = UPDATECHECK_NOUPDATES;

	if (lastModified !== null && this.lastModified === lastModified) {
		return updateCheckStatus;
	}

	this.lastModified = lastModified;
	var itemPath = "/rss/channel/item";

	// this isn't the best way to keep things unique, maybe should use guid
	var topEpisodeTitle = "-a-title-that-will-never-match-anything-";
	if (this.episodes.length > 0) {topEpisodeTitle = this.episodes[0].title;}

	this.validateXML(transport);

	if (this.title === null || this.title === "") {
		this.title = this.getTitle(transport);
	}

	if (this.albumArt === null || this.albumArt === "") {
		this.albumArt = this.getAlbumArt(transport);
	}

	Mojo.Log.error("Update: ", this.title, "(", this.url, ")");

	nodes = document.evaluate(itemPath, transport.responseXML, null, XPathResult.ANY_TYPE, null);

	if (!nodes) {
		return false;
	}

	var result = nodes.iterateNext();
	var newEpisodeCount = 0;
	// debugging, we only want to update 5 or so at a time, so that we can watch the list grow
	//var newToKeep = Math.floor(Math.random()*4+1);
	// end debugging
	while (result) {
		// construct a new Episode based on the current item from XML
		var episode = new Episode();
		episode.loadFromXML(result);

		// what really needs to happen here:
		// check based on guid each of the episodes, add new ones to the top of the array
		// update information for existing ones
		var e = this.guid[episode.guid];
		if (e === undefined) {
			episode.feedId = this.id;
			// record the title of the topmost episode
			if (newEpisodeCount === 0) {
				this.details = episode.title;
			}
			// insert the new episodes at the head of the list
			this.episodes.splice(newEpisodeCount, 0, episode);
			this.guid[episode.guid] = episode;
			newEpisodeCount++;
			updateCheckStatus = UPDATECHECK_UPDATES;
		} else {
			// it already exists, check that the enclosure url is up to date
			e.title = episode.title;
			e.pubDate = episode.pubDate;
			e.description = episode.description;
			e.link = episode.link;
			e.enclosure = episode.enclosure;
		}
		result = nodes.iterateNext();
	}

	// debugging
	//if (newEpisodeCount > newToKeep) {
		//this.episodes.splice(0, newEpisodeCount-newToKeep);
		//this.lastModified = null;
		//newEpisodeCount = newToKeep;
	//}
	// end debugging

	this.numNew += newEpisodeCount;

	return updateCheckStatus;
};

var FeedUtil = new Feed();

var feedModel = {items: [], ids: []};