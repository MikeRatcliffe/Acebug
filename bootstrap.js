/* See license.txt for terms of usage */

// ********************************************************************************************* //
// XPCOM

var {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");


var addScript = function(src, win) Services.scriptloader.loadSubScript(src, win);
/*devel__(*/
try{
	dump = Components.utils.import("resource://shadia/main.js").dump
}catch(e){}

var _addScript = addScript
var addDevelScript = function(src, win) {
	var script = win.document.createElementNS("http://www.w3.org/1999/xhtml","html:script")
	script.src = src
	script.language = "javascript"
	script.type = "text/javascript"
	win.document.documentElement.appendChild(script)
}
addScript = function(src, win) {
	try {
		_addScript(src, win)
	} catch(e) {
		Cu.reportError(e)
		addDevelScript(src, win)
	}
}
/*devel__)*/


// ********************************************************************************************* //
// Constants

const BOOTSTRAP_REASONS = [
    "", // the bootstrap reason is 1 based
    "APP_STARTUP",
    "APP_SHUTDOWN",
    "ADDON_ENABLE",
    "ADDON_DISABLE",
    "ADDON_INSTALL",
    "ADDON_UNINSTALL",
    "ADDON_UPGRADE",
    "ADDON_DOWNGRADE"
];

// ********************************************************************************************* //
// Firefox Bootstrap API

function install(data, reason) {}
function uninstall(data, reason) {}
function startup(data, reason) { firebugStartup(); }
function shutdown(data, reason) { firebugShutdown(); }

// ********************************************************************************************* //
// Firebug Bootstrap API

function firebugStartup() {
    try {
        Cu.import("resource://firebug/loader.js");
        FirebugLoader.registerBootstrapScope(this);
    } catch (e){}
}

function firebugShutdown() {
    try {
        Cu.import("resource://firebug/loader.js");
        FirebugLoader.unregisterBootstrapScope(this);
    } catch (e) {
        Cu.reportError(e);
    }
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function topWindowLoad(win) {}
function topWindowUnload(win) {}

function firebugFrameLoad(Firebug) {
    var win = Firebug.chrome.window
    win.top.dump("--------------")
    /*devel__(*/
        Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    /*devel__)*/
    addScript("chrome://acebug/content/overlay.js", win)
    addScript("chrome://acebug/content/aceEditor.js", win)
    addScript("chrome://acebug/content/autocompleter.js", win)
    addScript("chrome://acebug/content/resource.js", win)
    /*devel__(*/
        addScript("chrome://acebug/content/__devel__.js", win)
    /*devel__)*/
}

function firebugFrameUnload(Firebug) {
    if (!Firebug.isInitialized)
        return;

    var win = Firebug.chrome.window
    var doc = win.document
    win.top.dump("------  unreg -------")
    
    Firebug.largeCommandLineEditor.destroy();
    Firebug.Ace.destroy();
    
    var list = Firebug.AceBug.nodes.concat(
        Array.slice(doc.querySelectorAll("[AceBugRoot]"))
    );
    
    for (var i=0; i<list.length; i++) {
        var el = list[i];
        if (el && el.parentNode)
            el.parentNode.removeChild(el);
    }
    
    Firebug.unregisterPanel(Firebug.ResourcePanel);
    delete Firebug.ResourcePanel;
    
    Firebug.unregisterModule(Firebug.Ace);
    delete Firebug.Ace;
    
}

// ********************************************************************************************* //