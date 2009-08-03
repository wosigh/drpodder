function LoadingAssistant() {
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
		this.controller.stageController.swapScene("feedList");
	} else {
		setTimeout(this.waitForFeedsReady.bind(this), 200);
	}
};
