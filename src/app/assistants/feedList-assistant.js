/*
This file is part of drPodder.

drPodder is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

drPodder is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with drPodder.  If not, see <http://www.gnu.org/licenses/>.

Copyright 2010 Jamie Hatfield <support@drpodder.com>
*/

function FeedListAssistant() {
	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(DrPodder.MainStageName);
}

FeedListAssistant.prototype.cmdMenuModel = {
	items: [
		{icon: "new", submenu: "add-menu"},
		{icon: "refresh", command: "refresh-cmd", disabled: true}
	]
};

FeedListAssistant.prototype.addMenuModel = {
	items: [{label: "Enter feed URL...", command: "add-feed"},
			{label: "Search Directory...", command: "feed-search"},
	        //{label: "Search podTrapper...", command: "pt-search"},
	        //{label: "Search the Web...", command: "web-search"},
	        {label: "Dynamic Playlist...", command: "add-playlist"}
	        ]
};


FeedListAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};


//FeedListAssistant.prototype.depotOptions = { name: "feed", replace: false };

initialize = function() {
};

FeedListAssistant.prototype.setup = function() {
	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
	this.controller.setupWidget("add-menu", this.handleCommand, this.addMenuModel);

	this.feedAttr = {
		itemTemplate: "feedList/feedRowTemplate",
		listTemplate: "feedList/feedListTemplate",
		swipeToDelete: true,
		reorderable: true,
		renderLimit: 40,
		formatters: {"albumArt": this.albumArtFormatter.bind(this), "details": this.detailsFormatter.bind(this)}
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

	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refreshDelayed.bind(this), 1);
	this.needRefresh = false;
	this.refreshedOnce = false;

	this.onBlurHandler = this.onBlur.bind(this);
	this.onFocusHandler = this.onFocus.bind(this);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.onFocusHandler);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);
};

FeedListAssistant.prototype.activate = function(result) {
	this.active = true;
	if (result) {
		if (result.feedToAdd) {
			var feed = new Feed();
			feed.title = result.feedToAdd.title;
			feed.url = result.feedToAdd.url;
			feed.update(function() {});
			feedModel.add(feed);
			result.feedAdded = true;
		}
		if (result.feedChanged) {
			this.feedList.mojo.noticeUpdatedItems(result.feedIndex, [feedModel.items[result.feedIndex]]);
			this.feedList.mojo.revealItem(result.feedIndex, true);
		}
		if (result.feedAdded) {
			this.feedList.mojo.noticeAddedItems(feedModel.items.length-1, [feedModel.items[feedModel.items.length-1]]);
			this.feedList.mojo.revealItem(feedModel.items.length-1, true);
			DB.saveFeeds();
		}
	}

	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
	//this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	Mojo.Event.listen(this.feedList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listReorder, this.handleReorderHandler);

	if (Prefs.freeRotation) {
		if (this.controller.stageController.setWindowOrientation) {
			this.controller.stageController.setWindowOrientation("free");
		}
	} else {
		this.controller.stageController.setWindowOrientation("up");
	}

	if (Prefs.reload) {
		delete Prefs.reload;
		DB.writePrefs();
		this.stageController.swapScene("feedList");
	} else {
		var firstLoad = true;
		for (var i=0; i<feedModel.items.length; i++) {
			if (feedModel.items[i].episodes.length > 0) {
				firstLoad = false;
				break;
			}
		}
		if (firstLoad) {
			var dialog = new drnull.Dialog.Confirm(this, "Add Default Feeds",
				"Welcome to drPodder!<br><br>Would you like to add some technology podcasts to get you started?",
				function() {
					Mojo.Log.warn("we want to add feeds");
					var dialog = new drnull.Dialog.Info(this, "Thanks for using drPodder!",
						"You can add podcasts by url or search for podcasts using the '+' icon in the bottom left." +
						"<br><br>Feel free to delete any of the default podcasts.");
					dialog.show();
					DB.defaultFeeds();
					this.controller.modelChanged(feedModel);
					this.updateFeeds();
				}.bind(this),
				function() {
					var dialog = new drnull.Dialog.Info(this, "Thanks for using drPodder!",
						"You can add podcasts by url or search for podcasts using the '+' icon in the bottom left." +
						"<br><br>Until you add at least one podcast, you will see this prompt when starting the program.");
					dialog.show();
				}.bind(this));
			dialog.show();
		}
	}
	this.onFocus();
};

FeedListAssistant.prototype.deactivate = function() {
	this.active = false;
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listReorder, this.handleReorderHandler);
};

FeedListAssistant.prototype.onBlur = function() {
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
	// well this is just retarded.  There's no way for somebody to be notified of the blur,
	// since we are deactivated.  Boooooo
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "onBlur"});
};

FeedListAssistant.prototype.onFocus = function() {
	if (this.active) {
		this.refreshNow();
	}

	if (!this.foregroundVolumeMarker) {
		//this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	}

	Util.closeDashboard(DrPodder.DashboardStageName);
	Util.closeDashboard(DrPodder.DownloadingStageName);
	Util.closeDashboard(DrPodder.DownloadedStageName);

	this.cmdMenuModel.items[1].disabled = feedModel.updatingFeeds;
	this.controller.modelChanged(this.cmdMenuModel);

	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "onFocus"});
};

FeedListAssistant.prototype.updateFeeds = function(feedIndex) {
	feedModel.updateFeeds();
};

FeedListAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.onFocusHandler);
	Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);
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

	if (formatted && formatted.indexOf("/") === 0) {
		formatted = "/var/luna/data/extractfs" +
						encodeURIComponent("/media/internal" + formatted) +
						":0:0:56:56:3";
	}

	return formatted;
};

FeedListAssistant.prototype.detailsFormatter = function(details, model) {
	var formatted = details;
	if (formatted) {
		formatted = model.replace(formatted);
	}
	return formatted;
};


FeedListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	//var feed = event.item;
	var feedIndex = event.index;
	var feed = feedModel.items[feedIndex];
	if (targetClass.indexOf("feedStats") === 0) {
		var editCmd = {label: "Edit Feed", command: "edit-cmd"};
		if (feed.playlist) {
			editCmd = {label: "Edit Playlist", command: "editplaylist-cmd"};
		}
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
			        {label: "Clear New", command: 'listened-cmd'},
			        editCmd
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
			this.stageController.pushScene("addFeed", feed);
			break;
		case "editplaylist-cmd":
			this.stageController.pushScene("addPlaylist", feed);
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
			case "add-playlist":
				this.stageController.pushScene("addPlaylist", null);
				break;
			case "add-feed":
				this.stageController.pushScene("addFeed", null);
				break;
			case "feed-search":
				this.stageController.pushScene("feedSearch", this, null);
				break;
			case "web-search":
				this.stageController.pushScene("webSearch", {startPage: "http://m.google.com/search"});
				break;
			case "pt-search":
				this.stageController.pushScene("webSearch", {startPage: "http://ota.versatilemonkey.com/ptbrowse/browse.pl",
											                 limitSite: "http://ota.versatilemonkey.com"});
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
					this.refreshNow();
				}
				break;
		}
	}
};
