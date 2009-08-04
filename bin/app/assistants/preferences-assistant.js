function PreferencesAssistant() {
}

PreferencesAssistant.prototype.setup = function() {
	this.controller.setupWidget("albumArtToggle",
		{},
		{ value : Prefs.albumArt });

	this.controller.setupWidget("simpleToggle",
		{},
		{ value : !Prefs.simple });

	this.controller.setupWidget("singleTap",
		{},
		{ value : Prefs.singleTap });

	Mojo.Event.listen(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler.bind(this));
	Mojo.Event.listen(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler.bind(this));
	Mojo.Event.listen(this.controller.get('singleTap'),Mojo.Event.propertyChange,this.singleTapHandler.bind(this));
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
