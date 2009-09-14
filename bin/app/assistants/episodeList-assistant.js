function EpisodeListAssistant(feedObject) {
	this.feedObject = feedObject;
	this.episodeModel = {items: []};

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

EpisodeListAssistant.prototype.filterMenuModel = {
	items: [
		{label: "ALL", command: "filter-all-cmd"},
		{label: "New", command: "filter-new-cmd"},
		{label: "Old", command: "filter-old-cmd"},
		{label: "Downloaded", command: "filter-downloaded-cmd"},
		{label: "Downloading", command: "filter-downloading-cmd"},
		{label: "Paused", command: "filter-paused-cmd"}
	]
};

EpisodeListAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};

EpisodeListAssistant.prototype.filterEpisodes = function() {
	var newModel = this.feedObject.episodes;
	if (this.feedObject.viewFilter !== "ALL") {
		var filterFunc = function(e) {return !e.listened;};
		switch (this.feedObject.viewFilter) {
			case "Old":
				filterFunc = function(e) {return e.listened;};
				break;
			case "Downloaded":
				filterFunc = function(e) {return e.downloaded;};
				break;
			case "Downloading":
				filterFunc = function(e) {return e.downloading;};
				break;
			case "Paused":
				filterFunc = function(e) {return e.position;};
				break;
			case "New":
				break;
			default:
				break;
		}
		newModel = this.feedObject.episodes.filter(filterFunc);
	}


	var refreshNeeded = false;
	if (newModel.length !== this.episodeModel.items.length) {
		refreshNeeded = true;
	} else {
		for (var i=0,len=newModel.length; i<len; ++i) {
			if (this.episodeModel.items[i] !== newModel[i]) {
				refreshNeeded = true;
				break;
			}
		}
	}

	if (refreshNeeded) {
		this.episodeModel.items = newModel;
		this.refreshNow();
	}
};

EpisodeListAssistant.prototype.setup = function() {
	this.cmdMenuModel = {
		items: [
			{label: "View: " + this.feedObject.viewFilter, submenu: "filter-menu"},
			{icon: "refresh", command: "refresh-cmd"}
		]
	};

	this.menuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{label: "Edit Feed", command: "edit-cmd"},
			{label: "Mark all as New", command: "unlistened-cmd"},
			{label: "Mark all as Old", command: "listened-cmd"},
			{label: "Play from Top", command: "playFromNewest-cmd"},
			{label: "Play from Bottom", command: "playFromOldest-cmd"},
			{label: "About...", command: "about-cmd"}
		]
	};

	if (this.feedObject.playlist) {
		this.menuModel.items[0].label = "Edit Playlist";

	}

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
	this.controller.setupWidget("filter-menu", this.handleCommand, this.filterMenuModel);

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

	var itemTemplate ="episodeList/episodeRowTemplate";
	if (this.feedObject.playlist) {
		itemTemplate = "episodeList/playlistRowTemplate";
	}

	this.episodeAttr = {
		itemTemplate: itemTemplate,
		listTemplate: "episodeList/episodeListTemplate",
		renderLimit: 40,
		reorderable: false,
		swipeToDelete: true,
		// preventDeleteProperty: "noDelete", // based on !listened || downloaded || position
		// autoconfirmDelete: true,
		formatters: {"title": this.titleFormatter.bind(this), "pubDate": this.pubDateFormatter.bind(this),
		             "albumArt": this.albumArtFormatter.bind(this),
					 "bookmarkPercent": this.bookmarkPercentFormatter.bind(this),
					 "downloadingPercent": this.downloadingPercentFormatter.bind(this)}};

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

EpisodeListAssistant.prototype.downloadingPercentFormatter = function(downloadingPercent, model) {
	var formatted = downloadingPercent;
	if (formatted && this.feedObject.playlist) {
		formatted = "" + (formatted * 0.82);
	}
	return formatted;
};

EpisodeListAssistant.prototype.bookmarkPercentFormatter = function(bookmarkPercent, model) {
	var formatted = bookmarkPercent;
	if (formatted && this.feedObject.playlist) {
		formatted = "" + (formatted * 0.82);
	}
	return formatted;
};

EpisodeListAssistant.prototype.albumArtFormatter = function(albumArt, model) {
	var formatted = albumArt;

	if (formatted) {
		formatted = "/var/luna/data/extractfs" +
						encodeURIComponent(albumArt) +
						":0:0:48:48:3";
	}

	return formatted;
};


EpisodeListAssistant.prototype.activate = function(changes) {
	this.refresh();
	this.filterEpisodes();
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
				if (this.feedObject.playlist) {
					this.stageController.pushScene("addPlaylist", this.feedObject);
				} else {
					this.stageController.pushScene("addFeed", this.feedObject);
				}
				break;
			case "refresh-cmd":
				this.cmdMenuModel.items[1].disabled = true;
				this.controller.modelChanged(this.cmdMenuModel);
				this.feedObject.update(function() {
					this.cmdMenuModel.items[1].disabled = false;
					this.controller.modelChanged(this.cmdMenuModel);
					this.feedObject.download();
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
					items: [{label: "Play from Top", command: "playFromNewest-cmd"},
							{label: "Play from Bottom", command: "playFromOldest-cmd"}]
				});
				break;
			case "filter-all-cmd":
				this.handleFilterCommand("ALL");
				break;
			case "filter-new-cmd":
				this.handleFilterCommand("New");
				break;
			case "filter-old-cmd":
				this.handleFilterCommand("Old");
				break;
			case "filter-downloaded-cmd":
				this.handleFilterCommand("Downloaded");
				break;
			case "filter-downloading-cmd":
				this.handleFilterCommand("Downloading");
				break;
			case "filter-paused-cmd":
				this.handleFilterCommand("Paused");
				break;
		}
	}
};

EpisodeListAssistant.prototype.handleFilterCommand = function(filter) {
	this.feedObject.viewFilter = filter;
	this.cmdMenuModel.items[0].label = "View: " + filter;
	this.controller.modelChanged(this.cmdMenuModel);
	this.filterEpisodes();
	DB.saveFeed(this.feedObject);
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
	for (var i=0,len=this.episodeModel.items.length; i<len; ++i) {
		var episode = this.episodeModel.items[i];
		if (episode.enclosure) {
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
	if (formatted) {
		formatted = model.feedObject.replace(formatted);
	}
	return formatted;
};

EpisodeListAssistant.prototype.pubDateFormatter = function(pubDate, model) {
	var formatted = pubDate;
	var d_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	var m_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	if (formatted) {
		var d = formatted;
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
	var episodeIndex = this.episodeModel.items.indexOf(episode);
	if (episodeIndex !== -1) {
		var node = this.controller.get("episodeListWgt").mojo.getNodeByIndex(episodeIndex);
		var nodes;
		if (this.feedObject.playlist) {
            nodes = node.getElementsByClassName("progressDonePlaylist");
			nodes[0].style.width = episode.downloadingPercent*0.82 + "%";
		} else {
			nodes = node.getElementsByClassName("progressDone");
			nodes[0].style.width = episode.downloadingPercent + "%";
		}
	}
};

EpisodeListAssistant.prototype.eventApplies = function(ef) {
	return (ef === this.feedObject || (
		this.feedObject.playlist && (this.feedObject.feedIds.length === 0 ||
									 this.feedObject.feedIds.some(function(f) {return ef.id == f;}))
	));
};

EpisodeListAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "feedEpisodesUpdated":
				if (this.eventApplies(params.feed)) {
					this.refresh();
					this.filterEpisodes();
				}
				break;
			case "episodeUpdated":
				if (this.eventApplies(params.episode.feedObject)) {
					var episodeIndex = params.episodeIndex;
					if (episodeIndex === undefined) {
						episodeIndex = this.episodeModel.items.indexOf(params.episode);
					}
					if (episodeIndex !== -1) {
						this.episodeList.mojo.noticeUpdatedItems(episodeIndex, [params.episode]);
						this.filterEpisodes();
					}
				}
				break;
			case "downloadProgress":
				if (this.eventApplies(params.episode.feedObject)) {
					this.updatePercent(params.episode);
				}
				break;
			case "onFocus":
				this.refresh();
				this.filterEpisodes();
				break;
		}
	}
};
