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

Utilities.alert = function(message){
    this.controller.showAlertDialog({
        onChoose: function(value){
        },
        title: $L("Error"),
        message: message,
        choices: [{
            label: $L('OK'),
            value: 'ok',
            type: 'color'
        }]
    });
};

/*
var Util;
Util = new Utilities();
*/