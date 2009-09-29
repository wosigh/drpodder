function DigitalPodcastSearch() {
}

DigitalPodcastSearch.prototype.url = "http://www.digitalpodcast.com/podcastsearchservice/v2b/search/?appid=PrePodID&results=50&keywords=#{keyword}&contentfilter=#{filter}";
DigitalPodcastSearch.prototype.providerLabel = "powered by <a href='http://www.digitalpodcast.com'>Digital Podcast</a>";

DigitalPodcastSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

DigitalPodcastSearch.prototype.search = function(keyword, filter, callback) {
	//Mojo.Log.error("DigitalPodcastSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword), filter: filter});

	//Mojo.Log.error("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});

};

DigitalPodcastSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		return;
	}

	var doc = transport.responseXML;
	if (!doc) {
		doc = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
	}

	var totalResults = Util.xmlTagValue(doc, "totalResults");

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError("Error contacting search service", "Result Count not found");
		return;
	}

	var nodes = document.evaluate("//outline", doc, null, XPathResult.ANY_TYPE, null);
	var node = nodes.iterateNext();
	while (node) {
		var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
		var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
		if (title !== undefined && url !== undefined) {
			//Mojo.Log.error("found: (%s)-[%s]", title, url);
			results.push({title:title, url:url});
		} else {
			//Mojo.Log.error("skipping: (%s)-[%s]", title, url);
		}
		node = nodes.iterateNext();
	}

	callback(results);
};

function SpokenWordSearch() {
}

SpokenWordSearch.prototype.url = "http://#{username}:#{key}@api.spokenword.org/search/feeds.json?count=20&all=#{keyword}";
SpokenWordSearch.prototype.providerLabel = "powered by <a href='http://www.spokenword.com'>Spoken Word</a>";

SpokenWordSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

SpokenWordSearch.prototype.search = function(keyword, filter, callback) {
	//Mojo.Log.error("SpokenWordSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword),
						 username: "drnull",
						 key: "b754f71f3732ca720ce6ee249440b40e"});

	//Mojo.Log.error("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "true",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});

};

SpokenWordSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		return;
	}

	var json = transport.responseText.evalJSON(true);

	var totalResults = json.count;

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError("Error contacting search service", "Result Count not found");
		return;
	}

	json.feeds.forEach(function(f) {
		var title = f.title;
		var url = f.feedUrl;
		results.push({title: title, url: url});
	});

	callback(results);
};


function GoogleListenSearch() {
}

GoogleListenSearch.prototype.url = "http://lfe-alpo-gm.appspot.com/search?q=#{keyword}";
GoogleListenSearch.prototype.providerLabel = "powered by <a href='http://listen.googlelabs.com/'>Google Listen</a>";

GoogleListenSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

GoogleListenSearch.prototype.search = function(keyword, filter, callback) {
	Mojo.Log.info("GoogleListenSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword), filter: filter});

	//Mojo.Log.error("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});
};


GoogleListenSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		return;
	}

	for (i=0; i<transport.responseText.length; i+=100) {
		Mojo.Log.info("%s", transport.responseText.substring(i, i+100));
	}
	/*
	var doc = transport.responseXML;
	if (!doc) {
		doc = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
	}

	var totalResults = Util.xmlTagValue(doc, "totalResults");

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError("Error contacting search service", "Result Count not found");
		return;
	}

	var nodes = document.evaluate("//outline", doc, null, XPathResult.ANY_TYPE, null);
	var node = nodes.iterateNext();
	while (node) {
		var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
		var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
		if (title !== undefined && url !== undefined) {
			//Mojo.Log.error("found: (%s)-[%s]", title, url);
			results.push({title:title, url:url});
		} else {
			//Mojo.Log.error("skipping: (%s)-[%s]", title, url);
		}
		node = nodes.iterateNext();
	}
	*/

	callback(results);
};

function FeedSearchAssistant() {
	this.searchService = "digitalPodcast";
	this.searchServices = {"digitalPodcast": new DigitalPodcastSearch(),
						   "spokenWord": new SpokenWordSearch(),
						   "googleListen": new GoogleListenSearch()};
}

FeedSearchAssistant.prototype.setup = function() {
	this.controller.setupWidget("feedSearchScroller", {}, {});

	this.controller.setupWidget("searchProviderList",
		{label: "Directory",
		 choices: [{label: "Digital Podcast", value: "digitalPodcast"}
		           //{label: "Spoken Word", value: "spokenWord"}]
		           //{label: "Google Listen", value: "googleListen"}]
		]},
		this.searchProviderModel = { value : "digitalPodcast" });

	this.searchProvider = this.controller.get("searchProviderList");
	this.searchProviderChangeHandler = this.searchProviderChange.bind(this);

	this.controller.setupWidget("filterList",
		{label: "Filter",
		 choices: [{label: "No Filter", value: "nofilter"},
				   {label: "No Adult", value: "noadult"},
				   {label: "No Explicit", value: "noexplicit"},
				   {label: "Clean", value: "clean"},
				   {label: "Explicit", value: "explicit"},
				   {label: "Adult", value: "adult"}]},
		this.filterModel = { value : "nofilter" });

	this.filter = this.controller.get("filterList");
	this.filterDiv = this.controller.get("filterDiv");
	this.filterChangeHandler = this.filterChange.bind(this);

	this.controller.setupWidget("keywordField",
		{
			hintText : "Search Keyword",
			autoFocus : true,
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			focusMode : Mojo.Widget.focusSelectMode,
			requiresEnterKey: true
		},
		this.keywordModel = { value : ""});

	this.keywordField = this.controller.get("keywordField");
	this.keywordChangeHandler = this.keywordChange.bind(this);

	this.listAttr = {
		itemTemplate: "feedSearch/searchRowTemplate",
		listTemplate: "feedSearch/searchListTemplate",
		swipeToDelete: false,
		reorderable: false,
		renderLimit: 50
	};

	this.listModel = {items: []};

	this.providerLabel = this.controller.get("providerLabel");
	this.providerLabel.update(this.searchServices[this.searchService].getProviderLabel());

	this.controller.setupWidget("feedSearchList", this.listAttr, this.listModel);
	this.feedSearchList = this.controller.get("feedSearchList");
	this.selectionHandler = this.selection.bindAsEventListener(this);

};

FeedSearchAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.keywordField, Mojo.Event.propertyChange, this.keywordChangeHandler);
	Mojo.Event.listen(this.searchProvider, Mojo.Event.propertyChange, this.searchProviderChangeHandler);
	Mojo.Event.listen(this.feedSearchList, Mojo.Event.listTap, this.selectionHandler);
};

FeedSearchAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.keywordField, Mojo.Event.propertyChange, this.keywordChangeHandler);
	Mojo.Event.stopListening(this.searchProvider, Mojo.Event.propertyChange, this.searchProviderChangeHandler);
	Mojo.Event.stopListening(this.feedSearchList, Mojo.Event.listTap, this.selectionHandler);
};

FeedSearchAssistant.prototype.cleanup = function() {
};

FeedSearchAssistant.prototype.searchProviderChange = function(event) {
	this.searchService = this.searchProviderModel.value;
	this.providerLabel.update(this.searchServices[this.searchService].getProviderLabel());
	if (this.searchService === "digitalPodcast") {
		this.filterDiv.show();
	} else {
		this.filterDiv.hide();
	}
};

FeedSearchAssistant.prototype.filterChange = function(event) {
};

FeedSearchAssistant.prototype.keywordChange = function(event) {
	if (event.value) {
		var ss = this.searchServices[this.searchService];

		this.listModel.items = [];
		this.controller.modelChanged(this.listModel);
		Mojo.View.getScrollerForElement(this.providerLabel).mojo.revealBottom(true);

		ss.search(event.value, this.filterModel.value, function(results) {
			var numFeeds = results.length;
			this.listModel.items = results;

			if (numFeeds > 0) {
				this.controller.modelChanged(this.listModel);
			} else {
				Util.showError("No results found", "Please try a different keyword, or ask the service provider to add your feed.");
			}
		}.bind(this));
	}
};

FeedSearchAssistant.prototype.selection = function(event) {
	//Mojo.Log.error("You clicked on: [%s], [%s]", event.item.title, event.item.url);
	this.controller.stageController.popScene({feedToAdd: event.item});
};
