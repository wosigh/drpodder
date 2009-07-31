function AppAssistant(){
}

AppAssistant.prototype.setup = function() {
	AppAssistant.downloadService = new DownloadService();
	AppAssistant.mediaService = new MediaDBService();
	AppAssistant.applicationManagerService = new ApplicationManagerService();
	AppAssistant.powerService = new PowerService();
};
