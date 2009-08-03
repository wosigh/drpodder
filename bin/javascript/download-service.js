function DownloadService() {
}
DownloadService.prototype.URI = "palm://com.palm.downloadmanager/";

DownloadService.prototype._serviceRequest = function(sceneController, uri, params) {
	if (sceneController) {
		return sceneController.serviceRequest(uri, params);
	} else {
		var obj = new Mojo.Service.Request(uri, params);
		return obj;
	}
};

	// the download manager currently has a bug where if you cancel a download
	// with another download in the queue, it will then start the next download
	// but the amountTotal will never be set to the filesize

	// possible solutions:
	//  hold the download call until there are no downloads pending, thus never calling
	//   callback until we are ready?
	//  in downloadStatus, capture the 0 amountTotal error and restart the download? (ugh)

DownloadService.prototype.escapeSpecial = function(file) {
    file = file.toString().replace(/\//g,'_').replace(/\\/g,'_').replace(/\:/g,'_').
							replace(/\*/g,'_').replace(/\?/g,'_').replace(/\"/g,'_').
							replace(/</g, '_').replace(/\>/g, '_').replace(/\|/g, '_');

	// don't allow filenames longer than 200 chars
	if (file.length > 200) {
		file = file.slice(200);
	}

	if (file.length === 0) {
		file = "Unknown";
	}

	return file;
};

DownloadService.prototype.download = function(sceneController, target, dir, filename, callback, subscribe) {
	//if (force) { // has palm fixed the downloadmanager bug yet?
	//Mojo.Log.error("downloading:", target);
	if (subscribe === undefined) { subscribe = true;}
	return this._serviceRequest(sceneController, this.URI, {
		method: "download",
		onSuccess: callback,
		onFailure: callback,
		parameters: {"target": target,
		             "targetDir": "/media/internal/PrePod/" + this.escapeSpecial(dir),
		             "targetFilename": this.escapeSpecial(filename),
		             "keepFilenameOnRedirect": true,
		             "subscribe": subscribe}});
	//} else {
	//return this.downloadWhenEmpty(sceneController, target, callback);
	//}
};

	// what we need to do:
	// intercept the callback from a download.
	//  if its complete, check a queue and download the next one if available
	// also, when adding a new download, we should immediately notify the gui so it can "start" it

DownloadService.prototype.downloadWhenEmpty = function(sceneController, target, callback) {
	return sceneController.serviceRequest(this.URI, {
		method: "listPending",
		onSuccess: function(event) {
			callback({returnValue: true});
			if (event.count === 0) {
				this.download(sceneController, target, callback, true);
			} else {
				Mojo.Log.error("Waiting for pending to empty before downloading:", target, "count:", event.count);
				setTimeout(this.downloadWhenEmpty.bind(this, sceneController, target, callback), 2000);
			}
		}.bind(this),
		parameters: {}});
};

DownloadService.prototype.downloadStatus = function(sceneController, ticket, callback) {
	return this._serviceRequest(sceneController, this.URI, {
		method: "downloadStatusQuery",
		onSuccess: callback,
		onFailure: callback,
		parameters: {ticket: ticket, subscribe: true}});
};

DownloadService.prototype.cancelDownload = function(sceneController, ticket, callback) {
	return this._serviceRequest(sceneController, this.URI, {
		method: "cancelDownload",
		onSuccess: callback,
		onFailure: callback,
		parameters: {ticket: ticket}});
};
