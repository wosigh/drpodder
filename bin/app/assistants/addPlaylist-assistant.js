function AddPlaylistAssistant(feed) {
	this.feed = feed;

	this.feedModel = {items:[]};
	feedModel.items.forEach(function (f) {
		if (!f.playlist) {
			this.feedModel.items.push({feedId:f.id, title:f.title, selected:false});
		}
	}.bind(this));

	if (this.feed !== null) {
		this.newFeed = false;
		this.cmdMenuModel = {items: [{label: "Update", command: "update-cmd"}]}
		this.dialogTitle = "Edit Dynamic Playlist";
		this.title = this.feed.title;
		this.includeAll = (this.feed.playlists.length === 0);
	} else {
		this.feed = new Feed();
		this.feed.playlist = true;
		this.feed.albumArt = "/var/usr/palm/applications/com.palm.drnull.prepod/images/playlist-icon.png";
		this.feed.feedIds = [];
		this.feed.playlists = [];
		this.feed.viewFilter = "New";
		this.feed.details = undefined;

		this.newFeed = true;
		this.cmdMenuModel = {items: [{label: "Add", command: "add-cmd"}]}
		this.dialogTitle = "Add Dynamic Playlist";
		this.title = null;
		this.includeAll = false;
	}
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
		},
		this.nameModel = { value : this.title });

	this.controller.setupWidget("includeAllToggle",
		{},
		this.includeAllModel = { value : this.includeAll });

	this.controller.setupWidget("feedList", {
		itemTemplate: "addPlaylist/feedRowTemplate",
		swipeToDelete: false,
		reorderable: false
		},
		this.feedModel
	);

	this.feedList = this.controller.get("feedList");
	this.feedListDiv = this.controller.get("feedListDiv");
	if (this.includeAll) {
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

AddPlaylistAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "add-cmd":
				break;
			case "update-cmd":
				break;
		}
	}
};

AddPlaylistAssistant.prototype.listTap = function(event){
	var t = event.originalEvent.target;
	if (!t.hasClassName("palm-row")) {
		t = t.up("div.palm-row");
	}
	t.toggleClassName("feedSelected");
};

AddPlaylistAssistant.prototype.includeAllChanged = function(event) {
	if (event.value) {
		this.feedListDiv.hide();
		this.feedModel.items.forEach(function(f) {
		});
	} else {
		this.feedListDiv.show();
	}
};

AddPlaylistAssistant.prototype.updateFields = function() {
	if (this.nameModel.value) {this.feed.title = this.nameModel.value;}
};

AddPlaylistAssistant.prototype.cancel = function() {
	this.controller.stopListening("okButton", Mojo.Event.tap, this.checkFeedHandler);
	this.controller.stageController.popScene();
};

AddPlaylistAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.back) {
		if (!this.newFeed) {
			this.feed.url = this.originalUrl;
		}
	}
};
