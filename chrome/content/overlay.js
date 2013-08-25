/* See license.txt for terms of usage */

(function() {
window.top.dump("overlay+++++++++++++++++++++++++++++++++")

var lib = Firebug.require("firebug/firefox/browserOverlayLib")
var {$el, $toolbarButton, $} = lib
var doc = Firebug.chrome.window.document

var el = function(name, attributes, children, parent) {
    return $el(doc, name, attributes, children, parent)
}

Firebug.AceBug = {
    nodes: [],
    _counter: 0,
    initializeUI: function() {
        Firebug.AceBug._counter++
        if (Firebug.AceBug._counter===3)
            Firebug.Ace._doLoad()
    }
};
var s = lib.$stylesheet(doc, "chrome://acebug/content/acebug.css");
Firebug.AceBug.nodes.push(s);
var ifr1, ifr2;

ifr1 = el("iframe", {
    AceBugRoot: true,
    id: "fbAceBrowser",
    type: "content",
    flex: "1",
    tooltip: "fbTooltip" ,
    contextmenu: "fbContextMenu",
    src: "chrome://acebug/content/ace++/fbeditor.html",
    position: "1"
}, null, $(doc, "fbCommandEditorBox"))




el("hbox", {id: 'fbAceBrowser1-parent', AceBugRoot: true}, [
    el("vbox", {hidden: 'true', id: 'fbAceFileListTree', /*persist: 'width',*/ width: '50'}, [
        el("textbox", {
            type:'search', 
            oninput:"Firebug.chrome.getSelectedPanel().setFilter(this.value)",
            oncommand: "Firebug.chrome.getSelectedPanel().setFilter(this.value)",
            onchange: "Firebug.chrome.getSelectedPanel().setFilter(this.value)"
        }),            
        el("tree",  {
            position:'1', class:'plain', flex:'10', hidecolumnpicker:'true',
            onselect: "this.ownerPanel.onSelect()",
            treelines: 'true'
        }, [
            el("treechildren", {id:"domfly", flex:'1', contextmenu: "fbContextMenu"}, [
                el("treecols", {}, [
                    el("treecol", {id:"name", hideheader:"true", primary:"true", flex:"2", crop:"start"})
                ])
            ])
        ])
    ]),
    el("splitter", {position:'2', hidden:'true', collapse:'before'}, [el("grippy")]),
    ifr2 = el("iframe", {id:"fbAceBrowser1", type:"content", flex:"1",
                tooltip:"fbTooltip", contextmenu:"fbContextMenu",
                src:"chrome://acebug/content/ace++/fbeditor.html", position:"1"})
], $(doc, "fbPanelBar1-deck"))

ifr1.addEventListener("DOMContentLoaded", Firebug.AceBug.initializeUI)
ifr2.addEventListener("DOMContentLoaded", Firebug.AceBug.initializeUI)



el("panel", {AceBugRoot: true, id: "aceAutocompletePanel", noautofocus: 
            "true", ignorekeys: 'true', backdrag: 'true'}, [
    el("hbox", {}, [
        el("toolbarbutton", {label: '', onclick: 'jsExplore.qi()'}),
        el("spacer", {flex: '1'}),
        el("label"),
        el("toolbarbutton", {class: 'tab-close-button', oncommand: 'this.parentNode.parentNode.hidePopup()'})
    ]),
    el("stack", {flex: "1"}, [
        el("hbox", {flex: "1"}, [
            el("tree", {seltype: "single", treelines: "false", flex: "1", tabindex: "-1",
                    hidecolumnpicker: "true", style: "-moz-user-focus:none"}, [
                el("treechildren", {id: "domfly"}),
                el("treecols", {}, [
                    el("treecol", {id: "name", hideheader: "true", primary: "true", flex: "2"})
                ])
            ])
        ]),
        el("resizer", {element: "aceAutocompletePanel", dir: "bottomleft", left: "0", bottom: "0", width: "16", height: "16"}),
        el("resizer", {element: "aceAutocompletePanel", dir: "bottomright", right: "0", bottom: "0", width: "16", height: "16"})
    ])
], $(doc, "mainPopupSet"))
el("panel", {AceBugRoot: true, id: "ace-autocomplate-info-bubble", noautofocus: "true", ignorekeys: "true", backdrag: "true"}, [
    el("stack", {flex: "1"}, [
        el("textbox",  {multiline: "true", wrap: "off", flex: "1"}),
        el("resizer", {element: "ace-autocomplate-info-bubble", dir: "bottomleft", left: "0", bottom: "0", width: "16", height: "16"}),
        el("resizer", {element: "ace-autocomplate-info-bubble", dir: "bottomright", right: "0", bottom: "0", width: "16", height: "16"})
    ])
], $(doc, "mainPopupSet"))


window.top.dump("overlay s----------------------")





})();