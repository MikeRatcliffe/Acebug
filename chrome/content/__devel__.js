// this is for reloading ace files without reloading window

// not needed in release
var __AceBugDevel__ = {
	loadScript: function(href, index){
		var s=document.createElementNS('http://www.w3.org/1999/xhtml', "script")
		s.type = "text/javascript;version=1.8";
		s.src = href
		s.index = index
		s.onload = function(e){__AceBugDevel__.onLoad(e, this)}
		document.documentElement.appendChild(s)
	},
	
	sourceList: [
		"chrome://acebug/content/aceEditor.js",
		"chrome://acebug/content/autocompleter.js",
		"chrome://acebug/content/resource.js"		
	],
	
	doReload: function(){		
		FBL.ns=function(a){a()}
		// clean up
		try{Firebug.Ace.win1.editor.autocompleteCommandsAdded = false}catch(e){}
		try{Firebug.Ace.win2.editor.autocompleteCommandsAdded = false}catch(e){}
		
		Firebug.unregisterModule(Firebug.Ace)
		Firebug.unregisterPanel(Firebug.ResourcePanel)
		this.loadedScriptsCount = 0
		for(var i in this.sourceList){
			this.loadScript(this.sourceList[i],i)
		}
		
	},
	onLoad: function(){
		this.loadedScriptsCount++;
		if(this.loadedScriptsCount == this.sourceList.length){
			Firebug.Ace.initializeUI()
			
		}
	}
}


if(!document.getElementById('__AceBugDevel__')){
	t=document.createElement('toolbarbutton')
	t.setAttribute('oncommand','__AceBugDevel__.doReload()')
	t.id = '__AceBugDevel__'
	t.label='AceBugDevel'
	document.getElementById("status-bar").appendChild(t)
}