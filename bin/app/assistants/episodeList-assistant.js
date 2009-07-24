function EpisodeListAssistant(feedObject) {
	this.feedObject = feedObject;
	this.episodeModel = {items: feedObject.episodes};
}

EpisodeListAssistant.prototype.items = [];
//EpisodeListAssistant.prototype.episodeModel = {items: this.feedObject.episodes};
	// why can't we initialize this here?
EpisodeListAssistant.prototype.episodeAttr = {
	itemTemplate: "episodeList/episodeRowTemplate",
	listTemplate: "episodeList/episodeListTemplate",
	renderLimit: 40,
	reorderable: false};

	// use this to determine if we are wifi connected, if not, then we'll NOT auto-download mp3's
	// this.controller.serviceRequest('palm://com.palm.connectionmanager', {
    //method: 'getStatus',
    //parameters: {subscribe:true},
    //onSuccess: this.onSuccessHandler,
    //onFailure: this.onFailureHandler
	//});

EpisodeListAssistant.prototype.setup = function() {
	// probably would be good to go ahead and go through the episode list here
	// check if we have any tickets for downloads, and see if they're done.
	// if not, start the download watcher
	//this.feedObject.numNew = 0;
	//this.feedObject.numDownloaded = 0;
	//this.feedObject.numEpisodes = 0;
	for (var i=0; i<this.episodeModel.items.length; i++) {
		var episode = this.episodeModel.items[i];
		if (episode.downloadTicket) {
			Mojo.Log.error("Hey, looks like you were downloading:", episode.title, " resuming:", episode.downloadTicket);
			episode.downloading = true;
			episode.downloadingPercent = 0;
			episode.downloadingIndex = i;
			this.refresh();
			AppAssistant.downloadService.downloadStatus(this.controller, episode.downloadTicket,
				this.downloading.bind(this, episode, i));
		} else {
			episode.downloading = false;
		}

		// check to see that episode.file exists and wasn't deleted...
		// http://developer.palm.com/distribution/viewtopic.php?f=16&t=133
		if (episode.listened) {
			episode.indicatorColor = "gray";
		} else {
			episode.indicatorColor = "black";
			//this.feedObject.numNew++;
		}
		//this.feedObject.numEpisodes++;

		this.updateStatusIcon(episode);
	}

	this.controller.get("episodeListWgt").observe(Mojo.Event.listTap, this.handleSelection.bindAsEventListener(this));
	//this.controller.get("episodeListWgt").observe(Mojo.Event.listDelete, this.handleDelete.bindAsEventListener(this));
	//this.controller.get("episodeListWgt").observe(Mojo.Event.hold, this.handleHold.bindAsEventListener(this));
	// might be better to do the holdEnd...
	// this.controller.get("episodeListWgt").observe(Mojo.Event.holdEnd, this.handleHold.bindAsEventListener(this));


	this.controller.setupWidget("episodeListWgt", this.episodeAttr, this.episodeModel);

	this.controller.setupWidget("episodeSpinner", {property: "downloading"});
};

EpisodeListAssistant.prototype.refresh = function() {
	this.controller.modelChanged(this.episodeModel);
};

/*
EpisodeListAssistant.prototype.handleHold = function(event) {
	// we could popup a dialog here to delete the downloaded song or stream a song if not downloaded?
	event.stop();

	this.controller.popupSubmenu({
		onChoose: this.holdSelection.bind(this),
		placeNear: event.target,
		items: [
			{label: "Play", command: "play-cmd"},
			{label: "Delete", command: "delete-cmd"},
			{label: "Download", command: "download-cmd"},
			{label: "Mark Listened", command: "listen-cmd"}
		]
	});
	Mojo.Log.error("Hold stopped?");
};
*/

EpisodeListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	var episode = event.item;
	var items = [];
	var deleteCmd     = {label: "Delete", command: "delete-cmd"};
	var downloadCmd   = {label: "Download", command: "download-cmd"};
	var resumeCmd     = {label: "Resume", command: "resume-cmd"};
	var restartCmd    = {label: "Restart", command: "restart-cmd"};
	var listenedCmd   = {label: "Mark Listened", command: "listen-cmd"};
	var unlistenedCmd = {label: "Mark Unlistened", command: "unlisten-cmd"};
	var detailsCmd    = {label: "Episode Details", command: "details-cmd"};

	if (targetClass.indexOf("episodeStatus") === -1) {
		// we clicked on the row, just push the scene
		this.play(episode, false, true);
	} else {
		// we clicked on the icon, do something different
		var index = event.index;
		if (episode.downloading) {
			// if we're downloading, just cancel the download
			this.cancelDownload(episode);
		} else {
			if (!episode.downloaded) {
				items.push(downloadCmd);
			}
			items.push(resumeCmd);
			items.push(restartCmd);
			if (episode.downloaded) {
				items.push(deleteCmd);
			}

			if (episode.listened) {
				items.push(unlistenedCmd);
			} else {
				items.push(listenedCmd);
			}
			items.push(detailsCmd);
		}

		if (items.length > 0) {
			this.controller.popupSubmenu({
				onChoose: this.menuSelection.bind(this, episode, index),
				placeNear: event.originalEvent.target,
				items: items
			});
		}
	}
};

EpisodeListAssistant.prototype.menuSelection = function(episode, index, command) {
	//Mojo.Log.error("we tried to do:", command, "to", episode.title);
	switch (command) {
		case "listen-cmd":
			this.listened(episode);
			this.refresh();
			DB.saveFeeds();
			break;
		case "unlisten-cmd":
			this.unlistened(episode);
			this.refresh();
			DB.saveFeeds();
			break;
		case "download-cmd":
			this.download(episode, index);
			break;
		case "stream-cmd":
			this.play(episode, true, true);
			break;
		case "restart-cmd":
			this.play(episode, true, false);
			break;
		case "resume-cmd":
			this.play(episode, true, true);
			break;
		case "details-cmd":
			this.play(episode, false, true);
			break;
		case "play-cmd":
			this.play(episode, true, true);
			break;
		case "delete-cmd":
			this.deleteFile(episode);
			this.listened(episode);
			this.refresh();
			DB.saveFeeds();
			break;
	}
};


EpisodeListAssistant.prototype.download = function(episode, index) {
	if (episode.downloaded) {
		Mojo.Log.error("We're trying to delete: ["+episode.file+"]");
		this.deleteFile(episode);
	}

	AppAssistant.downloadService.download(this.controller, episode.enclosure,
		this.downloading.bind(this, episode, index));
};

EpisodeListAssistant.prototype.cancelDownload = function(episode) {
	Mojo.Log.error("attempting to cancel download:", episode.downloadTicket);
	AppAssistant.downloadService.cancelDownload(this.controller, episode.downloadTicket,
		function(event) {
			Mojo.Log.error("Canceling download");
		}.bind(this)
	);
};

EpisodeListAssistant.prototype.deleteFile = function(episode) {
	AppAssistant.mediaService.deleteFile(this.controller, episode.file, function(event) {
		episode.file = null;
		episode.downloaded = false;
		this.updateStatusIcon(episode);
		this.feedObject.numDownloaded--;
		this.refresh();
		DB.saveFeeds();
	}.bind(this));
};

EpisodeListAssistant.prototype.play = function(episode, autoPlay, resume) {
	this.controller.stageController.pushScene("episodeDetails", episode, autoPlay, resume);
};

EpisodeListAssistant.prototype.listened = function(episode) {
	if (!episode.listened) {
		episode.indicatorColor = "gray";
		episode.listened = true;
		this.feedObject.numNew--;
	}
	this.updateStatusIcon(episode);
};

EpisodeListAssistant.prototype.unlistened = function(episode) {
	if (episode.listened) {
		episode.indicatorColor = "black";
		episode.listened = false;
		this.feedObject.numNew++;
	}
	this.updateStatusIcon(episode);
};

EpisodeListAssistant.prototype.downloaded = function(episode){
	if (!episode.downloaded) {
		episode.downloaded = true;
		this.feedObject.numDownloaded++;
	}
	this.updateStatusIcon(episode);
};

EpisodeListAssistant.prototype.downloading = function(episode, index, event) {
	if (event.returnValue) {
		episode.downloadTicket = event.ticket;
		episode.downloadingPercent = 0;
		episode.downloadingIndex = index;
		if (!episode.downloading) {
			episode.downloading = true;
			this.updateStatusIcon(episode);
			this.refresh();
			DB.saveFeeds();
		}
	} else if (event.aborted || event.completed === false) {
		Mojo.Log.error("Download aborted!", episode.title);
		episode.downloadTicket = 0;
		episode.downloadingPercent = 0;
		episode.downloading = false;
		this.updateStatusIcon(episode);
		this.refresh();
		DB.saveFeeds();
	} else if (event.completed) {
		Mojo.Log.error("Download complete!", episode.title);
		episode.downloadTicket = 0;
		episode.downloading = false;
		episode.downloadingPercent = 0;
		this.unlistened(episode);

		episode.file = event.target;
		this.downloaded(episode);
		this.refresh();
		DB.saveFeeds();
	} else if (episode.downloading) {
		var per = 0;
		// if amountTotal is < 2048 or so, we'll assume it's a redirect
		if (event.amountTotal > 0 && event.amountReceived > 0 && event.amountTotal > 2048) {
			per = Math.floor(1000*event.amountReceived/event.amountTotal)/10;
		}
		if (episode.downloadingPercent !== per) {
			episode.downloadingPercent = per;
			this.updatePercent(episode);
		}
	} else {
		Mojo.Log.error("Error handling downloading of", episode.title);
		Utilities.dump(event);
		episode.downloadTicket = 0;
		episode.downloading = false;
		episode.downloadingPercent = 0;
		episode.downloadingIndex = index;
		this.updateStatusIcon(episode);
		this.refresh();
		DB.saveFeeds();
	}
};

EpisodeListAssistant.prototype.updatePercent = function(episode) {
	//Mojo.Log.error("Setting percent to:", episode.downloadingPercent);
	var node = this.controller.get("episodeListWgt").mojo.getNodeByIndex(episode.downloadingIndex);
	var nodes = node.getElementsByClassName("progressDone");
	nodes[0].style.width = episode.downloadingPercent + "%";
};

EpisodeListAssistant.prototype.updateStatusIcon = function(episode) {
	if (episode.downloading) {
		episode.statusIcon = "Knob Cancel.png";
	} else {
		if (episode.listened) {
			if (episode.downloaded) {
				episode.statusIcon = "Knob Remove Red.png";
			} else {
				episode.statusIcon = "Knob Grey.png";
			}
		} else {
			if (episode.downloaded) {
				episode.statusIcon = "Knob Play.png";
			} else {
				episode.statusIcon = "Knob Download.png";
			}
		}
	}
};
