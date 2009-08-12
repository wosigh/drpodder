function DashboardAssistant(title, message) {
	Mojo.Log.error("creating dashboardAssistant(%s, %s)", title, message);
	this.title = title;
	this.message = message;
}

DashboardAssistant.prototype.setup = function() {
	this.displayDashboard();
	this.switchHandler = this.launchMain.bindAsEventListener(this);
	this.controller.listen("dashboardinfo", Mojo.Event.tap, this.switchHandler);

	this.stageDocument = this.controller.stageController.document;
	this.activateStageHandler = this.activateStage.bindAsEventListener(this);
	Mojo.Event.listen(this.stageDocument, Mojo.Event.stageActivate, this.activateStageHandler);

	this.deactivateStageHandler = this.deactivateStage.bindAsEventListener(this);
	Mojo.Event.listen(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

DashboardAssistant.prototype.cleanup = function() {
	this.controller.stopListening("dashboardinfo", Mojo.Event.tap, this.switchHandler);
	Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageActivate, this.activateStageHandler);
	Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

DashboardAssistant.prototype.launchMain = function() {
	var appController = Mojo.Controller.getAppController();
	appController.assistant.handleLaunch({});
	this.controller.stageController.popScene();
};

DashboardAssistant.prototype.displayDashboard = function() {
	var info = {title: this.title, message: this.message};
	var renderedInfo = Mojo.View.render({object: info, template: "dashboard/item-info"});
	var infoElement = this.controller.get("dashboardinfo");
	infoElement.innerHTML = renderedInfo;
};

DashboardAssistant.prototype.updateDashboard = function(title, message) {
	this.title = title;
	this.message = message;
	this.displayDashboard();
};

DashboardAssistant.prototype.activateStage = function() {
};

DashboardAssistant.prototype.deactivateStage = function() {
};
