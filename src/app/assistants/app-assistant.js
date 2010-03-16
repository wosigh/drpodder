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
	Mojo.Log.warn("handleLaunchParams called: %s", launchParams.action);
	var dashboardOpen = this.controller.getStageController(DrPodder.DashboardStageName);
	var downloadedDashboardOpen = this.controller.getStageController(DrPodder.DownloadedStageName);
	var downloadingDashboardOpen = this.controller.getStageController(DrPodder.DownloadingStageName);
	switch (launchParams.action) {
		case "updateFeeds":
			this.setWakeup();
			if (Prefs.autoUpdate && !downloadingDashboardOpen && !feedModel.updatingFeeds) {
				feedModel.updateFeeds();
			}
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
		// compute time based on Prefs
		// Prefs.updateType: H, D, W
		// Prefs.updateInterval: if H, use directly for "IN" alarm
		// Prefs.updateHour & .updateMinute: if D or W, use to compute next "AT" alarm
		// Prefs.updateDay: ditto
		var alarmType;
		var alarmTime;
		var alarmDate = new Date();
		var now = new Date();
		Mojo.Log.warn("updateType: %s", Prefs.updateType);
		switch (Prefs.updateType) {
			case "H":
				alarmType = "in";
				Mojo.Log.warn("updateInterval: %s", Prefs.updateInterval);
				alarmTime = Prefs.updateInterval;
				break;
			case "W":
				alarmType = "at";
				Mojo.Log.warn("updateDay/Hour/Minute: %s %s:%s", Prefs.updateDay, Prefs.updateHour, Prefs.updateMinute);
				var dayDelta = Math.abs(Prefs.updateDay-alarmDate.getDay())%7;
				alarmDate.setDate(alarmDate.getDate() + dayDelta);
				alarmDate.setHours(Prefs.updateHour);
				alarmDate.setMinutes(Prefs.updateMinute);
				break;
			case "D":
				alarmType = "at";
				Mojo.Log.warn("updateHour/Minute: %s:%s", Prefs.updateHour, Prefs.updateMinute);
				alarmDate.setHours(Prefs.updateHour);
				alarmDate.setMinutes(Prefs.updateMinute);
				break;
		}
		Mojo.Log.warn("alarmTime: %s", alarmTime);
		if (alarmType === "at") {
			// verify that the time is at least 6 minutes in the future
			// if not, jump forward a day or a week depending on Prefs.updateType
			if (now.valueOf() + 6*60*1000 > alarmDate.valueOf()) {
				alarmDate.setDate(alarmDate.getDate() + ((Prefs.updateType==="D")?1:7));
			}
			// "mm/dd/yyyy hh:mm:ss"
			var d = alarmDate;
			var mo = "" + (d.getUTCMonth()+1); if (mo.length === 1) { mo = "0" + mo;}
			var da = "" + d.getUTCDate();    if (da.length === 1) { da = "0" + da;}
			var yy = "" + d.getUTCFullYear();
			var hh = "" + d.getUTCHours();   if (hh.length === 1) { hh = "0" + hh;}
			var mi = "" + d.getUTCMinutes(); if (mi.length === 1) { mi = "0" + mi;}
			alarmTime = mo + "/" + da + "/" + yy + " " + hh + ":" + mi + ":00";
		}
		if (alarmTime && alarmType) {
			var parameters = {};
			parameters.key = Mojo.appInfo.id + '.update';
			parameters.uri = "palm://com.palm.applicationManager/open";
			parameters.params = {"id": Mojo.appInfo.id, "params": {"action": "updateFeeds"}};
			parameters[alarmType] = alarmTime;
			Mojo.Log.info("alarm request %s: %s", alarmType, alarmTime);
			this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
				method: "set",
				parameters: parameters,
				onSuccess: function(response) {
					Mojo.Log.warn("Alarm set success: %s", response.returnValue);
				},
				onFailure: function(response) {
					Mojo.Log.warn("Alarm set failure: %s:%s", response.returnValue, response.errorText);
				}
			});
		}

	}
};

AppAssistant.prototype.handleCommand = function(event) {
	var stageController = this.controller.getActiveStageController();
	var currentScene = stageController.activeScene();

	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "prefs-cmd":
				stageController.pushScene({name:"preferences", transition: Mojo.Transition.none});
				break;
			case "about-cmd":
				stageController.pushAppSupportInfoScene();
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
								var hideFromOS = Util.xmlGetAttributeValue(node, "hideFromOS");
								var username = Util.xmlGetAttributeValue(node, "username");
								var password = Util.xmlGetAttributeValue(node, "password");
								if (title !== undefined && url !== undefined) {
									Mojo.Log.warn("Importing feed: (%s)-[%s]", title, url);
									feed = new Feed();
									feed.url = url;
									feed.title = title;
									if (autoDownload !== undefined) {feed.autoDownload = (autoDownload==='1');}
									if (autoDelete !== undefined) {feed.autoDelete = (autoDelete==='1');}
									if (maxDownloads !== undefined) {feed.maxDownloads = maxDownloads;}
									if (replacements !== undefined) {feed.replacements = replacements;}
									if (hideFromOS !== undefined) {feed.hideFromOS = hideFromOS;}
									if (username !== undefined) {feed.username = username;}
									if (password !== undefined) {feed.password = password;}
									feedModel.items.push(feed);
									feed.update(null, null, true);
									imported++;
								} else {
									Mojo.Log.warn("Skipping import: (%s)-[%s]", title, url);
								}
								node = nodes.iterateNext();
							}
							if (imported > 0) {
								DB.saveFeeds();
								Util.showError("OPML Import Finished", "The " + imported + " imported feed" + ((imported !== 1)?"s":"") + " can be found at the END of your feed list.");
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
				var message = "Copy the following out to a file named drpodder.xml (Make sure the filename is all lowercase and Windows doesn't rename the file as drpodder.xml.txt).<br>" +
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
						message += " hideFromOS='" + feed.hideFromOS + "'";
						if (feed.username) {
							message += " username='" + feed.username + "'";
							message += " password='" + feed.password + "'";
						}
						message += "/><br>";
					}
				}
				message += "&lt;/body>&lt;/opml>";
				AppAssistant.applicationManagerService.email("drPodder OPML Export", message);
				break;
		}
	}
};
