var PrePod = {};
PrePod.MainStageName = "PrePodMain";

function AppAssistant(){
	AppAssistant.downloadService = new DownloadService();
	AppAssistant.mediaService = new MediaDBService();
	AppAssistant.applicationManagerService = new ApplicationManagerService();
	AppAssistant.powerService = new PowerService();
	AppAssistant.mediaEventsService = new MediaEventsService();

	this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	window.document.addEventListener(Mojo.Event.deactivate, this.onBlurHandler.bind(this));
	window.document.addEventListener(Mojo.Event.activate, this.onFocusHandler.bind(this));
	this.setWakeup();
}

AppAssistant.prototype.onBlurHandler = function() {
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
};

AppAssistant.prototype.onFocusHandler = function() {
	if (!this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	}
};

AppAssistant.appMenuAttr = {omitDefaultItems: true};
AppAssistant.appMenuModel = {
	visible: true,
	items: [
		{label: "OPML",
		 items: [{label: "Import from prepod.xml", command: "import-cmd"},
				 {label: "Export via email", command: "export-cmd"}]
		},
		{label: "Preferences", command: "prefs-cmd"},
		{label: "About...", command: "about-cmd"}
	]
};

AppAssistant.prototype.handleLaunch = function(launchParams) {
	var cardStageController = this.controller.getStageController(PrePod.MainStageName);

	if (!launchParams) {
		if (cardStageController) {
			Mojo.Log.error("Main Stage exists");
			cardStageController.popScenesTo("feedList");
			cardStageController.activate();
		} else {
			var pushMainScene = function(stageController) {
				stageController.pushScene("loading");
			};
			Mojo.Log.error("Create Main Stage");
			var stageArguments = {name: PrePod.MainStageName, lightweight: true};
			this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");
		}
	} else {
		Mojo.Log.error("Wakeup call!", launchParams.action);
		switch (launchParams.action) {
			case "updateFeeds":
				this.setWakeup();
				break;
			case "somethingElse":
				break;
		}

	}
};

AppAssistant.prototype.setWakeup = function() {
	// obviously, a preference needs to be here
	if (true) {
		this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
			method: "set",
			parameters: {
				"key": "com.palm.drnull.prepod.update",
				"in": "00:05:00",
				"uri": "palm://com.palm.applicationManager/open",
				"params": {
					"id": "com.palm.drnull.prepod",
					"params": {"action": "updateFeeds"}
				}
			},
			onSuccess: function(response) {
				Mojo.Log.error("Alarm set success: %s", response.returnValue);
			},
			onFailure: function(response) {
				Mojo.Log.error("Alarm set failure: %s:%s", response.returnValue, response.errorText);
			}
		});

	}
};

AppAssistant.prototype.handleCommand = function(event) {
	var stageController = this.controller.getActiveStageController();
	var currentScene = stageController.activeScene();

	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "prefs-cmd":
				stageController.pushScene("preferences");
				break;
			case "about-cmd":
				currentScene.showAlertDialog({
					onChoose: function(value) {},
					title: "PrePod - v" + Mojo.Controller.appInfo.version,
					message: "Copyright 2009, Jamie Hatfield",
					choices: [
						{label: "OK", value:""}
					]
				});
				break;
			case "import-cmd":
				var req = new Ajax.Request("/media/internal/prepod.xml", {
					method: 'get',
					onFailure: function() {
						Util.showError("Weird error reading OPML File", "I don't know what happened, but we couldn't read the prepod.xml file.");
					},
					on404: function() {
						Util.showError("OPML File not found", "Please place the prepod.xml file in the root of the Pre's USB directory and retry.");
					},
					onSuccess: function(transport) {
						try {
							var doc = transport.responseXML = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
							var nodes = document.evaluate("//outline", doc, null, XPathResult.ANY_TYPE, null);
							var node = nodes.iterateNext();
							var imported = 0;
							while (node) {
								var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
								var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
								var autoDownload = Util.xmlGetAttributeValue(node, "autoDownload");
								var autoDelete = Util.xmlGetAttributeValue(node, "autoDelete");
								var maxDownloads = Util.xmlGetAttributeValue(node, "maxDownloads");
								var replacements = Util.xmlGetAttributeValue(node, "replacements");
								if (title !== undefined && url !== undefined) {
									Mojo.Log.error("Importing feed: (%s)-[%s]", title, url);
									feed = new Feed();
									feed.url = url;
									feed.title = title;
									if (autoDownload !== undefined) {feed.autoDownload = (autoDownload==='1');}
									if (autoDelete !== undefined) {feed.autoDelete = (autoDelete==='1');}
									if (maxDownloads !== undefined) {feed.maxDownloads = maxDownloads;}
									if (replacements !== undefined) {feed.replacements = replacements;}
									feedModel.items.push(feed);
									imported++;
								} else {
									Mojo.Log.error("Skipping import: (%s)-[%s]", title, url);
								}
								node = nodes.iterateNext();
							}
							if (imported > 0) {
								DB.saveFeeds();
								Util.showError("OPML Import Finished", "Please refresh the Feed List to see the " + imported + " imported feed" + ((imported !== 1)?"s":""));
							} else {
								Util.showError("OPML Import Finished", "No valid feeds found in prepod.xml");
							}
						} catch (e){
							Mojo.Log.error("error with OPML: (%s)", e);
							Util.showError("Error parsing OPML File", "There was an error parsing the OPML file.  Please send the file to drnull.");
						}
					}.bind(this)
				});
				break;
			case "export-cmd":
				var message = "Copy the following out to a file named prepod.xml.<br>" +
				              "To restore this set of feeds to PrePod, simply copy prepod.xml to the root of the Pre's USB directory." +
							  "<br><br>&lt;opml version='1.1'>&lt;body><br>";
				for (var i=0; i<feedModel.items.length; i++) {
					var feed = feedModel.items[i];
					message += "&lt;outline text='" + feed.title.replace(/&/g, "&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
					message += " type='rss' xmlUrl='" + feed.url.replace(/&/g, "&amp;amp;") + "'";
					message += " autoDownload='" + feed.autoDownload + "'";
					message += " autoDelete='" + feed.autoDelete + "'";
					message += " maxDownloads='" + feed.maxDownloads + "'";
					message += " replacements='" + feed.replacements.replace(/&/g,"&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
					message += "/><br>";
				}
				message += "&lt;/body>&lt;/opml>";
				AppAssistant.applicationManagerService.email("PrePod OPML Export", message);
				break;
		}
	}
};
