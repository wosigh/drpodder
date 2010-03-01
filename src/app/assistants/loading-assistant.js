/*
This file is part of drPodder.

drPodder is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

drPodder is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with drPodder.  If not, see <http://www.gnu.org/licenses/>.

Copyright 2010 Jamie Hatfield <support@drpodder.com>
*/

function LoadingAssistant() {
	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(DrPodder.MainStageName);
}

LoadingAssistant.prototype.initialize = function() {
};

LoadingAssistant.prototype.setup = function() {
	//this.spinnerModel = {spinning: true};
	//this.controller.setupWidget("loadingSpinner", {spinnerSize: "small"}, this.spinnerModel);
	//this.spinnerScrim = this.controller.get("spinnerScrim");
	//this.spinnerModel.spinning = true;
	//this.loadingSpinner = this.controller.get("loadingSpinner");
	this.controller.get("versionDiv").update("v"+Mojo.Controller.appInfo.version);
	this.loadingDiv = this.controller.get("loadingDiv");

	//this.controller.enableFullScreenMode(true);
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
	//this.spinnerModel.spinning = false;
	//this.controller.modelChanged(this.spinnerModel);
	this.loadingDiv.update("Loading Feed List");
	this.stageController.swapScene("feedList");
};

LoadingAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "updateLoadingMessage":
				this.loadingDiv.update(params.message);
				break;
			case "shutupJSLint":
				break;
		}
	}
};
