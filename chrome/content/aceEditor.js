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

        Firebug.CommandLine.getCommandLineLarge = function()
        {
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
		this.win1.startAce()
		this.showPanel=function(){}
    },

    getOptions: function(){
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
	
	switchPanels: function(toAce){
		var panelID = toAce?"fbAceBrowser1":'fbPanelBar1-browser'
		var panel = Firebug.chrome.$(panelID);
		panel.parentNode.selectedPanel=panel;
	}
};

Firebug.largeCommandLineEditor = {
    initialize: function() {
        if(!this._getValue)
            return;
        if(!Firebug.Ace.win2)
            Firebug.Ace.initializeUI();

        Firebug.Ace.env = Firebug.Ace.win2.env;
        var editor = Firebug.Ace.env.editor;

        //set Firebug.largeCommandLineEditor on wrapped window so that Firebug.getElementPanel can access it
        Firebug.Ace.win2Wrapped.document.body.ownerPanel = this;
        // clean up preload handlers
        this.getValue = this._getValue;
        this.setValue = this._setValue;
        this.setValue(this._valueBuffer || '');
        delete this._getValue;
        delete this._setValue;
        delete this._loadingStarted;
        delete this._valueBuffer;
        this.setFontSize = this._setFontSize;
        if(this._fontSizeBuffer){
            this.setFontSize(this._fontSizeBuffer);
            delete this._fontSizeBuffer;
        }
        delete this._setFontSize;

        //add shortcuts
        Firebug.Ace.env.editor.addCommands({
            execute: Firebug.largeCommandLineEditor.enter,
            startAutocompleter: function() {
                Firebug.Ace.autocompleter.start(editor);
            }
        });

        acebugPrefObserver.register();
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

    setFontSize: function(sizePercent){
        this._fontSizeBuffer = sizePercent;
    },

    // activated when ace is loaded
    _getValue: function() {
        return Firebug.Ace.env.editor.session.getValue();
    },

    _setValue: function(text) {
        var editor = Firebug.Ace.env.editor;
        editor.selection.selectAll();
        editor.onTextInput(text);
        return text;
    },

    _setFontSize: function(sizePercent){
        Firebug.Ace.env.editor.container.style.fontSize = sizePercent;
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
        var editor = Firebug.Ace.env.editor;
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
        Firebug.Ace.env && Firebug.Ace.env.editor.focus();
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
            this.value = readEntireFile(fp.file);
        }
    },

    saveFile:function()
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

    getContextMenuItems: function(target)
    {
        var items = [],
            editor = Firebug.Ace.env.editor,
            clipBoardText = gClipboardHelper.getData(),
            editorText = editor.getCopyText(),
            self = this;

        items.push(
            {
                label: $ACESTR("acebug.executeselection"),
                command: function() {
                    Firebug.CommandLine.enter(Firebug.currentContext, editorText);
                    self.focus();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.streamcomment"),
                command: function() {
                    Firebug.Ace.env.execCommand('toggleStreamComment');
                }
            },
            "-",
            {
                label: $ACESTR("acebug.copy"),
                command: function() {
                    gClipboardHelper.copyString(editorText);
                    self.focus();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.cut"),
                command: function() {
                    gClipboardHelper.copyString(editorText);
                    editor.onCut();
                    self.focus();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.paste"),
                command: function() {
                    editor.onTextInput(clipBoardText);
                    self.focus();
                },
                disabled: !clipBoardText
            },
            "-",
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
        return items;
    },

    getPopupObject: function(target)
    {
        return null;
    },

    getTooltipObject: function(target)
    {
        return null;
    }
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

        var env = Firebug.Ace.env;

        switch (aData) {
            case "highlightactiveline":
                env.editor.setHighlightActiveLine(this._branch.getBoolPref(aData));
            break;
            case "keybinding":
                env.setKeybinding(this._branch.getCharPref(aData));
            break;
            case "showinvisiblecharacters":
                env.editor.setShowInvisibles(this._branch.getBoolPref(aData));
            break;
            case "softtabs":
                env.editor.session.setUseSoftTabs(this._branch.getBoolPref(aData));
            break;
            case "tabsize":
                env.editor.session.setTabSize(this._branch.getIntPref(aData));
            break;
            case "theme":
                env.editor.setTheme(this._branch.getCharPref(aData));
            break;
            case "wordwrap":
                env.editor.session.setUseWrapMode(this._branch.getBoolPref(aData));
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
// stylesheet panel
Firebug.stylesheetEditor = {
    initialize: function() {
        if(!this._getValue)
            return;
        if(!Firebug.Ace.win1)
            Firebug.Ace.initializeUI();

        Firebug.Ace.env = Firebug.Ace.win1.env;
        var editor = Firebug.Ace.env.editor;

        //set Firebug.largeCommandLineEditor on wrapped window so that Firebug.getElementPanel can access it
        Firebug.Ace.win2Wrapped.document.body.ownerPanel = this;
        // clean up preload handlers
        this.getValue = this._getValue;
        this.setValue = this._setValue;
        this.setValue(this._valueBuffer || '');
        delete this._getValue;
        delete this._setValue;
        delete this._loadingStarted;
        delete this._valueBuffer;
        this.setFontSize = this._setFontSize;
        if(this._fontSizeBuffer){
            this.setFontSize(this._fontSizeBuffer);
            delete this._fontSizeBuffer;
        }
        delete this._setFontSize;

        //add shortcuts
        Firebug.Ace.env.editor.addCommands({
            execute: Firebug.largeCommandLineEditor.enter,
            startAutocompleter: function() {
                Firebug.Ace.autocompleter.start(editor);
            }
        });

        acebugPrefObserver.register();
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

    setFontSize: function(sizePercent){
        this._fontSizeBuffer = sizePercent;
    },

    // activated when ace is loaded
    _getValue: function() {
        return Firebug.Ace.env.editor.session.getValue();
    },

    _setValue: function(text) {
        var editor = Firebug.Ace.env.editor;
        editor.selection.selectAll();
        editor.onTextInput(text);
        return text;
    },

    _setFontSize: function(sizePercent){
        Firebug.Ace.env.editor.container.style.fontSize = sizePercent;
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
        var editor = Firebug.Ace.env.editor;
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
        Firebug.Ace.env && Firebug.Ace.env.editor.focus();
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
            this.value = readEntireFile(fp.file);
        }
    },

    saveFile:function()
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

    getContextMenuItems: function(target)
    {
        var items = [],
            editor = Firebug.Ace.env.editor,
            clipBoardText = gClipboardHelper.getData(),
            editorText = editor.getCopyText(),
            self = this;

        items.push(
            {
                label: $ACESTR("acebug.executeselection"),
                command: function() {
                    Firebug.CommandLine.enter(Firebug.currentContext, editorText);
                    self.focus();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.streamcomment"),
                command: function() {
                    Firebug.Ace.env.execCommand('toggleStreamComment');
                }
            },
            "-",
            {
                label: $ACESTR("acebug.copy"),
                command: function() {
                    gClipboardHelper.copyString(editorText);
                    self.focus();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.cut"),
                command: function() {
                    gClipboardHelper.copyString(editorText);
                    editor.onCut();
                    self.focus();
                },
                disabled: !editorText
            },
            {
                label: $ACESTR("acebug.paste"),
                command: function() {
                    editor.onTextInput(clipBoardText);
                    self.focus();
                },
                disabled: !clipBoardText
            },
            "-",
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
        return items;
    },

    getPopupObject: function(target)
    {
        return null;
    },

    getTooltipObject: function(target)
    {
        return null;
    }
};

Firebug.stylesheetEditor.saveEdit=bind(function(){
	Firebug.CSSModule.freeEdit(this.styleSheet, Firebug.Ace.win1.editor.session.getValue())
}, Firebug.stylesheetEditor);
Firebug.CSSStyleSheetPanel.prototype.startBuiltInEditing = function(css)
{
	var panel=Firebug.chrome.$("fbAceBrowser1")
	panel.parentNode.selectedPanel=panel

	set=function(){
		var s=new Firebug.Ace.win1.EditSession(css,new Firebug.Ace.win1.CSSMode())
		s.on('change', Firebug.stylesheetEditor.saveEdit)
		Firebug.Ace.win1.editor.setSession(s)
	}
	if(Firebug.Ace.win1.editor){
		set()
	
	}else{
		Firebug.Ace.win1.startAce(set)
	}

	var styleSheet = this.location.editStyleSheet
		? this.location.editStyleSheet.sheet
		: this.location;

	this.stylesheetEditor.styleSheet = this.location;	
}
Firebug.CSSStyleSheetPanel.prototype.stylesheetEditor = Firebug.stylesheetEditor


var HTMLPanelEditor = function() {
	this.__noSuchMethod__ = dump;
	this.aceWindow = Firebug.Ace.win1
	this.editor = this.aceWindow.editor
	this.session = this.aceWindow.createSession('.html')
	this.onInput = bind(this.onInput, this)
	this.session.on('change', this.onInput)
	//
	this.multiLine = true;
    this.tabNavigation = false;
    this.arrowCompletion = false;
}

HTMLPanelEditor.prototype = {
	getValue: function() {
		return this.editor.session.getValue()
	},
	
	setValue: function(value) {
		this.ignoreChange = true
		this.session.setValue(value);
		if(this.editor.session != this.session) {
			this.ignoreChange = true
			this.editor.setSession(this.session)
		}
		return value
	},
	
	show: function(target, panel, value, textSize, targetSize) {
		this.target = target;
		this.panel = panel;
		this.editingElements = [target.repObject, null];
		
		this.setValue(value);
		this.editor.focus();
	
		var command = Firebug.chrome.$("cmd_toggleHTMLEditing");
		command.setAttribute("checked", true);
		Firebug.Ace.switchPanels(true)
	},
	
	hide: function() {
		var command = Firebug.chrome.$("cmd_toggleHTMLEditing");
		command.setAttribute("checked", false);
	
		Firebug.Ace.switchPanels(false)
		
		delete this.editingElements;
		delete this.target;
		delete this.panel;
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
		dump(defer, this.ignoreChange, this.timerId)
	
		if(this.ignoreChange)
			return this.ignoreChange = false

		if(!defer){			
			this.saveEdit();
			return;
		}
			
		if(this.timerId){
			clearTimeout(this.timerId)
		}
		var self = this;
		this.timerId = setTimeout(function(){self.timerId = null;self.onInput()}, 200);
		
	}
}

Firebug.HTMLPanel.Editors.html = HTMLPanelEditor
// ************************************************************************************************

Firebug.registerModule(Firebug.Ace);

// ************************************************************************************************

}});
