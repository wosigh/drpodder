function AddFeedAssistant(feed) {
	this.feed = feed;

	// default empty replacement
	this.replacementModel = {items: []};

	if (this.feed !== null) {
		this.newFeed = false;
		this.originalUrl = feed.url;
		this.originalUsername = feed.username;
		this.originalPassword = feed.password;
		this.dialogTitle = "Edit Podcast XML Feed";
		this.title = this.feed.title;
		this.url = this.feed.url;
		this.username = this.feed.username;
		this.password = this.feed.password;
		this.albumArt = this.feed.albumArt;
		this.autoDownload = this.feed.autoDownload;
		this.autoDelete = this.feed.autoDelete;
		this.maxDownloads = this.feed.maxDownloads;
		this.okButtonValue = "Update";
		this.replacementModel.items = this.feed.getReplacementsArray();
	} else {
		this.newFeed = true;
		this.dialogTitle = "Add Podcast XML Feed";
		this.title = null;
		this.url = null;
		this.username = null;
		this.password = null;
		this.albumArt = null;
		this.autoDownload = false;
		this.autoDelete = true;
		this.maxDownloads = 1;
		this.okButtonValue = "Add Feed";
	}
}

AddFeedAssistant.prototype.menuAttr = {omitDefaultItems: true};

AddFeedAssistant.prototype.setup = function() {
	this.menuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{label: "Authentication", command: "authentication-cmd"},
			Mojo.Menu.helpItem,
			{label: "About...", command: "about-cmd"}
		]
	};

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	this.controller.get("dialogTitle").update(this.dialogTitle);
	this.controller.setupWidget("newFeedURL",
		{
			hintText : $L("RSS feed URL"),
			focus : true,
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.urlModel = { value : this.url });

	this.controller.setupWidget("username", {
			hintText : $L("Username"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.usernameModel = { value : this.username });

	this.controller.setupWidget("password", {
			hintText : $L("Password"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.passwordModel = { value : this.password });

	this.controller.setupWidget("newFeedName", {
			hintText : $L("Title (Optional)"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeTitleCase,
			enterSubmits : false
		},
		this.nameModel = { value : this.title });

	this.controller.setupWidget("albumArt", {
			hintText : $L("Album Art (space clears)"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.albumArtModel = { value : this.albumArt });

	/*
	this.controller.setupWidget("maxDisplaySelector",
		{label: "Only show latest # episodes",
		 choices: [
			{label: "5", value: 5},
			{label: "10", value: 10},
			{label: "15", value: 15},
			{label: "20", value: 20},
			{label: "30", value: 30},
			{label: "40", value: 40},
			{label: "50", value: 50},
			{label: "60", value: 60},
			{label: "70", value: 70},
			{label: "80", value: 80},
			{label: "90", value: 90},
			{label: "100", value: 100}
		]
		},
		this.maxDisplay = { value : this.maxDisplay });
	*/

	this.controller.setupWidget("autoDeleteToggle",
		{},
		this.autoDeleteModel = { value : this.autoDelete });

	this.controller.setupWidget("autoDownloadToggle",
		{},
		this.autoDownloadModel = { value : this.autoDownload });

	this.controller.setupWidget("maxDownloadsSelector",
		{label: "Keep at most",
		 choices: [
			{label: "All", value: 0},
			{label: "1", value: 1},
			{label: "2", value: 2},
			{label: "3", value: 3},
			{label: "4", value: 4},
			{label: "5", value: 5},
			{label: "10", value: 10},
			{label: "15", value: 15},
			{label: "20", value: 20}
		]
		},
		this.maxDownloadsModel = { value : this.maxDownloads });


	this.controller.setupWidget("replacementList", {
		itemTemplate: "addFeed/replacementRowTemplate",
		swipeToDelete: true,
		reorderable: true,
		addItemLabel: "Add..."
		},
		this.replacementModel
	);

	this.controller.setupWidget("fromText", {
		hintText: "Replace this...",
		modelProperty: "from",
		textReplacement: false,
		textCase : Mojo.Widget.steModeLowerCase,
		limitResize: false,
		autoResize: false,
		multiline: false
	});

	this.controller.setupWidget("toText", {
		hintText: "With this...",
		modelProperty: "to",
		textCase : Mojo.Widget.steModeLowerCase,
		textReplacement: false,
		limitResize: false,
		autoResize: false,
		multiline: false
	});

	this.replacementList = this.controller.get("replacementList");
	this.listAddHandler = this.listAddHandler.bindAsEventListener(this);
	this.listDeleteHandler = this.listDeleteHandler.bindAsEventListener(this);
	this.listReorderHandler = this.listReorderHandler.bindAsEventListener(this);

	this.controller.setupWidget("okButton", {
		type : Mojo.Widget.activityButton
	}, this.okButtonModel = {
		buttonLabel : this.okButtonValue,
		disables : false
	});
	this.okButtonActive = false;
	this.okButton = this.controller.get('okButton');
	this.checkFeedHandler = this.checkFeed.bindAsEventListener(this);

	if (!this.autoDownloadModel.value) {
		this.controller.get("maxDownloadsRow").hide();
		this.controller.get("autoDownloadRow").addClassName("last");
	}

	if (!this.usernameModel.value) {
		this.controller.get("usernameDiv").hide();
		this.controller.get("passwordDiv").hide();
	}

	if (this.newFeed) {
		this.controller.get("newFeedDiv").addClassName("last");
		this.controller.get("albumArtDiv").hide();
	}

	this.autoDownloadToggle = this.controller.get('autoDownloadToggle');
	this.autoDownloadHandler = this.autoDownloadChanged.bindAsEventListener(this);
};

AddFeedAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.replacementList, Mojo.Event.listAdd, this.listAddHandler);
	Mojo.Event.listen(this.replacementList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.listen(this.replacementList, Mojo.Event.listReorder, this.listReorderHandler);
	Mojo.Event.listen(this.okButton, Mojo.Event.tap, this.checkFeedHandler);
	Mojo.Event.listen(this.autoDownloadToggle, Mojo.Event.propertyChange,this.autoDownloadHandler);
};

AddFeedAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.replacementList, Mojo.Event.listAdd, this.listAddHandler);
	Mojo.Event.stopListening(this.replacementList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.stopListening(this.replacementList, Mojo.Event.listReorder, this.listReorderHandler);
	Mojo.Event.stopListening(this.okButton, Mojo.Event.tap, this.checkFeedHandler);
	Mojo.Event.stopListening(this.autoDownloadToggle, Mojo.Event.propertyChange,this.autoDownloadHandler);
};

AddFeedAssistant.prototype.listAddHandler = function(event){
	var newItem = {from:"", to: ""};
	this.replacementModel.items.push(newItem);
	this.replacementList.mojo.noticeAddedItems(this.replacementModel.items.length, [newItem]);
};

AddFeedAssistant.prototype.listDeleteHandler = function(event){
	this.replacementModel.items.splice(this.replacementModel.items.indexOf(event.item), 1);
};

AddFeedAssistant.prototype.listReorderHandler = function(event){
	this.replacementModel.items.splice(this.replacementModel.items.indexOf(event.item), 1);
	this.replacementModel.items.splice(event.toIndex, 0, event.item);
};

AddFeedAssistant.prototype.autoDownloadChanged = function(event) {
	if (event.value) {
		this.controller.get("maxDownloadsRow").show();
		this.controller.get("autoDownloadRow").removeClassName("last");
	} else {
		this.controller.get("maxDownloadsRow").hide();
		this.controller.get("autoDownloadRow").addClassName("last");
	}
};

AddFeedAssistant.prototype.updateFields = function() {
	if (this.nameModel.value) {this.feed.title = this.nameModel.value;}
	if (this.albumArtModel.value) {this.feed.albumArt = this.albumArtModel.value;}
	this.feed.autoDownload = this.autoDownloadModel.value;
	this.feed.autoDelete = this.autoDeleteModel.value;
	this.feed.maxDownloads = this.maxDownloadsModel.value;
	this.feed.setReplacements(this.replacementModel.items);
};

AddFeedAssistant.prototype.checkFeed = function() {
	if (this.okButtonActive === true) {
		// Shouldn't happen, but log event if it does and exit
		Mojo.Log.info("Multiple Check Feed requests");
		return;
	}

	// Check entered URL and name to confirm that it is a valid feedlist
	Mojo.Log.error("New Feed URL Request: (%s:%s)%s", this.usernameModel.value, this.passwordModel.value, this.urlModel.value);

	// If the url is the same, then assume that it's just a title change,
	// update the feed title and close the dialog. Otherwise update the feed.

	if (!this.newFeed && this.feed !== null &&
		this.feed.url === this.urlModel.value &&
		this.feed.username === this.usernameModel.value &&
		this.feed.password === this.passwordModel.value) {
		this.updateFields();
		DB.saveFeed(this.feed);
		this.controller.stageController.popScene({feedChanged: true, feedIndex: feedModel.items.indexOf(this.feed)});
	} else {
		this.okButton.mojo.activate();
		this.okButtonActive = true;
		this.okButtonModel.buttonLabel = "Updating Feed";
		this.okButtonModel.disabled = true;
		this.controller.modelChanged(this.okButtonModel);

		// Check for "http://" on front or other legal prefix; any string of
		// 1 to 5 alpha characters followed by ":" is ok, else prepend "http://"
		var url = this.urlModel.value;
		if (/^[A-Za-z]{1,5}:/.test(url) === false) {
			// Strip any leading slashes
			url = url.replace(/^\/{1,2}/, "");
			url = "http://" + url;
			this.urlModel.value = url;
			// Update the entered URL & model
			this.controller.modelChanged(this.urlModel);
		}


		this.check(url);
	}
};

AddFeedAssistant.prototype.check = function(url) {
	if (!url) {
		url = this.urlModel.value;
	}
	//this.ajaxRequestTime = (new Date()).getTime();
	//Mojo.Log.error("making ajax request [%s]", url);
	if (this.usernameModel.value) {
		url = url.replace("http://", "http://" +
						  encodeURIComponent(this.usernameModel.value) + ":" +
						  encodeURIComponent(this.passwordModel.value) + "@");
	}

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		onSuccess : this.checkSuccess.bind(this),
		onFailure : this.checkFailure.bind(this)
	});
	//Mojo.Log.error("finished making ajax request");
};

AddFeedAssistant.prototype.checkSuccess = function(transport) {
	//Mojo.Log.error("check success %d", (new Date()).getTime()-this.ajaxRequestTime);
	var location = transport.getHeader("Location");
	if (location) {
		Mojo.Log.error("Redirection location=%s", location);
		this.check(location);
		return;
	}
	var feedStatus = UPDATECHECK_INVALID;
	// Prototype template object generates a string from return status
	var t = new Template($L("#{status}"));
	var m = t.evaluate(transport);
	Mojo.Log.info("Valid URL (Status ", m, " returned).");

	if (transport.status) {
		// DEBUG - Work around due occasion Ajax XML error in response.
		if (transport.responseXML === null && transport.responseText !== null) {
			Mojo.Log.info("Request not in XML format - manually converting");
			//var start = (new Date()).getTime();
			transport.responseXML = new DOMParser().parseFromString(
					transport.responseText, "text/xml");
			//Mojo.Log.error("parse time: %d", (new Date()).getTime()-start);
		}

		//  If a new feed, push the entered feed data on to the feedlist and
		//  call processFeed to evaluate it.
		if (this.newFeed) {
			this.feed = new Feed();
			this.feed.url = this.urlModel.value;
			this.feed.username = this.usernameModel.value;
			this.feed.password = this.passwordModel.value;
			this.feed.interval = 60000;
		} else {
			this.feed.url = this.urlModel.value;
			this.feed.username = this.usernameModel.value;
			this.feed.password = this.passwordModel.value;

			// need to clear out this feed (and probably delete downloaded episodes)
			// maybe not clear them out, what if they need to move the feed somewhere else?
			//this.feed.episodes = [];
			//this.feed.numEpisodes = 0;
			//this.feed.numNew = 0;
			//this.feed.numStarted = 0;
			//this.feed.numDownloaded = 0;
			//this.feed.albumArt = null;
		}

		this.feed.gui = true;
		feedStatus = this.feed.updateCheck(transport);
		this.feed.gui = false;
	}

	if (feedStatus < 0 || !transport.status) {
		// Feed can't be processed - remove it but keep the dialog open
		Mojo.Log.error("Error updating feed: (%s:%s) %s", this.usernameModel.value, this.passwordModel.value, this.urlModel.value);
		this.controller.get("dialogTitle").update("Error updating feed");
		this.controller.getSceneScroller().mojo.revealTop(true);
		this.controller.get("newFeedURL").mojo.focus();

		this.resetButton();
	} else {
		this.updateFields();
		var results = {};
		if (this.newFeed) {
			feedModel.items.push(this.feed);
			results.feedAdded = true;
		} else {
			results.feedChanged = true;
			results.feedIndex = feedModel.items.indexOf(this.feed);
			DB.saveFeed(this.feed);
		}
		this.controller.stageController.popScene(results);
	}
};

AddFeedAssistant.prototype.resetButton = function() {
	this.okButton.mojo.deactivate();
	this.okButtonActive = false;
	this.okButtonModel.buttonLabel = this.okButtonValue;
	this.okButtonModel.disabled = false;
	this.controller.modelChanged(this.okButtonModel);
};

AddFeedAssistant.prototype.checkFailure = function(transport) {
	// Prototype template object generates a string from return status
	var t = new Template("#{status}");
	var m = t.evaluate(transport);

	this.resetButton();

	// Log error and put message in status area
	if (transport.status === 401) {
		if (this.usernameModel.value) {
			Util.showError("Access Denied", "Please check your username and password to ensure they are correct.");
		} else {
			Util.showError("Authorization Required", "Please enter your username and password for this feed.");
			this.controller.get("usernameDiv").show();
			this.controller.get("passwordDiv").show();
		}
	} else {
		Mojo.Log.error("Invalid URL (Status", m, "returned).");
		this.controller.get("dialogTitle").update("Invalid URL Please Retry");
		this.controller.getSceneScroller().mojo.revealTop(true);
		this.controller.get("newFeedURL").mojo.focus();
	}
};

AddFeedAssistant.prototype.cancel = function() {
	// TODO - Cancel Ajax request or Feed operation if in progress
	this.controller.stopListening("okButton", Mojo.Event.tap, this.checkFeedHandler);
	this.controller.stageController.popScene();
};

AddFeedAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "authentication-cmd":
				this.controller.get("usernameDiv").toggle();
				this.controller.get("passwordDiv").toggle();
				if (!this.controller.get("usernameDiv").visible()) {
					this.usernameModel.value = null;
					this.passwordModel.value = null;
					this.controller.modelChanged(this.usernameModel);
					this.controller.modelChanged(this.passwordModel);
				}
			case "shutup-JSLint":
				break;
		}
	} else	if (event.type === Mojo.Event.back) {
		if (!this.newFeed) {
			this.feed.url = this.originalUrl;
			this.feed.username = this.originalUsername;
			this.feed.password = this.originalPassword;
		}
	}
};
