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

	this.handleSelectionHandler = this.handleSelection.bindAsEventListener(this);
	this.handleDeleteHandler = this.handleDelete.bindAsEventListener(this);
	this.handleReorderHandler = this.handleReorder.bindAsEventListener(this);

	this.controller.setupWidget("refreshSpinner", {property: "updating"});
	this.controller.setupWidget("downloadSpinner", {property: "downloading"});

	this.controller.setupWidget(Mojo.Menu.appMenu, AppAssistant.appMenuAttr, AppAssistant.appMenuModel);

	this.feedUpdateHandler = this.feedUpdate.bind(this);
	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refreshDelayed.bind(this), 1);
	this.needRefresh = false;
	this.refreshedOnce = false;

	this.onBlurHandler = this.onBlur.bind(this);
	this.onFocusHandler = this.onFocus.bind(this);
};

FeedListAssistant.prototype.activate = function(feedToAdd) {
	if (feedToAdd) {
		var feed = new Feed();
		feed.title = feedToAdd.title;
		feed.url = feedToAdd.url;
		feed.update();
		feedModel.add(feed);
		this.feedList.mojo.noticeAddedItems(feedModel.items.length-1, [feed]);
		this.feedList.mojo.revealItem(feedModel.items.length-1, true);
		DB.saveFeeds();
	}

	this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.onFocusHandler);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listReorder, this.handleReorderHandler);

	if (Prefs.updated) {
		if (Prefs.reload) {
			delete Prefs.reload;
			this.stageController.swapScene("feedList");
		}
		delete Prefs.updated;
		DB.writePrefs();
	} else {
		this.refresh();
		var firstLoad = true;
		for (var i=0; i<feedModel.items.length; i++) {
			if (feedModel.items[i].episodes.length > 0) {
				firstLoad = false;
				break;
			}
		}
		if (firstLoad) {
			this.updateFeeds();
		} else if (!feedModel.updatingFeeds) {
			this.cmdMenuModel.items[1].disabled = false;
			this.controller.modelChanged(this.cmdMenuModel);
		}
	}
};

FeedListAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.onFocusHandler);
	Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listReorder, this.handleReorderHandler);
};

FeedListAssistant.prototype.onBlur = function() {
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
};

FeedListAssistant.prototype.onFocus = function() {
	if (!this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	}
};

FeedListAssistant.prototype.updateFeeds = function(feedIndex) {
	feedModel.updateFeeds();
};

FeedListAssistant.prototype.cleanup = function() {
	// this doesn't seem to actually save the feeds.  db has gone away maybe?
	//DB.saveFeeds();
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
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
			break;
	}

};

FeedListAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
			case "add-cmd":
				this.controller.popupSubmenu({
					onChoose: function(command) {
						switch (command) {
							case "add-feed":
								this.stageController.pushScene("addFeed", this, null);
								break;
							case "feed-search":
								this.stageController.pushScene("feedSearch", this, null);
								break;
						}
					}.bind(this),
					placeNear: event.originalEvent.target,
					items: [{label: "Search...", command: "feed-search"},
					        {label: "Enter feed URL...", command: "add-feed"}]
				});
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

FeedListAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "feedUpdated":
				var feedIndex = params.feedIndex;
				if (feedIndex === undefined) {
					feedIndex = feedModel.items.indexOf(params.feed);
				}
				if (feedIndex !== -1) {
					this.feedList.mojo.noticeUpdatedItems(feedIndex, [params.feed]);
				}
				break;
			case "feedsUpdating":
				this.cmdMenuModel.items[1].disabled = params.value;
				this.controller.modelChanged(this.cmdMenuModel);
				if (!params.value) {
					this.refresh();
				}
				break;
		}
	}
};
