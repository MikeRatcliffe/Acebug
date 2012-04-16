// this is for reloading ace files without reloading window
try{
	var {classes:Cc, interfaces: Ci, utils: Cu} = Components
	dump = Components.utils.import("resource://shadia/main.js").dump
}catch(e){}
// not needed in release
var __AceBugDevel__ = {
    loadScript: function(href, index) {
        var s = document.createElementNS('http://www.w3.org/1999/xhtml', "script");
        s.type = "text/javascript;version=1.8";
        s.src = href;
        s.index = index;
        s.onload = function(e) {
            __AceBugDevel__.onLoad(e, this);
        };
        document.documentElement.appendChild(s);
    },

    sourceList: [
        "chrome://acebug/content/aceEditor.js",
        "chrome://acebug/content/autocompleter.js",
        "chrome://acebug/content/resource.js"
    ],

    doReload: function(action) {
		if(action == 'full'){
			this.toggleFirebug(true)
			return;
		}
        FBL.ns = function(a) {
            a();
        };
		if(action == 'editor'){
			Firebug.Ace.win1.location.reload()
			Firebug.Ace.win2.location.reload()
		}
        // clean up
        try{
            Firebug.Ace.win1.editor.autocompleteCommandsAdded = false;
        } catch(e) {}
        try{
            Firebug.Ace.win2.editor.autocompleteCommandsAdded = false;
        } catch(e) {}

        Firebug.unregisterModule(Firebug.Ace);
        Firebug.unregisterPanel(Firebug.ResourcePanel);
        this.loadedScriptsCount = 0;
        for(var i in this.sourceList) {
            this.loadScript(this.sourceList[i], i);
        }
    },

    onLoad: function() {
        this.loadedScriptsCount++;
        if (this.loadedScriptsCount == this.sourceList.length) {
            Firebug.Ace.initializeUI();
        }
    },
	
	toggleFirebug: function(on)
    {
        Components.utils.import("resource://gre/modules/Services.jsm");
        Services.obs.notifyObservers(null, "startupcache-invalidate", null);

        var BOOTSTRAP_REASONS = {
            APP_STARTUP     : 1,
            APP_SHUTDOWN    : 2,
            ADDON_ENABLE    : 3,
            ADDON_DISABLE   : 4,
            ADDON_INSTALL   : 5,
            ADDON_UNINSTALL : 6,
            ADDON_UPGRADE   : 7,
            ADDON_DOWNGRADE : 8
        };
        var XPIProviderBP = Components.utils.import("resource://gre/modules/XPIProvider.jsm");
        var id = "firebug@software.joehewitt.com";
        var XPIProvider = XPIProviderBP.XPIProvider;
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        file.persistentDescriptor = XPIProvider.bootstrappedAddons[id].descriptor;

        var t1 = Date.now();
        XPIProvider.callBootstrapMethod(id, XPIProvider.bootstrappedAddons[id].version,
                                XPIProvider.bootstrappedAddons[id].type, file,
                                "shutdown", BOOTSTRAP_REASONS.ADDON_DISABLE);
        FBTrace&&FBTrace.sysout("shutdown time :" + (Date.now() - t1) + "ms");
        if (!on)
            return;

        t1 = Date.now()
        XPIProvider.callBootstrapMethod(id, XPIProvider.bootstrappedAddons[id].version,
                                XPIProvider.bootstrappedAddons[id].type, file,
                                "startup", BOOTSTRAP_REASONS.APP_STARTUP);
        FBTrace&&FBTrace.sysout("startup time :" + (Date.now() - t1) + "ms");
    },
};

window.addEventListener("load", function() {
	function insertXML(element, xml, before) {
		var range = document.createRange()
		range.selectNode(element)
		range.collapse(true)
		var fragment = range.createContextualFragment(xml)
		return element.insertBefore(fragment, before)
	}
	var sb = document.getElementById("fbPanelBar1-tabBox") 
	var tb = document.createElement('toolbarbutton')
	sb.appendChild(tb)
	tb.type='menu'
	tb.label='\u27F3'
	tb.setAttribute('oncommand', '__AceBugDevel__.doReload(event.target.getAttribute("action"))')
	
	insertXML(
		tb,
		<menupopup>
			<menuitem label='ace' action='ace'/>
			<menuitem label='reload editor' action='editor'/>
			<menuitem label='fullreload&#10227;' action='full'/>
		</menupopup>.toXMLString().replace(/>\s*</,'><'),
		tb.lastChild
	)
}, false)


