function AddFeedAssistant(sceneAssistant, feed) {
	this.sceneAssistant = sceneAssistant;
	this.feed = feed;

	if (this.feed !== null) {
		this.dialogTitle = "Edit Podcast XML Feed";
		this.title = this.feed.title;
		this.url = this.feed.url;
	} else {
		this.dialogTitle = "Add Podcast XML Feed";
		this.title = null;
		this.url = null;
	}
}

AddFeedAssistant.prototype.setup = function(widget) {
	this.widget = widget;

	this.sceneAssistant.controller.get("add-feed-title").update(this.dialogTitle);
	this.sceneAssistant.controller.setupWidget("newFeedURL",
		{
			hintText : $L("RSS feed URL"),
			focus : true,
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.urlModel = { value : this.url });

	this.sceneAssistant.controller.setupWidget("newFeedName", {
			hintText : $L("Title (Optional)"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeTitleCase,
			enterSubmits : false
		},
		this.nameModel = { value : this.title });

	this.sceneAssistant.controller.setupWidget("okButton", {
		type : Mojo.Widget.activityButton
	}, this.okButtonModel = {
		buttonLabel : "OK",
		disables : false
	});
	this.okButtonActive = false;
	this.okButton = this.sceneAssistant.controller.get('okButton');
	this.checkFeedHandler = this.checkFeed.bindAsEventListener(this);
	this.sceneAssistant.controller.listen("okButton", Mojo.Event.tap,
			this.checkFeedHandler);

	this.sceneAssistant.controller.setupWidget("cancelButton", {
		type : Mojo.Widget.simpleButton
	},
	{
		buttonLabel : "Cancel"
	});
	this.cancelHandler = this.cancel.bindAsEventListener(this);
	this.sceneAssistant.controller.listen("cancelButton", Mojo.Event.tap,
			this.cancelHandler);
	//Mojo.Event.listen(this.sceneAssistant.controller, Mojo.Event.back, this.cancelHandler);
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
	Mojo.Log.error("url:", url);

	// Update the entered URL & model
	this.urlModel.value = url;
	this.sceneAssistant.controller.modelChanged(this.urlModel);

	// If the url is the same, then assume that it's just a title change,
	// update the feed title and close the dialog. Otherwise update the feed.
	if (this.feed && this.feed.url == this.urlModel.value) {
		this.feed.title = this.nameModel.value;
		this.sceneAssistant.refresh();
		DB.saveFeeds();
		this.widget.mojo.close();
	} else {
		this.okButton.mojo.activate();
		this.okButtonActive = true;
		this.okButtonModel.buttonLabel = "Updating Feed";
		this.okButtonModel.disabled = true;
		this.sceneAssistant.controller.modelChanged(this.okButtonModel);

		var request = new Ajax.Request(url, {
			method : "get",
			evalJSON : "false",
			onSuccess : this.checkSuccess.bind(this),
			onFailure : this.checkFailure.bind(this)
		});
	}
};

AddFeedAssistant.prototype.checkSuccess = function(transport) {
	var newFeed = false;
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
	if (this.feed === null) {
		newFeed = true;
		this.feed = new Feed();
		this.feed.url = this.urlModel.value;
		this.feed.title = this.nameModel.value;
		this.feed.interval = 60000;
	} else {
		this.feed.url = this.urlModel.value;
		this.feed.title = this.nameModel.value;

		// need to clear out this feed (and probably delete downloaded episodes)
		this.feed.episodes = [];
		this.feed.numEpisodes = 0;
		this.feed.numNew = 0;
		this.feed.numStarted = 0;
		this.feed.numDownloaded = 0;
		this.feed.interval = 60000;
		this.feed.maxDownloads = 5;
		this.feed.autoDelete = true;
		this.feed.autoDownload = true;
		this.feed.albumArt = null;
	}

	feedSuccess = this.feed.updateCheck(transport, this.sceneAssistant);

	if (feedSuccess <= 0) {
		// Feed can't be processed - remove it but keep the dialog open
		Mojo.Log.error("Error updating feed:", this.urlModel.value);
		this.sceneAssistant.controller.get("add-feed-title").update("Error updating feed");

		this.resetButton();
		this.feed = null;
	} else {
		if (newFeed) {
			feedModel.items.push(this.feed);
		}
		this.sceneAssistant.setInterval(this.feed);
		this.sceneAssistant.refresh();
		DB.saveFeeds();
		this.sceneAssistant.activate();
		this.widget.mojo.close();
	}
};

AddFeedAssistant.prototype.resetButton = function() {
	this.okButton.mojo.deactivate();
	this.okButtonActive = false;
	this.okButtonModel.buttonLabel = "OK";
	this.okButtonModel.disabled = false;
	this.sceneAssistant.controller.modelChanged(this.okButtonModel);
};

AddFeedAssistant.prototype.checkFailure = function(transport) {
	// Prototype template object generates a string from return status
	var t = new Template("#{status}");
	var m = t.evaluate(transport);

	this.resetButton();
	this.feed = null;

	// Log error and put message in status area
	Mojo.Log.error("Invalid URL (Status", m, "returned).");
	var addFeedTitleElement = this.sceneAssistant.controller.get("add-feed-title");
	addFeedTitleElement.update("Invalid URL Please Retry");
};

AddFeedAssistant.prototype.cancel = function() {
	// TODO - Cancel Ajax request or Feed operation if in progress
	this.sceneAssistant.controller.stopListening("okButton", Mojo.Event.tap, this.checkFeedHandler);
	this.sceneAssistant.controller.stopListening("cancelButton", Mojo.Event.tap, this.cancelHandler);
	//Mojo.Event.stopListening(this.sceneAssistant.controller, Mojo.Event.back, this.cancelHandler);
	this.sceneAssistant.activate();
	this.widget.mojo.close();
};
