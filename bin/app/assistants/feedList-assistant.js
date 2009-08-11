function FeedListAssistant() {
	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(PrePod.MainStageName);
}

FeedListAssistant.prototype.cmdMenuModel = {
	items: [
		{icon: "new", command: "add-cmd"},
		{icon: "refresh", command: "refresh-cmd", disabled: true}
	]
};

//FeedListAssistant.prototype.depotOptions = { name: "feed", replace: false };

initialize = function() {
};

FeedListAssistant.prototype.setup = function() {
	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	this.feedAttr = {
		itemTemplate: "feedList/feedRowTemplate",
		listTemplate: "feedList/feedListTemplate",
		swipeToDelete: true,
		reorderable: true,
		renderLimit: 40,
		formatters: {"albumArt": this.albumArtFormatter.bind(this)}
	};


	if (Prefs.albumArt) {
		if (Prefs.simple) {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate-simple";
		} else {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate";
		}
	} else {
		if (Prefs.simple) {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate-simpleNoAlbumArt";
		} else {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate-noAlbumArt";
		}
	}

	this.controller.setupWidget("feedListWgt", this.feedAttr, feedModel);

	this.feedList = this.controller.get("feedListWgt");

	this.feedList.observe(Mojo.Event.listTap, this.handleSelection.bindAsEventListener(this));
	this.feedList.observe(Mojo.Event.listDelete, this.handleDelete.bindAsEventListener(this));
	this.feedList.observe(Mojo.Event.listReorder, this.handleReorder.bindAsEventListener(this));

	this.controller.setupWidget("refreshSpinner", {property: "updating"});
	this.controller.setupWidget("downloadSpinner", {property: "downloading"});

	this.controller.setupWidget(Mojo.Menu.appMenu, AppAssistant.appMenuAttr, AppAssistant.appMenuModel);

	this.feedUpdateHandler = this.feedUpdate.bind(this);
	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refreshDelayed.bind(this), 1);
	this.needRefresh = false;
	this.refreshedOnce = false;
};

FeedListAssistant.prototype.activate = function() {
	if (Prefs.updated) {
		if (Prefs.reload) {
			delete Prefs.reload;
			this.stageController.swapScene("feedList");
		}
		delete Prefs.updated;
		DB.writePrefs();
	} else {
		this.waitForFeedsReady();
	}
};

FeedListAssistant.prototype.deactivate = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		feedModel.items[i].unlisten(this.feedUpdateHandler);
	}
};

FeedListAssistant.prototype.waitForFeedsReady = function() {
	if (DB.feedsReady) {
		this.refresh();
		var firstLoad = true;
		for (var i=0; i<feedModel.items.length; i++) {
			feedModel.items[i].listen(this.feedUpdateHandler);
			if (feedModel.items[i].episodes.length > 0) {
				firstLoad = false;
			}
		}
		if (firstLoad) {
			this.updateFeeds();
		} else if (!this.updatingFeeds) {
			this.cmdMenuModel.items[1].disabled = false;
			this.controller.modelChanged(this.cmdMenuModel);
		}
	} else {
		this.controller.window.setTimeout(this.waitForFeedsReady.bind(this), 200);
	}
};

FeedListAssistant.prototype.updateFeeds = function(feedIndex) {
	if (!feedIndex) {
		// first time through
		this.updatingFeeds = true;
		this.cmdMenuModel.items[1].disabled = true;
		this.controller.modelChanged(this.cmdMenuModel);
		feedIndex = 0;
	}
	if (feedIndex < feedModel.items.length) {
		var feed = feedModel.items[feedIndex];
		feed.updating = true;
		this.feedList.mojo.noticeUpdatedItems(feedIndex, feed);
		feed.update(function() {
			feed.updating = false;
			this.feedList.mojo.noticeUpdatedItems(feedIndex, feed);
			this.updateFeeds(feedIndex+1);
		}.bind(this));
	} else {
		DB.saveFeeds();
		this.refresh();
		this.updatingFeeds = false;
		this.cmdMenuModel.items[1].disabled = false;
		this.controller.modelChanged(this.cmdMenuModel);
		this.checkForDownloads();
	}
};

FeedListAssistant.prototype.checkForDownloads = function(feedIndex, episodeIndex) {
	// this is currently done in the feed update
};

FeedListAssistant.prototype.cleanup = function() {
	// this doesn't seem to actually save the feeds.  db has gone away maybe?
	//DB.saveFeeds();
};

FeedListAssistant.prototype._refreshDebounced = function() {
	this.needRefresh = true;
	if (!this.refreshedOnce) {
		this._doRefresh();
		this.refreshedOnce = true;
	}
};

FeedListAssistant.prototype._refreshDelayed = function() {
	this.refreshedOnce = false;
	this._doRefresh();
};

FeedListAssistant.prototype._doRefresh = function() {
	if (this.needRefresh) {
		//Mojo.Log.error("fla refresh");
		this.controller.modelChanged(feedModel);
		this.needRefresh = false;
	}
};

FeedListAssistant.prototype.refreshNow = function() {
	this.needRefresh = true;
	this._doRefresh();
};

FeedListAssistant.prototype.albumArtFormatter = function(albumArt, model) {
	var formatted = albumArt;

	if (albumArt) {
		formatted = "/var/luna/data/extractfs" +
						encodeURIComponent(albumArt) +
						":0:0:58:58:3";
	}

	return formatted;
};

FeedListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	//var feed = event.item;
	var feedIndex = event.index;
	var feed = feedModel.items[feedIndex];
	if (targetClass.indexOf("feedStats") === 0) {
		// popup menu:
		// last update date/time
		// next update date/time
		// ## downloaded
		// ## new
		// ## started
		// edit feed
		this.controller.popupSubmenu({
			onChoose: this.popupHandler.bind(this, feed, feedIndex),
			placeNear: event.originalEvent.target,
			items: [
			        //{label: "Last: "+feed.lastUpdate, command: 'dontwant-cmd', enabled: false},
			        //{label: "Next: "+feed.lastUpdate+feed.interval, command: 'dontwant-cmd'},
			        //{label: feed.numDownloaded+" downloaded", command: 'viewDownloaded-cmd'},
			        //{label: feed.numNew+" new", command: 'viewNew-cmd'},
			        //{label: feed.numStarted+" started", command: 'viewStarted-cmd'},
			        {label: "Mark Listened", command: 'listened-cmd'},
			        {label: "Edit Feed", command: 'edit-cmd'}
			]});
	} else if (targetClass.indexOf("download") === 0) {
		this.controller.popupSubmenu({
			onChoose: this.popupHandler.bind(this, feed, feedIndex),
			placeNear: event.originalEvent.target,
			items: [
			        {label: "Cancel Downloads", command: 'cancelDownloads-cmd'}
			]});
	} else {
		this.stageController.pushScene("episodeList", feed);
	}
};

FeedListAssistant.prototype.popupHandler = function(feed, feedIndex, command) {
	switch(command) {
		case "edit-cmd":
			this.stageController.pushScene("addFeed", this, feed);
			break;
		case "listened-cmd":
			feed.listened();
			break;
		case "cancelDownloads-cmd":
			for (var i=0; i<feed.episodes.length; i++) {
				var episode = feed.episodes[i];
				episode.cancelDownload();
			}
			this.feedList.mojo.noticeUpdatedItems(feedIndex, feed);
			DB.saveFeed(feed);
			break;
	}

};

FeedListAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
			case "add-cmd":
				this.stageController.pushScene("addFeed", this, null);
				break;
			case "refresh-cmd":
				this.updateFeeds();
				break;
		}
	}
};

FeedListAssistant.prototype.handleDelete = function(event) {
	DB.removeFeed(event.model.items[event.index]);
	event.model.items.splice(event.index, 1);
	DB.saveFeeds();
};

FeedListAssistant.prototype.handleReorder = function(event) {
	event.model.items.splice(event.fromIndex, 1);
	var toIndex = event.toIndex;
	if (toIndex > event.fromIndex) {
		toIndex--;
	}
	event.model.items.splice(event.toIndex, 0, event.item);
	DB.saveFeeds();
};

FeedListAssistant.prototype.feedUpdate = function(action, feed) {
	//Mojo.Log.error("EpisodeLA: feed [%s] said: %s", feed.title, action);
	switch (action) {
		case "REFRESH":
			this.refresh();
			break;
		case "ACTION":
			break;
	}
};
