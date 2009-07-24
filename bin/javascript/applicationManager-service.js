function ApplicationManagerService() {
}

ApplicationManagerService.prototype.URI = "palm://com.palm.applicationManager/";

ApplicationManagerService.prototype.stream = function(sceneController, url, callback) {
    return sceneController.serviceRequest(this.URI, {
        method: "open",
        onSuccess: function() {callback("success");},
        onFailure: function() {callback("failure");},
        onComplete: function() {callback("complete");},
        parameters: {target: url}
    }); 
};

ApplicationManagerService.prototype.play = function(sceneController, file, callback) {
    return sceneController.serviceRequest(this.URI, {
        method: "open",
        onSuccess: function() {callback("success");},
        onFailure: function() {callback("failure");},
        onComplete: function() {callback("complete");},
        parameters: {target: file}
    }); 
};