/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

Firebug.Ace =
{
    dispatchName: "Ace",

    initializeUI: function() {
        var browser = FBL.$("fbAceBrowser");
        this.win2Wrapped = browser.contentWindow;
        this.win2 = this.win2Wrapped.wrappedJSObject;

		var browser = FBL.$("fbAceBrowser1");
        this.win1Wrapped = browser.contentWindow;
        this.win1 = this.win1Wrapped.wrappedJSObject;
		
		this.win1.gAutocompleter =
		this.win2.gAutocompleter = this.autocompleter;
		
		//set Firebug.largeCommandLineEditor on wrapped window so that Firebug.getElementPanel can access it
        this.win1Wrapped.document.getElementById('editor').ownerPanel = this;
        this.win2Wrapped.document.getElementById('editor').ownerPanel = this;

		acebugPrefObserver.register();
		
		Firebug.CommandLine.getCommandLineLarge = function() {
            return Firebug.largeCommandLineEditor;
        };

        Firebug.ConsolePanel.prototype.detach = function(oldChrome, newChrome) {
            var oldFrame = oldChrome.$("fbAceBrowser");
            var newFrame = newChrome.$("fbAceBrowser");
            if(oldFrame.contentWindow == Firebug.Ace.win2Wrapped) {
                oldFrame.QueryInterface(Ci.nsIFrameLoaderOwner).swapFrameLoaders(newFrame);
				// swap other window too
				oldFrame = oldChrome.$("fbAceBrowser1");
				newFrame = newChrome.$("fbAceBrowser1");
				oldFrame.QueryInterface(Ci.nsIFrameLoaderOwner).swapFrameLoaders(newFrame);
            }
        };
    },

    showPanel: function(browser, panel) {
		this.win1.startAce(null, this.getOptions())
		this.showPanel=function(){}
    },

    getOptions: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
        var branch = prefs.getBranch("extensions.acebug.");
        var options = {};

        var names = branch.getChildList("", {});
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            if (branch.getPrefType(name) == branch.PREF_BOOL) {
                options[name] = branch.getBoolPref(name);
            } else if (branch.getPrefType(name) == branch.PREF_STRING) {
                options[name] = branch.getCharPref(name);
            } else {
                options[name] = branch.getIntPref(name);
            }
        }
        return options;
    },
	
	switchPanels: function(toAce) {
		var panelID = toAce?"fbAceBrowser1-parent":'fbPanelBar1-browser'
		var panel = Firebug.chrome.$(panelID);
		panel.parentNode.selectedPanel=panel;
	},

	setFontSize: function(sizePercent) {
        this.win1Wrapped.document.getElementById('editor').style.fontSize = sizePercent;
		this.win2Wrapped.document.getElementById('editor').style.fontSize = sizePercent;
    },
	// context menu
	getContextMenuItems: function(nada, target) {
		var env = target.ownerDocument.defaultView.wrappedJSObject
		
		var items = [],
            editor = env.editor,
            clipBoardText = gClipboardHelper.getData(),
            editorText = editor.getCopyText(),
            self = this;

        items.push(
            {
                label: $ACESTR("acebug.copy"),
                command: function() {
                    gClipboardHelper.copyString(editorText);
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.cut"),
                command: function() {
                    gClipboardHelper.copyString(editorText);
                    editor.onCut();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.paste"),
                command: function() {
                    editor.onTextInput(clipBoardText);
                },
                disabled: !clipBoardText
            },
            "-",
			{
                label: $ACESTR("acebug.options"),
                command: function() {
                    openDialog('chrome://acebug/content/options.xul','','resizable,centerscreen')
                }
            },
            {
                label: $ACESTR("acebug.reportissue"),
                command: function() {
                    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                        .getService(Components.interfaces.nsIWindowMediator);
                    var mainWindow = wm.getMostRecentWindow("navigator:browser");
                    mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab("https://github.com/MikeRatcliffe/Acebug/issues");
                }
            }
        );
		
		var sessionOwner
		switch(editor.session.owner) {
			case 'console': sessionOwner = Firebug.largeCommandLineEditor; break;
			case 'stylesheetEditor': sessionOwner = StyleSheetEditor.prototype; break;
			case 'htmlEditor': sessionOwner = null; break;
		}
        sessionOwner && sessionOwner.addContextMenuItems(items, editor, editorText)
		
		return items;		 
	},
	
	getPopupObject: function(target) {
        return null;
    },

    getTooltipObject: function(target) {
        return null;
    }
};

Firebug.largeCommandLineEditor = {
    initialize: function() {
        if(!this._getValue)
            return;

        var editor = Firebug.Ace.win2.editor;
		editor.session.owner = 'console';

        // clean up preload handlers
        this.getValue = this._getValue;
        this.setValue = this._setValue;
        this.setValue(this._valueBuffer || '');
        delete this._getValue;
        delete this._setValue;
        delete this._loadingStarted;
        delete this._valueBuffer;       

        //add shortcuts
        editor.addCommands({
            execute: Firebug.largeCommandLineEditor.enter
        });          
    },
    // called if ace still loading
    _startLoading: function() {
        if(this._loadingStarted)
            return;
        this._loadingStarted = true;

        Firebug.Ace.win2.startAce(bind(this.initialize,this), Firebug.Ace.getOptions());
    },

    getValue: function() {
        this._startLoading();
        return this._valueBuffer || '';
    },

    setValue: function(text) {
        this._startLoading();
        return this._valueBuffer = text;
    },

    // activated when ace is loaded
    _getValue: function() {
        return Firebug.Ace.win2.editor.session.getValue();
    },

    _setValue: function(text) {
        var editor = Firebug.Ace.win2.editor;
        editor.selection.selectAll();
        editor.onTextInput(text);
        return text;
    },
  
    //* * * * * * * * * * * * * * * * * * * * * * * * *
    get value() {
        return this.getValue();
    },

    set value(val) {
        if(arguments.callee.caller == Firebug.CommandLine.commandHistory.onMouseUp || this._setValue)
            return this.setValue(val);
        return val;
    },

    enter: function(runSelection) {
        var editor = Firebug.Ace.win2.editor;
        if (runSelection)
            var text = editor.getCopyText();
        if (!text) {
            //log lines with breakpoints
            var bp = editor.session.$breakpoints;
            text = editor.session.doc.$lines.map(function(x,i) bp[i]?'console.log('+x+')':x ).join('\n');
        }
        Firebug.CommandLine.enter(Firebug.currentContext, text);
    },

    addEventListener: function() {
        Firebug.Ace.win2.addEventListener.apply(null,arguments);
    },

    removeEventListener: function() {
        Firebug.Ace.win2.removeEventListener.apply(null,arguments);
    },

    focus: function() {
		var win = Firebug.Ace.win2
        win && win.editor && win.editor.focus();
    },

    __noSuchMethod__: function() {
    },

    loadFile:function()
    {
        var result;
        var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

        fp.init(window, $ACESTR("acebug.selectafile"), Ci.nsIFilePicker.modeOpen);
        fp.appendFilter($ACESTR("acebug.javascriptfiles"), "*.js");
        fp.appendFilters(Ci.nsIFilePicker.filterAll);

        result = fp.show();
        if( result == Ci.nsIFilePicker.returnOK) {
            this.setValue(readEntireFile(fp.file));
        }
    },

    saveFile: function()
    {
        var file, name, result,
            fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

        fp.init(window, $ACESTR("acebug.saveas"), Ci.nsIFilePicker.modeSave);
        fp.appendFilter($ACESTR("acebug.javascriptfiles"), "*.js");
        fp.appendFilters(Ci.nsIFilePicker.filterAll);

        result = fp.show();
        if(result == Ci.nsIFilePicker.returnOK)
        {
            file = fp.file;
            name = file.leafName;

            if(name.indexOf('.js')<0)
            {
                file = file.parent;
                file.append(name + '.js');
            }

            writeFile(file, this.value);
        }
        else if(result == Ci.nsIFilePicker.returnReplace)
        {
            writeFile(fp.file, this.value);
        }
    },

    addContextMenuItems: function(items, editor, editorText)
    {       
		items.unshift(
            {
                label: $ACESTR("acebug.executeselection"),
                command: function() {
                    Firebug.CommandLine.enter(Firebug.currentContext, editorText);
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.streamcomment"),
                command: function() {
                    editor.execCommand('toggleStreamComment');
                }
            },
            "-"
        );
    },
	
	// * * * * * * * * * * * * * * * * * * * * * * 	
    setFontSize: function(sizePercent) {
        Firebug.Ace.setFontSize(sizePercent)
    },
};

/***********************************************************/

var acebugPrefObserver = {
    register: function() {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);

        this._branch = prefService.getBranch("extensions.acebug.");
        this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
        this._branch.addObserver("", this, false);
    },

    unregister: function() {
        if (!this._branch)
            return;
        this._branch.removeObserver("", this);
    },

    observe: function(aSubject, aTopic, aData) {
        if(aTopic != "nsPref:changed")
            return;

        var env1 = Firebug.Ace.win1.env;
        var env2 = Firebug.Ace.win2.env;

        switch (aData) {
            case "highlightactiveline":
                env1 && env1.editor.setHighlightActiveLine(this._branch.getBoolPref(aData));
                env2 && env2.editor.setHighlightActiveLine(this._branch.getBoolPref(aData));
            break;
            case "keybinding":
                env1 && env1.setKeybinding(this._branch.getCharPref(aData));
                env2 && env2.setKeybinding(this._branch.getCharPref(aData));
            break;
            case "showinvisiblecharacters":
                env1 && env1.editor.setShowInvisibles(this._branch.getBoolPref(aData));
                env2 && env2.editor.setShowInvisibles(this._branch.getBoolPref(aData));
            break;
            case "softtabs":
                env1 && env1.editor.session.setUseSoftTabs(this._branch.getBoolPref(aData));
                env2 && env2.editor.session.setUseSoftTabs(this._branch.getBoolPref(aData));
            break;
            case "tabsize":
                env1 && env1.editor.session.setTabSize(this._branch.getIntPref(aData));
                env2 && env2.editor.session.setTabSize(this._branch.getIntPref(aData));
            break;
            case "theme":
                env1 && env1.editor.setTheme(this._branch.getCharPref(aData));
                env2 && env2.editor.setTheme(this._branch.getCharPref(aData));
            break;
            case "wordwrap":
                env1 && env1.editor.session.setUseWrapMode(this._branch.getBoolPref(aData));
                env2 && env2.editor.session.setUseWrapMode(this._branch.getBoolPref(aData));
            break;
        }
    }
};

/***********************************************************/
var gClipboardHelper = {
    cbHelperService: Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper),

    copyString: function(str) {
        if(str)
            this.cbHelperService.copyString(str);
    },

    getData: function() {
        try{
            var pastetext,
                clip = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard),
                trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable),
                str={},
                strLength={};

            trans.addDataFlavor("text/unicode");
            clip.getData(trans,1);
            trans.getTransferData("text/unicode",str,strLength);
            str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
            pastetext = str.data.substring(0, strLength.value/2) || "";
            return pastetext;
        } catch(e) {
            Components.utils.reportError(e);
            return "";
        }
    }
};
/***********************************************************/

$ACESTR = function(name) {
    return $STR(name, "strings_acebug");
};

/***********************************************************/

function readEntireFile(file)
{
    var data = "",
        str = {},
        fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream),
        converter = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);

    const replacementChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
    fstream.init(file, -1, 0, 0);
    converter.init(fstream, "UTF-8", 1024, replacementChar);
    while (converter.readString(4096, str) != 0)
    {
        data += str.value;
    }
    converter.close();

    return data;
}

function writeFile(file, text)
{
    var fostream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream),
        converter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);

    fostream.init(file, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
    converter.init(fostream, "UTF-8", 4096, 0x0000);
    converter.writeString(text);
    converter.close();
}


// ************************************************************************************************
// html panel

var HTMLPanelEditor = function() {
	this.__noSuchMethod__ = dump;
	this.aceWindow = Firebug.Ace.win1;
	this.editor = this.aceWindow.editor;
	this.session = this.aceWindow.createSession('', '.html');
	this.onInput = bind(this.onInput, this);
	this.session.on('change', this.onInput);
	this.session.owner = 'htmlEditor';
	//
	this.cmdID = "cmd_toggleHTMLEditing";
}

HTMLPanelEditor.prototype = {
	// needed for Firebug.Editor
	multiLine: true,
    tabNavigation: false,
    arrowCompletion: false,
	//
	getValue: function() {
		return this.editor.session.getValue()
	},
	
	setValue: function(value) {
		this.ignoreChange = true
		this.session.doc.setValue(value);
		this.session.selection.moveCursorFileStart();
		if(this.editor.session != this.session)
			this.editor.setSession(this.session)
		this.ignoreChange = false
		return value
	},
	
	show: function(target, panel, value, textSize, targetSize) {
		this.prepare(target)
		this.panel = panel
		this.panel.search = bind(this.search, this)
		
		this.setValue(value);
		this.editor.focus();
	
		var command = Firebug.chrome.$(this.cmdID);
		command.setAttribute("checked", true);
		Firebug.Ace.switchPanels(true)
		this.editing = true
	},
	
	hide: function() {
		var command = Firebug.chrome.$(this.cmdID);
		command.setAttribute("checked", false);	
		Firebug.Ace.switchPanels(false)
		this.cleanup()
		delete this.panel.search;
		delete this.panel;
		this.editing = false
	},
	
	prepare: function(target){
		this.target = target;
		this.editingElements = [target.repObject, null];
	},
	
	cleanup: function(target){
		FirebugChrome.getSelectedPanel().select(this.editingElements[0])		
		delete this.editingElements;
		delete this.target;
	},
	
	saveEdit:  function() {
		// Make sure that we create at least one node here, even if it's just
		// an empty space, because this code depends on having something to replace
		var value = this.getValue()||" "
		dump(value)
		// Remove all of the nodes in the last range we created, except for
		// the first one, because setOuterHTML will replace it
		var first = this.editingElements[0], last = this.editingElements[1];
		if (last && last != first)
		{
			for (var child = first.nextSibling; child;)
			{
				var next = child.nextSibling;
				child.parentNode.removeChild(child);
				if (child == last)
					break;
				else
					child = next;
			}
		}

		if (this.innerEditMode)
			this.editingElements[0].innerHTML = value;
		else
			this.editingElements = setOuterHTML(this.editingElements[0], value);
	},
	
	endEditing: function() {
		return true;
	},
	
	beginEditing: function() {
	},
	// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	
	onInput: function(defer) {	
		if(this.ignoreChange)
			return

		if(!defer){			
			this.saveEdit();
			return;
		}
			
		if(this.timerId){
			clearTimeout(this.timerId)
		}
		var self = this;
		this.timerId = setTimeout(function(){self.timerId = null;self.onInput()}, 200);		
	},
	
	search: function(text, reverse) {
		var e = this.editor   
        e.$search.set({backwards: reverse, needle: text}); 

		
		var range = e.$search.find(this.session);
		if (!range) {
			range=e.selection.getRange()
			if(!range.isEmpty()) {
				range.end=range.start
				e.selection.setSelectionRange(range)
				range = e.$search.find(this.session);
			}
		}
		
		if (range) {
			e.gotoLine(range.end.row + 1, range.end.column);
			e.selection.setSelectionRange(range);
		}
		return range
	}
}

Firebug.HTMLPanel.Editors.html = HTMLPanelEditor

// stylesheet panel

var StyleSheetEditor = function() {
	this.__noSuchMethod__ = dump;
	this.aceWindow = Firebug.Ace.win1
	this.editor = this.aceWindow.editor
	this.session = this.aceWindow.createSession('', '.css')
	this.onInput = bind(this.onInput, this)
	this.session.on('change', this.onInput)
	this.session.owner = 'stylesheetEditor';
	//
	this.cmdID = 'cmd_togglecssEditMode'
}

StyleSheetEditor.prototype = extend(HTMLPanelEditor.prototype, {
	saveEdit: function(){
		Firebug.CSSModule.freeEdit(this.styleSheet, this.getValue())
	},
	
	prepare: function(target){	
	},	
	
	cleanup: function(target){
		delete this.styleSheet;
	},
	
	addContextMenuItems: function(items, editor, editorText) {       
        var self = this
		items.unshift(
            {
                label: $ACESTR("acebug.streamcomment"),
                command: function() {
                    editor.execCommand('toggleStreamComment');
                }
            },
            "-"
        );
    },

})

Firebug.StyleSheetEditor = StyleSheetEditor

Firebug.CSSStyleSheetPanel.prototype.startBuiltInEditing = function(css) {
	if (!this.stylesheetEditor)
		this.stylesheetEditor = new StyleSheetEditor();

	var styleSheet = this.location.editStyleSheet
		? this.location.editStyleSheet.sheet
		: this.location;

	this.stylesheetEditor.styleSheet = this.location;
	Firebug.Editor.startEditing(this.panelNode, css, this.stylesheetEditor);

	//this.stylesheetEditor.scrollToLine(topmost.line, topmost.offset);
	//this.stylesheetEditor.input.scrollTop = this.panelNode.scrollTop;
}
// ************************************************************************************************

Firebug.registerModule(Firebug.Ace);

// ************************************************************************************************

}});
