var DrPodder = {};
DrPodder.MainStageName = "DrPodderMain";
DrPodder.DashboardStageName = "DrPodderDashboard";
DrPodder.DownloadingStageName = "DrPodderDownloading";
DrPodder.DownloadedStageName = "DrPodderDownloaded";

function AppAssistant(){
	AppAssistant.downloadService = new DownloadService();
	AppAssistant.applicationManagerService = new ApplicationManagerService();
	AppAssistant.powerService = new PowerService();
	AppAssistant.mediaEventsService = new MediaEventsService();
	AppAssistant.wifiService = new WifiService();

	this.setWakeup();
}

AppAssistant.appMenuAttr = {omitDefaultItems: true};
AppAssistant.appMenuModel = {
	visible: true,
	items: [
		Mojo.Menu.editItem,
		{label: "OPML",
		 items: [{label: "Import from drpodder.xml", command: "import-cmd"},
				 {label: "Export via email", command: "export-cmd"}]
		},
		{label: "Preferences", command: "prefs-cmd"},
		Mojo.Menu.helpItem,
		{label: "About...", command: "about-cmd"}
	]
};

AppAssistant.prototype.handleLaunch = function(launchParams) {
	if (!launchParams || launchParams.action === undefined) {
		var cardStageController = this.controller.getStageController(DrPodder.MainStageName);
		if (cardStageController) {
			Mojo.Log.warn("Main Stage exists");
			cardStageController.activate();
		} else {
			var pushMainScene = function(stageController) {
				stageController.pushScene("loading");
			};
			Mojo.Log.warn("Create Main Stage");
			var stageArguments = {name: DrPodder.MainStageName, lightweight: true};
			this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");
		}
	} else {
		if (!DB) {
			DB = new DBClass();
			DB.waitForFeeds(this.handleLaunchParams.bind(this, launchParams));
		} else {
			this.handleLaunchParams(launchParams);
		}
	}
};

AppAssistant.prototype.handleLaunchParams = function(launchParams) {
	Mojo.Log.error("handleLaunchParams called: %s", launchParams.action);
	var dashboardOpen = this.controller.getStageController(DrPodder.DashboardStageName);
	var downloadedDashboardOpen = this.controller.getStageController(DrPodder.DownloadedStageName);
	var downloadingDashboardOpen = this.controller.getStageController(DrPodder.DownloadingStageName);
	switch (launchParams.action) {
		case "updateFeeds":
			if (Prefs.autoUpdate && !downloadingDashboardOpen && !feedModel.updatingFeeds) {
				feedModel.updateFeeds();
			}
			this.setWakeup();
			break;
		case "download":
			feedModel.download();
			break;
	}
};

AppAssistant.prototype.setWakeup = function() {
	// send wakeup from command line
	// luna-send -n 1 palm://com.palm.applicationManager/open '{"id":"com.drnull.drpodder","params":{"action":"updateFeeds"}}'
	// obviously, an update time preference needs to be here
	if (Prefs.autoUpdate) {
		this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
			method: "set",
			parameters: {
				"key": Mojo.appInfo.id + '.update', //"com.drnull.drpodder.update",
				"in": Prefs.updateInterval,
				//"wakeup": true,
				"uri": "palm://com.palm.applicationManager/open",
				"params": {
					"id": Mojo.appInfo.id, //"com.drnull.drpodder",
					"params": {"action": "updateFeeds"}
				}
			},
			onSuccess: function(response) {
				Mojo.Log.warn("Alarm set success: %s", response.returnValue);
			},
			onFailure: function(response) {
				Mojo.Log.warn("Alarm set failure: %s:%s", response.returnValue, response.errorText);
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
				stageController.pushScene("support");
				break;
			case "import-cmd":
				var req = new Ajax.Request("/media/internal/drpodder.xml", {
					method: 'get',
					onFailure: function() {
						Util.showError("Weird error reading OPML File", "I don't know what happened, but we couldn't read the drpodder.xml file.");
					},
					on404: function() {
						Util.showError("OPML File not found", "Please place the drpodder.xml file in the root of the Pre's USB directory and retry.");
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
									Mojo.Log.warn("Importing feed: (%s)-[%s]", title, url);
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
									Mojo.Log.warn("Skipping import: (%s)-[%s]", title, url);
								}
								node = nodes.iterateNext();
							}
							if (imported > 0) {
								DB.saveFeeds();
								Util.showError("OPML Import Finished", "Please refresh the Feed List to see the " + imported + " imported feed" + ((imported !== 1)?"s":""));
							} else {
								Util.showError("OPML Import Finished", "No valid feeds found in drpodder.xml");
							}
						} catch (e){
							Mojo.Log.error("error with OPML: (%s)", e);
							Util.showError("Error parsing OPML File", "There was an error parsing the OPML file.  Please send the file to support@drpodder.com.");
						}
					}.bind(this)
				});
				break;
			case "export-cmd":
				var message = "Copy the following out to a file named drpodder.xml.<br>" +
				              "To restore this set of feeds to drPodder, simply copy drpodder.xml to the root of the Pre's USB directory." +
							  "<br><br>&lt;opml version='1.1'>&lt;body><br>";
				for (var i=0; i<feedModel.items.length; i++) {
					var feed = feedModel.items[i];
					if (!feed.playlist) {
						message += "&lt;outline text='" + feed.title.replace(/&/g, "&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
						message += " type='rss' xmlUrl='" + feed.url.replace(/&/g, "&amp;amp;") + "'";
						message += " autoDownload='" + feed.autoDownload + "'";
						message += " autoDelete='" + feed.autoDelete + "'";
						message += " maxDownloads='" + feed.maxDownloads + "'";
						message += " replacements='" + feed.replacements.replace(/&/g,"&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
						message += "/><br>";
					}
				}
				message += "&lt;/body>&lt;/opml>";
				AppAssistant.applicationManagerService.email("drPodder OPML Export", message);
				break;
		}
	}
};
