function Episode(xmlObject) {
	if (xmlObject) {
		this.title = this.xmlTagValue(xmlObject, "title", "NO TITLE FOUND");
		this.link = this.xmlTagValue(xmlObject, "link");
		this.description = this.xmlTagValue(xmlObject, "description");
		this.enclosure = this.xmlTagAttributeValue(xmlObject, "enclosure", "url");
		this.pubDate = new Date(this.xmlTagValue(xmlObject, "pubDate"));
		this.guid = new Date(this.xmlTagValue(xmlObject, "guid"));

	} else {
		this.title = null;
		this.link = null;
		this.description = null;
		this.enclosure = null;
		this.pubDate = null;
		this.guid = guid;
	}

	this.listened = false;
	this.length = 0;
	this.position = 0;
}

Episode.prototype.xmlTagValue = function(node, element, def) {
	var arr = node.getElementsByTagName(element);
	var val = def;
	if (arr && arr.length > 0 && arr[0].firstChild) { val = arr[0].firstChild.nodeValue; }
	return val;
};

Episode.prototype.xmlTagAttributeValue = function(node, element, attr, def) {
	var arr = node.getElementsByTagName(element);
	var val = def;
	if (arr && arr.length > 0) {
		// we found the element
		node = arr[0];

		if (node.attributes !== null) {
			// just stepping through the attributes till we find the one asked for
			for (var i=0; i<node.attributes.length; i++) {
				var attrNode = node.attributes[i];
				if (attrNode.nodeName.toLowerCase() == attr.toLowerCase()) {
					val = attrNode.nodeValue;
					break;
				}
			}
		}
	}
	return val;
};

var EpisodeUtil = new Episode();
