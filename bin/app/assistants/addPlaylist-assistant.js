function AddPlaylistAssistant(feed) {
	this.feed = feed;

	if (this.feed !== null) {
		this.newFeed = false;
		this.cmdMenuModel = {items: [{label: "Update", command: "update-cmd"}]};
		this.dialogTitle = "Edit Dynamic Playlist";
		this.nameModel = { value: this.feed.title };
		this.includeAllModel = { value: (this.feed.feedIds.length === 0) };
	} else {
		this.feed = new Feed();
		this.feed.playlist = true;
		this.feed.albumArt = "images/playlist-icon.png";
		this.feed.feedIds = [];
		this.feed.playlists = [];
		this.feed.viewFilter = "New";
		this.feed.details = undefined;

		this.newFeed = true;
		this.cmdMenuModel = {items: [{label: "Add", command: "update-cmd"}]};
		this.dialogTitle = "Add Dynamic Playlist";
		this.nameModel = { value: null };
		this.includeAllModel = { value: false };
	}

	this.feedModel = {items:[]};
	feedModel.items.forEach(function (f) {
		if (!f.playlist) {
			var listItem = {id:f.id, title:f.title, selected:false};
			if (this.feed.feedIds.some(function(testId) {return testId == f.id;})) {
				listItem.selected = true;
			}
			this.feedModel.items.push(listItem);
		}
	}.bind(this));
}

AddPlaylistAssistant.prototype.setup = function() {
	this.controller.get("dialogTitle").update(this.dialogTitle);

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	this.controller.setupWidget("newPlaylistName", {
			hintText : $L("Title"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeTitleCase,
			enterSubmits : false
		}, this.nameModel);

	this.controller.setupWidget("includeAllToggle",
		{}, this.includeAllModel);

	this.controller.setupWidget("feedList", {
		itemTemplate: "addPlaylist/feedRowTemplate",
		swipeToDelete: false,
		reorderable: false,
		onItemRendered: this.onItemRendered
		},
		this.feedModel
	);

	this.feedList = this.controller.get("feedList");
	this.feedListDiv = this.controller.get("feedListDiv");
	if (this.includeAllModel.value) {
		this.feedListDiv.hide();
	}
	this.listTapHandler = this.listTap.bindAsEventListener(this);

	this.includeAllToggle = this.controller.get('includeAllToggle');
	this.includeAllHandler = this.includeAllChanged.bindAsEventListener(this);
};

AddPlaylistAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.feedList, Mojo.Event.listTap, this.listTapHandler);
	Mojo.Event.listen(this.includeAllToggle, Mojo.Event.propertyChange, this.includeAllHandler);
};

AddPlaylistAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listTap, this.listTapHandler);
	Mojo.Event.stopListening(this.includeAllToggle, Mojo.Event.propertyChange, this.includeAllHandler);
};

AddPlaylistAssistant.prototype.onItemRendered = function(listWidget, itemModel, itemNode) {
	if (itemModel.selected) {
		itemNode.addClassName("selected");
	} else {
		itemNode.removeClassName("selected");
	}
};

AddPlaylistAssistant.prototype.listTap = function(event){
	var t = event.originalEvent.target;
	var f = event.item;
	if (!t.hasClassName("palm-row")) {
		t = t.up("div.palm-row");
	}
	f.selected = t.toggleClassName("selected").hasClassName("selected");
};

AddPlaylistAssistant.prototype.includeAllChanged = function(event) {
	if (event.value) {
		this.feedListDiv.hide();
	} else {
		this.feedListDiv.show();
	}
};

AddPlaylistAssistant.prototype.updateFields = function() {
	if (this.nameModel.value) {this.feed.title = this.nameModel.value;}
};

AddPlaylistAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "update-cmd":
				var feedIds = [];
				if (!this.includeAllModel.value) {
					this.feedModel.items.forEach(function(f) {
						if (f.selected) {
							feedIds.push(f.id);
						}
					});
				}
				if (feedIds.length || this.includeAllModel.value) {
					if (this.nameModel.value) {
						this.feed.feedIds = feedIds;
						this.feed.title = this.nameModel.value;
						this.feed.episodes = [];
						this.feed.numNew = 0;
						this.feed.numDownloaded = 0;
						this.feed.numStarted = 0;
						this.feed.downloadCount = 0;
						this.feed.downloading = false;

						if (feedIds.length === 0) {
							feedIds = [];
							feedModel.items.forEach(function(f) {
								if (!f.playlist) { feedIds.push(f.id); }
							});
						}

						feedIds.forEach(function(fid) {
							var f = feedModel.getFeedById(fid);
							f.playlists.push(this.feed);
							f.episodes.forEach(function(e) {
								this.feed.insertEpisodeTop(e);
							}.bind(this));
						}.bind(this));

						this.feed.sortEpisodes();

						var results = {};
						if (this.newFeed) {
							//feedModel.items.push(this.feed);
							feedModel.items.unshift(this.feed);
							results.feedChanged = true;
							results.feedIndex = 0;
							DB.saveFeeds();
						} else {
							results.feedChanged = true;
							results.feedIndex = feedModel.items.indexOf(this.feed);
							DB.saveFeed(this.feed);
						}
						this.controller.stageController.popScene(results);
					} else {
						Util.showError("No Playlist Title", "Please enter a Title for the Playlist");
					}
				} else {
					Util.showError("No Feeds Selected", "Please select at least 1 feed or choose \"Include All Feeds\"");
				}
				break;
			case "shutupJSLint":
				break;
		}
	}
};
