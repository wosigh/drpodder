function WebSearchAssistant(params) {
	if (params) {
		this.startPage = params.startPage;
		this.limitSite = params.limitSite;
	}
}

WebSearchAssistant.prototype.setup = function() {
	this.controller.setupWidget("searchWebView",
        this.attributes = {
            url:    this.startPage,
            virtualpagewidth: 280,
			interrogateClicks: true,
			minFontSize:8
        },
        this.model = {}
	);

	this.searchWebView = this.controller.get("searchWebView");

	this.handleLinkClicked = this.linkClicked.bind(this);
};

WebSearchAssistant.prototype.activate = function(event) {
	Mojo.Event.listen(this.searchWebView, Mojo.Event.webViewLinkClicked, this.handleLinkClicked);
};

WebSearchAssistant.prototype.deactivate = function(event) {
	Mojo.Event.stopListening(this.searchWebView, Mojo.Event.webViewLinkClicked, this.handleLinkClicked);
};

WebSearchAssistant.prototype.cleanup = function(event) {
};

WebSearchAssistant.prototype.linkClicked = function(event) {
	if (this.limitSite && !event.url.startsWith(this.limitSite)) {
		this.controller.stageController.popScene({feedToAdd: {url:event.url}});
	} else {
		this.searchWebView.mojo.openURL(event.url);
	}
};
