function MediaDBService() {
}

MediaDBService.prototype.URI = "palm://com.palm.mediadb/";

MediaDBService.prototype.listArtists = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "audio", {
        method: "listartists",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listSongs = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "audio", {
        method: "listsongs",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listAlbums = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "audio", {
        method: "listalbums",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listAlbumArt = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "audio", {
        method: "listalbumart",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listPlaylists = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "audio", {
        method: "listplaylists",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listGenres = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "audio", {
        method: "listgenres",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listRingTones = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "ringtone", {
        method: "listringtones",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listImages = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "image", {
        method: "listimages",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listVideos = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "video", {
        method: "listvideos",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.listOthers = function(sceneController, parameters, callback){
    return sceneController.serviceRequest(this.URI + "other", {
        method: "listothers",
        onSuccess: callback,
        parameters: parameters
    });
};

MediaDBService.prototype.deleteFile = function(sceneController, path, callback){
    return sceneController.serviceRequest(this.URI, {
        method: 'deletefile',
        onSuccess: callback,
        onFailure: callback,
        parameters: {path: path}
    });
};
