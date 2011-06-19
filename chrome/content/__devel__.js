// this is for reloading ace files without reloading window

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
        FBL.ns = function(a) {
            a();
        };
		if(action == 'full'){
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
    }
};
function appendXML(element, xml){
	var range = document.createRange()
	range.selectNode(element)
	range.collapse(true)
	var fragment = range.createContextualFragment(xml)

	return element.appendChild(fragment)
}
window.addEventListener('load', function(){
	window.removeEventListener('load', arguments.callee.caller, false)
	
    var sb = document.getElementById("fbPanelBar1-tabBox") 
	var tb=document.createElement('toolbarbutton')
	sb.appendChild(tb)
	tb.type='menu-button'
	tb.label='ace\u27F3'
	tb.setAttribute('oncommand', '__AceBugDevel__.doReload(event.target.getAttribute("action"))')
	appendXML(tb,
			<menupopup>
				<menuitem label='fullreload&#10227;' action='full'/>
			</menupopup>.toXMLString().replace(/>\s*</,'><'))
},false)