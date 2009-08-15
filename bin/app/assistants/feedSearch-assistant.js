function FeedSearchAssistant() {
}

FeedSearchAssistant.prototype.progressAttr = {
	sliderProperty: "value",
	progressStartProperty: "progressStart",
	progressProperty: "progressEnd",
	round: false,
	updateInterval: 0.2
};

FeedSearchAssistant.prototype.setup = function() {
	this.controller.setupWidget("feedSearchScroller", {}, {});

	this.controller.setupWidget("searchProviderList",
		{label: "Directory",
		 choices: [{label: "Digital Podcast", value: "digitalPodcast"}]},
		this.searchProviderModel = { value : "digitalPodcast" });

	this.searchProvider = this.controller.get("searchProviderList");
	this.searchProviderChangeHandler = this.searchProviderChange.bind(this);

	this.controller.setupWidget("keywordField",
		{
			hintText : "Search Keyword",
			focus : true,
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
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

	this.controller.setupWidget("feedSearchList", this.listAttr, this.listModel);
	this.feedSearchList = this.controller.get("feedSearchList");
	this.selectionHandler = this.selection.bindAsEventListener(this);
};

FeedSearchAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.keywordField, Mojo.Event.propertyChange, this.keywordChangeHandler);
	//Mojo.Event.listen(this.searchProvider, Mojo.Event.propertyChange, this.searchProviderChangeHandler);
	Mojo.Event.listen(this.feedSearchList, Mojo.Event.listTap, this.selectionHandler);
};

FeedSearchAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.keywordField, Mojo.Event.propertyChange, this.keywordChangeHandler);
	//Mojo.Event.stopListening(this.searchProvider, Mojo.Event.propertyChange, this.searchProviderChangeHandler);
};

FeedSearchAssistant.prototype.cleanup = function() {
};

FeedSearchAssistant.prototype.searchProviderChange = function(event) {
};

FeedSearchAssistant.prototype.keywordChange = function(event) {
	// change this to an object based system (since we can have multiple providers)
	// use Template to generate the url
	//var t = new Template("#{status}");
	//var m = t.evaluate(transport);
	var digitalPodcastURL = "http://www.digitalpodcast.com/podcastsearchservice/v2b/search/?appid=PrePodID&results=50&keywords=";
	//Mojo.Log.error("You are searching for: %s", event.value);
	//Mojo.Log.error("url: %s", digitalPodcastURL+encodeURI(event.value));

	var request = new Ajax.Request(digitalPodcastURL + encodeURI(event.value), {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError("Error contacting search service", "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this)
	});
};

FeedSearchAssistant.prototype.searchResults = function(transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
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
	var numFeeds = 0;
	this.listModel.items = [];
	this.controller.modelChanged(this.listModel);
	while (node) {
		var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
		var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
		if (title !== undefined && url !== undefined) {
			//Mojo.Log.error("found: (%s)-[%s]", title, url);
			this.listModel.items.push({title:title, url:url});
			++numFeeds;
		} else {
			//Mojo.Log.error("skipping: (%s)-[%s]", title, url);
		}
		node = nodes.iterateNext();
	}

	if (numFeeds > 0) {
		this.controller.modelChanged(this.listModel);
	} else {
		Util.showError("No results found", "Please try a different keyword, or go to http://www.digitalpodcast.com and add your feed.");
	}
};

FeedSearchAssistant.prototype.selection = function(event) {
	//Mojo.Log.error("You clicked on: [%s], [%s]", event.item.title, event.item.url);
	this.controller.stageController.popScene({feedToAdd: event.item});
};
