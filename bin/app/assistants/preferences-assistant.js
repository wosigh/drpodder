function PreferencesAssistant() {
}

PreferencesAssistant.prototype.setup = function() {
	this.controller.setupWidget("enableNotificationsToggle",
		{},
		{ value : Prefs.enableNotifications });

	this.controller.setupWidget("autoUpdateToggle",
		{},
		{ value : Prefs.autoUpdate });

	this.controller.setupWidget("wifiToggle",
		{},
		{ value : Prefs.enableWifi});

	this.controller.get("wifiToggleDiv").hide();

	this.controller.setupWidget("limitToWifiToggle",
		{},
		{ value : Prefs.limitToWifi });

	this.controller.setupWidget("albumArtToggle",
		{},
		{ value : Prefs.albumArt });

	this.controller.setupWidget("simpleToggle",
		{},
		{ value : !Prefs.simple });

	this.controller.setupWidget("singleTap",
		{},
		{ value : Prefs.singleTap });

	Mojo.Event.listen(this.controller.get('enableNotificationsToggle'),Mojo.Event.propertyChange,this.enableNotificationsHandler.bind(this));
	Mojo.Event.listen(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler.bind(this));
	Mojo.Event.listen(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler.bind(this));
	Mojo.Event.listen(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler.bind(this));
	Mojo.Event.listen(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler.bind(this));
	Mojo.Event.listen(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler.bind(this));
	Mojo.Event.listen(this.controller.get('singleTap'),Mojo.Event.propertyChange,this.singleTapHandler.bind(this));
};

PreferencesAssistant.prototype.enableNotificationsHandler = function(event) {
	Prefs.enableNotifications = event.value;
	Prefs.updated = true;
};

PreferencesAssistant.prototype.autoUpdateHandler = function(event) {
	Prefs.autoUpdate = event.value;
	Prefs.updated = true;
	if (Prefs.autoUpdate) {
		Mojo.Controller.getAppController().assistant.setWakeup();
	}
};

PreferencesAssistant.prototype.wifiHandler = function(event) {
	Prefs.enableWifi = event.value;
	Prefs.updated = true;
};

PreferencesAssistant.prototype.limitToWifiHandler = function(event) {
	Prefs.limitToWifi = event.value;
	Prefs.updated = true;
};

PreferencesAssistant.prototype.albumArtHandler = function(event) {
	Prefs.albumArt = event.value;
	Prefs.updated = true;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.simpleHandler = function(event) {
	Prefs.simple = !event.value;
	Prefs.updated = true;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.singleTapHandler = function(event) {
	Prefs.singleTap = event.value;
	Prefs.updated = true;
};
