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
	var stageController = this.controller.getActiveStageController();
	var currentScene = stageController.currentScene();
	currentScene.showAlertDialog({
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

Utilities.prototype.xpath = function(path, node, getData, numeric) {
    var type = XPathResult.FIRST_UNORDERED_NODE_TYPE;
    var result = node.evaluate(path, node, null, type, null);
    var resultNode = (result !== undefined)?result.singleNodeValue:result;
    if (!getData) {
       return resultNode;
    } else if (numeric) {
       return (resultNode !== undefined)?resultNode.data:0;
    } else {
       return (resultNode !== undefined)?resultNode.data:"";
    }
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
		val = this.xmlGetAttributeValue(node, attr);
	}
	return val;
};

Utilities.prototype.xmlGetAttributeValue = function(node, attr) {
	var val;
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
	return val;
};


Utilities.prototype.escapeSpecial = function(file) {
    file = file.toString().replace(/\//g,'_').replace(/\\/g,'_').replace(/\:/g,'_').
							replace(/\*/g,'_').replace(/\?/g,'_').replace(/\"/g,'_').
							replace(/</g, '_').replace(/\>/g, '_').replace(/\|/g, '_');

	// don't allow filenames longer than 200 chars
	if (file.length > 200) {
		file = file.slice(200);
	}

	// if file ends in a space character, get rid of it, that's bad
	file = file.replace(/\s*$/,"");

	if (file.length === 0) {
		file = "Unknown";
	}

	return file;
};



Util = new Utilities();
