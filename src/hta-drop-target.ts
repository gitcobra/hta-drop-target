type Listener = (path: string) => any;

type HtaDropTargetOptions = {
  html?: string
  htmlFilePath?: string
  ondrop?: Listener
  ondragenter?: (ev: MSEventObj) => any
  ondragleave?: (ev: MSEventObj) => any
  ondragover?: (ev: MSEventObj) => any
  ondragend?: (ev: MSEventObj) => any
  ondropfileIE6?: Function
};

const WebBrowserObjectId = 'hta-drop-target-object';

export default class HtaDropTarget {
  private _target: HTMLElement;
  private _listeners: Omit<HtaDropTargetOptions, 'html'> = {};
  private _WebBrowserObjectHTML: string = '';
  private _html?: string;
  private _htmlFilePath?: string;
  private _initializedHtmlFile: boolean = false;
  private _locked = false;
  private _leIE6 = Number(/MSIE (\d)\./.exec(navigator.appVersion)?.[1]) <= 6;
  private _leIE7 = this._leIE6 || /MSIE 7/.test(navigator.appVersion) && !/Trident\/([\d.]+)/.test(navigator.appVersion);
  private _leIE8 = this._leIE7 || Number(/Trident\/([\d.]+)/.exec(navigator.appVersion)?.[1]) <= 4;

  constructor(target: HTMLElement, args: Listener | HtaDropTargetOptions) {
    this._target = target;
    
    let html = '';
    if( typeof args === 'function' ) {
      this._listeners.ondrop = args;
    }
    else if( args ) {
      html = args.html ? String(args.html) : ''; 
      this._listeners.ondrop = args.ondrop;
      this._listeners.ondragenter = args.ondragenter;
      this._listeners.ondragover = args.ondragover;
      this._listeners.ondragleave = args.ondragleave;
      this._listeners.ondragend = args.ondragend;
      this._listeners.ondropfileIE6 = args.ondropfileIE6;

      this._htmlFilePath = args.htmlFilePath;
      if( this._htmlFilePath && !/^[a-z]:/i.test(this._htmlFilePath) ) {
        const a = document.createElement('a');
        a.setAttribute('href', this._htmlFilePath);
        // @ts-ignore
        this._htmlFilePath = unescape(a.cloneNode(false).href.replace(/^file:\/\/\//, '').replace(/\//g, '\\'));
      }
    }

    this.setTargetHTML( html );

    // save references of the callbacks to detach
    this._leIE8 ? this._wrapped_onStatusTextChange = (sText: string) => this._onStatusTextChange(sText) : this._wrapped_onBeforeNavigate = (pDisp:any, Url:any, Flags:any, TargetFrameName:any, PostData:any, Headers:any, Cancel: any) => this._onBeforeNavigate(pDisp, Url, Flags, TargetFrameName, PostData, Headers, Cancel);
    this._wrapped_onNavigateComplete = (pDisp:any, URL:any) => this._onNavigateComplete(pDisp, URL);

    this._generateBrowserAndAttachEventHandlers();
  }

  setTargetHTML(html: string) {
    let locationValue = '';
    if( this._htmlFilePath ) {
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
      locationValue = `about:<body ondragstart='return false' scroll=no style='border:0px; margin:0px; padding:0px;'>${html}`;
      //locationValue = locationValue.replace(/"/g, '&quot;');
      this._html = '';
    }

    // hta-drop-target uses a WebBrowser Control as a drop target. 
    this._WebBrowserObjectHTML = `
    <object classid="clsid:8856F961-340A-11D0-A96B-00C04FD705A2" id="${WebBrowserObjectId}" style="border:0px; width:100%; height:100%;">
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
    
    // loading a real html file
    if( this._htmlFilePath ) {
      // wait for navigation
      setTimeout(() => {
        try {
          if( this._html )
            wbcref.Document.body.innerHTML = this._html;

          // set user events
          wbcref.Document.body.ondragenter = this._listeners.ondragenter || null as any;
          wbcref.Document.body.ondragleave = this._listeners.ondragleave || null as any;
          wbcref.Document.body.ondragend = this._listeners.ondragend || null as any;
          wbcref.Document.body.ondragover = this._listeners.ondragover || null as any;

          // exec script inside the controler
          wbcref.Document.parentWindow.execScript(`
            document.body.scroll = 'no';
            document.body.style.cssText = 'border:0px; color:red; margin:0px; padding:0px; overflow:hidden;';
            document.body.ondragstart = function() { return false; };
            document.body.onselectstart = function() { return false; };
          `);
        } catch(e: any) {
          console.log(`failed to access WebBrowser's Document. "${e.message}"`, 'red');
        }
      }, 0);
    }

    // set WebBrowser's Events
    this._leIE8 ? wbcref.attachEvent('StatusTextChange', this._wrapped_onStatusTextChange as any) : wbcref.attachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate as any);
    wbcref.attachEvent('NavigateComplete2', this._wrapped_onNavigateComplete as any);
  }
  private _detachBrowserEventHandlers() {
    const wbcref = this._target.all(WebBrowserObjectId) as any;
    if( wbcref ) {
      this._leIE8 ? wbcref.detachEvent('StatusTextChange', this._wrapped_onStatusTextChange as any) : wbcref.detachEvent('BeforeNavigate2', this._wrapped_onBeforeNavigate as any);
      wbcref.detachEvent('NavigateComplete2', this._wrapped_onNavigateComplete as any);

      try {
        wbcref.Document.body.ondragenter = null as any;
        wbcref.Document.body.ondragleave = null as any;
        wbcref.Document.body.ondragend = null as any;
        wbcref.Document.body.ondragover = null as any;
      } catch(e: any) {
        console.log(`failed to detach WebBrowser's Events. "${e.message}"`, 'red');
      }
    }
  }


  
  // [StatusTextChange] read a file's path from the status text. only IE6-8 need this.
  // Although the status text includes a file's path, this just ignore the file dropping operation on IE8 or lower.
  // The reason is that there may be no easy way to read precisely the path from the status text in all languages,
  // and besides, when it recieves a dropped file on those versions of IE, occasionally a download dialog is opened.
  private _onStatusTextChange(sText: string) {
    console.log(`StatusTextChange: ${sText}`);
    if( this._locked )
      return;

    if( /\b[a-z]+:\/\//.test(sText) ) {
      if( this._htmlFilePath && !this._initializedHtmlFile )
        return;

      this._reset();

      if( !this._listeners.ondropfileIE6 )
        alert(`On IE6-8, the drop target accepts only a folder.\n\nstatus: "${sText}"`);
      else
        this._listeners.ondropfileIE6();
    }
  }
  private _wrapped_onStatusTextChange;

  // [BeforeNavigate] get a file's path from the event parameter. it doesn't work on IE6.
  private _onBeforeNavigate(pDisp:any, Url:any, Flags:any, TargetFrameName:any, PostData:any, Headers:any, Cancel: any) {
    console.log(`BeforeNavigate: ${Url}`);
    if( this._locked || /^about:/i.test(Url) )
      return;

    // avoid this._htmlFilePath's first navigation firing the event
    if( this._htmlFilePath && !this._initializedHtmlFile && this._htmlFilePath === Url ) {
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
    
    // avoid this._htmlFilePath's first navigation firing the event
    if( this._htmlFilePath && !this._initializedHtmlFile && this._htmlFilePath === URL ) {
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
    this._target.innerHTML = '';

    // call ondrop listener
    this._listeners.ondrop?.(path);

    this._reset();
  }

  // clear WebBrowser Control to cancel the navigation
  private _reset() {
    this._locked = true;

    // release the event handlers
    this._detachBrowserEventHandlers();
    // reset WebBrowser
    this._generateBrowserAndAttachEventHandlers();

    // unlock
    setTimeout(() => this._locked = false, 500);
  }

  dispose() {
    this._detachBrowserEventHandlers();
    this._wrapped_onStatusTextChange = null as any;
    this._wrapped_onBeforeNavigate = null as any;
    this._wrapped_onNavigateComplete = null as any;
    this._target.innerHTML = '';
    this._target = null as any;
    this._listeners = null as any;
  }
}
