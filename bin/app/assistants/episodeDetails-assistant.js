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
		Mojo.Log.error("Setting episode position:", cur);
		this.episodeObject.position = cur;
	}
	DB.saveFeeds();
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

EpisodeDetailsAssistant.prototype.readyToPlay = function(event) {
	this.cmdMenuModel.items[2] = {items: [this.menuCommandItems.nil,
										  this.menuCommandItems.play,
										  this.menuCommandItems.nil]};
	if (this.episodeObject.downloaded) {
		this.cmdMenuModel.items[4] = this.menuCommandItems.deleteFile;
	} else {
		//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
		this.cmdMenuModel.items[4] = this.menuCommandItems.download;
	}

	if (this.autoPlay) {
		this.handleCommand({"type": Mojo.Event.command, "command":"play-cmd"});
	}

	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.handleError = function(event) {
	Mojo.Log.error("Error playing audio!!!!!!!!!!!!!!!!!!! %j", event);
	Utilities.dump(this.audioObject.mojo._media.error);
	this.stop();
	this.readyToPlay();
};

EpisodeDetailsAssistant.prototype.handleAudioEvents = function(event) {
	Mojo.Log.error("AudioEvent: %j", event);
	switch (event.type) {
		case "play":
			//if (this.episodeObject.downloaded) {
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.pause;
			//} else {
				//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPause;
			//}
			this.setTimer(true);
			if (this.resume) {
				this.audioObject.currentTime = this.episodeObject.position;
				Mojo.Log.error("we set currentTime to", this.episodeObject.position);
				this.resume = false;
			}
			this.bookmark();
			break;
		case "pause":
			//if (this.episodeObject.downloaded) {
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.play;
			//} else {
				//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
			//}
			this.setTimer(false);
			this.bookmark();
			break;
	}
};

EpisodeDetailsAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.command) {
        switch(event.command) {
            case "download-cmd":
				this.cmdMenuModel.items[2] = {};
				this.cmdMenuModel.items[4] = this.menuCommandItems.cancel;
				this.controller.modelChanged(this.cmdMenuModel);
				this.download();
				break;
            /*
			case "streamPlay-cmd":
				this.cmdMenuModel.items[2].items[0] = this.menuCommandItems.skipBack;
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPause;
				this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.skipForward;
				this.controller.modelChanged(this.cmdMenuModel);
				this.streamPlay();
				break;
            case "streamPause-cmd":
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
				this.controller.modelChanged(this.cmdMenuModel);
				this.pause();
				break;
			*/
            case "play-cmd":
				this.cmdMenuModel.items[2].items[0] = this.menuCommandItems.skipBack;
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.pause;
				this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.skipForward;
				this.controller.modelChanged(this.cmdMenuModel);
				this.play();
				break;
            case "pause-cmd":
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.play;
				this.controller.modelChanged(this.cmdMenuModel);
				this.pause();
				break;
            case "delete-cmd":
				this.cmdMenuModel.items[2].items[0] = this.menuCommandItems.nil;
				this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.play;
				//this.cmdMenuModel.items[2].items[1] = this.menuCommandItems.streamPlay;
				this.cmdMenuModel.items[2].items[2] = this.menuCommandItems.nil;
				this.cmdMenuModel.items[4] = this.menuCommandItems.download;
				this.controller.modelChanged(this.cmdMenuModel);
				this.deleteFile();
				break;
            case "skipForward-cmd":
				this.audioObject.currentTime += 30;
				this.updateProgressLabels();
				this.controller.modelChanged(this.progressModel);
				this.bookmark();
				break;
            case "skipBack-cmd":
				this.audioObject.currentTime -= 30;
				this.updateProgressLabels();
				this.controller.modelChanged(this.progressModel);
				this.bookmark();
				break;
		}
	}
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
	this.audioObject.play();
};

EpisodeDetailsAssistant.prototype.filePlay = function() {
	if (this.audioObject.src === null || this.audioObject.src === undefined) {
		Mojo.Log.error("Setting file src to:", this.episodeObject.file);
		this.audioObject.src = this.episodeObject.file;
		this.progressModel.progressStart = 0;
		this.progressModel.progressEnd = 1;
		this.controller.modelChanged(this.progressModel);
	}
	this.audioObject.play();
};

EpisodeDetailsAssistant.prototype.stop = function() {
	this.audioObject.stop();
	this.audioObject.src = null;
};
