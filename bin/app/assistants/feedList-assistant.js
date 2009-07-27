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
		{icon: "refresh", command: "refresh-cmd"}
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

	this.controller.setupWidget("feedSpinner", {property: "updating"});

	this.controller.setupWidget(Mojo.Menu.appMenu, StageAssistant.appMenuAttr, StageAssistant.appMenuModel);

	this.waitForFeedsReady();
};

FeedListAssistant.prototype.activate = function() {
	/*
	for (var i=0; i<feedModel.items.length; i++) {
		this.setInterval(feedModel.items[i]);
	}
	*/
	this.refresh();
};

FeedListAssistant.prototype.waitForFeedsReady = function() {
	if (DB.feedsReady) {
		for (var i=0; i<feedModel.items.length; i++) {
			this.setInterval(feedModel.items[i]);
		}
	} else {
		setTimeout(this.waitForFeedsReady.bind(this), 200);
	}
};

FeedListAssistant.prototype.cleanup = function() {
	// this doesn't seem to actually save the feeds.  db has gone away maybe?
	//DB.saveFeeds();
};

FeedListAssistant.prototype.setInterval = function(feed) {
	if (this.updating) {
		setTimeout(this.setInterval.bind(this, feed), 500);
	} else {
		if (feed.intervalID) {
			clearInterval(feed.intervalID);
			feed.intervalID = 0;
		} else {
			feed.update(this);
		}
		// TODO: uncomment
		// if (feed.interval) {feed.intervalID = setInterval(feed.update.bind(feed, this), feed.interval);}
	}
};

FeedListAssistant.prototype.clearIntervals = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		var feed = feedModel.items[i];
		if (feed.intervalID) {clearInterval(feed.intervalID);}
		feed.intervalID = 0;
	}
};

FeedListAssistant.prototype.refresh = function() {
	this.controller.modelChanged(feedModel);
};

FeedListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	var feed = event.item;
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
		this.clearIntervals();
		this.controller.stageController.pushScene("episodeList", feed);
	}
};

FeedListAssistant.prototype.popupHandler = function(feed, command) {
	switch(command) {
		case "edit-cmd":
			this.clearIntervals();
			this.controller.showDialog({
				template: "feedList/addFeed-dialog",
				assistant: new AddFeedAssistant(this, feed)
			});
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
				this.clearIntervals();
				this.controller.showDialog({
					template: "feedList/addFeed-dialog",
					assistant: new AddFeedAssistant(this, null)
				});
				break;
			case "refresh-cmd":
				this.clearIntervals();
				for (var i=0; i<feedModel.items.length; i++) {
					this.setInterval(feedModel.items[i]);
				}
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
