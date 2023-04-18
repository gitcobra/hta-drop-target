type Listener = (path: string) => any;
type HtaDropTargetOptions = {
    html?: string;
    htmlFilePath?: string;
    ondrop?: Listener;
    ondragenter?: (ev: MSEventObj) => any;
    ondragleave?: (ev: MSEventObj) => any;
    ondragover?: (ev: MSEventObj) => any;
    ondragend?: (ev: MSEventObj) => any;
    ondropfileIE6?: Function;
};
declare class HtaDropTarget {
    private _target;
    private _listeners;
    private _WebBrowserObjectHTML;
    private _html?;
    private _htmlFilePath?;
    private _initializedHtmlFile;
    private _locked;
    private _leIE6;
    private _leIE7;
    private _leIE8;
    constructor(target: HTMLElement, args: Listener | HtaDropTargetOptions);
    setTargetHTML(html: string): void;
    private _generateBrowserAndAttachEventHandlers;
    private _detachBrowserEventHandlers;
    private _onStatusTextChange;
    private _wrapped_onStatusTextChange;
    private _onBeforeNavigate;
    private _wrapped_onBeforeNavigate;
    private _onNavigateComplete;
    private _wrapped_onNavigateComplete;
    private _fireOnDrop;
    private _reset;
    dispose(): void;
}

export { HtaDropTarget as default };
