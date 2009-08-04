function StageAssistant(){
}

StageAssistant.appMenuAttr = {omitDefaultItems: true};
StageAssistant.appMenuModel = {
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

StageAssistant.prototype.setup = function() {
	this.controller.pushScene("loading");
};

StageAssistant.prototype.handleCommand = function(event) {
	var currentScene = this.controller.activeScene();
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "prefs-cmd":
				this.controller.pushScene("preferences");
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
