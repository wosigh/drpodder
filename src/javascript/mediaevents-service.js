function MediaEventsService() {
}

MediaEventsService.prototype.URI = "palm://com.palm.mediaevents/";

MediaEventsService.prototype._serviceRequest = function(sceneController, uri, params) {
	if (sceneController) {
		return sceneController.serviceRequest(uri, params);
	} else {
		var obj = new Mojo.Service.Request(uri, params);
		return obj;
	}
};

MediaEventsService.prototype.registerForMediaEvents = function(sceneController, callback) {
	return this._serviceRequest(sceneController, this.URI, {
		method: "mediaEvents",
		onSuccess: callback,
		parameters: {"appName": Mojo.appName, "subscribe": true}});
};

MediaEventsService.prototype.markAppForeground = function(sceneController, callback) {
	return this._serviceRequest(sceneController, "palm://com.palm.audio/media", {
		method: "lockVolumeKeys",
		onSuccess: callback,
		parameters: {"foregroundApp": true, "subscribe": true}});
};
