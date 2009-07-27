var Util;

function Utilities(){
}

Utilities.dump = function(obj){
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            Mojo.Log.error("obj." + key + "=" + obj[key]);
        }
    }
};

Utilities._albumArtFormatterHelper = function(url, dimStr){
    return "/var/luna/data/extractfs" + encodeURIComponent(url) + dimStr + ":3";
};

Utilities.albumArtLargeUrlFormatter = function(url){
    if (url) {
        return Util._albumArtFormatterHelper(url, ":200:200");
    } else {
        return "images/large-album-art-sample.png";
    }
};

Utilities.albumArtListUrlFormatter = function(url){
    if (url) {
        return Util._albumArtFormatterHelper(url, ":80:80");
    } else {
        return "images/default-album-art-list-view.png";
    }
};

Utilities.prototype.showError = function(title, message){
    var controller = Mojo.Controller.stageController.activeScene();
	controller.showAlertDialog({
        onChoose: function(value){
        },
        title: title,
        message: message,
        choices: [{
            label: $L('OK'),
            value: 'ok',
            type: 'color'
        }]
    });
};

Utilities.prototype.xmlTagValue = function(node, element, def) {
	var arr = node.getElementsByTagName(element);
	var val = def;
	if (arr && arr.length > 0 && arr[0].firstChild) { val = arr[0].firstChild.nodeValue; }
	return val;
};

Utilities.prototype.xmlTagAttributeValue = function(node, element, attr, def) {
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

Util = new Utilities();
