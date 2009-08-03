function AppAssistant(){
	AppAssistant.downloadService = new DownloadService();
	AppAssistant.mediaService = new MediaDBService();
	AppAssistant.applicationManagerService = new ApplicationManagerService();
	AppAssistant.powerService = new PowerService();
	AppAssistant.mediaEventsService = new MediaEventsService();

	this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	window.document.addEventListener(Mojo.Event.deactivate, this.onBlurHandler.bind(this));
	window.document.addEventListener(Mojo.Event.activate, this.onFocusHandler.bind(this));
}

AppAssistant.prototype.onBlurHandler = function() {
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
};

AppAssistant.prototype.onFocusHandler = function() {
	if (!this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	}
};
