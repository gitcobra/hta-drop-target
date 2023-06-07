/*
  title: hta-drop-target
  version: 1.0.3
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
            this._autoHide = false;
            this._draggingOver = false;
            this._initializedHtmlFile = false;
            this._locked = false;
            this._leIE6 = Number((_a = /MSIE (\d)\./.exec(navigator.appVersion)) === null || _a === void 0 ? void 0 : _a[1]) <= 6;
            this._leIE7 = this._leIE6 || /MSIE 7/.test(navigator.appVersion) && !/Trident\/([\d.]+)/.test(navigator.appVersion);
            this._leIE8 = this._leIE7 || Number((_b = /Trident\/([\d.]+)/.exec(navigator.appVersion)) === null || _b === void 0 ? void 0 : _b[1]) <= 4;
            this._disabled = false;
            // set events for showing/hiding the drag target automatically
            this._autoHideTimeoutId = 0;
            this._wrapped_ondragenter_for_observer_ = function () { return _this.show(true); };
            this._wrapped_ondragend_for_observer_ = function () { return _this.show(false); };
            this._wrapped_ondragover_for_observer_ = function () { return _this._resetDraggingTimeout(); };
            this._wrapped_ondragleave_for_observer_ = function () { return _this._prepareToDragLeave(); };
            this._wrapped_ondragover_for_wbc_ = function (ev) {
                var _a, _b;
                (_b = (_a = _this._listeners) === null || _a === void 0 ? void 0 : _a.ondragover) === null || _b === void 0 ? void 0 : _b.call(_a, ev);
                _this._resetDraggingTimeout();
            };
            this._wrapped_ondragenter_for_wbc_ = function (ev) {
                var _a, _b;
                (_b = (_a = _this._listeners) === null || _a === void 0 ? void 0 : _a.ondragenter) === null || _b === void 0 ? void 0 : _b.call(_a, ev);
            };
            this._wrapped_ondragleave_for_wbc_ = function (ev) {
                var _a, _b;
                (_b = (_a = _this._listeners) === null || _a === void 0 ? void 0 : _a.ondragleave) === null || _b === void 0 ? void 0 : _b.call(_a, ev);
                _this._prepareToDragLeave();
            };
            this._wrapped_ondragend_for_wbc_ = function (ev) {
                var _a, _b;
                (_b = (_a = _this._listeners) === null || _a === void 0 ? void 0 : _a.ondragend) === null || _b === void 0 ? void 0 : _b.call(_a, ev);
            };
            this._target = target;
            var html = '';
            if (typeof args === 'function') {
                this._listeners.ondrop = args;
            }
            else if (args) {
                this._listeners.ondrop = args.ondrop;
                this._listeners.ondragenter = args.ondragenter;
                this._listeners.ondragover = args.ondragover;
                this._listeners.ondragleave = args.ondragleave;
                this._listeners.ondragend = args.ondragend;
                this._listeners.ondropfileIE6 = args.ondropfileIE6;
                html = args.html ? String(args.html) : '';
                this._htmlFile = args.htmlFile;
                if (this._htmlFile && !/^[a-z]:/i.test(this._htmlFile)) {
                    var a = document.createElement('a');
                    a.setAttribute('href', this._htmlFile);
                    // @ts-ignore
                    this._htmlFile = unescape(a.cloneNode(false).href.replace(/^file:\/+/, '').replace(/\//g, '\\'));
                }
                this._autoHide = !!args.autoHide;
                if (this._autoHide) {
                    if (!this._htmlFile)
                        throw new Error("hta-drop-target needs htmlFile parameter when autoHide is true.");
                    var observer = (args === null || args === void 0 ? void 0 : args.observer) || target.parentNode;
                    if (!observer)
                        throw new Error("hta-drop-target needs observer or target.parentNode when autoHide is true.");
                    this._observer = observer;
                }
            }
            this.setTargetHTML(html);
            // save references of the callbacks to detach
            if (this._leIE8)
                this._wrapped_onStatusTextChange = function (sText) { return _this._onStatusTextChange(sText); };
            else
                this._wrapped_onBeforeNavigate = function (pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel) { return _this._onBeforeNavigate(pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel); };
            this._wrapped_onNavigateComplete = function (pDisp, URL) { return _this._onNavigateComplete(pDisp, URL); };
            this._generateBrowserAndAttachEventHandlers();
            if (this._autoHide) {
                this._setAutoHidingEventsForOuterDocument();
            }
        }
        HtaDropTarget.prototype.setTargetHTML = function (html) {
            var locationValue = '';
            if (this._htmlFile) {
                // local HTML file path.
                // it is necessary to set event listeners on the WBC's Document because
                // it seems that its Document property is not accesible when the Location is "about:blank".
                locationValue = this._htmlFile;
                this._html = html;
                this._initializedHtmlFile = false;
            }
            else {
                // when the _htmlFile is not supplied, it has no choice but to use "about:<HTML tags>...".
                // in this case all event listeners will be no effect.
                html = html.replace(/"/g, '&quot;');
                locationValue = "about:<body ondragstart='return false' scroll=no style='border:0px; margin:0px; padding:0px;'>".concat(html);
                //locationValue = locationValue.replace(/"/g, '&quot;');
                this._html = '';
            }
            // hta-drop-target uses a WebBrowser Control as a drop target. 
            this._WebBrowserObjectHTML = "\n    <object classid=\"clsid:8856F961-340A-11D0-A96B-00C04FD705A2\" id=\"".concat(WebBrowserObjectId, "\" style=\"visibility:hidden; border:0px; width:100%; height:100%;\">\n    <param name=\"Location\" Value=\"").concat(locationValue, "\">\n    <param name=\"RegisterAsDropTarget\" value=\"1\">\n    <param name=\"Offline\" Value=\"1\">\n    <param name=\"Silent\" Value=\"1\">\n    </object>\n    ");
        };
        // set events to the WebBrowser Control
        HtaDropTarget.prototype._generateBrowserAndAttachEventHandlers = function () {
            var _this = this;
            this._target.innerHTML = this._WebBrowserObjectHTML;
            var wbcref = this._target.all(WebBrowserObjectId);
            if (!wbcref)
                throw new Error("could not find WebBrowser Object. id:\"".concat(WebBrowserObjectId, "\""));
            // set WebBrowser's Events
            if (this._leIE8)
                wbcref.attachEvent('StatusTextChange', this._wrapped_onStatusTextChange);
            else
                wbcref.attachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate);
            wbcref.attachEvent('NavigateComplete2', this._wrapped_onNavigateComplete);
            //setTimeout(() => this._initializedHtmlFile = true, 500);
            // loading a real html file
            if (this._htmlFile) {
                // wait for navigation
                var retry_1 = 3;
                var setWBCinnerDocument_1 = function () {
                    try {
                        if (_this._html)
                            wbcref.Document.body.innerHTML = _this._html;
                        // set user events
                        if (_this._autoHide) {
                            _this._setAutoHidingEventsForWBCDocument(wbcref);
                        }
                        else {
                            wbcref.Document.body.ondragenter = _this._listeners.ondragenter || null;
                            wbcref.Document.body.ondragleave = _this._listeners.ondragleave || null;
                            wbcref.Document.body.ondragend = _this._listeners.ondragend || null;
                            wbcref.Document.body.ondragover = _this._listeners.ondragover || null;
                        }
                        // exec script inside the controler
                        wbcref.Document.parentWindow.execScript("\n            document.body.scroll = 'no';\n            document.body.style.cssText += ';margin:0px; padding:0px; overflow:hidden;';\n            document.body.ondragstart = function() { return false; };\n            document.body.onselectstart = function() { return false; };\n          ");
                        wbcref.style.visibility = 'visible';
                    }
                    catch (e) {
                        if (--retry_1)
                            setTimeout(setWBCinnerDocument_1, 300);
                        else
                            wbcref.style.visibility = 'visible';
                    }
                };
                setTimeout(setWBCinnerDocument_1, 300);
            }
            else
                wbcref.style.visibility = 'visible';
        };
        HtaDropTarget.prototype._detachBrowserControlEventHandlers = function () {
            var wbcref = this._target.all(WebBrowserObjectId);
            if (wbcref) {
                wbcref.style.display = 'none';
                if (this._leIE8)
                    wbcref.detachEvent('StatusTextChange', this._wrapped_onStatusTextChange);
                else
                    wbcref.detachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate);
                wbcref.detachEvent('NavigateComplete2', this._wrapped_onNavigateComplete);
                try {
                    wbcref.Document.body.ondragenter = null;
                    wbcref.Document.body.ondragleave = null;
                    wbcref.Document.body.ondragend = null;
                    wbcref.Document.body.ondragover = null;
                    wbcref.Document.body.detachEvent('ondragover', this._wrapped_ondragover_for_wbc_);
                    wbcref.Document.body.detachEvent('ondragleave', this._wrapped_ondragleave_for_wbc_);
                    wbcref.Document.body.detachEvent('ondragenter', this._wrapped_ondragenter_for_wbc_);
                    wbcref.Document.body.detachEvent('ondragend', this._wrapped_ondragend_for_wbc_);
                }
                catch (e) {
                }
            }
        };
        HtaDropTarget.prototype._detachObserverEventHandlers = function () {
            var observer = this._observer;
            if (observer) {
                observer.detachEvent('ondragenter', this._wrapped_ondragenter_for_observer_);
                observer.detachEvent('ondragend', this._wrapped_ondragend_for_observer_);
                observer.detachEvent('ondragover', this._wrapped_ondragover_for_observer_);
                observer.detachEvent('ondragleave', this._wrapped_ondragleave_for_observer_);
            }
        };
        // [StatusTextChange] read a file's path from the status text. only IE6-8 need this.
        HtaDropTarget.prototype._onStatusTextChange = function (sText) {
            var _this = this;
            if (this._locked)
                return;
            if (/\b[a-z]+:\/+/.test(sText)) {
                this._reset();
                if (this._htmlFile && !this._initializedHtmlFile) {
                    setTimeout(function () { return _this._initializedHtmlFile = true; }, 500);
                    return;
                }
                var exec = /file:\/\/\/([^\s]+)\s*\.\.\.$/.exec(sText);
                if (exec) {
                    var url = unescape(exec[1]).replace(/\//g, '\\');
                    this._fireOnDrop(url);
                }
                else {
                    if (!this._listeners.ondropfileIE6)
                        alert("On IE6-8, the drop target accepts only a folder.");
                    else
                        this._listeners.ondropfileIE6();
                }
            }
        };
        // [BeforeNavigate] get a file's path from the event parameter. it doesn't work on IE6.
        HtaDropTarget.prototype._onBeforeNavigate = function (pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel) {
            if (this._locked || /^about:/i.test(Url))
                return;
            // avoid this._htmlFile's first navigation firing the event
            if (this._htmlFile && !this._initializedHtmlFile && this._htmlFile === Url) {
                return;
            }
            this._fireOnDrop(String(Url));
        };
        // [NavigateComplete] get a folder's path.
        HtaDropTarget.prototype._onNavigateComplete = function (pDisp, URL) {
            if (this._locked || /^about:/i.test(URL))
                return;
            // avoid this._htmlFile's first navigation firing the event
            if (this._htmlFile && !this._initializedHtmlFile && this._htmlFile === URL) {
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
            this._detachBrowserControlEventHandlers();
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
            this._detachBrowserControlEventHandlers();
            // reset WebBrowser
            this._generateBrowserAndAttachEventHandlers();
            // unlock
            setTimeout(function () { return _this._locked = false; }, 500);
        };
        HtaDropTarget.prototype._setAutoHidingEventsForOuterDocument = function () {
            var observer = this._observer;
            observer.attachEvent('ondragenter', this._wrapped_ondragenter_for_observer_);
            observer.attachEvent('ondragend', this._wrapped_ondragend_for_observer_);
            observer.attachEvent('ondragover', this._wrapped_ondragover_for_observer_);
            observer.attachEvent('ondragleave', this._wrapped_ondragleave_for_observer_);
        };
        HtaDropTarget.prototype._setAutoHidingEventsForWBCDocument = function (wbc) {
            wbc.Document.body.attachEvent('ondragover', this._wrapped_ondragover_for_wbc_);
            wbc.Document.body.attachEvent('ondragleave', this._wrapped_ondragleave_for_wbc_);
            wbc.Document.body.attachEvent('ondragenter', this._wrapped_ondragenter_for_wbc_);
            wbc.Document.body.attachEvent('ondragend', this._wrapped_ondragend_for_wbc_);
        };
        HtaDropTarget.prototype._resetDraggingTimeout = function () {
            var _this = this;
            clearTimeout(this._autoHideTimeoutId);
            this._draggingOver = true;
            this._autoHideTimeoutId = window.setTimeout(function () {
                _this._draggingOver = false;
                _this.show(false);
            }, 300);
        };
        HtaDropTarget.prototype._prepareToDragLeave = function () {
            var _this = this;
            this._draggingOver = false;
            window.setTimeout(function () {
                if (!_this._draggingOver)
                    _this.show(false);
            }, 200);
        };
        HtaDropTarget.prototype.show = function (flag) {
            if (flag === void 0) { flag = true; }
            if (this._disabled && flag)
                return;
            this._target.style.display = flag ? '' : 'none';
        };
        HtaDropTarget.prototype.disable = function (flag) {
            if (flag === void 0) { flag = true; }
            this._disabled = flag;
        };
        HtaDropTarget.prototype.isDisabled = function () {
            return this._disabled;
        };
        HtaDropTarget.prototype.dispose = function () {
            this._detachBrowserControlEventHandlers();
            this._detachObserverEventHandlers();
            this._wrapped_onStatusTextChange = null;
            this._wrapped_onBeforeNavigate = null;
            this._wrapped_onNavigateComplete = null;
            this._wrapped_ondragover_for_wbc_ = null;
            this._wrapped_ondragleave_for_wbc_ = null;
            this._wrapped_ondragenter_for_wbc_ = null;
            this._wrapped_ondragend_for_wbc_ = null;
            this._listeners = null;
            this._observer = null;
            this._target.innerHTML = '';
            this._target = null;
        };
        return HtaDropTarget;
    }());

    return HtaDropTarget;

})();
