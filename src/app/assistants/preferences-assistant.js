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

function PreferencesAssistant() {
}

PreferencesAssistant.prototype.setup = function() {
	this.controller.setupWidget("freeRotationToggle",
		{},
		{ value : Prefs.freeRotation });

	/*
	this.controller.setupWidget("enableNotificationsToggle",
		{},
		{ value : Prefs.enableNotifications });
	*/

	this.controller.setupWidget("autoUpdateToggle",
		{},
		{ value : Prefs.autoUpdate });

	this.controller.setupWidget("updateTypeList",
		{label: "Update Type",
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [
				  {label: "Hourly", value: "H"},
				  {label: "Daily", value: "D"},
				  {label: "Weekly", value: "W"}]},
		{ value : Prefs.updateType });

	this.controller.setupWidget("updateIntervalList",
		{label: "Update Every",
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [
				  //{label: "5 Minutes", value: "00:05:00"},
				  {label: "1 Hour", value: "01:00:00"},
				  {label: "2 Hours", value: "02:00:00"},
				  {label: "4 Hours", value: "04:00:00"},
				  {label: "6 Hours", value: "06:00:00"},
				  {label: "12 Hours", value: "12:00:00"},
				  {label: "24 Hours", value: "23:59:59"}]},
		{ value : Prefs.updateInterval });

	this.showIntervalSelector();

	this.controller.setupWidget("updateDayList",
		{label: "Update Day",
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [{label: "Sunday", value: "0"},
				   {label: "Monday", value: "1"},
 				   {label: "Tuesday", value: "2"},
				   {label: "Wednesday", value: "3"},
				   {label: "Thursday", value: "4"},
				   {label: "Friday", value: "5"},
				   {label: "Saturday", value: "6"}
				  ]},
		{ value: Prefs.updateDay });

    this.controller.setupWidget("timePicker",
        { label: ' ',
		  minuteInterval: 15},
        { time: Prefs.updateTime }
    );

	this.controller.setupWidget("wifiToggle",
		{},
		{ value : Prefs.enableWifi});

	this.controller.get("wifiToggleDiv").hide();

	this.controller.setupWidget("limitToWifiToggle",
		{},
		this.limitToWifiModel = { value : Prefs.limitToWifi });

	this.controller.setupWidget("transitionList",
		{label: "Transitions",
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [
				  {label: "None", value: Mojo.Transition.none},
				  {label: "Zoom Fade", value: Mojo.Transition.zoomFade},
				  {label: "Cross Fade", value: Mojo.Transition.crossFade}]},
		{ value : Prefs.transition });

	this.controller.setupWidget("albumArtToggle",
		{},
		{ value : Prefs.albumArt });

	this.controller.setupWidget("simpleToggle",
		{},
		{ value : !Prefs.simple });

	this.controller.setupWidget("singleTap",
		{},
		{ value : Prefs.singleTap });

	this.freeRotationHandler = this.freeRotation.bind(this);
	//this.enableNotificationsHandler = this.enableNotifications.bind(this);
	this.autoUpdateHandler = this.autoUpdate.bind(this);
	this.updateIntervalHandler = this.updateInterval.bind(this);
	this.updateTypeHandler = this.updateType.bind(this);
	this.updateDayHandler = this.updateDay.bind(this);
	this.updateTimeHandler = this.updateTime.bind(this);
	this.wifiHandler = this.wifi.bind(this);
	this.limitToWifiHandler = this.limitToWifi.bind(this);
	this.transitionHandler = this.transition.bind(this);
	this.albumArtHandler = this.albumArt.bind(this);
	this.simpleHandler = this.simple.bind(this);
	this.singleTapHandler = this.singleTap.bind(this);

	if (Prefs.autoUpdate) {
		this.controller.get("updateIntervalDiv").show();
	} else {
		this.controller.get("updateIntervalDiv").hide();
	}
};

PreferencesAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.controller.get('freeRotationToggle'),Mojo.Event.propertyChange,this.freeRotationHandler);
	//Mojo.Event.listen(this.controller.get('enableNotificationsToggle'),Mojo.Event.propertyChange,this.enableNotificationsHandler);
	Mojo.Event.listen(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler);
	Mojo.Event.listen(this.controller.get('updateIntervalList'),Mojo.Event.propertyChange,this.updateIntervalHandler);
	Mojo.Event.listen(this.controller.get('updateTypeList'),Mojo.Event.propertyChange,this.updateTypeHandler);
	Mojo.Event.listen(this.controller.get('updateDayList'),Mojo.Event.propertyChange,this.updateDayHandler);
	Mojo.Event.listen(this.controller.get('timePicker'),Mojo.Event.propertyChange,this.updateTimeHandler);
	Mojo.Event.listen(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler);
	Mojo.Event.listen(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler);
	Mojo.Event.listen(this.controller.get('transitionList'),Mojo.Event.propertyChange,this.transitionHandler);
	Mojo.Event.listen(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler);
	Mojo.Event.listen(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler);
	Mojo.Event.listen(this.controller.get('singleTap'),Mojo.Event.propertyChange,this.singleTapHandler);
};

PreferencesAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.controller.get('freeRotationToggle'),Mojo.Event.propertyChange,this.freeRotationHandler);
	//Mojo.Event.stopListening(this.controller.get('enableNotificationsToggle'),Mojo.Event.propertyChange,this.enableNotificationsHandler);
	Mojo.Event.stopListening(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler);
	Mojo.Event.stopListening(this.controller.get('updateIntervalList'),Mojo.Event.propertyChange,this.updateIntervalHandler);
	Mojo.Event.stopListening(this.controller.get('updateTypeList'),Mojo.Event.propertyChange,this.updateTypeHandler);
	Mojo.Event.stopListening(this.controller.get('updateDayList'),Mojo.Event.propertyChange,this.updateDayHandler);
	Mojo.Event.stopListening(this.controller.get('timePicker'),Mojo.Event.propertyChange,this.updateTimeHandler);
	Mojo.Event.stopListening(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler);
	Mojo.Event.stopListening(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler);
	Mojo.Event.stopListening(this.controller.get('transitionList'),Mojo.Event.propertyChange,this.transitionHandler);
	Mojo.Event.stopListening(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler);
	Mojo.Event.stopListening(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler);
	Mojo.Event.stopListening(this.controller.get('singleTap'),Mojo.Event.propertyChange,this.singleTapHandler);
	DB.writePrefs();
};

PreferencesAssistant.prototype.freeRotation = function(event) {
	Prefs.freeRotation = event.value;
	var dialog = new drnull.Dialog.Info(this, "Restart Required",
		"Changing Free Rotation requires a restart of drPodder.");
	dialog.show();
};

PreferencesAssistant.prototype.enableNotifications = function(event) {
	Prefs.enableNotifications = event.value;
};

PreferencesAssistant.prototype.autoUpdate = function(event) {
	Prefs.autoUpdate = event.value;
	if (Prefs.autoUpdate) {
		Mojo.Controller.getAppController().assistant.setWakeup();
		this.controller.get("updateIntervalDiv").show();
	} else {
		this.controller.get("updateIntervalDiv").hide();
	}
};

PreferencesAssistant.prototype.updateInterval = function(event) {
	Prefs.updateInterval = event.value;
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.updateType = function(event) {
	Prefs.updateType = event.value;
	this.showIntervalSelector();
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.updateDay = function(event) {
	Prefs.updateDay = event.value;
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.updateTime = function(event) {
	Prefs.updateTime = event.value;
	Prefs.updateHour = Prefs.updateTime.getHours();
	Prefs.updateMinute = Prefs.updateTime.getMinutes();
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.showIntervalSelector = function() {
	switch (Prefs.updateType) {
		case 'H':
			this.controller.get("intervalH").show();
			this.controller.get("intervalW").hide();
			this.controller.get("intervalD").hide();
			break;
		case 'D':
			this.controller.get("intervalH").hide();
			this.controller.get("intervalW").hide();
			this.controller.get("intervalD").show();
			break;
		case 'W':
			this.controller.get("intervalH").hide();
			this.controller.get("intervalW").show();
			this.controller.get("intervalD").show();
			break;
	}
};

PreferencesAssistant.prototype.wifi = function(event) {
	Prefs.enableWifi = event.value;
};

PreferencesAssistant.prototype.limitToWifi = function(event) {
	/*
	if (!event.value) {
		this.controller.showAlertDialog({
			onChoose: function(value) {
				if (value === "evdo") {
					this.limitToWifiModel.value = false;
					Prefs.limitToWifi = false;
				} else {
					this.limitToWifiModel.value = true;
					Prefs.limitToWifi = true;
				}
				this.controller.modelChanged(this.limitToWifiModel);
			}.bind(this),
			title: "Warning",
			message: "Allowing downloads over EVDO may cause you to " +
					"exceed your 5GB/month download cap.<br><br>Are you sure you wish " +
					"to allow EVDO Downloads?",
			allowHTMLMessage: true,
			choices:[
				{label: "Allow EVDO Downloads", value: "evdo", type: "negative"},
				{label: "WiFi-only Downloads", value: "wifi", type: "affirmative"}
			]
		});
	} else {
		Prefs.limitToWifi = true;
	}
	*/
	Prefs.limitToWifi = event.value;
};

PreferencesAssistant.prototype.transition = function(event) {
	Prefs.transition = event.value;
	this.controller.stageController.swapScene({name: "preferences", transition: Prefs.transition});
};

PreferencesAssistant.prototype.albumArt = function(event) {
	Prefs.albumArt = event.value;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.simple = function(event) {
	Prefs.simple = !event.value;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.singleTap = function(event) {
	Prefs.singleTap = event.value;
};
