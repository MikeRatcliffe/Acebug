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
        this.__defineGetter__('browser', function()Firebug.chrome.$("fbAceBrowser1"))

        Firebug.Panel.initialize.apply(this, arguments);
    },
	
	show: function()
	{
		this.aceWindow = Firebug.Ace.win1;
		this.editor = this.aceWindow.editor;
		this.session = this.aceWindow.createSession('ppp', '.html');
		this.editor.setSession(this.session)
	},
	
	hide: function()
	{
		
	},
	
	getSourceLink: function(target, object)
    {
		
    },
   
});


// ************************************************************************************************

Firebug.registerPanel(Firebug.ResourcePanel);

// ************************************************************************************************

}});
