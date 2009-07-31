function FeedListAssistant() {
}

FeedListAssistant.prototype.feedAttr = {
	itemTemplate: "feedList/feedRowTemplate",
	listTemplate: "feedList/feedListTemplate",
	swipeToDelete: true,
	reorderable: true,
	renderLimit: 40
};

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
	this.controller.get("feedListWgt").observe(Mojo.Event.listTap, this.handleSelection.bindAsEventListener(this));
	this.controller.get("feedListWgt").observe(Mojo.Event.listDelete, this.handleDelete.bindAsEventListener(this));
	this.controller.get("feedListWgt").observe(Mojo.Event.listReorder, this.handleReorder.bindAsEventListener(this));

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	this.controller.setupWidget("feedListWgt", this.feedAttr, feedModel);

	this.controller.setupWidget("refreshSpinner", {property: "updating"});
	this.controller.setupWidget("downloadSpinner", {property: "downloading"});

	this.controller.setupWidget(Mojo.Menu.appMenu, StageAssistant.appMenuAttr, StageAssistant.appMenuModel);

	this.feedUpdateHandler = this.feedUpdate.bind(this);
	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refresh.bind(this), 1);
	this.needRefresh = false;
};

FeedListAssistant.prototype.activate = function() {
	this.waitForFeedsReady();
	for (var i=0; i<feedModel.items.length; i++) {
		feedModel.items[i].listen(this.feedUpdateHandler);
	}
};

FeedListAssistant.prototype.deactivate = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		feedModel.items[i].unlisten(this.feedUpdateHandler);
	}
};

FeedListAssistant.prototype.waitForFeedsReady = function() {
	if (DB.feedsReady) {
		this.refreshNow();
		var firstLoad = true;
		for (var i=0; i<feedModel.items.length; i++) {
			if (feedModel.items[i].episodes.length > 0) {
				firstLoad = false;
				break;
			}
		}
		if (firstLoad) {
			this.updateFeeds();
		} else {
			this.cmdMenuModel.items[1].disabled = false;
			this.controller.modelChanged(this.cmdMenuModel);
		}
	} else {
		setTimeout(this.waitForFeedsReady.bind(this), 200);
	}
};

FeedListAssistant.prototype.updateFeeds = function(feedIndex) {
	if (!feedIndex) {
		// first time through
		this.cmdMenuModel.items[1].disabled = true;
		this.controller.modelChanged(this.cmdMenuModel);
		feedIndex = 0;
	}
	if (feedIndex < feedModel.items.length) {
		var feed = feedModel.items[feedIndex];
		feed.updating = true;
		this.refreshNow();
		feed.update(function() {
			feed.updating = false;
			this.updateFeeds(feedIndex+1);
		}.bind(this));
	} else {
		DB.saveFeeds();
		this.refreshNow();
		this.checkForDownloads();
	}
};

FeedListAssistant.prototype.checkForDownloads = function(feedIndex, episodeIndex) {
	this.cmdMenuModel.items[1].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);
};

FeedListAssistant.prototype.cleanup = function() {
	// this doesn't seem to actually save the feeds.  db has gone away maybe?
	//DB.saveFeeds();
};

FeedListAssistant.prototype._refreshDebounced = function() {
	this.needRefresh = true;
};

FeedListAssistant.prototype.refreshNow = function() {
	this.needRefresh = true;
	this._refresh();
};

FeedListAssistant.prototype._refresh = function() {
	if (this.needRefresh) {
		Mojo.Log.error("refresh");
		this.controller.modelChanged(feedModel);
		this.needRefresh = false;
	}
};

FeedListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	//var feed = event.item;
	var feed = feedModel.items[event.index];
	if (targetClass.indexOf("feedStats") === 0) {
		// popup menu:
		// last update date/time
		// next update date/time
		// ## downloaded
		// ## new
		// ## started
		// edit feed
		this.controller.popupSubmenu({
			onChoose: this.popupHandler.bind(this, feed),
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
	} else {
		this.controller.stageController.pushScene("episodeList", feed);
	}
};

FeedListAssistant.prototype.popupHandler = function(feed, command) {
	switch(command) {
		case "edit-cmd":
			this.controller.stageController.pushScene("addFeed", this, feed);
			break;
		case "listened-cmd":
			for (var i=0; i<feed.episodes.length; i++) {
				var episode = feed.episodes[i];
				episode.listened = true;
			}
			feed.numNew = 0;
			this.refresh();
			DB.saveFeed(feed);
			break;
	}

};

FeedListAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
			case "add-cmd":
				this.controller.stageController.pushScene("addFeed", this, null);
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
			this.refreshNow();
			break;
		case "ACTION":
			break;
	}
};
