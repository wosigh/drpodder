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
	this.waitForFeedsReady();
};

LoadingAssistant.prototype.waitForFeedsReady = function() {
	if (DB.feedsReady) {
		this.spinnerScrim.hide();
		this.spinnerModel.spinning = false;
		this.controller.modelChanged(this.spinnerModel);
		this.stageController.swapScene("feedList");
	} else {
		this.controller.window.setTimeout(this.waitForFeedsReady.bind(this), 200);
	}
};
