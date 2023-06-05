declare var event: MSEventObj | undefined;

import HtaDropTarget from "../dist/hta-drop-target.esm";

const target = document.getElementById('target');
new HtaDropTarget(target, {
	autoHide: true,
	html: '<h1 style="width:100%; height:100%; border:5px dashed red; text-align:center;">DROP HERE<span style="height:100%; vertical-align:middle;"></span></h1>',
	htmlFile: 'blank.html',
	
	ondrop: function (path: string) {
		alert("dropped!: \n\"".concat(path, "\""));
	},
});


