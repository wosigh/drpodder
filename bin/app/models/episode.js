function Episode(init) {
	if (init !== undefined) {
		this.id = init.id;
		this.displayOrder = init.displayOrder;
		this.feedId = init.feedId;
		this.title = init.title;
		this.link = init.link;
		this.description = init.description;
		this.enclosure = init.enclosure;
		this.pubDate = init.pubDate;
		this.guid = init.guid;
		this.file = init.file;
		this.downloadTicket = init.downloadTicket;
		this.downloaded = init.downloaded;
		this.listened = init.listened;
		this.length = init.length;
		this.position = init.position;
	} else {
		this.title = null;
		this.link = null;
		this.description = null;
		this.enclosure = null;
		this.pubDate = null;
		this.guid = null;
		this.file = null;
		this.downloadTicket = null;
		this.downloaded = false;
		this.listened = false;
		this.length = 0;
		this.position = 0;
	}

}

Episode.prototype.loadFromXML = function(xmlObject) {
	this.title = Util.xmlTagValue(xmlObject, "title", "NO TITLE FOUND");
	this.link = Util.xmlTagValue(xmlObject, "link");
	this.description = Util.xmlTagValue(xmlObject, "description");
	this.enclosure = Util.xmlTagAttributeValue(xmlObject, "enclosure", "url");
	// fix stupid redirect url's BOL has started to use
	if (this.enclosure !== undefined && this.enclosure !== null) {
		this.enclosure = this.enclosure.replace(/.*http\:\/\//, "http://");
	}
	this.pubDate = Util.xmlTagValue(xmlObject, "pubDate");
	this.guid = Util.xmlTagValue(xmlObject, "guid");
};

var EpisodeUtil = new Episode();
