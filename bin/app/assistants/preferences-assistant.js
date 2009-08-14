function PreferencesAssistant() {
}

PreferencesAssistant.prototype.setup = function() {
	this.controller.setupWidget("enableNotificationsToggle",
		{},
		{ value : Prefs.enableNotifications });

	this.controller.setupWidget("autoUpdateToggle",
		{},
		{ value : Prefs.autoUpdate });

	this.controller.setupWidget("updateIntervalList",
		{label: "Update Interval",
		choices: [
				  {label: "5 Minutes", value: "00:05:00"},
				  {label: "1 Hour", value: "01:00:00"},
				  {label: "2 Hours", value: "02:00:00"},
				  {label: "4 Hours", value: "04:00:00"},
				  {label: "6 Hours", value: "06:00:00"},
				  {label: "12 Hours", value: "12:00:00"},
				  {label: "24 Hours", value: "23:59:59"}]},
		{ value : Prefs.updateInterval });

	this.controller.setupWidget("wifiToggle",
		{},
		{ value : Prefs.enableWifi});

	this.controller.get("wifiToggleDiv").hide();

	this.controller.setupWidget("limitToWifiToggle",
		{},
		this.limitToWifiModel = { value : Prefs.limitToWifi });

	this.controller.setupWidget("albumArtToggle",
		{},
		{ value : Prefs.albumArt });

	this.controller.setupWidget("simpleToggle",
		{},
		{ value : !Prefs.simple });

	this.controller.setupWidget("singleTap",
		{},
		{ value : Prefs.singleTap });

	this.enableNotificationsHandler = this.enableNotifications.bind(this);
	this.autoUpdateHandler = this.autoUpdate.bind(this);
	this.updateIntervalHandler = this.updateInterval.bind(this);
	this.wifiHandler = this.wifi.bind(this);
	this.limitToWifiHandler = this.limitToWifi.bind(this);
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
	Mojo.Event.listen(this.controller.get('enableNotificationsToggle'),Mojo.Event.propertyChange,this.enableNotificationsHandler);
	Mojo.Event.listen(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler);
	Mojo.Event.listen(this.controller.get('updateIntervalList'),Mojo.Event.propertyChange,this.updateIntervalHandler);
	Mojo.Event.listen(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler);
	Mojo.Event.listen(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler);
	Mojo.Event.listen(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler);
	Mojo.Event.listen(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler);
	Mojo.Event.listen(this.controller.get('singleTap'),Mojo.Event.propertyChange,this.singleTapHandler);
};

PreferencesAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.controller.get('enableNotificationsToggle'),Mojo.Event.propertyChange,this.enableNotificationsHandler);
	Mojo.Event.stopListening(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler);
	Mojo.Event.stopListening(this.controller.get('updateIntervalList'),Mojo.Event.propertyChange,this.updateIntervalHandler);
	Mojo.Event.stopListening(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler);
	Mojo.Event.stopListening(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler);
	Mojo.Event.stopListening(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler);
	Mojo.Event.stopListening(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler);
	Mojo.Event.stopListening(this.controller.get('singleTap'),Mojo.Event.propertyChange,this.singleTapHandler);
};

PreferencesAssistant.prototype.enableNotifications = function(event) {
	Prefs.enableNotifications = event.value;
	Prefs.updated = true;
};

PreferencesAssistant.prototype.autoUpdate = function(event) {
	Prefs.autoUpdate = event.value;
	Prefs.updated = true;
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
	Prefs.updated = true;
};

PreferencesAssistant.prototype.wifi = function(event) {
	Prefs.enableWifi = event.value;
	Prefs.updated = true;
};

PreferencesAssistant.prototype.limitToWifi = function(event) {
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
				Prefs.updated = true;
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
		Prefs.updated = true;
	}
};

PreferencesAssistant.prototype.albumArt = function(event) {
	Prefs.albumArt = event.value;
	Prefs.updated = true;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.simple = function(event) {
	Prefs.simple = !event.value;
	Prefs.updated = true;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.singleTap = function(event) {
	Prefs.singleTap = event.value;
	Prefs.updated = true;
};
