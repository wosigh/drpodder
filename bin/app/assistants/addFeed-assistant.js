function AddFeedAssistant(sceneAssistant, feed) {
	this.sceneAssistant = sceneAssistant;
	this.feed = feed;

	// default empty replacement
	this.replacementModel = {items: []};

	if (this.feed !== null) {
		this.newFeed = false;
		this.dialogTitle = "Edit Podcast XML Feed";
		this.title = this.feed.title;
		this.url = this.feed.url;
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
		this.autoDownload = false;
		this.autoDelete = true;
		this.maxDownloads = 1;
		this.okButtonValue = "Add Feed";
	}
}

AddFeedAssistant.prototype.setup = function() {
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

	this.controller.setupWidget("newFeedName", {
			hintText : $L("Title (Optional)"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeTitleCase,
			enterSubmits : false
		},
		this.nameModel = { value : this.title });

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
	Mojo.Event.listen(this.replacementList, Mojo.Event.listAdd, this.listAddHandler);
	Mojo.Event.listen(this.replacementList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.listen(this.replacementList, Mojo.Event.listReorder, this.listReorderHandler);

	this.controller.setupWidget("okButton", {
		type : Mojo.Widget.activityButton
	}, this.okButtonModel = {
		buttonLabel : this.okButtonValue,
		disables : false
	});
	this.okButtonActive = false;
	this.okButton = this.controller.get('okButton');
	this.checkFeedHandler = this.checkFeed.bindAsEventListener(this);
	this.controller.listen("okButton", Mojo.Event.tap,
			this.checkFeedHandler);

	if (!this.autoDownloadModel.value) {
		this.controller.get("maxDownloadsRow").hide();
		this.controller.get("autoDownloadRow").addClassName("last");
	}

	this.autoDownloadHandler = this.autoDownloadChanged.bindAsEventListener(this);
	Mojo.Event.listen(this.controller.get('autoDownloadToggle'),Mojo.Event.propertyChange,this.autoDownloadHandler);

	//Mojo.Event.listen(this.sceneAssistant.controller, Mojo.Event.back, this.cancelHandler);
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
	this.feed.title = this.nameModel.value;
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
	Mojo.Log.error("New Feed URL Request: ", this.urlModel.value);

	// Check for "http://" on front or other legal prefix; any string of
	// 1 to 5 alpha characters followed by ":" is ok, else prepend "http://"
	var url = this.urlModel.value;
	if (/^[A-Za-z]{1,5}:/.test(url) === false) {
		// Strip any leading slashes
		url = url.replace(/^\/{1,2}/, "");
		url = "http://" + url;
	}

	// Update the entered URL & model
	this.urlModel.value = url;
	this.controller.modelChanged(this.urlModel);

	// If the url is the same, then assume that it's just a title change,
	// update the feed title and close the dialog. Otherwise update the feed.
	if (!this.newFeed && this.feed !== null && this.feed.url === this.urlModel.value) {
		this.updateFields();
		this.sceneAssistant.refresh();
		DB.saveFeeds();
		this.controller.stageController.popScene();
	} else {
		this.okButton.mojo.activate();
		this.okButtonActive = true;
		this.okButtonModel.buttonLabel = "Updating Feed";
		this.okButtonModel.disabled = true;
		this.controller.modelChanged(this.okButtonModel);

		var request = new Ajax.Request(url, {
			method : "get",
			evalJSON : "false",
			onSuccess : this.checkSuccess.bind(this),
			onFailure : this.checkFailure.bind(this)
		});
	}
};

AddFeedAssistant.prototype.checkSuccess = function(transport) {
	var feedStatus = UPDATECHECK_INVALID;
	// Prototype template object generates a string from return status
	var t = new Template($L("#{status}"));
	var m = t.evaluate(transport);
	Mojo.Log.info("Valid URL (Status ", m, " returned).");

	// DEBUG - Work around due occasion Ajax XML error in response.
	if (transport.responseXML === null && transport.responseText !== null) {
		Mojo.Log.info("Request not in XML format - manually converting");
		transport.responseXML = new DOMParser().parseFromString(
				transport.responseText, "text/xml");
	}

	//  If a new feed, push the entered feed data on to the feedlist and
	//  call processFeed to evaluate it.
	if (this.newFeed) {
		this.feed = new Feed();
		this.feed.url = this.urlModel.value;
	} else {
		this.feed.url = this.urlModel.value;

		// need to clear out this feed (and probably delete downloaded episodes)
		this.feed.episodes = [];
		this.feed.numEpisodes = 0;
		this.feed.numNew = 0;
		this.feed.numStarted = 0;
		this.feed.numDownloaded = 0;
		this.feed.albumArt = null;
	}
	this.feed.interval = 60000;
	this.updateFields();

	this.feed.gui = true;
	feedSuccess = this.feed.updateCheck(transport, this.sceneAssistant);
	this.feed.gui = false;

	if (feedSuccess <= 0) {
		// Feed can't be processed - remove it but keep the dialog open
		Mojo.Log.error("Error updating feed:", this.urlModel.value);
		this.controller.get("dialogTitle").update("Error updating feed");
		this.controller.getSceneScroller().mojo.revealTop(true);
		this.controller.get("newFeedURL").mojo.focus();

		this.resetButton();
	} else {
		if (this.newFeed) {
			feedModel.items.push(this.feed);
		}
		this.sceneAssistant.refresh();
		DB.saveFeeds();
		this.controller.stageController.popScene();
	}
};

AddFeedAssistant.prototype.resetButton = function() {
	this.okButton.mojo.deactivate();
	this.okButtonActive = false;
	this.okButtonModel.buttonLabel = "OK";
	this.okButtonModel.disabled = false;
	this.controller.modelChanged(this.okButtonModel);
};

AddFeedAssistant.prototype.checkFailure = function(transport) {
	// Prototype template object generates a string from return status
	var t = new Template("#{status}");
	var m = t.evaluate(transport);

	this.resetButton();

	// Log error and put message in status area
	Mojo.Log.error("Invalid URL (Status", m, "returned).");
	this.controller.get("dialogTitle").update("Invalid URL Please Retry");
	this.controller.getSceneScroller().mojo.revealTop(true);
	this.controller.get("newFeedURL").mojo.focus();
};

AddFeedAssistant.prototype.cancel = function() {
	// TODO - Cancel Ajax request or Feed operation if in progress
	this.controller.stopListening("okButton", Mojo.Event.tap, this.checkFeedHandler);
	//Mojo.Event.stopListening(this.sceneAssistant.controller, Mojo.Event.back, this.cancelHandler);
	this.controller.stageController.popScene();
};
