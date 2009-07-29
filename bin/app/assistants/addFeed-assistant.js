function AddFeedAssistant(sceneAssistant, feed) {
	this.sceneAssistant = sceneAssistant;
	this.feed = feed;

	if (this.feed !== null) {
		this.newFeed = false;
		this.dialogTitle = "Edit Podcast XML Feed";
		this.title = this.feed.title;
		this.url = this.feed.url;
		this.autoDownload = this.feed.autoDownload;
		this.autoDelete = this.feed.autoDelete;
		this.maxDownloads = this.feed.maxDownloads;
		this.okButtonValue = "Update";
	} else {
		this.newFeed = true;
		this.dialogTitle = "Add Podcast XML Feed";
		this.title = null;
		this.url = null;
		this.autoDownload = true;
		this.autoDelete = true;
		this.maxDownloads = 5;
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

	this.controller.setupWidget("autoDownloadToggle",
		{},
		this.autoDownloadModel = { value : this.autoDownload });

	this.controller.setupWidget("autoDeleteToggle",
		{},
		this.autoDeleteModel = { value : this.autoDelete });

	this.controller.setupWidget("maxDownloadList",
		{label: "Keep at most",
		 modelProperty: "value",
		 min: 1, max: 20
		},
		this.maxDownloadsModel = { value : this.maxDownloads });

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

	if (!this.autoDeleteModel.value) {
		this.controller.get("maxDownloadList").hide();
	}

	this.autoDeleteHandler = this.autoDeleteChanged.bindAsEventListener(this);
	Mojo.Event.listen(this.controller.get('autoDeleteToggle'),Mojo.Event.propertyChange,this.autoDeleteHandler);

	//Mojo.Event.listen(this.sceneAssistant.controller, Mojo.Event.back, this.cancelHandler);
};

AddFeedAssistant.prototype.autoDeleteChanged = function(event) {
	if (event.value) {
		this.controller.get("maxDownloadList").show();
	} else {
		this.controller.get("maxDownloadList").hide();
	}
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
	if (this.feed !== null && this.feed.url === this.urlModel.value) {
		this.feed.title = this.nameModel.value;
		this.feed.autoDownload = this.autoDownloadModel.value;
		this.feed.autoDelete = this.autoDeleteModel.value;
		this.feed.maxDownloads = this.maxDownloadsModel.value;
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
	Mojo.Log.error("is it new?");
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
	Mojo.Log.error("it's new done!");
	this.feed.title = this.nameModel.value;
	this.feed.interval = 60000;
	this.feed.autoDownload = this.autoDownloadModel.value;
	this.feed.autoDelete = this.autoDeleteModel.value;
	this.feed.maxDownloads = this.maxDownloadsModel.value;

	Mojo.Log.error("checking feed");
	feedSuccess = this.feed.updateCheck(transport, this.sceneAssistant);
	Mojo.Log.error("checked");

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
		this.sceneAssistant.setInterval(this.feed);
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
