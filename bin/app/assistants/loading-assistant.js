function LoadingAssistant() {
	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(PrePod.MainStageName);
}

LoadingAssistant.prototype.initialize = function() {
};

LoadingAssistant.prototype.setup = function() {
	this.spinnerModel = {spinning: true};
	this.controller.setupWidget("loadingSpinner", {spinnerSize: "large"}, this.spinnerModel);
	this.spinnerScrim = this.controller.get("spinnerScrim");
	this.spinnerModel.spinning = true;
};

LoadingAssistant.prototype.activate = function() {
	if (!DB) {
		DB = new DBClass();
		DB.waitForFeeds(this.waitForFeedsReady.bind(this));
	} else {
		this.waitForFeedsReady();
	}
};

LoadingAssistant.prototype.waitForFeedsReady = function() {
	this.spinnerScrim.hide();
	this.spinnerModel.spinning = false;
	this.controller.modelChanged(this.spinnerModel);
	this.stageController.swapScene("feedList");
};
