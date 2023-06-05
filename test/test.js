(function (HtaDropTarget) {
    'use strict';

    var target = document.getElementById('target');
    new HtaDropTarget(target, {
        autoHide: true,
        html: '<h1 style="width:100%; height:100%; border:5px dashed red; text-align:center;">DROP HERE<span style="height:100%; vertical-align:middle;"></span></h1>',
        htmlFile: 'blank.html',
        ondrop: function (path) {
            alert("dropped!: \n\"".concat(path, "\""));
        }
    });

})(HtaDropTarget);
