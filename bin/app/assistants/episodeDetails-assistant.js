function EpisodeDetailsAssistant(episode, autoPlay, resume) {
	this.episodeObject = episode;
	this.resume = resume;
	this.autoPlay = autoPlay;
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
	skipBack2:   {iconPath: "images/menu-icon-music-rewind.png", command: "skipBack2-cmd"},
	nil:         {icon: "", command: "", label: " "}
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

	this.updateTimer = false;
};

EpisodeDetailsAssistant.prototype.activate = function() {
};

EpisodeDetailsAssistant.prototype.deactivate = function() {
	// save current player position
	this.bookmark();
};

EpisodeDetailsAssistant.prototype.bookmark = function() {
	var cur = this.audioObject.currentTime;
	if (cur !== undefined && cur !== null && cur > 15) {
		Mojo.Log.error("Saving episode position:", cur);
		if (this.episodeObject.position === 0) {
			feedModel.ids[this.episodeObject.feedId].numStarted++;
		}
		this.episodeObject.position = cur;
		this.episodeObject.length = this.audioObject.duration;
	}
	DB.saveFeed(feedModel.ids[this.episodeObject.feedId]);
};

EpisodeDetailsAssistant.prototype.clearBookmark = function() {
	Mojo.Log.error("Clearing bookmark");
	this.audioObject.currentTime = 0;
	if (this.episodeObject.position) {
		this.episodeObject.position = 0;
		feedModel.ids[this.episodeObject.feedId].numStarted--;
	}
	if (!this.episodeObject.listened) {
		this.episodeObject.listened = true;
		feedModel.ids[this.episodeObject.feedId].numNew--;
	}
	DB.saveFeed(feedModel.ids[this.episodeObject.feedId]);
	this.controller.stageController.popScene(true);
};

EpisodeDetailsAssistant.prototype.setTimer = function(bool) {
	if (bool) {
		this.updateTimer = setInterval(this.updateProgress.bind(this), 500);
	} else {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
		}
	}
};

EpisodeDetailsAssistant.prototype.keyDownHandler = function(event) {
	var key = event.originalEvent.keyCode;
	if (key === 32) {
		//play/pause
		if (this.audioObject.paused) {
			this.doPlay();
		} else {
			this.doPause();
		}
	} else if (key === 190) {
		// ff1
		this.doSkip(15);
	} else if (key === 48) {
		// fr1
		this.doSkip(-15);
	} else if (key === 17) {
		// ff2
		this.doSkip(60);
	} else if (key === 0) {
		// fr2
		this.doSkip(-60);
	} else {
		Mojo.Log.error("Ignoring keyCode", key);
	}
};

EpisodeDetailsAssistant.prototype.readyToPlay = function(event) {
	this.cmdMenuModel.items[2] = {items: [this.menuCommandItems.nil,
										  this.menuCommandItems.nil,
										  this.menuCommandItems.play,
										  this.menuCommandItems.nil,
										  this.menuCommandItems.nil]};
	/*
	if (this.episodeObject.downloaded) {
		this.cmdMenuModel.items[4] = this.menuCommandItems.deleteFile;
	} else {
		//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
		this.cmdMenuModel.items[4] = this.menuCommandItems.download;
	}
	*/

	if (this.autoPlay) {
		this.doPlay();
	}

	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.handleError = function(event) {
	try {
		Mojo.Log.error("Error playing audio!!!!!!!!!!!!!!!!!!! %o", event);
		Mojo.Log.error("Error playing audio!!!!!!!!!!!!!!!!!!! %j", event);
	} catch (e) {
	}
	this.stop();
	this.readyToPlay();
};

EpisodeDetailsAssistant.prototype.handleAudioEvents = function(event) {
	Mojo.Log.error("AudioEvent: %j", event);
	switch (event.type) {
		case "play":
			this.doPlay();
			break;
		case "pause":
			this.doPause();
			break;
		case "ended":
			this.doPause();
			this.clearBookmark();
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
				this.doPlay();
				break;
            case "pause-cmd":
				this.doPause();
				break;
            case "delete-cmd":
				this.cmdMenuModel.items[2].items[0] = this.menuCommandItems.nil;
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.nil;
				this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.play;
				//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
				this.cmdMenuModel.items[2].items[3] = this.menuCommandItems.nil;
				this.cmdMenuModel.items[2].items[4] = this.menuCommandItems.nil;
				//this.cmdMenuModel.items[4] = this.menuCommandItems.download;
				this.controller.modelChanged(this.cmdMenuModel);
				this.deleteFile();
				break;
            case "skipForward-cmd":
				this.doSkip(15);
				break;
            case "skipBack-cmd":
				this.doSkip(-15);
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

EpisodeDetailsAssistant.prototype.doPlay = function() {
	this.cmdMenuModel.items[2].items[0] = this.menuCommandItems.skipBack2;
	this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.skipBack;
	this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.pause;
	this.cmdMenuModel.items[2].items[3] = this.menuCommandItems.skipForward;
	this.cmdMenuModel.items[2].items[4] = this.menuCommandItems.skipForward2;
	this.controller.modelChanged(this.cmdMenuModel);
	this.play();
	this.setTimer(true);
	if (this.resume) {
		this.audioObject.currentTime = this.episodeObject.position;
		Mojo.Log.error("loading resume position:", this.episodeObject.position);
		this.resume = false;
	}
	this.bookmark();
};

EpisodeDetailsAssistant.prototype.doPause = function() {
	this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.play;
	this.controller.modelChanged(this.cmdMenuModel);
	this.pause();
	this.bookmark();
	this.setTimer(false);
};

EpisodeDetailsAssistant.prototype.doSkip = function(secs) {
	this.audioObject.currentTime += secs;
	this.updateProgressLabels();
	this.controller.modelChanged(this.progressModel);
	this.bookmark();
};

EpisodeDetailsAssistant.prototype.sliderDragStart = function(event) {
	this.wasPlaying = !this.audioObject.paused;
	if (this.wasPlaying) {
		this.audioObject.pause();
	}
};

EpisodeDetailsAssistant.prototype.progressChange = function(event) {
	this.audioObject.currentTime = event.value * this.audioObject.duration;
	this.updateProgressLabels();
	this.controller.modelChanged(this.progressModel);
};

EpisodeDetailsAssistant.prototype.sliderDragEnd = function(event) {
	if (this.wasPlaying) {
		this.audioObject.play();
	}
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
	this.audioObject.pause();
};

EpisodeDetailsAssistant.prototype.play = function() {
	if (this.episodeObject.file) {
		this.filePlay();
	} else {
		this.streamPlay();
	}
};

EpisodeDetailsAssistant.prototype.streamPlay = function() {
	if (this.audioObject.src === null || this.audioObject.src === undefined) {
		Mojo.Log.error("Setting stream src to:", this.episodeObject.enclosure);
		this.audioObject.src = this.episodeObject.enclosure;
	}
	if (this.audioObject.paused) {
		this.audioObject.play();
	}
};

EpisodeDetailsAssistant.prototype.filePlay = function() {
	if (this.audioObject.src === null || this.audioObject.src === undefined) {
		Mojo.Log.error("Setting file src to:", this.episodeObject.file);
		this.audioObject.src = this.episodeObject.file;
		this.progressModel.progressStart = 0;
		this.progressModel.progressEnd = 1;
		this.controller.modelChanged(this.progressModel);
	}
	if (this.audioObject.paused) {
		this.audioObject.play();
	}
};

EpisodeDetailsAssistant.prototype.stop = function() {
	this.audioObject.stop();
	this.audioObject.src = null;
};