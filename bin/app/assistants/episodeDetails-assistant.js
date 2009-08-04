function EpisodeDetailsAssistant(episode, autoPlay, resume) {
	this.episodeObject = episode;
	this.resume = resume;
	this.autoPlay = autoPlay;
	this.episodeUpdateHandler = this.episodeUpdate.bind(this);
}

EpisodeDetailsAssistant.prototype.progressAttr = {
	sliderProperty: "value",
	progressStartProperty: "progressStart",
	progressProperty: "progressEnd",
	round: false,
	updateInterval: 0.2
};

EpisodeDetailsAssistant.prototype.progressModel = {
	value: 0,
	minValue: 0,
	maxValue: 1
};

EpisodeDetailsAssistant.prototype.menuCommandItems = {
	//streamPlay:  {iconPath: "images/mini-player-icon-streamPlay.png", command: "streamPlay-cmd"},
	//streamPause: {iconPath: "images/mini-player-icon-streamPause.png", command: "streamPause-cmd"},
	download:    {icon: "save", command: "download-cmd"},
	cancel:      {icon: "stop", command: "cancel-cmd"},
	pause:       {iconPath: "images/mini-player-icon-pause.png", command: "pause-cmd"},
	play:        {iconPath: "images/mini-player-icon-play.png", command: "play-cmd"},
	deleteFile:  {icon: "delete", command: "delete-cmd"},
	skipForward: {iconPath: "images/menu-icon-music-forward.png", command: "skipForward-cmd"},
	skipBack:    {iconPath: "images/menu-icon-music-rewind.png", command: "skipBack-cmd"},
	skipForward2:{iconPath: "images/menu-icon-music-forward.png", command: "skipForward2-cmd"},
	skipBack2:   {iconPath: "images/menu-icon-music-rewind.png", command: "skipBack2-cmd"}
};

EpisodeDetailsAssistant.prototype.cmdMenuModel = {
	items: [
		{},
		{},
		{},
		{},
		{}
	]
};


EpisodeDetailsAssistant.prototype.setup = function() {
	this.controller.setupWidget("bodyScroller", {}, {});
	this.controller.update(this.controller.get("episodeDetailsTitle"), this.episodeObject.title);
	this.controller.update(this.controller.get("episodeDetailsDescription"), this.episodeObject.description);

	this.progressModel.value = 0;
	this.progressModel.progressStart = 0;
	this.progressModel.progressEnd = 0;

	this.controller.setupWidget("progress", this.progressAttr, this.progressModel);
	this.controller.listen("progress", Mojo.Event.propertyChange, this.progressChange.bind(this));
	this.controller.listen("progress", Mojo.Event.sliderDragStart, this.sliderDragStart.bind(this));
	this.controller.listen("progress", Mojo.Event.sliderDragEnd, this.sliderDragEnd.bind(this));

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	this.audioObject = AudioTag.extendElement("episodeDetailsAudio");
	this.audioObject.palm.audioClass = Media.AudioClass.MEDIA;

	this.audioObject.addEventListener(Media.Event.X_PALM_CONNECT, this.readyToPlay.bind(this));
	//this.audioObject.addEventListener(Media.Event.PROGRESS, this.updateProgress.bind(this));
	//this.audioObject.addEventListener(Media.Event.DURATIONCHANGE, this.updateProgress.bind(this));
	this.audioObject.addEventListener(Media.Event.ERROR, this.handleError.bind(this));

	this.audioObject.addEventListener(Media.Event.PAUSE, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.PLAY, this.handleAudioEvents.bind(this));

	this.audioObject.addEventListener(Media.Event.ENDED, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.ABORT, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.CANPLAY, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.CANPLAYTHROUGH, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.CANSHOWFIRSTFRAME, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.EMPTIED, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.LOAD, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.LOADEDFIRSTFRAME, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.LOADEDMETADATA, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.LOADSTART, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.SEEKED, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.SEEKING, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.STALLED, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.TIMEUPDATE, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.WAITING, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.X_PALM_DISCONNECT, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.X_PALM_RENDER_MODE, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.X_PALM_SUCCESS, this.handleAudioEvents.bind(this));
	this.audioObject.addEventListener(Media.Event.X_PALM_WATCHDOG, this.handleAudioEvents.bind(this));

	this.keyDownEventHandler = this.keyDownHandler.bind(this);
	this.controller.listen(this.controller.sceneElement, Mojo.Event.keydown, this.keyDownEventHandler);

	AppAssistant.mediaEventsService.registerForMediaEvents(this.controller, this.mediaKeyPressHandler.bind(this));

	this.updateTimer = null;

	this.episodeObject.listen(this.episodeUpdateHandler);
};

EpisodeDetailsAssistant.prototype.activate = function() {
};

EpisodeDetailsAssistant.prototype.deactivate = function() {
};

EpisodeDetailsAssistant.prototype.cleanup = function() {
	this.setTimer(false);
	this.bookmark();
	this.episodeObject.unlisten(this.episodeUpdateHandler);
};

EpisodeDetailsAssistant.prototype.episodeUpdate = function(action, episode) {
	//Mojo.Log.error("EpisodeDA: episode [%s] said: %s", episode.title, action);
	switch (action) {
		case "BOOKMARK":
			DB.saveEpisode(episode);
			break;
		case "BOOKMARKUPDATE":
			DB.saveEpisode(episode);
			break;
		case "ACTION":
			break;
	}
};

EpisodeDetailsAssistant.prototype.bookmark = function() {
	var cur = this.audioObject.currentTime;
	if (cur !== undefined && cur !== null && cur > 15) {
		this.episodeObject.length = this.audioObject.duration;
		this.episodeObject.bookmark(cur);
	}
};

EpisodeDetailsAssistant.prototype.backToList = function() {
	var feed = feedModel.getFeedById(this.episodeObject.feedId);

	this.audioObject.currentTime = 0;

	this.episodeObject.setListened();

	if (feed.autoDelete && this.episodeObject.downloaded) {
		this.episodeObject.deleteFile();
	}

	this.controller.stageController.popScene(true);
};

EpisodeDetailsAssistant.prototype.setTimer = function(bool) {
	if (bool && !this.updateTimer) {
		this.updateTimer = setInterval(this.updateProgress.bind(this), 500);
	} else {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}
	}
};

EpisodeDetailsAssistant.prototype.mediaKeyPressHandler = function(event) {
	switch (event.key) {
		case "togglePausePlay":
			if (this.audioObject.paused) {
				this.play();
			} else {
				this.pause();
			}
			break;
		case "pause":
			this.pause();
			break;
		case "play":
			this.play();
			break;
		case "next":
			this.doSkip(20);
			break;
		case "prev":
			this.doSkip(-20);
			break;
		default:
			Mojo.Log.error("Ignoring mediaKeyPress: %j", event);
			break;
	}
};

EpisodeDetailsAssistant.prototype.keyDownHandler = function(event) {
	var key = event.originalEvent.keyCode;
	switch (key) {
		case 32:
			//play/pause
			if (this.audioObject.paused) {
				this.play();
			} else {
				this.pause();
			}
			break;
		case 190:
			// ff1
			this.doSkip(20);
			break;
		case 48:
			// fr1
			this.doSkip(-20);
			break;
		case 17:
			// ff2
			this.doSkip(60);
			break;
		case 0:
			// fr2
			this.doSkip(-60);
			break;
		default:
			Mojo.Log.error("Ignoring keyCode", key);
			break;
	}
};

EpisodeDetailsAssistant.prototype.readyToPlay = function(event) {
	this.cmdMenuModel.items[2] = {items: [{},
										  {},
										  this.menuCommandItems.play,
										  {},
										  {}]};
	this.cmdMenuModel.items[2].items[2].disabled = false;
	/*
	if (this.episodeObject.downloaded) {
		this.cmdMenuModel.items[4] = this.menuCommandItems.deleteFile;
	} else {
		//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
		this.cmdMenuModel.items[4] = this.menuCommandItems.download;
	}
	*/

	if (this.autoPlay) {
		this.play();
		this.autoPlay = false;
	}

	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.handleError = function(event) {
	try {
		Mojo.Log.error("Error playing audio!!!!!!!!!!!!!!!!!!! %j", event);
	} catch (f) {
	}
	this.stop();
	this.readyToPlay();
};

EpisodeDetailsAssistant.prototype.handleAudioEvents = function(event) {
	//Mojo.Log.error("AudioEvent: %j", event);
	switch (event.type) {
		case "play":
			this.forcedPause = false;
			if (this.resume) {
				Mojo.Log.error("resuming playback at %d", this.episodeObject.position);
				this.audioObject.currentTime = this.episodeObject.position;
				this.resume = false;
			}
			this.playGUI();
			break;
		/*
		case "waiting":
			this.forcedPause = true;
			this.pauseGUI();
			break;
		case "canplaythrough":
			if (this.forcedPause) {
				Mojo.Log.error("try to play now that we're ready");
				this.play();
			}
			break;
		*/
		case "pause":
			this.pauseGUI();
			break;
		case "ended":
			this.episodeObject.clearBookmark();
			this.backToList();
			break;
	}
};

EpisodeDetailsAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.command) {
        switch(event.command) {
            case "download-cmd":
				this.cmdMenuModel.items[2] = {};
				//this.cmdMenuModel.items[4] = this.menuCommandItems.cancel;
				this.controller.modelChanged(this.cmdMenuModel);
				this.download();
				break;
            case "play-cmd":
				this.play();
				break;
            case "pause-cmd":
				this.pause();
				break;
            case "delete-cmd":
				this.cmdMenuModel.items[2].items[0] = {};
				this.cmdMenuModel.items[2].items[1] = {};
				this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.play;
				this.cmdMenuModel.items[2].items[3] = {};
				this.cmdMenuModel.items[2].items[4] = {};
				//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
				//this.cmdMenuModel.items[4] = this.menuCommandItems.download;
				this.cmdMenuModel.items[2].items[2].disabled = false;
				this.controller.modelChanged(this.cmdMenuModel);
				this.deleteFile();
				break;
            case "skipForward-cmd":
				this.doSkip(20);
				break;
            case "skipBack-cmd":
				this.doSkip(-20);
				break;
            case "skipForward2-cmd":
				this.doSkip(60);
				break;
            case "skipBack2-cmd":
				this.doSkip(-60);
				break;
		}
	}
};

EpisodeDetailsAssistant.prototype.playGUI = function() {
	this.cmdMenuModel.items[2].items[0] = this.menuCommandItems.skipBack2;
	this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.skipBack;
	this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.pause;
	this.cmdMenuModel.items[2].items[3] = this.menuCommandItems.skipForward;
	this.cmdMenuModel.items[2].items[4] = this.menuCommandItems.skipForward2;
	this.cmdMenuModel.items[2].items[2].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.pauseGUI = function() {
	this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.play;
	this.cmdMenuModel.items[2].items[2].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.doSkip = function(secs) {
	this.audioObject.currentTime += secs;
	this.updateProgressLabels();
	this.controller.modelChanged(this.progressModel);
	this.bookmark();
};

EpisodeDetailsAssistant.prototype.sliderDragStart = function(event) {
	this.wasPlaying = !this.audioObject.paused;
	/*
	if (this.wasPlaying) {
		this.audioObject.pause();
	}
	*/
};

EpisodeDetailsAssistant.prototype.progressChange = function(event) {
	this.audioObject.currentTime = event.value * this.audioObject.duration;
	this.updateProgressLabels();
	this.controller.modelChanged(this.progressModel);
};

EpisodeDetailsAssistant.prototype.sliderDragEnd = function(event) {
	this.bookmark();
	/*
	if (this.wasPlaying) {
		this.audioObject.play();
	} else {
	}
	*/
};

EpisodeDetailsAssistant.prototype.updateProgressLabels = function() {
	this.updateProgressLabelsValues(this.formatTime(this.audioObject.currentTime),
									this.formatTime(this.audioObject.duration-this.audioObject.currentTime));
};

EpisodeDetailsAssistant.prototype.updateProgressLabelsValues = function(playbackProgress, playbackRemaining) {
	this.controller.get("playback-progress").update(playbackProgress);
	this.controller.get("playback-remaining").update(playbackRemaining);
};

EpisodeDetailsAssistant.prototype.updateProgress = function(event) {
	if (isNaN(this.audioObject.currentTime) || this.audioObject.currentTime === 0 ||
	    isNaN(this.audioObject.duration) || this.audioObject.duration === 0) {
		this.updateProgressLabelsValues("00:00", "00:00");
	} else {
		this.updateProgressLabels();
		this.progressModel.value = this.audioObject.currentTime/this.audioObject.duration;
	}

	if (!this.episodeObject.downloaded) {
		if (this.audioObject.mojo._media !== undefined && this.audioObject.mojo._media !== null) {
			var buffered = this.audioObject.mojo._media.buffered;
			if (buffered !== undefined && buffered !== null) {
				this.progressModel.progressStart = buffered.start(0)/this.audioObject.duration;
				this.progressModel.progressEnd = buffered.end(0)/this.audioObject.duration;
			}
		}
	}
	this.controller.modelChanged(this.progressModel);
};

EpisodeDetailsAssistant.prototype.formatTime = function(secs) {
	if (secs < 0) {
		return "00:00";
	}
	var mins = Math.floor(secs / 60);
	secs = Math.floor(secs % 60);
	if (mins<10) {mins = "0"+mins;}
	if (secs<10) {secs = "0"+secs;}
	return mins+":"+secs;
};

EpisodeDetailsAssistant.prototype.download = function() {
	this.stop();
};

EpisodeDetailsAssistant.prototype.deleteFile = function() {
	this.stop();
};

EpisodeDetailsAssistant.prototype.pause = function() {
	this.cmdMenuModel.items[2].items[2].disabled = true;
	this.controller.modelChanged(this.cmdMenuModel);
	this.audioObject.pause();
	this.bookmark();
	this.setTimer(false);
};

EpisodeDetailsAssistant.prototype.play = function() {
	this.cmdMenuModel.items[2].items[2].disabled = true;
	this.controller.modelChanged(this.cmdMenuModel);
	if (this.episodeObject.file) {
		this.filePlay();
	} else {
		this.streamPlay();
	}
	this.bookmark();
	this.setTimer(true);
};

EpisodeDetailsAssistant.prototype.streamPlay = function() {
	if (this.episodeObject.type !== undefined && this.episodeObject.type !== null &&
		this.episodeObject.type.indexOf("video") === 0) {
		AppAssistant.applicationManagerService.play(this.controller, this.episodeObject.enclosure, function(){});
		this.cmdMenuModel.items[2].items[2].disabled = false;
		setTimeout(this.refreshMenu.bind(this), 5000);
	} else {
		if (this.audioObject.src === null || this.audioObject.src === undefined) {
			Mojo.Log.error("Setting [%s] stream src to:[%s]", this.episodeObject.type, this.episodeObject.enclosure);
			this.audioObject.src = this.episodeObject.enclosure;
		}
		if (this.audioObject.paused) {
			this.audioObject.play();
		}
	}
};

EpisodeDetailsAssistant.prototype.refreshMenu = function() {
	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.filePlay = function() {
	if (this.episodeObject.type !== undefined && this.episodeObject.type !== null &&
		this.episodeObject.type.indexOf("video") === 0) {
		AppAssistant.applicationManagerService.play(this.controller, this.episodeObject.file, function(){});
		this.cmdMenuModel.items[2].items[2].disabled = false;
		setTimeout(this.refreshMenu.bind(this), 5000);
	} else {
		if (this.audioObject.src === null || this.audioObject.src === undefined) {
			Mojo.Log.error("Setting [%s] file src to:[%s]", this.episodeObject.type, this.episodeObject.file);
			this.audioObject.src = this.episodeObject.file;
			this.progressModel.progressStart = 0;
			this.progressModel.progressEnd = 1;
			this.controller.modelChanged(this.progressModel);
		}
		if (this.audioObject.paused) {
			this.audioObject.play();
		}
	}
};

EpisodeDetailsAssistant.prototype.stop = function() {
	this.audioObject.pause();
	this.audioObject.src = null;
};
