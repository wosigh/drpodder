function Episode(init) {
	if (init !== undefined) {
		this.id = init.id;
		this.displayOrder = init.displayOrder;
		this.feedId = init.feedId;
		this.title = init.title;
		this.link = init.link;
		this.description = init.description;
		this.enclosure = init.enclosure;
		this.pubDate = init.pubDate;
		this.guid = init.guid;
		this.file = init.file;
		this.downloadTicket = init.downloadTicket;
		this.downloaded = init.downloaded;
		this.listened = init.listened;
		this.length = init.length;
		this.position = init.position;
		this.type = init.type;
	} else {
		this.title = null;
		this.link = null;
		this.description = null;
		this.enclosure = null;
		this.pubDate = null;
		this.guid = null;
		this.file = null;
		this.downloadTicket = null;
		this.downloaded = false;
		this.listened = false;
		this.length = 0;
		this.position = 0;
		this.type = null;
	}
	this.listeners = [];
	this.downloading = false;

}

Episode.prototype.findLinks = /(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;

Episode.prototype.loadFromXML = function(xmlObject) {
	this.title = Util.xmlTagValue(xmlObject, "title", "NO TITLE FOUND");
	this.link = Util.xmlTagValue(xmlObject, "link");
	this.description = Util.xmlTagValue(xmlObject, "description");
	this.enclosure = Util.xmlTagAttributeValue(xmlObject, "enclosure", "url");
	if (this.enclosure !== undefined && this.enclosure !== null) {
		// fix stupid redirect url's BOL has started to use
		//this.enclosure = this.enclosure.replace(/.*http\:\/\//, "http://");
		// fix error with 60sec podcast
		//this.enclosure = this.enclosure.replace("ref=p_itune", "ref=p_itunes");
	}
	this.pubDate = Util.xmlTagValue(xmlObject, "pubDate");
	this.guid = Util.xmlTagValue(xmlObject, "guid");
	if (this.guid === undefined) {this.guid = this.link;}
	this.type = Util.xmlTagAttributeValue(xmlObject, "enclosure", "type");
};

Episode.prototype.listen = function(callback) {
	this.listeners.unshift(callback);
};

Episode.prototype.unlisten = function(callback) {
	for (var i=0; i<this.listeners.length; i++) {
		if (callback === this.listeners[i]) {
			this.listeners.splice(i, 1);
		}
	}
};

Episode.prototype.notify = function(action, extra) {
	for (var i=0; i<this.listeners.length; i++) {
		//Mojo.Log.error("episode.notify %d", i);
		setTimeout(this.listeners[i].bind(this, action, this, extra), 10*i);
		//Mojo.Log.error("episode.notify %d done", i);
	}
};

Episode.prototype.updateUIElements = function() {
	if (this.downloading) {
		if (this.listened) {
			this.indicatorColor = "gray";
		} else {
			this.indicatorColor = "black";
		}
		this.statusIcon = "Knob Cancel.png";
	} else {
		if (this.listened) {
			this.indicatorColor = "gray";
			if (this.downloaded) {
				this.statusIcon = "Knob Remove Red.png";
			} else {
				this.statusIcon = "Knob Grey.png";
			}
		} else {
			this.indicatorColor = "black";
			if (this.downloaded) {
				this.statusIcon = "Knob Play.png";
			} else {
				this.statusIcon = "Knob Download.png";
			}
		}
		if (!this.enclosure) {
			this.statusIcon = "Knob Help.png";
		}
	}
};

Episode.prototype.setListened = function(needRefresh) {
	if (!this.listened && this.enclosure) {
		this.listened = true;
		this.updateUIElements();
		this.notify("LISTENED", {needRefresh: needRefresh, needSave: needRefresh});
	}
};

Episode.prototype.setUnlistened = function(needRefresh) {
	if (this.listened && this.enclosure) {
		this.listened = false;
		this.updateUIElements();
		this.notify("LISTENED", {needRefresh: needRefresh, needSave: needRefresh});
	}
};

Episode.prototype.setDownloaded = function(needRefresh) {
	if (!this.downloaded) {
		this.downloaded = true;
		this.updateUIElements();
		this.notify("DOWNLOADED", {needRefresh: needRefresh, needSave: needRefresh});
	}
};

Episode.prototype.bookmark = function(pos) {
	var newBookmark = (this.position === 0);

	this.position = pos;
	if (this.length) {
		this.bookmarkPercent = 100*this.position/this.length;
	} else {
		this.bookmarkPercent = 0;
	}

	if (newBookmark) {
		this.notify("BOOKMARK");
	} else {
		this.notify("BOOKMARKUPDATE");
	}
};

Episode.prototype.clearBookmark = function() {
	if (this.position) {
		this.position = 0;
		this.bookmarkPercent = 0;
		this.notify("BOOKMARK");
	}
};

Episode.prototype.download = function() {
	if (this.feedId) {
		this.deleteFile();
		Mojo.Log.error("Downloading %s", this.enclosure);
		Mojo.Log.error("We will call it %s", this.getDownloadFilename());
		if (this.enclosure) {
			this.downloadRequest = AppAssistant.downloadService.download(null, this.enclosure,
																		this.escapeSpecial(feedModel.getFeedById(this.feedId).title),
																		this.getDownloadFilename(),
																		this.downloadingCallback.bind(this));
		}
	} else {
		setTimeout(this.download.bind(this), 5000);
	}
};

Episode.prototype.getDateString = function() {
	var date = new Date(this.pubDate);
	if (date === undefined || date === null || isNaN(date)) {
		date = new Date();
	}
	var y = date.getFullYear();
	var m = (date.getMonth()+1);
	var d=date.getDate();
	if (m<10) {m="0"+m;}
	if (d<10) {d="0"+d;}
	return ""+y+""+m+""+d;
};

Episode.prototype.getDownloadFilename = function() {
	var ext="mp3";
	switch (this.type) {
		case "audio/mpeg":
			ext = "mp3";
			break;
		case "audio/x-m4a":
			ext = "m4a";
			break;
		case "audio/mp4":
			ext = "m4a";
			break;
		case "video/x-msvideo":
			ext = "avi";
			break;
		case "video/x-ms-asf":
			ext = "asf";
			break;
		case "video/quicktime":
			ext = "mov";
			break;
		case "video/mpeg":
			ext = "mpg";
			break;
		case "video/mp4":
			ext = "mp4";
			break;
		case "video/x-mp4":
			ext = "mp4";
			break;
		case "video/x-m4v":
			ext = "m4v";
			break;
		case "video/m4v":
			ext = "m4v";
			break;
		case "video/flv":
			ext = "flv";
			break;
		case "video/wmv":
			ext = "wmv";
			break;
		case "application/x-shockwave-flash":
			ext = "flv";
			break;
	}

	return this.escapeSpecial(this.title) + "-" + this.getDateString() + "." + ext;
};

Episode.prototype.deleteTempFile = function() {
	var filename = "/media/internal/PrePod/" + this.escapeSpecial(feedModel.getFeedById(this.feedId).title);
	filename += "/." + this.getDownloadFilename();
	Mojo.Log.error("deleting temp file: %s", filename);
	AppAssistant.mediaService.deleteFile(null, filename, function(event) {});
};

Episode.prototype.downloadingCallback = function(event) {
	//Mojo.Log.error("downloadingCallback: %j", event);
	if (event.returnValue) {
		this.downloadCanceled = false;
		this.downloadTicket = event.ticket;
		this.downloadingPercent = 0;
		if (!this.downloading) {
			this.downloading = true;
			this.downloadActivity();
			this.updateUIElements(this);
			this.notify("DOWNLOADSTART");
		}
	} else if (this.downloading && event.completed === false) {
		this.deleteTempFile();
		this.downloading = false;
		this.downloadTicket = 0;
		this.downloadingPercent = 0;
		this.updateUIElements(this);
		// if the user didn't do this, let them know what happened
		if (!event.aborted) {
			Mojo.Log.error("Download error=%j", event);
			Util.showError("Download aborted", "There was an error downloading url:"+this.enclosure);
			this.notify("DOWNLOADABORT");
		} else {
			this.notify("DOWNLOADCANCEL");
		}
	} else if (this.downloading && event.completed && event.completionStatusCode === 200) {
		//success!
		Mojo.Log.error("Download complete!", this.title);
		this.downloadTicket = 0;
		this.downloading = false;
		this.downloadingPercent = 0;

		this.file = event.target;

		this.setDownloaded(false);
		this.setUnlistened(false);

		this.notify("DOWNLOADCOMPLETE");

	} else if (this.downloading && event.completed && (event.completionStatusCode === 302 || event.completionStatusCode === 301)) {
		Mojo.Log.error("Redirecting...", event.target);
		this.downloadTicket = 0;
		this.downloading = false;
		this.downloadingPercent = 0;

		this.notify("DOWNLOADCOMPLETE");

		var req = new Ajax.Request(event.target, {
			method: 'get',
			onFailure: function() {
				this.deleteTempFile();
				Util.showError("Error downloading " + this.title, "The redirection link could not be found.");
				Mojo.Log.error("Couldn't find %s... strange", event.target);
			}.bind(this),
			onComplete: function(transport) {
				var redirect;
				try {
					var matches = this.findLinks.exec(transport.responseText);
					if (matches) {
						redirect = matches[0];
					}
				} catch (e){
					Mojo.Log.error("error with regex: (%s)", e);
					Util.showError("Error parsing redirection", "There was an error parsing the mp3 url");
				}
				AppAssistant.mediaService.deleteFile(null, event.target, function(event) {});
				if (redirect !== undefined) {
					Mojo.Log.error("Attempting to download redirected link: [%s]", redirect);
					this.downloadRequest = AppAssistant.downloadService.download(null, redirect,
						this.escapeSpecial(feedModel.getFeedById(this.feedId).title),
						this.getDownloadFilename(),
						this.downloadingCallback.bind(this));
				} else {
					Mojo.Log.error("No download link found! [%s]", transport.responseText);
					this.updateUIElements(this);
				}
			}.bind(this)
		});
	} else if (event.returnValue === false) {
		this.deleteTempFile();
		this.downloadTicket = 0;
		this.downloading = false;
		this.downloadingPercent = 0;
		this.updateUIElements(this);
		this.notify("DOWNLOADABORT");
	} else if (this.downloading) {
		var per = 0;
		// if amountTotal is < 2048 or so, we'll assume it's a redirect
		if (event.amountTotal > 0 && event.amountReceived > 0 && event.amountTotal > 2048) {
			per = Math.floor(1000*event.amountReceived/event.amountTotal)/10;
		}
		if (this.downloadingPercent !== per) {
			this.downloadingPercent = per;
			this.notify("DOWNLOADPROGRESS");
		}
	} else if (event.aborted || this.downloadCanceled) {
		this.deleteTempFile();
		this.downloadCanceled = false;
		Mojo.Log.error("Got the cancel event, but it has already been handled");
	} else {
		this.deleteTempFile();
		Mojo.Log.error("Unknown error message while downloading %s (%j)", this.title, event);
		Util.showError("Error downloading "+this.title, "There was an error downloading url:"+this.enclosure);
		this.downloadTicket = 0;
		// this.downloading = false; // must already be false
		this.downloadingPercent = 0;
		this.updateUIElements(this);
		// this.notify("DOWNLOADABORT"); // can't notify, or count would be messed up
	}
};

Episode.prototype.downloadActivity = function() {
	// every 5 minutes, if we are still downloading we start an activity
	if (this.downloading) {
		AppAssistant.powerService.activityStart(null, this.id);
		setTimeout(this.downloadActivity.bind(this), 300000);
	} else {
		AppAssistant.powerService.activityEnd(null, this.id);
	}
};

Episode.prototype.escapeSpecial = function(file) {
    file = file.toString().replace(/\//g,'_').replace(/\\/g,'_').replace(/\:/g,'_').
							replace(/\*/g,'_').replace(/\?/g,'_').replace(/\"/g,'_').
							replace(/</g, '_').replace(/\>/g, '_').replace(/\|/g, '_');

	// don't allow filenames longer than 200 chars
	if (file.length > 200) {
		file = file.slice(200);
	}

	if (file.length === 0) {
		file = "Unknown";
	}

	return file;
};


Episode.prototype.deleteFile = function(refresh) {
	if (this.downloaded) {
		AppAssistant.mediaService.deleteFile(null, this.file, function() {});
		this.downloaded = false;
		this.file = null;
		this.updateUIElements();
		this.notify("DOWNLOADED", {needRefresh: refresh, needSave: refresh});
	}
};

Episode.prototype.cancelDownload = function() {
	if (this.downloading) {
		AppAssistant.downloadService.cancelDownload(null, this.downloadTicket, function() {});
		this.downloadTicket = 0;
		this.downloading = false;
		this.downloadingPercent = 0;
		this.updateUIElements(this);
		this.downloadCanceled = true;
		this.notify("DOWNLOADCANCEL");
		Mojo.Log.error("Canceling download");
	}
};


var EpisodeUtil = new Episode();
