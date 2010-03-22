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

function EpisodeDetailsAssistant(episode, options) {
	this.episodeObject = episode;
	if (!options) { options = {}; }
	this.resume = options.resume && (this.episodeObject.position !== 0);
	this.autoPlay = options.autoPlay;
	this.playlist = options.playlist;
	this.isForeground = true;
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

EpisodeDetailsAssistant.prototype.menuAttr = {omitDefaultItems: true};
EpisodeDetailsAssistant.prototype.menuModel = {
	visible: true,
	items: [
		Mojo.Menu.editItem,
		{label: $L({value:"Play using webOS player", key:"playExternal"}), command: "playExternal-cmd"},
		{label: $L({value:"Report a Problem", key:"reportProblem"}), command: "report-cmd"},
		{label: $L("Help"), command: "help-cmd"},
		{label: $L("About") + '...', command: "about-cmd"}
	]
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
	skipForward2:{iconPath: "images/menu-icon-music-forward2.png", command: "skipForward2-cmd"},
	skipBack2:   {iconPath: "images/menu-icon-music-rewind2.png", command: "skipBack2-cmd"},
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

EpisodeDetailsAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};

EpisodeDetailsAssistant.prototype.setup = function() {
	this.statusDiv = this.controller.get("statusDiv");
	this.statusDiv.hide();
	this.setStatus($L("Setup"));
	this.controller.getSceneScroller().mojo.setMode("dominant");
	this.controller.update(this.controller.get("episodeDetailsTitle"), this.episodeObject.title);

	DB.getEpisodeDescription(this.episodeObject, function(description) {
		this.controller.update(this.controller.get("episodeDetailsDescription"), description);
	}.bind(this));
	/*
	var viewMenuPrev = {icon: "", command: "", label: " "};
	var viewMenuNext = {icon: "", command: "", label: " "};
	if (this.episodeObject.displayOrder > 0) {
		viewMenuPrev = {icon: "back", command: "feedPrev-cmd"};
	}

	if (this.episodeObject.displayOrder < this.episodeObject.feedObject.episodes.length) {
		viewMenuNext = {icon: "forward", command: "feedNext-cmd"};
	}

	this.viewMenuModel.items = [{items: [viewMenuPrev,
										{label: this.episodeObject.title, height: 100, width: 200, command: "edit-cmd"},
										viewMenuNext]}];
	this.controller.setupWidget(Mojo.Menu.viewMenu,
								{}, this.viewMenuModel);
	*/


	this.progressModel.value = 0;
	this.progressModel.progressStart = 0;
	this.progressModel.progressEnd = 0;

	this.controller.setupWidget("progress", this.progressAttr, this.progressModel);
	this.progress = this.controller.get("progress");
	this.cmdMenuModel = {items: [{},{},{},{},{}]};
	if (this.episodeObject.enclosure || this.episodeObject.downloaded) {
		this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
		if (!this.isVideo()) {

			this.setStatus($L("Extend"));
			this.audioObject = AudioTag.extendElement(this.controller.get("episodeDetailsAudio"));
			this.setStatus($L("Class"));
			this.audioObject.palm.audioClass = Media.AudioClass.MEDIA;

			this.setStatus($L("Bind"));
			this.readyToPlayHandler = this.readyToPlay.bind(this);
			this.setStatus($L("Event"));
			this.audioObject.addEventListener(Media.Event.X_PALM_CONNECT, this.readyToPlayHandler);
			//this.audioObject.addEventListener(Media.Event.PROGRESS, this.updateProgress.bind(this));
			//this.audioObject.addEventListener(Media.Event.DURATIONCHANGE, this.updateProgress.bind(this));
			this.setStatus($L("Loading"));
			this.disablePlay(true);
			this.progressChangedHandler = this.progressChange.bind(this);
			this.sliderDragStartHandler = this.sliderDragStart.bind(this);
			this.sliderDragEndHandler = this.sliderDragEnd.bind(this);

			this.handleErrorHandler = this.handleError.bind(this);
			this.handleAudioEventsHandler = this.handleAudioEvents.bind(this);

			this.updateProgressHandler = this.updateProgress.bind(this);

			this.audioObject.addEventListener(Media.Event.ERROR, this.handleErrorHandler);

			this.audioObject.addEventListener(Media.Event.PAUSE, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.PLAY, this.handleAudioEventsHandler);

			this.audioObject.addEventListener(Media.Event.ENDED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.ABORT, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.CANPLAY, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.CANPLAYTHROUGH, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.CANSHOWFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.DURATIONCHANGE, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.EMPTIED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOAD, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOADEDFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOADEDMETADATA, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOADSTART, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.SEEKED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.SEEKING, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.STALLED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.WAITING, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_DISCONNECT, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_RENDER_MODE, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_SUCCESS, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_WATCHDOG, this.handleAudioEventsHandler);

			//this.audioObject.addEventListener(Media.Event.TIMEUPDATE, this.updateProgressHandler);

			this.keyDownEventHandler = this.keyDownHandler.bind(this);
		} else {
			this.setStatus();
			if (this.autoPlay) {
				this.disablePlay();
				this.controller.window.setTimeout(this.enablePlay.bind(this), 10000);
				this.play();
			} else {
				this.enablePlay();
			}
		}

		this.updateTimer = null;
	} else {
		this.setStatus();
	}

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	this.onBlurHandler = this.onBlur.bind(this);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);
};

EpisodeDetailsAssistant.prototype.activate = function() {
	var height=this.controller.get("topContent").getHeight();
	this.controller.get("topSpacer").style.height = height + 'px';
	this.controller.get("descriptionFade").style.top = height + 'px';

	if ((this.episodeObject.enclosure || this.episodeObject.downloaded) && !this.isVideo()) {
		Mojo.Event.listen(this.progress, Mojo.Event.propertyChange, this.progressChangedHandler);
		Mojo.Event.listen(this.progress, Mojo.Event.sliderDragStart, this.sliderDragStartHandler);
		Mojo.Event.listen(this.progress, Mojo.Event.sliderDragEnd, this.sliderDragEndHandler);
		Mojo.Event.listen(this.controller.sceneElement, Mojo.Event.keydown, this.keyDownEventHandler);

		this.mediaEvents = AppAssistant.mediaEventsService.registerForMediaEvents(this.controller, this.mediaKeyPressHandler.bind(this));
	}
};

EpisodeDetailsAssistant.prototype.deactivate = function() {
	this.isForeground = false;
	Mojo.Log.warn("isForeground = false");
	if ((this.episodeObject.enclosure || this.episodeObject.downloaded) && !this.isVideo()) {
		Mojo.Event.stopListening(this.progress, Mojo.Event.propertyChange, this.progressChangedHandler);
		Mojo.Event.stopListening(this.progress, Mojo.Event.sliderDragStart, this.sliderDragStartHandler);
		Mojo.Event.stopListening(this.progress, Mojo.Event.sliderDragEnd, this.sliderDragEndHandler);
		Mojo.Event.stopListening(this.controller.sceneElement, Mojo.Event.keydown, this.keyDownEventHandler);
		Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);

		if (this.mediaEvents) {
			this.mediaEvents.cancel();
			this.mediaEvents = undefined;
		}
	}
};

EpisodeDetailsAssistant.prototype.cleanup = function() {
	if (this.episodeObject.enclosure) {
		this.audioObject.removeEventListener(Media.Event.X_PALM_CONNECT, this.readyToPlayHandler);
		if (!this.isVideo()) {
			if (!this.finished) {this.bookmark();}
			this.audioObject.removeEventListener(Media.Event.ERROR, this.handleErrorHandler);

			this.audioObject.removeEventListener(Media.Event.PAUSE, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.PLAY, this.handleAudioEventsHandler);

			this.audioObject.removeEventListener(Media.Event.ENDED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.ABORT, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.CANPLAY, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.CANPLAYTHROUGH, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.CANSHOWFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.DURATIONCHANGE, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.EMPTIED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOAD, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOADEDFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOADEDMETADATA, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOADSTART, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.SEEKED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.SEEKING, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.STALLED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.WAITING, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_DISCONNECT, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_RENDER_MODE, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_SUCCESS, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_WATCHDOG, this.handleAudioEventsHandler);
		}
		this.setTimer(false);
	}
};

EpisodeDetailsAssistant.prototype.bookmark = function() {
	var cur = this.audioObject.currentTime;
	Mojo.Log.warn("BOOKMARK!!! %d", cur);
	if (cur !== undefined && cur !== null && cur > 15) {
		this.episodeObject.length = this.audioObject.duration;
		this.episodeObject.bookmark(cur);
	}
};

EpisodeDetailsAssistant.prototype.backToList = function() {
	var feed = this.episodeObject.feedObject;

	this.finished = true;

	this.episodeObject.setListened();
	this.episodeObject.clearBookmark();

	if (feed.autoDelete && this.episodeObject.downloaded) {
		this.episodeObject.deleteFile();
	}

	if (!this.playlist || this.playlist.length === 0) {
		this.controller.stageController.popScene(true);
	} else {
		var episode = this.playlist.shift();
		this.controller.stageController.swapScene({name: "episodeDetails", transition: Prefs.transition}, episode, {autoPlay: true, resume: true, playlist: this.playlist});
	}
};

EpisodeDetailsAssistant.prototype.setTimer = function(bool) {
	if (this.updateTimer) {
		this.controller.window.clearInterval(this.updateTimer);
		this.updateTimer = null;
	}
	Mojo.Log.info("setTimer: set it=%s, isForeground=%s", bool, this.isForeground);
	if (bool && this.isForeground) {
		this.updateTimer = this.controller.window.setInterval(this.updateProgress.bind(this), 500);
	}
};

EpisodeDetailsAssistant.prototype.readyToPlay = function() {
	/*if (this.isVideo()) {
		if (this.autoPlay) {
			this.disablePlay();
			this.controller.window.setTimeout(this.enablePlay.bind(this), 10000);
			this.play();
		} else {
			this.enablePlay();
		}
	} else {*/
		if (this.episodeObject.file) {
			Mojo.Log.warn("Setting [%s] file src to:[%s]", this.episodeObject.type, this.episodeObject.file);
			this.setStatus();
			this.audioObject.src = this.episodeObject.file;
			this.progressModel.progressStart = 0;
			this.progressModel.progressEnd = 1;
			this.controller.modelChanged(this.progressModel);
		} else {
			var url = this.episodeObject.getEnclosure();
			Mojo.Log.warn("Setting [%s] stream src to:[%s]", this.episodeObject.type, url);
			this.setStatus($L("Connecting"));
			this.audioObject.src = url;
			this.progressModel.progressStart = 0;
			this.progressModel.progressEnd = 0;
			this.controller.modelChanged(this.progressModel);
		}
		this.audioObject.autoplay = this.autoPlay;
		this.setTimer(true);
	//}
};

EpisodeDetailsAssistant.prototype.handleError = function(event) {
	try {
		Mojo.Log.error("Error playing audio!!!!!!!!!!!!!!!!!!! %j", event);
	} catch (f) {
	}
	this.bookmark();
	this.cmdMenuModel.items[0] = {};
	this.cmdMenuModel.items[1] = {};
	this.cmdMenuModel.items[3] = {};
	this.cmdMenuModel.items[4] = {};
	this.disablePlay(true);
	this.resume = true;
	this.readyToPlay();
};

EpisodeDetailsAssistant.prototype.mediaKeyPressHandler = function(event) {
	Mojo.Log.warn("received mediaKeyPress: %s", Mojo.Log.propertiesAsString(event));
	if (event.state === 'down') {
		switch (event.key) {
			case "togglePausePlay":
			case "headset_button":
				if (this.audioObject.paused) {
					this.play();
				} else {
					this.pause();
				}
				break;
			case "stop":
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
				Mojo.Log.warn("Ignoring mediaKeyPress: ", event.key);
				break;
		}
	}
};

EpisodeDetailsAssistant.prototype.keyDownHandler = function(event) {
	var key = event.originalEvent.keyCode;
	switch (key) {
		case Mojo.Char.spaceBar:
			//play/pause
			if (this.audioObject.paused) {
				this.play();
			} else {
				this.pause();
			}
			break;
		case Mojo.Char.period:
			// ff1
			this.doSkip(20);
			break;
		case Mojo.Char.zero:
			// fr1
			this.doSkip(-20);
			break;
		case Mojo.Char.sym:
			// ff2
			this.doSkip(60);
			break;
		case Mojo.Char.shift:
			// fr2
			this.doSkip(-60);
			break;
		default:
			Mojo.Log.warn("Ignoring keyCode: ", key);
			break;
	}
};

EpisodeDetailsAssistant.prototype.setStatus = function(message, maxDisplay) {
	Mojo.Log.info("setStatus: %s", message);
	this.statusMessage = message;
	this.statusIter = 2;
	this.statusDiv.update(message);
	if (message) {
		this.statusDiv.show();
		if (!this.statusTimerID) {
			this.statusTimerID = this.controller.window.setInterval(this.statusTimer.bind(this), 400);
		}
	} else {
		this.statusDiv.hide();
		if (this.statusTimerID) {
			this.controller.window.clearInterval(this.statusTimerID);
			this.statusTimerID = null;
		}
	}
};

EpisodeDetailsAssistant.prototype.statusTimer = function() {
	var dots = "";
	if (Math.abs(this.statusIter-2) === 1) {
		dots = " . ";
	} else if (Math.abs(this.statusIter-2) === 2) {
		dots = " . . ";
	}
	this.statusIter = (this.statusIter+1)%4;
	this.statusDiv.update(dots + this.statusMessage + dots);
};

EpisodeDetailsAssistant.prototype.handleAudioEvents = function(event) {
	Mojo.Log.warn("W.AudioEvent: %s", event.type);
	switch (event.type) {
		case "load":
			this.setStatus();
			this.updateProgress();
			break;
		case "durationchange":
			if (this.resume) {
				Mojo.Log.info("resuming playback at %d", this.episodeObject.position);
				try {
					this.setStatus($L("Seeking"));
					this.audioObject.currentTime = this.episodeObject.position;
					this.resume = false;
				} catch (e) {
					Mojo.Log.error("Error setting currentTime: %s", e.message);
				}
				this.updateProgress();
			}
			break;
		case "canplay":
			if (!this.resume && this.audioObject.autoplay) {
				this.setStatus($L("Buffering"));
			}
			break;
		case "canplaythrough":
			this.updateProgress();
			this.setStatus();
			this.cmdMenuModel.items[2].disabled = false;
			this.refreshMenu();
			break;
		case "seeked":
			if (this.audioObject.paused && !this.episodeObject.downloaded) {
				this.setStatus($L("Buffering"));
			}
			this.cmdMenuModel.items[2].disabled = false;
			this.refreshMenu();
			break;
		case "waiting":
			this.setStatus($L("Buffering"));
			break;
		case "play":
			this.setStatus();
			this.playGUI();
			break;
		case "pause":
			this.updateProgress();
			this.bookmark();
			this.pauseGUI();
			break;
		case "ended":
			this.backToList();
			break;
	}
};

EpisodeDetailsAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.command) {
        switch(event.command) {
            case "download-cmd":
				this.cmdMenuModel.items[2] = {};
				this.refreshMenu();
				this.download();
				break;
            case "play-cmd":
				this.play();
				break;
            case "pause-cmd":
				this.pause();
				break;
            case "delete-cmd":
				this.enablePlay();
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
            case "report-cmd":
				event.assistant = this;
				event.data = "Episode Information: <br/>" +
					"Title: " + this.episodeObject.title + "<br/>" +
					"Enclosure: " + this.episodeObject.enclosure + "<br/>" +
					"Type: " + this.episodeObject.type + "<br/>" +
					"File: " + this.episodeObject.file + "<br/><br/>" +
					"Feed Information:<br/>" +
					"URL: " + this.episodeObject.feedObject.url + "<br/>";
				break;
            case "playExternal-cmd":
				this.playExternal();
				break;
            case "about-cmd":
				this.controller.showAlertDialog({
						onChoose: function(value) {},
						message: "<div style='width=100%; font-size: 30px;'>drPodder - v" + Mojo.Controller.appInfo.version + "</div><HR>" +
								"Copyright 2010 Jamie Hatfield<BR>" +
								"Logo Design: <a href='http://jamie3d.com/'>Jamie Hamel-Smith</a><BR>" +
								"Original Logo Concept: <a href='http://www.userinterfaceicons.com/preview.php'>UII</a>",
						allowHTMLMessage: true,
						choices: [
							{label: "OK", value:""}
						]
					});
				event.stopPropagation();
				break;
		}
	}
};

EpisodeDetailsAssistant.prototype.playGUI = function() {
	this.autoPlay = true;
	this.cmdMenuModel.items[0] = this.menuCommandItems.skipBack2;
	this.cmdMenuModel.items[1] = this.menuCommandItems.skipBack;
	this.cmdMenuModel.items[3] = this.menuCommandItems.skipForward;
	this.cmdMenuModel.items[4] = this.menuCommandItems.skipForward2;
	this.enablePause(true);
	this.setTimer(true);
};

EpisodeDetailsAssistant.prototype.pauseGUI = function() {
	this.autoPlay = false;
	this.setTimer(false);
	this.enablePlay();
};

EpisodeDetailsAssistant.prototype.doSkip = function(secs) {
	this.wasPlaying = !this.audioObject.paused;
	this.audioObject.currentTime += secs;
	if (this.wasPlaying) {this.audioObject.play();}
	this.updateProgress();
	this.controller.modelChanged(this.progressModel);
	this.bookmark();
};

EpisodeDetailsAssistant.prototype.sliderDragStart = function() {
	this.wasPlaying = !this.audioObject.paused;
	if (this.wasPlaying) {
		this.audioObject.pause();
	}
};

EpisodeDetailsAssistant.prototype.progressChange = function(event) {
	// need this line
	//this.audioObject.currentTime = event.value * this.audioObject.duration;
	this.updateProgress(null, event.value * this.audioObject.duration);
	this.controller.modelChanged(this.progressModel);
};

EpisodeDetailsAssistant.prototype.sliderDragEnd = function(event) {
	this.audioObject.currentTime = this.progressModel.value * this.audioObject.duration;
	this.setStatus($L("Seeking"));
	this.bookmark();
	if (this.wasPlaying) {
		this.audioObject.play();
	}
};

EpisodeDetailsAssistant.prototype.updateProgressLabels = function(currentTime) {
	this.updateProgressLabelsValues(this.formatTime(currentTime||this.audioObject.currentTime),
									this.formatTime(this.audioObject.duration-(currentTime||this.audioObject.currentTime)));
};

EpisodeDetailsAssistant.prototype.updateProgressLabelsValues = function(playbackProgress, playbackRemaining) {
	this.controller.get("playback-progress").update(playbackProgress);
	this.controller.get("playback-remaining").update(playbackRemaining);
};

EpisodeDetailsAssistant.prototype.updateProgress = function(event, currentTime) {
	Mojo.Log.warn("updateProgress: currentTime: %d, duration: %d (passed in: %d)", this.audioObject.currentTime, this.audioObject.duration, currentTime);

	if (isNaN(this.audioObject.currentTime) ||
	    !isFinite(this.audioObject.duration) || isNaN(this.audioObject.duration) || this.audioObject.duration === 0) {
		this.updateProgressLabelsValues("00:00", "00:00");
	} else {
		this.updateProgressLabels(currentTime);
		if (!currentTime) {
			this.progressModel.value = this.audioObject.currentTime/this.audioObject.duration;
		}
	}

	if (!this.episodeObject.downloaded) {
		var buffered = this.audioObject.buffered;
		if (buffered !== undefined && buffered !== null) {
			// webOS 1.4 broke this
			//this.progressModel.progressStart = buffered.start(0)/this.audioObject.duration;
			//Mojo.Log.info("buffered.start(0)=%d", buffered.start(0));
			this.progressModel.progressStart = this.audioObject.currentTime/this.audioObject.duration;
			this.progressModel.progressEnd = buffered.end(0)/this.audioObject.duration;
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
	try {
		this.disablePause();
		this.audioObject.pause();
		//this.controller.window.setTimeout(this.enablePlayPause.bind(this), 10000);
	} catch (e) {
		Mojo.Log.error("Error in pause: %j", e);
	}
};

EpisodeDetailsAssistant.prototype.play = function() {
	try {
		if (this.isVideo()) {
			if (this.isForeground) {
				this.launchVideo(this.episodeObject.file || this.episodeObject.getEnclosure());
				this.controller.window.setTimeout(this.enablePlay.bind(this), 10000);
			}
		} else {
			if (this.audioObject.paused) {
				this.disablePlay();
			}
			this.audioObject.play();
			//this.controller.window.setTimeout(this.enablePlayPause.bind(this), 10000);

		}
	} catch (e) {
		Mojo.Log.error("Error in play: %j", e);
	}
};

EpisodeDetailsAssistant.prototype.stop = function() {
	this.audioObject.pause();
	this.audioObject.src = null;
};

EpisodeDetailsAssistant.prototype.isVideo = function() {
	if (this.episodeObject.type !== undefined && this.episodeObject.type !== null &&
		this.episodeObject.type.indexOf("video") === 0) {
		return true;
	} else {
		return false;
	}
};

EpisodeDetailsAssistant.prototype.launchVideo = function(uri) {
	var args = {
		appId: "com.palm.app.videoplayer",
		name: "nowplaying"
	};

	var params = {
		target: uri,
		title: this.episodeObject.title,
		thumbUrl: this.episodeObject.feedObject.albumArt
		/*,
		initialPos: 0,
		videoID: undefined*/
	};

	this.controller.stageController.pushScene(args, params);
};

EpisodeDetailsAssistant.prototype.playExternal = function() {
	this.controller.serviceRequest("palm://com.palm.applicationManager", {
		method: "open",
		parameters: {
			target: this.episodeObject.file || this.episodeObject.getEnclosure()
		}
	});
};

EpisodeDetailsAssistant.prototype.enablePlay = function(needRefresh) {
	this.setPlayPause(true, true, needRefresh);
};

EpisodeDetailsAssistant.prototype.disablePlay = function(needRefresh) {
	this.setPlayPause(true, false, needRefresh);
};

EpisodeDetailsAssistant.prototype.enablePause = function(needRefresh) {
	this.setPlayPause(false, true, needRefresh);
};

EpisodeDetailsAssistant.prototype.disablePause = function(needRefresh) {
	this.setPlayPause(false, false, needRefresh);
};

EpisodeDetailsAssistant.prototype.setPlayPause = function(isPlay, isEnabled, needRefresh) {
	Mojo.Log.info("setPlayPause(%d, %d, %d)", isPlay, isEnabled, needRefresh);
	var item;
	if (isPlay) {item = this.menuCommandItems.play;}
	else        {item = this.menuCommandItems.pause;}

	var c = this.cmdMenuModel.items[2];
	if (c !== item) {
		this.cmdMenuModel.items[2] = c = item;
		needRefresh = true;
	}

	if (c.disabled === undefined || c.disabled === isEnabled) {
		c.disabled = !isEnabled;
		needRefresh = true;
	}

	if (needRefresh) {
		this.refreshMenu();
	}
};

EpisodeDetailsAssistant.prototype.refreshMenu = function() {
	this.controller.modelChanged(this.cmdMenuModel);
};

EpisodeDetailsAssistant.prototype.onBlur = function() {
	this.bookmark();
	this.isForeground = false;
	this.setTimer(false);

	//this.audioObject.removeEventListener(Media.Event.TIMEUPDATE, this.updateProgressHandler);
};

EpisodeDetailsAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "onFocus":
				this.isForeground = true;
				this.updateProgress();
				if (this.audioObject && this.audioObject.paused !== true) {
					this.setTimer(true);
				}
				// timeupdate STILL doesn't work 100%
				// get your fraking act together, PALM!!!
				// this.audioObject.addEventListener(Media.Event.TIMEUPDATE, this.updateProgressHandler);

				break;
			case "shutupJSLint":
				break;
		}
	}
};
