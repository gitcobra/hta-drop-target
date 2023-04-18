declare var event: MSEventObj | undefined;

import HtaDropTarget from "../dist/hta-drop-target.esm";


let doverTimeoutId = 0 as any;
let dragOverTarget = false;

const target = document.getElementById('target');
new HtaDropTarget(target, {
	html: '<h1 style="width:100%; height:100%; border:5px dashed red; text-align:center;">DROP HERE<span style="height:100%; vertical-align:middle;"></span></h1>',
	htmlFilePath: 'blank.html',
	
	ondrop: function (path: string) {
		showTarget(false);
		alert("dropped!: \n\"".concat(path, "\""));
	},
	ondragleave: function(ev: MSEventObj) {
		console.log("dragleave on WBC");
    dragOverTarget = false;
	},
	ondragenter: function() {
		console.log("dragenter on WBC");
		dragOverTarget = true;
	},
	ondragover: function() {
		console.log("dragover on WBC");
		dragOverTarget = true;
		clearTimeout(doverTimeoutId);
		doverTimeoutId = setTimeout(function(){
			dragOverTarget = false;
			showTarget(false);
		}, 500);
	}
});


function showTarget(flag: boolean) {
	target.style.display = flag ? 'block' : 'none';
}

document.body.ondragenter = function() {
	console.log("dragenter: "+event?.srcElement?.nodeName)
	showTarget(true);
};
document.body.ondragend = function() {
	console.log("dragend: "+event?.srcElement?.nodeName)
	showTarget(false);
};
document.body.ondragleave = function() {
	console.log("dragleave: "+event?.srcElement?.nodeName)
	setTimeout(function(){
		if( !dragOverTarget )
			showTarget(false);
	}, 0);
};
document.body.ondragover = function() {
	console.log("dragover: "+event?.srcElement.nodeName)
};
