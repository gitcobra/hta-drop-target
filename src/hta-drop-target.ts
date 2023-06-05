type Listener = (path: string) => any;

type HtaDropTargetOptions = {
  autoHide?: boolean // automatically control visiblity of the drop target. default is false.
  observer?: HTMLElement // when autoHide is true, this element is used to detect ondragenter, ondragleave, etc. default is target.parentNode.
  html?: string
  htmlFile?: string
  ondrop?: Listener
  ondragenter?: (ev: MSEventObj) => any
  ondragleave?: (ev: MSEventObj) => any
  ondragover?: (ev: MSEventObj) => any
  ondragend?: (ev: MSEventObj) => any // not works?
  ondropfileIE6?: Function // to alert that dropping a file is no effect on IE6-8
};

const WebBrowserObjectId = 'hta-drop-target-object';
const console = window.console || { log: () => {} };

export default class HtaDropTarget {
  private _target: HTMLElement;
  private _listeners: Omit<HtaDropTargetOptions, 'html'> = {};
  private _WebBrowserObjectHTML: string = '';
  
  private _autoHide = false;
  private _observer?: HTMLElement;
  private _draggingOver = false;
  
  private _html?: string;
  private _htmlFile?: string;
  private _initializedHtmlFile: boolean = false;
  
  private _locked = false;
  private _leIE6 = Number(/MSIE (\d)\./.exec(navigator.appVersion)?.[1]) <= 6;
  private _leIE7 = this._leIE6 || /MSIE 7/.test(navigator.appVersion) && !/Trident\/([\d.]+)/.test(navigator.appVersion);
  private _leIE8 = this._leIE7 || Number(/Trident\/([\d.]+)/.exec(navigator.appVersion)?.[1]) <= 4;

  private _disabled = false;

  constructor(target: HTMLElement, args: Listener | HtaDropTargetOptions) {
    this._target = target;
    
    let html = '';
    if( typeof args === 'function' ) {
      this._listeners.ondrop = args;
    }
    else if( args ) {
      this._listeners.ondrop = args.ondrop;
      this._listeners.ondragenter = args.ondragenter;
      this._listeners.ondragover = args.ondragover;
      this._listeners.ondragleave = args.ondragleave;
      this._listeners.ondragend = args.ondragend;
      this._listeners.ondropfileIE6 = args.ondropfileIE6;

      html = args.html ? String(args.html) : ''; 
      this._htmlFile = args.htmlFile;
      if( this._htmlFile && !/^[a-z]:/i.test(this._htmlFile) ) {
        const a = document.createElement('a');
        a.setAttribute('href', this._htmlFile);
        // @ts-ignore
        this._htmlFile = unescape(a.cloneNode(false).href.replace(/^file:\/+/, '').replace(/\//g, '\\'));
      }

      this._autoHide = !!args.autoHide;
      if( this._autoHide ) {
        if( !this._htmlFile )
          throw new Error(`hta-drop-target needs htmlFile parameter when autoHide is true.`);
        
        let observer = args?.observer || target.parentNode;
        if( !observer )
          throw new Error(`hta-drop-target needs observer or target.parentNode when autoHide is true.`);
        this._observer = observer as HTMLElement;
      }
    }

    this.setTargetHTML( html );

    // save references of the callbacks to detach
    if( this._leIE8 )
      this._wrapped_onStatusTextChange = (sText: string) => this._onStatusTextChange(sText);
    else
      this._wrapped_onBeforeNavigate = (pDisp:any, Url:any, Flags:any, TargetFrameName:any, PostData:any, Headers:any, Cancel: any) => this._onBeforeNavigate(pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel);
    
    this._wrapped_onNavigateComplete = (pDisp:any, URL:any) => this._onNavigateComplete(pDisp, URL);

    this._generateBrowserAndAttachEventHandlers();

    if( this._autoHide ) {
      this._setAutoHidingEventsForOuterDocument();
    }
  }

  setTargetHTML(html: string) {
    let locationValue = '';
    if( this._htmlFile ) {
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
      locationValue = `about:<body ondragstart='return false' scroll=no style='border:0px; margin:0px; padding:0px;'>${html}`;
      //locationValue = locationValue.replace(/"/g, '&quot;');
      this._html = '';
    }

    // hta-drop-target uses a WebBrowser Control as a drop target. 
    this._WebBrowserObjectHTML = `
    <object classid="clsid:8856F961-340A-11D0-A96B-00C04FD705A2" id="${WebBrowserObjectId}" style="visibility:hidden; border:0px; width:100%; height:100%;">
    <param name="Location" Value="${locationValue}">
    <param name="RegisterAsDropTarget" value="1">
    <param name="Offline" Value="1">
    <param name="Silent" Value="1">
    </object>
    `;
  }

  // set events to the WebBrowser Control
  private _generateBrowserAndAttachEventHandlers() {
    this._target.innerHTML = this._WebBrowserObjectHTML;

    const wbcref = this._target.all(WebBrowserObjectId) as any;
    if( !wbcref )
      throw new Error(`could not find WebBrowser Object. id:"${WebBrowserObjectId}"`);

    // set WebBrowser's Events
    if( this._leIE8 )
      wbcref.attachEvent('StatusTextChange', this._wrapped_onStatusTextChange as any)
    else
      wbcref.attachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate as any);
    
    wbcref.attachEvent('NavigateComplete2', this._wrapped_onNavigateComplete as any);
    
    //setTimeout(() => this._initializedHtmlFile = true, 500);

    // loading a real html file
    if( this._htmlFile ) {
      // wait for navigation
      let retry = 3;
      const setWBCinnerDocument = () => {
        try {
          if( this._html )
            wbcref.Document.body.innerHTML = this._html;

          // set user events
          if( this._autoHide ) {
            this._setAutoHidingEventsForWBCDocument(wbcref);
          }
          else {
            wbcref.Document.body.ondragenter = this._listeners.ondragenter || null as any;
            wbcref.Document.body.ondragleave = this._listeners.ondragleave || null as any;
            wbcref.Document.body.ondragend = this._listeners.ondragend || null as any;
            wbcref.Document.body.ondragover = this._listeners.ondragover || null as any;
          }

          // exec script inside the controler
          wbcref.Document.parentWindow.execScript(`
            document.body.scroll = 'no';
            document.body.style.cssText += ';margin:0px; padding:0px; overflow:hidden;';
            document.body.ondragstart = function() { return false; };
            document.body.onselectstart = function() { return false; };
          `);
          wbcref.style.visibility = 'visible';
        } catch(e: any) {
          console.log(`failed to access WebBrowser's Document. "${e.message}"`, 'red');
          if( --retry )
            setTimeout(setWBCinnerDocument, 300);
          else
            wbcref.style.visibility = 'visible';
        }
      };
      setTimeout(setWBCinnerDocument, 300);
    }
    else
      wbcref.style.visibility = 'visible';
  }
  private _detachBrowserControlEventHandlers() {
    const wbcref = this._target.all(WebBrowserObjectId) as any;
    if( wbcref ) {
      wbcref.style.display = 'none';
      
      if( this._leIE8 )
        wbcref.detachEvent('StatusTextChange', this._wrapped_onStatusTextChange as any)
      else
        wbcref.detachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate as any);
      
      wbcref.detachEvent('NavigateComplete2', this._wrapped_onNavigateComplete as any);

      try {
        wbcref.Document.body.ondragenter = null as any;
        wbcref.Document.body.ondragleave = null as any;
        wbcref.Document.body.ondragend = null as any;
        wbcref.Document.body.ondragover = null as any;

        wbcref.Document.body.detachEvent('ondragover', this._wrapped_ondragover_for_wbc_);
        wbcref.Document.body.detachEvent('ondragleave', this._wrapped_ondragleave_for_wbc_);
        wbcref.Document.body.detachEvent('ondragenter', this._wrapped_ondragenter_for_wbc_);
        wbcref.Document.body.detachEvent('ondragend', this._wrapped_ondragend_for_wbc_);
        
        console.log('all inner WBC events cleared.');
      } catch(e: any) {
        console.log(`failed to detach WebBrowser's Events. "${e.message}"`, 'red');
      }
    }
  }
  private _detachObserverEventHandlers() {
    const observer = this._observer;
    if( observer ) {
      observer.detachEvent('ondragenter', this._wrapped_ondragenter_for_observer_);
      observer.detachEvent('ondragend', this._wrapped_ondragend_for_observer_);
      observer.detachEvent('ondragover', this._wrapped_ondragover_for_observer_);
      observer.detachEvent('ondragleave', this._wrapped_ondragleave_for_observer_);
    }
  }


  
  // [StatusTextChange] read a file's path from the status text. only IE6-8 need this.
  private _onStatusTextChange(sText: string) {
    console.log(`StatusTextChange: ${sText}`);
    if( this._locked )
      return;

    if( /\b[a-z]+:\/+/.test(sText) ) {
      this._reset();

      if( this._htmlFile && !this._initializedHtmlFile ) {
        setTimeout(() => this._initializedHtmlFile = true, 500);
        return;
      }

      const exec = /file:\/\/\/([^\s]+)\s*\.\.\.$/.exec(sText);
      if( exec ) {
        const url = unescape(exec[1]).replace(/\//g, '\\');
        this._fireOnDrop(url);
      }
      else {
        if( !this._listeners.ondropfileIE6 )
          alert(`On IE6-8, the drop target accepts only a folder.`);
        else
          this._listeners.ondropfileIE6();
      }
    }
  }
  private _wrapped_onStatusTextChange;

  // [BeforeNavigate] get a file's path from the event parameter. it doesn't work on IE6.
  private _onBeforeNavigate(pDisp:any, Url:any, Flags:any, TargetFrameName:any, PostData:any, Headers:any, Cancel: any) {
    console.log(`BeforeNavigate: ${Url}`);
    if( this._locked || /^about:/i.test(Url) )
      return;

    // avoid this._htmlFile's first navigation firing the event
    if( this._htmlFile && !this._initializedHtmlFile && this._htmlFile === Url ) {
      return;
    }
    
    this._fireOnDrop(String(Url));
  }
  private _wrapped_onBeforeNavigate;
  
  // [NavigateComplete] get a folder's path.
  private _onNavigateComplete(pDisp:any, URL:any) {
    console.log(`NavigateComplete: ${URL}`);
    if( this._locked || /^about:/i.test(URL) )
      return;
    
    // avoid this._htmlFile's first navigation firing the event
    if( this._htmlFile && !this._initializedHtmlFile && this._htmlFile === URL ) {
      this._initializedHtmlFile = true;
      return;
    }

    this._fireOnDrop(String(URL));
  }
  private _wrapped_onNavigateComplete;

  /*
  // [NavigateError]
  private _onNavigateError(pDisp:any, URL:any, TargetFrameName:any, StatusCode:any, Cancel:boolean) {
    alert(`a navigation error occured. "${URL}"`);
  }
  */




  // pass a dropped file's path to the "ondrop" handler
  private _fireOnDrop(path: string) {
    this._locked = true;
    
    // clear target
    this._detachBrowserControlEventHandlers();
    this._target.innerHTML = '';

    // call ondrop listener
    this._listeners.ondrop?.(path);

    this._reset();
  }

  // clear WebBrowser Control to cancel the navigation
  private _reset() {
    console.log('#_reset');
    this._locked = true;

    // release the event handlers
    this._detachBrowserControlEventHandlers();
    // reset WebBrowser
    this._generateBrowserAndAttachEventHandlers();

    // unlock
    setTimeout(() => this._locked = false, 500);
  }


  // set events for showing/hiding the drag target automatically
  private _autoHideTimeoutId: number = 0;
  
  private _wrapped_ondragenter_for_observer_ = () => this.show(true);
  private _wrapped_ondragend_for_observer_ = () => this.show(false);
  private _wrapped_ondragover_for_observer_ = () => this._resetDraggingTimeout();
  private _wrapped_ondragleave_for_observer_ = () => this._prepareToDragLeave();
  private _setAutoHidingEventsForOuterDocument() {
    const observer = this._observer!;
    observer.attachEvent('ondragenter', this._wrapped_ondragenter_for_observer_);
    observer.attachEvent('ondragend', this._wrapped_ondragend_for_observer_);
    observer.attachEvent('ondragover', this._wrapped_ondragover_for_observer_);
    observer.attachEvent('ondragleave', this._wrapped_ondragleave_for_observer_);
  }

  private _wrapped_ondragover_for_wbc_ = (ev: MSEventObj) => {
    this._listeners?.ondragover?.(ev);
    this._resetDraggingTimeout();
  };
  private _wrapped_ondragenter_for_wbc_ = (ev:MSEventObj) => {
    this._listeners?.ondragenter?.(ev);
  };
  private _wrapped_ondragleave_for_wbc_ = (ev:MSEventObj) => {
    this._listeners?.ondragleave?.(ev);
    this._prepareToDragLeave();
  };
  private _wrapped_ondragend_for_wbc_ = (ev:MSEventObj) => {
    this._listeners?.ondragend?.(ev);
  };
  private _setAutoHidingEventsForWBCDocument(wbc: any) {
    wbc.Document.body.attachEvent('ondragover', this._wrapped_ondragover_for_wbc_);
    wbc.Document.body.attachEvent('ondragleave', this._wrapped_ondragleave_for_wbc_);
    wbc.Document.body.attachEvent('ondragenter', this._wrapped_ondragenter_for_wbc_);
    wbc.Document.body.attachEvent('ondragend', this._wrapped_ondragend_for_wbc_);
  }
  private _resetDraggingTimeout() {
    clearTimeout(this._autoHideTimeoutId);
    this._draggingOver = true;
    this._autoHideTimeoutId = window.setTimeout(() => {
      this._draggingOver = false;
      this.show(false);
    }, 300);
  }
  private _prepareToDragLeave() {
    this._draggingOver = false;
    window.setTimeout(() => {
      if( !this._draggingOver )
        this.show(false);
    }, 200);
  }

  show(flag = true) {
    if( this._disabled && flag )
      return;
    this._target.style.display = flag ? '' : 'none';
  }
  disable(flag = true) {
    this._disabled = flag;
  }
  isDisabled() {
    return this._disabled;
  }

  dispose() {
    this._detachBrowserControlEventHandlers();
    this._detachObserverEventHandlers();
    this._wrapped_onStatusTextChange = null as any;
    this._wrapped_onBeforeNavigate = null as any;
    this._wrapped_onNavigateComplete = null as any;
    this._wrapped_ondragover_for_wbc_ = null as any;
    this._wrapped_ondragleave_for_wbc_ = null as any;
    this._wrapped_ondragenter_for_wbc_ = null as any;
    this._wrapped_ondragend_for_wbc_ = null as any;
    this._listeners = null as any;
    this._observer = null as any;
    this._target.innerHTML = '';
    this._target = null as any;
  }
}
