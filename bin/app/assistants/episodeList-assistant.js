function EpisodeListAssistant(feedObject) {
	this.feedObject = feedObject;
	this.episodeModel = {items: feedObject.episodes};

	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(DrPodder.MainStageName);
}

EpisodeListAssistant.prototype.items = [];
//EpisodeListAssistant.prototype.episodeModel = {items: this.feedObject.episodes};
	// why can't we initialize this here?
	// use this to determine if we are wifi connected, if not, then we'll NOT auto-download mp3's
	// this.controller.serviceRequest('palm://com.palm.connectionmanager', {
    //method: 'getStatus',
    //parameters: {subscribe:true},
    //onSuccess: this.onSuccessHandler,
    //onFailure: this.onFailureHandler
	//});

EpisodeListAssistant.prototype.menuAttr = {omitDefaultItems: true};
EpisodeListAssistant.prototype.menuModel = {
	visible: true,
	items: [
		{label: "Edit Feed", command: "edit-cmd"},
		{label: "Mark all as New", command: "unlistened-cmd"},
		{label: "Mark all as Old", command: "listened-cmd"},
		{label: "Play from Newest", command: "playFromNewest-cmd"},
		{label: "Play from Oldest", command: "playFromOldest-cmd"},
		{label: "About...", command: "about-cmd"}
	]
};

EpisodeListAssistant.prototype.cmdMenuModel = {
	items: [
		{},
		{icon: "refresh", command: "refresh-cmd"}
	]
};

EpisodeListAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};

EpisodeListAssistant.prototype.setup = function() {
	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	var viewMenuPrev = {icon: "", command: "", label: " "};
	var viewMenuNext = {icon: "", command: "", label: " "};
	if (this.feedObject.displayOrder > 0) {
		viewMenuPrev = {icon: "back", command: "feedPrev-cmd"};
	}

	if (this.feedObject.displayOrder < feedModel.items.length-1) {
		viewMenuNext = {icon: "forward", command: "feedNext-cmd"};
	}

	this.viewMenuModel.items = [{items: [viewMenuPrev,
										{label: this.feedObject.title, width: 200, command: "feed-cmd"},
										viewMenuNext]}];
	this.controller.setupWidget(Mojo.Menu.viewMenu,
								{}, this.viewMenuModel);

	this.episodeAttr = {
		itemTemplate: "episodeList/episodeRowTemplate",
		listTemplate: "episodeList/episodeListTemplate",
		renderLimit: 40,
		reorderable: false,
		swipeToDelete: true,
		// autoconfirmDelete: true,
		// doesn't exist yet preventDeleteProperty: "downloaded",
		formatters: {"title": this.titleFormatter.bind(this), "pubDate": this.pubDateFormatter.bind(this)}};


	// things to move somewhere else...
	// check to see that episode.file exists and wasn't deleted...
	// http://developer.palm.com/distribution/viewtopic.php?f=16&t=133


	this.controller.setupWidget("episodeListWgt", this.episodeAttr, this.episodeModel);
	this.episodeList = this.controller.get("episodeListWgt");

	this.handleSelectionHandler = this.handleSelection.bindAsEventListener(this);
	this.handleDeleteHandler = this.handleDelete.bindAsEventListener(this);
	this.handleHoldHandler = this.handleHold.bindAsEventListener(this);
	this.dragStartHandler = this.clearPopupMenuOnSelection.bindAsEventListener(this);

	this.controller.setupWidget("episodeSpinner", {property: "downloading"});

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refreshDelayed.bind(this), 1);
	this.needRefresh = false;
};

EpisodeListAssistant.prototype.activate = function(changes) {
	this.refreshNow();
	Mojo.Event.listen(this.episodeList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.listen(this.episodeList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.listen(this.episodeList, Mojo.Event.hold, this.handleHoldHandler);
	Mojo.Event.listen(this.episodeList, Mojo.Event.dragStart, this.dragStartHandler);
};

EpisodeListAssistant.prototype.deactivate = function(changes) {
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.hold, this.handleHoldHandler);
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.dragStart, this.dragStartHandler);
};

EpisodeListAssistant.prototype.cleanup = function(changes) {
};

EpisodeListAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "unlistened-cmd":
				this.feedObject.unlistened();
				break;
			case "listened-cmd":
				this.feedObject.listened();
				break;
			case "edit-cmd":
				this.stageController.pushScene("addFeed", this.feedObject);
				break;
			case "refresh-cmd":
				this.cmdMenuModel.items[1].disabled = true;
				this.controller.modelChanged(this.cmdMenuModel);
				this.feedObject.update(function() {
					this.cmdMenuModel.items[1].disabled = false;
					this.controller.modelChanged(this.cmdMenuModel);
				}.bind(this));
				break;
			case "playFromNewest-cmd":
				this.playFrom();
				break;
			case "playFromOldest-cmd":
				this.playFrom(true);
				break;
			case "feedPrev-cmd":
				var feed = feedModel.items[this.feedObject.displayOrder-1];
				this.stageController.swapScene("episodeList", feed);
				break;
			case "feedNext-cmd":
				feed = feedModel.items[this.feedObject.displayOrder+1];
				this.stageController.swapScene("episodeList", feed);
				break;
			case "feed-cmd":
				this.controller.popupSubmenu({
					onChoose: this.handleFeedPopup.bind(this),
					manualPlacement: true,
					popupClass: "titlePopup1",
					//placeNear: event.originalEvent.target,
					items: [{label: "Play from Newest", command: "playFromNewest-cmd"},
							{label: "Play from Oldest", command: "playFromOldest-cmd"}]
				});
				break;
		}
	}
};

EpisodeListAssistant.prototype.handleFeedPopup = function(value) {
	switch(value) {
		case "playFromNewest-cmd":
			this.playFrom();
			break;
		case "playFromOldest-cmd":
			this.playFrom(true);
			break;
	}
};

EpisodeListAssistant.prototype.playFrom = function(oldest) {
	var playlist = [];
	for (var i=0,len=this.feedObject.episodes.length; i<len; ++i) {
		var episode = this.feedObject.episodes[i];
		if (!episode.listened && episode.enclosure) {
			playlist.push(episode);
		}
	}
	if (oldest) {playlist.reverse();}
	if (playlist.length > 0) {
		var e = playlist.shift();
		this.stageController.pushScene("episodeDetails", e, {autoPlay: true, resume: true, playlist: playlist});
	} else {
		Util.showError("Error playing episodes", "No New Episodes found");
	}
};

EpisodeListAssistant.prototype.titleFormatter = function(title, model) {
	var formatted = title;
	if (title) {
		formatted = this.feedObject.replace(title);
	}
	return formatted;
};

EpisodeListAssistant.prototype.pubDateFormatter = function(pubDate, model) {
	var formatted = pubDate;
	var d_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	var m_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	if (pubDate) {
		var d = new Date(pubDate);
		var y = d.getFullYear();
		var m = d.getMonth();
		var dom=d.getDate();
		var dow=d.getDay();
		var h=d.getHours()%12;
		var min=d.getMinutes();
		var pm = (d.getHours() >= 12)?"pm":"am";
		if (h===0) {h=12;}
		//if (m<10) {m="0"+m;}
		if (dom<10) {dom="0"+dom;}
		if (min<10) {min="0"+min;}
		//formatted = y+"/"+m+"/"+dom+" "+h+":"+min+" "+pm;
		formatted = d_names[dow] + " " + m_names[m] + " " + dom + ", " + y +
		            " " + h + ":" + min + " " + pm;
	}
	return formatted;
};

EpisodeListAssistant.prototype._refreshDebounced = function() {
	this.needRefresh = true;
	if (!this.refreshedOnce) {
		this._doRefresh();
		this.refreshedOnce = true;
	}
};

EpisodeListAssistant.prototype._refreshDelayed = function() {
	this.refreshedOnce = false;
	this._doRefresh();
};

EpisodeListAssistant.prototype._doRefresh = function() {
	if (this.needRefresh) {
		//Mojo.Log.error("ela refresh");
		this.controller.modelChanged(this.episodeModel);
		this.needRefresh = false;
	}
};

EpisodeListAssistant.prototype.refreshNow = function() {
	this.needRefresh = true;
	this._doRefresh();
};

EpisodeListAssistant.prototype.handleDelete = function(event) {
	event.stop();
	if (event.item.downloading) {
		event.item.cancelDownload();
	} else {
		event.item.setListened(true);
		event.item.deleteFile(true);
		event.item.clearBookmark(true);
		event.item.updateUIElements();
		event.item.save();
	}
};

EpisodeListAssistant.prototype.cmdItems = {
	deleteCmd     : {label: "Delete", command: "delete-cmd"},
	downloadCmd   : {label: "Download", command: "download-cmd"},
	cancelCmd     : {label: "Cancel", command: "cancel-cmd"},
	playCmd       : {label: "Play", command: "resume-cmd"},
	resumeCmd     : {label: "Resume", command: "resume-cmd"},
	restartCmd    : {label: "Restart", command: "restart-cmd"},
	listenedCmd   : {label: "Mark as Old", command: "listen-cmd"},
	unlistenedCmd : {label: "Mark as New", command: "unlisten-cmd"},
	clearCmd      : {label: "Clear Bookmark", command: "clear-cmd"},
	detailsCmd    : {label: "Episode Details", command: "details-cmd"},
	noEnclosureCmd: {label: "No enclosure found", command: "noenclosure-cmd", disabled: true}
};

EpisodeListAssistant.prototype.clearPopupMenuOnSelection = function(event) {
	this.popupMenuOnSelection = false;
};

EpisodeListAssistant.prototype.handleHold = function(event) {
	this.popupMenuOnSelection = true;
};

EpisodeListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	var episode = event.item;
	var items = [];

	if (!Prefs.singleTap || this.popupMenuOnSelection ||
		(targetClass.indexOf("episodeStatus") !== -1 &&
			!episode.downloading &&
			(episode.listened || !episode.enclosure) &&
			!episode.downloaded)) {
		this.popupMenuOnSelection = false;
		if (episode.downloading) {
			items.push(this.cmdItems.cancelCmd);
			items.push(this.cmdItems.playCmd);
			items.push(this.cmdItems.detailsCmd);
		} else {
			if (episode.enclosure) {
				if (!episode.downloaded) {
					items.push(this.cmdItems.downloadCmd);
				}
				if (episode.position) {
					items.push(this.cmdItems.resumeCmd);
					items.push(this.cmdItems.clearCmd);
					items.push(this.cmdItems.restartCmd);
				} else {
					items.push(this.cmdItems.playCmd);
				}
				if (episode.downloaded) {
					items.push(this.cmdItems.deleteCmd);
				}
			} else {
				items.push(this.cmdItems.noEnclosureCmd);
			}
			if (episode.listened) {
				items.push(this.cmdItems.unlistenedCmd);
			} else {
				items.push(this.cmdItems.listenedCmd);
			}
			items.push(this.cmdItems.detailsCmd);
		}
	} else {
		if (targetClass.indexOf("episodeStatus") === -1) {
			// we clicked on the row, just push the scene
			this.play(episode, true, true);
		} else {
			// we clicked on the icon, do something different
			if (episode.downloading) {
				// if we're downloading, just cancel the download
				episode.cancelDownload();
			} else {
				if (episode.enclosure) {
					if (episode.listened) {
						if (episode.downloaded) {
							episode.setListened();
							episode.deleteFile();
						} else {
							this.handleHold(event);
						}
					} else {
						if (episode.downloaded) {
							this.play(episode, true, true);
						} else {
							episode.download(true);
						}
					}
				}
			}
		}
	}
	if (items.length > 0) {
		this.controller.popupSubmenu({
			onChoose: this.menuSelection.bind(this, episode),
			placeNear: event.originalEvent.target,
			items: items
		});
	}
};

EpisodeListAssistant.prototype.menuSelection = function(episode, command) {
	//Mojo.Log.error("we tried to do:", command, "to", episode.title);
	switch (command) {
		case "listen-cmd":
			episode.setListened();
			break;
		case "unlisten-cmd":
			episode.setUnlistened();
			break;
		case "cancel-cmd":
			episode.cancelDownload();
			break;
		case "download-cmd":
			episode.download(true);
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
		case "clear-cmd":
			episode.clearBookmark();
			break;
		case "delete-cmd":
			episode.setListened();
			episode.deleteFile();
			break;
	}
};

EpisodeListAssistant.prototype.play = function(episode, autoPlay, resume) {
	this.stageController.pushScene("episodeDetails", episode, {"autoPlay": autoPlay, "resume": resume, playlist: []});
};

EpisodeListAssistant.prototype.updatePercent = function(episode) {
	//Mojo.Log.error("Setting percent to:", episode.downloadingPercent);
	var node = this.controller.get("episodeListWgt").mojo.getNodeByIndex(episode.displayOrder);
	var nodes = node.getElementsByClassName("progressDone");
	nodes[0].style.width = episode.downloadingPercent + "%";
};

EpisodeListAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "feedEpisodesUpdated":
				if (params.feed === this.feedObject) {
					this.refresh();
				}
				break;
			case "episodeUpdated":
				if (params.episode.feedObject === this.feedObject) {
					var episodeIndex = params.episodeIndex;
					if (episodeIndex === undefined) {
						episodeIndex = this.episodeModel.items.indexOf(params.episode);
					}
					if (episodeIndex !== -1) {
						this.episodeList.mojo.noticeUpdatedItems(episodeIndex, [params.episode]);
					}
				}
				break;
			case "downloadProgress":
				if (params.episode.feedObject === this.feedObject) {
					this.updatePercent(params.episode);
				}
				break;
			case "onFocus":
				this.refreshNow();
				break;
		}
	}
};
