/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {


/*Firebug.currentContext.getPanel('net')
//Firebug.getp

//FirebugChrome.getSelectedPanel()

panelBar = Firebug.chrome.$("fbPanelBar1");
panelType = panelBar.selectedTab.panelType;


for(var i=Firebug.panelTypes.length;i--;)
if(Firebug.panelTypes[i].name=='NetPanel'){
var netPanel=Firebug.panelTypes[i]
break
}
netPanel.prototype.setEnabled(true)
//netPanel.prototype.setEnabled(false)


Firebug.TabWatcher.reloadPageFromMemory(Firebug.currentContext)*/

var enumerateRequests = function(fn)
{
	var netPanel = Firebug.currentContext.getPanel('net')
	if (!netPanel.table)
		return;

	var rows = netPanel.table.getElementsByClassName("netRow");
	for (var i=0; i<rows.length; i++)
	{
		var row = rows[i];
		var pageRow = FBL.hasClass(row, "netPageRow");

		if (FBL.hasClass(row, "collapsed") && !pageRow)
			continue;

		if (FBL.hasClass(row, "history"))
			continue;


		var file = Firebug.getRepObject(row);
		if (file)
			fn(file);
	}
}
var getAllLocations = function(){ 
	var locationList=[document.documentURI]
	//scripts
	var list = document.documentElement.getElementsByTagName('script')
	for(var i = list.length; i--;){
		src = list[i].getAttribute('src')
		if(src)locationList.push(src)
	}
	//images
	list = document.documentElement.getElementsByTagName('img')
	for(var i = list.length; i--;){
		src = list[i].getAttribute('src')
		if(src)locationList.push(src)
	}
	//stylesheets
	list = document.styleSheets
	for(var i = list.length; i--;){
		src = list[i].href
		if(src)locationList.push(src)
	}
	return locationList
}
/*a=[]
enumerateRequests(function(x)a.push(x))
a.map(function(a)a.href)
*/
// ************************************************************************************************
// stylesheet panel
Firebug.ResourcePanel = function ResourcePanel() {}

Firebug.ResourcePanel.prototype = extend(Firebug.Panel,
{
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "resource",
    title: "Resource",
	parentPanel: null,
    searchable: true,
    order: 190,

    initialize: function()
    {
        this.__defineGetter__('browser', function() Firebug.chrome.$("fbAceBrowser1-parent"))

        Firebug.Panel.initialize.apply(this, arguments);
    },
	
	show: function()
	{
		var treePane = this.browser.firstChild
		treePane.hidden = false
		treePane.nextSibling.hidden = false
		this.aceWindow = Firebug.Ace.win1;
		this.editor = this.aceWindow.editor;
		if (this.editor) {
			this.session = this.aceWindow.createSession('ppp', '.html');
			this.editor.setSession(this.session)		
		} else {
			this.aceWindow.startAce(bind(function(){
				this.editor = this.aceWindow.editor;
				this.setSession()
			}, this))
		}
	},
	
	setSession: function()
	{
		this.session = this.aceWindow.createSession('ppp', '.html');
		this.editor.setSession(this.session)		
	},
	
	hide: function()
	{
		var treePane = this.browser.firstChild
		treePane.hidden = true
		treePane.nextSibling.hidden = true
	},
	
	getSourceLink: function(target, object)
    {
		
    },
   
});


// ************************************************************************************************

Firebug.registerPanel(Firebug.ResourcePanel);

// ************************************************************************************************

}});
