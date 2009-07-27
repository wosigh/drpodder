function StageAssistant(){
}

StageAssistant.appMenuAttr = {omitDefaultItems: true};
StageAssistant.appMenuModel = {
	visible: true,
	items: [
		{label: "About...", command: "about-cmd"}
	]
};

StageAssistant.prototype.setup = function() {
	this.controller.pushScene("feedList");
};

StageAssistant.prototype.handleCommand = function(event) {
	var currentScene = this.controller.activeScene();
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "about-cmd":
				currentScene.showAlertDialog({
					onChoose: function(value) {},
					title: "PrePod - v" + Mojo.Controller.appInfo.version,
					message: "Copyright 2009, Jamie Hatfield",
					choices: [
						{label: "OK", value:""}
					]
				});
				break;
			case "another-cmd":
				break;
		}
	}
};
