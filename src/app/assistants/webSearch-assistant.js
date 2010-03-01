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
