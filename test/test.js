(function (HtaDropTarget) {
    'use strict';

    var doverTimeoutId = 0;
    var dragOverTarget = false;
    var target = document.getElementById('target');
    new HtaDropTarget(target, {
        html: '<h1 style="width:100%; height:100%; border:5px dashed red; text-align:center;">DROP HERE<span style="height:100%; vertical-align:middle;"></span></h1>',
        htmlFilePath: 'blank.html',
        ondrop: function (path) {
            showTarget(false);
            alert("dropped!: \n\"".concat(path, "\""));
        },
        ondragleave: function (ev) {
            console.log("dragleave on WBC");
            dragOverTarget = false;
        },
        ondragenter: function () {
            console.log("dragenter on WBC");
            dragOverTarget = true;
        },
        ondragover: function () {
            console.log("dragover on WBC");
            dragOverTarget = true;
            clearTimeout(doverTimeoutId);
            doverTimeoutId = setTimeout(function () {
                dragOverTarget = false;
                showTarget(false);
            }, 500);
        }
    });
    function showTarget(flag) {
        target.style.display = flag ? 'block' : 'none';
    }
    document.body.ondragenter = function () {
        var _a;
        console.log("dragenter: " + ((_a = event === null || event === void 0 ? void 0 : event.srcElement) === null || _a === void 0 ? void 0 : _a.nodeName));
        showTarget(true);
    };
    document.body.ondragend = function () {
        var _a;
        console.log("dragend: " + ((_a = event === null || event === void 0 ? void 0 : event.srcElement) === null || _a === void 0 ? void 0 : _a.nodeName));
        showTarget(false);
    };
    document.body.ondragleave = function () {
        var _a;
        console.log("dragleave: " + ((_a = event === null || event === void 0 ? void 0 : event.srcElement) === null || _a === void 0 ? void 0 : _a.nodeName));
        setTimeout(function () {
            if (!dragOverTarget)
                showTarget(false);
        }, 0);
    };
    document.body.ondragover = function () {
        console.log("dragover: " + (event === null || event === void 0 ? void 0 : event.srcElement.nodeName));
    };

})(HtaDropTarget);
