function PendingDLAssistant(eps) {
	this.epIndex = 0;
	this.setInfo(eps);
}

PendingDLAssistant.prototype.setup = function() {
	this.displayDashboard();
	this.switchHandler = this.launchMain.bindAsEventListener(this);
	this.controller.listen("dashboardinfo", Mojo.Event.tap, this.switchHandler);

	this.stageDocument = this.controller.stageController.document;
	this.activateStageHandler = this.activateStage.bindAsEventListener(this);
	Mojo.Event.listen(this.stageDocument, Mojo.Event.stageActivate, this.activateStageHandler);

	this.deactivateStageHandler = this.deactivateStage.bindAsEventListener(this);
	Mojo.Event.listen(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

PendingDLAssistant.prototype.cleanup = function() {
	this.controller.stopListening("dashboardinfo", Mojo.Event.tap, this.switchHandler);
	Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageActivate, this.activateStageHandler);
	Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

PendingDLAssistant.prototype.launchMain = function() {
	var appController = Mojo.Controller.getAppController();
	appController.assistant.handleLaunch({"action":"download"});
	//AppAssistant.applicationManagerService.open(this.controller, "com.palm.drnull.prepod", {"action":"updateFeeds"});
	//this.controller.window.close();
	//for (var v in this.stageDocument) {Mojo.Log.error("stageDocument.%s", v);}
	//this.stageDocument.close();
	this.controller.stageController.popScene();
};

PendingDLAssistant.prototype.displayDashboard = function() {
	var info = {title: this.title, message: this.message, count: this.count};
	var renderedInfo = Mojo.View.render({object: info, template: "pendingDL/item-info"});
	var infoElement = this.controller.get("dashboardinfo");
	infoElement.innerHTML = renderedInfo;
};

PendingDLAssistant.prototype.setInfo = function(eps) {
	this.eps = eps;
	this.title = "DL" + ((eps.length===1)?"":"s") +
				" pending WiFi (tap to retry)";
	//this.message = "Tap to retry";
	this.message = eps[this.epIndex].title;
	this.count = eps.length;
};

PendingDLAssistant.prototype.updateDashboard = function() {
	this.setInfo(eps);
	this.displayDashboard();
};

PendingDLAssistant.prototype.activateStage = function() {
	this.epIndex = 0;
	this.showEpisode();
};

PendingDLAssistant.prototype.deactivateStage = function() {
	this.stopShowEpisode();
};

PendingDLAssistant.prototype.showEpisode = function() {
	this.interval = 3000;
	if (!this.timer) {
		this.timer = this.controller.window.setInterval(this.showEpisode.bind(this), this.interval);
	} else {
		++this.epIndex;
		if (this.epIndex >= this.eps.length) {
			this.epIndex = 0;
		}
		this.message = this.eps[this.epIndex].title;
		this.displayDashboard();
	}
};

PendingDLAssistant.prototype.stopShowEpisode = function() {
	if (this.timer) {
		this.controller.window.clearInterval(this.timer);
		this.timer = undefined;
	}
};
