/*
  title: hta-drop-target
  version: 1.0.0
  github: https://github.com/gitcobra/hta-drop-target
*/
var HtaDropTarget = (function () {
    'use strict';

    var WebBrowserObjectId = 'hta-drop-target-object';
    var HtaDropTarget = /** @class */ (function () {
        function HtaDropTarget(target, args) {
            var _this = this;
            var _a, _b;
            this._listeners = {};
            this._WebBrowserObjectHTML = '';
            this._initializedHtmlFile = false;
            this._locked = false;
            this._leIE6 = Number((_a = /MSIE (\d)\./.exec(navigator.appVersion)) === null || _a === void 0 ? void 0 : _a[1]) <= 6;
            this._leIE7 = this._leIE6 || /MSIE 7/.test(navigator.appVersion) && !/Trident\/([\d.]+)/.test(navigator.appVersion);
            this._leIE8 = this._leIE7 || Number((_b = /Trident\/([\d.]+)/.exec(navigator.appVersion)) === null || _b === void 0 ? void 0 : _b[1]) <= 4;
            this._target = target;
            var html = '';
            if (typeof args === 'function') {
                this._listeners.ondrop = args;
            }
            else if (args) {
                html = args.html ? String(args.html) : '';
                this._listeners.ondrop = args.ondrop;
                this._listeners.ondragenter = args.ondragenter;
                this._listeners.ondragover = args.ondragover;
                this._listeners.ondragleave = args.ondragleave;
                this._listeners.ondragend = args.ondragend;
                this._listeners.ondropfileIE6 = args.ondropfileIE6;
                this._htmlFilePath = args.htmlFilePath;
                if (this._htmlFilePath && !/^[a-z]:/i.test(this._htmlFilePath)) {
                    var a = document.createElement('a');
                    a.setAttribute('href', this._htmlFilePath);
                    // @ts-ignore
                    this._htmlFilePath = unescape(a.cloneNode(false).href.replace(/^file:\/\/\//, '').replace(/\//g, '\\'));
                }
            }
            this.setTargetHTML(html);
            // save references of the callbacks to detach
            this._leIE8 ? this._wrapped_onStatusTextChange = function (sText) { return _this._onStatusTextChange(sText); } : this._wrapped_onBeforeNavigate = function (pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel) { return _this._onBeforeNavigate(pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel); };
            this._wrapped_onNavigateComplete = function (pDisp, URL) { return _this._onNavigateComplete(pDisp, URL); };
            this._generateBrowserAndAttachEventHandlers();
        }
        HtaDropTarget.prototype.setTargetHTML = function (html) {
            var locationValue = '';
            if (this._htmlFilePath) {
                // local HTML file path.
                // it is necessary to set event listeners on the WBC's Document because
                // it seems that its Document property is not accesible when the Location is "about:blank".
                locationValue = this._htmlFilePath;
                this._html = html;
                this._initializedHtmlFile = false;
            }
            else {
                // when the _htmlFilePath is not supplied, it has no choice but to use "about:<HTML tags>...".
                // in this case all event listeners will be no effect.
                html = html.replace(/"/g, '&quot;');
                locationValue = "about:<body ondragstart='return false' scroll=no style='border:0px; margin:0px; padding:0px;'>".concat(html);
                //locationValue = locationValue.replace(/"/g, '&quot;');
                this._html = '';
            }
            // hta-drop-target uses a WebBrowser Control as a drop target. 
            this._WebBrowserObjectHTML = "\n    <object classid=\"clsid:8856F961-340A-11D0-A96B-00C04FD705A2\" id=\"".concat(WebBrowserObjectId, "\" style=\"border:0px; width:100%; height:100%;\">\n    <param name=\"Location\" Value=\"").concat(locationValue, "\">\n    <param name=\"RegisterAsDropTarget\" value=\"1\">\n    <param name=\"Offline\" Value=\"1\">\n    <param name=\"Silent\" Value=\"1\">\n    </object>\n    ");
        };
        // set events to the WebBrowser Control
        HtaDropTarget.prototype._generateBrowserAndAttachEventHandlers = function () {
            var _this = this;
            this._target.innerHTML = this._WebBrowserObjectHTML;
            var wbcref = this._target.all(WebBrowserObjectId);
            if (!wbcref)
                throw new Error("could not find WebBrowser Object. id:\"".concat(WebBrowserObjectId, "\""));
            // loading a real html file
            if (this._htmlFilePath) {
                // wait for navigation
                setTimeout(function () {
                    try {
                        if (_this._html)
                            wbcref.Document.body.innerHTML = _this._html;
                        // set user events
                        wbcref.Document.body.ondragenter = _this._listeners.ondragenter || null;
                        wbcref.Document.body.ondragleave = _this._listeners.ondragleave || null;
                        wbcref.Document.body.ondragend = _this._listeners.ondragend || null;
                        wbcref.Document.body.ondragover = _this._listeners.ondragover || null;
                        // exec script inside the controler
                        wbcref.Document.parentWindow.execScript("\n            document.body.scroll = 'no';\n            document.body.style.cssText = 'border:0px; color:red; margin:0px; padding:0px; overflow:hidden;';\n            document.body.ondragstart = function() { return false; };\n            document.body.onselectstart = function() { return false; };\n          ");
                    }
                    catch (e) {
                    }
                }, 0);
            }
            // set WebBrowser's Events
            this._leIE8 ? wbcref.attachEvent('StatusTextChange', this._wrapped_onStatusTextChange) : wbcref.attachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate);
            wbcref.attachEvent('NavigateComplete2', this._wrapped_onNavigateComplete);
        };
        HtaDropTarget.prototype._detachBrowserEventHandlers = function () {
            var wbcref = this._target.all(WebBrowserObjectId);
            if (wbcref) {
                this._leIE8 ? wbcref.detachEvent('StatusTextChange', this._wrapped_onStatusTextChange) : wbcref.detachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate);
                wbcref.detachEvent('NavigateComplete2', this._wrapped_onNavigateComplete);
                try {
                    wbcref.Document.body.ondragenter = null;
                    wbcref.Document.body.ondragleave = null;
                    wbcref.Document.body.ondragend = null;
                    wbcref.Document.body.ondragover = null;
                }
                catch (e) {
                }
            }
        };
        // [StatusTextChange] read a file's path from the status text. only IE6-8 need this.
        // Although the status text includes a file's path, this just ignore the file dropping operation on IE8 or lower.
        // The reason is that there may be no easy way to read precisely the path from the status text in all languages,
        // and besides, when it recieves a dropped file on those versions of IE, occasionally a download dialog is opened.
        HtaDropTarget.prototype._onStatusTextChange = function (sText) {
            if (this._locked)
                return;
            if (/\b[a-z]+:\/\//.test(sText)) {
                if (this._htmlFilePath && !this._initializedHtmlFile)
                    return;
                this._reset();
                if (!this._listeners.ondropfileIE6)
                    alert("On IE6-8, the drop target accepts only a folder.\n\nstatus: \"".concat(sText, "\""));
                else
                    this._listeners.ondropfileIE6();
            }
        };
        // [BeforeNavigate] get a file's path from the event parameter. it doesn't work on IE6.
        HtaDropTarget.prototype._onBeforeNavigate = function (pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel) {
            if (this._locked || /^about:/i.test(Url))
                return;
            // avoid this._htmlFilePath's first navigation firing the event
            if (this._htmlFilePath && !this._initializedHtmlFile && this._htmlFilePath === Url) {
                return;
            }
            this._fireOnDrop(String(Url));
        };
        // [NavigateComplete] get a folder's path.
        HtaDropTarget.prototype._onNavigateComplete = function (pDisp, URL) {
            if (this._locked || /^about:/i.test(URL))
                return;
            // avoid this._htmlFilePath's first navigation firing the event
            if (this._htmlFilePath && !this._initializedHtmlFile && this._htmlFilePath === URL) {
                this._initializedHtmlFile = true;
                return;
            }
            this._fireOnDrop(String(URL));
        };
        /*
        // [NavigateError]
        private _onNavigateError(pDisp:any, URL:any, TargetFrameName:any, StatusCode:any, Cancel:boolean) {
          alert(`a navigation error occured. "${URL}"`);
        }
        */
        // pass a dropped file's path to the "ondrop" handler
        HtaDropTarget.prototype._fireOnDrop = function (path) {
            var _a, _b;
            this._locked = true;
            // clear target
            this._target.innerHTML = '';
            // call ondrop listener
            (_b = (_a = this._listeners).ondrop) === null || _b === void 0 ? void 0 : _b.call(_a, path);
            this._reset();
        };
        // clear WebBrowser Control to cancel the navigation
        HtaDropTarget.prototype._reset = function () {
            var _this = this;
            this._locked = true;
            // release the event handlers
            this._detachBrowserEventHandlers();
            // reset WebBrowser
            this._generateBrowserAndAttachEventHandlers();
            // unlock
            setTimeout(function () { return _this._locked = false; }, 500);
        };
        HtaDropTarget.prototype.dispose = function () {
            this._detachBrowserEventHandlers();
            this._wrapped_onStatusTextChange = null;
            this._wrapped_onBeforeNavigate = null;
            this._wrapped_onNavigateComplete = null;
            this._target.innerHTML = '';
            this._target = null;
            this._listeners = null;
        };
        return HtaDropTarget;
    }());

    return HtaDropTarget;

})();
