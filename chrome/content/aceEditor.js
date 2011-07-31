/* See license.txt for terms of usage */

FBL.ns(function() {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

Firebug.Ace = {
    dispatchName: "Ace",

    initializeUI: function() {
        var browser = FBL.$("fbAceBrowser");
        var win2Wrapped = browser.contentWindow;
        this.win2 = win2Wrapped.wrappedJSObject;

        var browser = FBL.$("fbAceBrowser1");
        win1Wrapped = browser.contentWindow;
        this.win1 = win1Wrapped.wrappedJSObject;

        this.win1.startAcebugAutocompleter =
        this.win2.startAcebugAutocompleter = this.startAutocompleter;

        //set Firebug.Ace on wrapped window so that Firebug.getElementPanel can access it
        win1Wrapped.document.getElementById('editor').ownerPanel = this;
        win2Wrapped.document.getElementById('editor').ownerPanel = this;

        this.win1.aceManager = this.win2.aceManager = this
        this.win1.onclose = this.win2.onclose = this.shutdown.bind(this)

        acebugPrefObserver.register();

        this.hookIntoFirebug()
    },

    shutdown: function() {
        if(!this.win1)
            return
        this.win1.aceManager = this.win2.aceManager = null
        this.win1 = this.win2 = null
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
        //
        Firebug.Ace.showautocompletionhints = options.showautocompletionhints;
        return options;
    },

    // firebug hook
    hookIntoFirebug: function() {
        var fName = "getCommandLineLarge"
        if (Firebug.CommandLine.getCommandEditor &&
            !Firebug.CommandLine.getCommandEditorPatched
            ) {
            Firebug.CommandLine.getCommandEditorPatched = true

            // required for 1.8 compatibility
            // see http://code.google.com/p/fbug/source/detail?r=11301
            fName = "getCommandEditor"

            let oldEl = Firebug.chrome.$("fbLargeCommandBox")
            let newEl = Firebug.chrome.$("fbCommandEditorBox")
            let toolbar = Firebug.chrome.$("fbCommandToolbar")
            newEl.parentNode.removeChild(newEl)
            oldEl.appendChild(toolbar)
            oldEl.id = "fbCommandEditorBox"
        }

        Firebug.CommandLine[fName] = function() {
            return Firebug.largeCommandLineEditor;
        };
        Firebug.ConsolePanel.prototype.detach = this.detach
        this.loadFBugPatch()
    },

    detach: function(oldChrome, newChrome) {
        var oldFrame = oldChrome.$("fbAceBrowser");
        var newFrame = newChrome.$("fbAceBrowser");
        if (oldFrame.contentWindow == Firebug.Ace.win2Wrapped) {
            oldFrame.QueryInterface(Ci.nsIFrameLoaderOwner).swapFrameLoaders(newFrame);
            // swap other window too
            oldFrame = oldChrome.$("fbAceBrowser1");
            newFrame = newChrome.$("fbAceBrowser1");
            oldFrame.QueryInterface(Ci.nsIFrameLoaderOwner).swapFrameLoaders(newFrame);
        }
    },

    loadFBugPatch: function() {
        var script = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
        script.type = "text/javascript;version=1.8";
        script.src ='chrome://acebug/content/patchUpFirebug.js'
        document.documentElement.appendChild(script)
    },

    showPanel: function(browser, panel) {
        this.win1.startAce(null, this.getOptions());
        this.showPanel = function(browser, panel) {
            if(panel.name=='console')
                this.win2.editor.renderer.onResize();
        }
    },

    switchPanels: function(toAce) {
        var panelID = toAce?"fbAceBrowser1-parent":'fbPanelBar1-browser';
        var panel = Firebug.chrome.$(panelID);
        panel.parentNode.selectedPanel=panel;
        this.win1.editor.renderer.onResize();
    },

    setFontSize: function(sizePercent) {
        this.win1Wrapped.document.getElementById('editor').style.fontSize = sizePercent;
        this.win2Wrapped.document.getElementById('editor').style.fontSize = sizePercent;
    },

    // context menu
    getContextMenuItems: function(nada, target) {
        var env = target.ownerDocument.defaultView.wrappedJSObject;

        var items = [],
            editor = env.editor,
            clipBoardText = gClipboardHelper.getData(),
            editorText = editor.getCopyText(),
            self = this;
        // important: make sure editor is focused
        editor.focus()

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
                label: $ACESTR("acebug options"),
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

        var sessionOwner;
        switch(editor.session.owner) {
            case 'console': sessionOwner = Firebug.largeCommandLineEditor; break;
            case 'stylesheetEditor': sessionOwner = StyleSheetEditor.prototype; break;
            case 'htmlEditor': sessionOwner = null; break;
        }
        sessionOwner && sessionOwner.addContextMenuItems(items, editor, editorText);

        return items;
    },

    getSourceLink: function(target, object) {
        var env = target.ownerDocument.defaultView.wrappedJSObject;
        var session = env.editor.session;
        if (!session.href)
            return;
        var cursor = Firebug.Ace.win1.editor.session.selection.selectionLead;
        var link = new FBL.SourceLink(session.href, cursor.row);
        link.column = cursor.column;
        return link
    },

    getPopupObject: function(target) {
        return null;
    },

    getTooltipObject: function(target) {
        return null;
    },

    // save and load
    initFilePicker: function(session, mode) {
        var ext = session.extension,
            fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker),
            ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
        if (mode == 'save')
            fp.init(window, $ACESTR("acebug.saveas"), Ci.nsIFilePicker.modeSave);
        else
            fp.init(window, $ACESTR("acebug.selectafile"), Ci.nsIFilePicker.modeOpen);

        if (ext)
            fp.appendFilter(ext, "*." + ext);
        fp.appendFilters(Ci.nsIFilePicker.filterAll);

        // try to set initial file
        if (session.filePath) {
            try{
                file = ios.newURI(session.filePath, null, null);
                file = file.QueryInterface(Ci.nsIFileURL).file;
                fp.displayDirectory = file.parent;
                fp.defaultString = file.leafName;
            } catch(e) {}
        }
        return fp;
    },

    loadFile: function(editor) {
        var result, file, name, result,
            session = editor.session, ext = session.extension,
            ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
        var fp = this.initFilePicker(session, 'open');

        result = fp.show();

        if (result == Ci.nsIFilePicker.returnOK) {
            session.setValue(readEntireFile(fp.file));
            session.setFileInfo(ios.newFileURI(fp.file).spec);
        }
    },

    saveFile: function(editor, doNotUseFilePicker) {
        var file, name, result, session = editor.session,
            ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService),
            fp = this.initFilePicker(session, 'save');

        if (doNotUseFilePicker && session.href) {
            try {
                file = ios.newURI(session.href, null, null)
                    .QueryInterface(Ci.nsIFileURL).file;
                if (file.exists()) {
                    result = Ci.nsIFilePicker.returnOK;
                    fp = {file: file};
                }
            } catch(e){}
        }

        if (!fp.file)
            result = fp.show();
        if (result == Ci.nsIFilePicker.returnOK) {
            file = fp.file;
            name = file.leafName;

            if (name.indexOf('.')<0) {
                file = file.parent;
                file.append(name + '.' + session.extension);
            }

            writeFile(file, session.getValue());
            if (!session.filePath)
                session.setFileInfo(ios.newFileURI(file).spec);
        }
        else if (result == Ci.nsIFilePicker.returnReplace) {
            writeFile(fp.file, session.getValue());
            if (!session.filePath)
                session.setFileInfo(ios.newFileURI(file).spec);
        }
    },

    savePopupShowing: function(popup) {
        FBL.eraseNode(popup)
        FBL.createMenuItem(popup, {label: 'save As', nol10n: true });
    },

    loadPopupShowing: function(popup) {
        FBL.eraseNode(popup)
        FBL.createMenuItem(popup, {label: 'ace auto save', nol10n: true });
    },

    getUserFile: function(id){
        var file = Services.dirsvc.get(dir||"ProfD", Ci.nsIFile);
        file.append('acebug')
        file.append('autosave-'+id)
        return file
    },


    // search
    search: function(text, reverse) {
        var e = this.editor;
        e.$search.set({
            needle: text,
            backwards: reverse,
            caseSensitive: Firebug.searchCaseSensitive,
            //regExp: Firebug.searchUseRegularExpression,
        });

        var range = e.$search.find(e.session);
        if (!range) {
            range = e.selection.getRange();
            if (!range.isEmpty()) {
                range.end = range.start;
                e.selection.setSelectionRange(range);
                range = e.$search.find(e.session);
            }
        }

        if (range) {
            e.gotoLine(range.end.row + 1, range.end.column);
            e.selection.setSelectionRange(range);
        }
        return range&&!range.isEmpty();
    }
};

Firebug.largeCommandLineEditor = {
    initialize: function() {
        if (!this._getValue)
            return;

        var editor = Firebug.Ace.win2.editor;
        editor.session.owner = 'console';
        editor.session.href = '';
        editor.session.autocompletionType = 'console';

        // set mode which allows cells and, js+coffeescript combination
        Firebug.Ace.win2.initConsoleMode(editor)


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
            execute: function()Firebug.largeCommandLineEditor.enter(true, false),
            dirExecute: function()Firebug.largeCommandLineEditor.enter(true, true)
        });
    },
    // called if ace still loading
    _startLoading: function() {
        if (this._loadingStarted)
            return;
        this._loadingStarted = true;

        Firebug.Ace.win2.startAce(FBL.bind(this.initialize,this),
            Firebug.Ace.getOptions(), ['fbace/consoleMode', "fbace/worker"]);
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
        editor.session.doc.setValue(text);
        return text;
    },

    //* * * * * * * * * * * * * * * * * * * * * * * * *
    get value() {
        return this.getValue();
    },

    set value(val) {
        if (this._setValue)
            return this.setValue(val);
        if (arguments.callee.caller == Firebug.CommandLine.commandHistory.onMouseUp) {
            var mode = Firebug.Ace.win2.editor.session.getMode()
            if (mode.setCellText)
                return mode.setCellText(val)
            return this.setValue(val);
        }
        return val;
    },

    addEventListener: function() {
        Firebug.Ace.win2.addEventListener.apply(null,arguments);
    },

    removeEventListener: function() {
        Firebug.Ace.win2.removeEventListener.apply(null,arguments);
    },

    focus: function() {
        var win = Firebug.Ace.win2;
        win && win.editor && win.editor.focus();
    },

    // emulate textarea for firebug compatibility
    __noSuchMethod__: function() {
    },
    style: {
        set fontSizeAdjust(val) {
            dump(val); return val
        }
    },

    addContextMenuItems: function(items, editor, editorText) {
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

    // * * * * * * * * * * * * * * * * * * * * * *
    // todo: do we need to support noscript? Cc["@maone.net/noscript-service;1"]
    enter: function(runSelection, dir) {
        this.$useConsoleDir = dir;
        var editor = Firebug.Ace.win2.editor;
        var cell = editor.session.getMode().getCurrentCell();
        this.cell = cell;

        if (runSelection)
            var text = editor.getCopyText();
        if (!text) {
            //log lines with breakpoints
            var bp = editor.session.$breakpoints;
            if (cell.coffeeError) {
                this.logCoffeeError(cell.coffeeError);
                return;
            } else if (cell.coffeeText) {
                text = cell.coffeeText
            } else
                text = cell.body.map(function(x, i) {
                    if (bp[i + cell.bodyStart]) {
                        // strip comments and ;
                        x = x.replace(/\/\/.*$/, '')
                             .replace(/;\s*$/, '')
                             .replace(/^\s*var\s+/g, '')
                        if(x)
                            x = 'console.log(' + x + ')'
                    }
                    return x;
                }).join('\n');
            Firebug.CommandLine.commandHistory.appendToHistory(cell.body.join('\n'));
        }
        text = text.replace(/\.\s*$/, '');

        Firebug.largeCommandLineEditor.runUserCode(text, cell);
    },

    setThisValue: function(code, cell){
        cell = cell || Firebug.Ace.win2.editor.session.getMode().getCurrentCell();
        var thisValue = cell.headerText.match(/this\s*=(.*)/)
        if (thisValue&&code){
            code = '(function(){return eval(' + code.quote() + ')}).call(' + thisValue[1] + ')'
        }
        dump(code)
        return code
    },

    setErrorLocation: function(context){
        Firebug.CommandLine.evaluate('++++', context, context.thisValue, null,
            dump, function(error) {
                var source = error.source.split('++++')
                context.errorLocation={
                    fileName: error.fileName,
                    lineNumber: error.lineNumber,
                    before: source[0].length,
                    after: -source[1].length,
                }
            }
        );
    },

    runUserCode: function(code, cell) {
        var context = Firebug.currentContext;
        if(!context.errorLocation)
            this.setErrorLocation(context);

        var shortExpr = FBL.cropString(code.replace(/\s*/g, ''), 100);//\xAD \u2009
        Firebug.Console.log("in:" + (inputNumber++) + ">>> " + cell.sourceLang + shortExpr, context, "command", FirebugReps.Text);

        code = this.setThisValue(code, this.cell);
        this.lastEvaledCode = code;
        Firebug.CommandLine.evaluate(code, context, context.thisValue, null,
            Firebug.largeCommandLineEditor.logSuccess,
            Firebug.largeCommandLineEditor.logError
        );
    },
    logSuccess: function(e){
        Firebug.largeCommandLineEditor.$useConsoleDir?
            Firebug.Console.log(e,  Firebug.currentContext, "dir", Firebug.DOMPanel.DirTable):
            Firebug.Console.log(e);
    },
    logError: function(error) {
        var loc = Firebug.currentContext.errorLocation
        var self = Firebug.largeCommandLineEditor;
        var source = error.source.slice(loc.before, loc.after);
        if(loc.fileName == error.fileName && source == self.lastEvaledCode) {
            var cellStart = self.cell.bodyStart;
            var lineNumber = error.lineNumber - loc.lineNumber;
            var lines = source.split('\n');
            var line = lines[lineNumber]||lines[lineNumber-1];
            Firebug.Console.log(error.message + ' `' + line + '` @'+(lineNumber+cellStart));
        } else
            Firebug.Console.log(error);
    },
    logCoffeeError: function(error) {
        Firebug.Console.log(error.text + ' `' + error.source + '` @'+(error.row+this.cell.bodyStart));
    }
};

var inputNumber = 0;
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
        if (aTopic != "nsPref:changed")
            return;

        var env1 = Firebug.Ace.win1.env;
        var env2 = Firebug.Ace.win2.env;

        switch (aData) {
            case "highlightactiveline":
                env1 && env1.editor.setHighlightActiveLine(this._branch.getBoolPref(aData));
                env2 && env2.editor.setHighlightActiveLine(this._branch.getBoolPref(aData));
            break;
            case "highlightselectedword":
                env1 && env1.editor.setHighlightSelectedWord(this._branch.getBoolPref(aData));
                env2 && env2.editor.setHighlightSelectedWord(this._branch.getBoolPref(aData));
            break;
            case "validateasyoutype":
                env1 && env1.editor.session.setUseWorker(this._branch.getBoolPref(aData));
                env2 && env2.editor.session.setUseWorker(this._branch.getBoolPref(aData));
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
            case "showautocompletionhints":
                Firebug.Ace.showautocompletionhints = this._branch.getBoolPref(aData);
            break;
        }
    }
};

/***********************************************************/
var gClipboardHelper = Firebug.Ace.gClipboardHelper = {
    cbHelperService: Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper),

    copyString: function(str) {
        if (str)
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
    return FBL.$STR(name, "strings_acebug");
};

/***********************************************************/

function readEntireFile(file) {
    var data = "",
        str = {},
        fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream),
        converter = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);

    const replacementChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
    fstream.init(file, -1, 0, 0);
    converter.init(fstream, "UTF-8", 1024, replacementChar);
    while (converter.readString(4096, str) != 0) {
        data += str.value;
    }
    converter.close();

    return data;
}

function writeFile(file, text) {
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
    this.onInput = FBL.bind(this.onInput, this);
    this.session.on('change', this.onInput);
    this.session.owner = 'htmlEditor';
    //
    this.cmdID = "cmd_toggleHTMLEditing";
};

HTMLPanelEditor.prototype = {
    // needed to get rid from Firebug.Editor's "help"
    multiLine: true,
    tabNavigation: false,
    arrowCompletion: false,

    //
    getValue: function() {
        return this.editor.session.getValue()
    },

    setValue: function(value) {
        this.ignoreChange = true;
        this.session.doc.setValue(value);
        this.session.selection.moveCursorFileStart();
        if (this.editor.session != this.session)
            this.editor.setSession(this.session);
        this.ignoreChange = false;
        return value;
    },

    show: function(target, panel, value, textSize, targetSize) {
        this.prepare(target);
        this.panel = panel;
        this.panel.search = FBL.bind(Firebug.Ace.search, this);

        this.setValue(value);
        this.editor.focus();

        var command = Firebug.chrome.$(this.cmdID);
        command.setAttribute("checked", true);
        Firebug.Ace.switchPanels(true);
        this.editing = true;
        // this too is for 'help'
        setTimeout(function() {
            Firebug.Editor.detachListeners();
        }, 10)
    },

    hide: function() {
        var command = Firebug.chrome.$(this.cmdID);
        command.setAttribute("checked", false);
        Firebug.Ace.switchPanels(false);
        this.cleanup();
        delete this.panel.search;
        delete this.panel;
        this.editing = false;
    },

    prepare: function(target) {
        this.target = target;
        this.editingElements = [target.repObject, null];
    },

    cleanup: function(target) {
        Firebug.chrome.getSelectedPanel().select(this.editingElements[0]);
        delete this.editingElements;
        delete this.target;
    },

    saveEdit: function() {
        // Make sure that we create at least one node here, even if it's just
        // an empty space, because this code depends on having something to replace
        var value = this.getValue() || " ";

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
            this.editingElements = FBL.setOuterHTML(this.editingElements[0], value);
    },

    endEditing: function() {
        return true;
    },

    beginEditing: function() {
    },
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onInput: function(defer) {
        if (this.ignoreChange)
            return;

        if (!defer) {
            this.saveEdit();
            return;
        }

        if (this.timerId) {
            clearTimeout(this.timerId);
        }
        var self = this;
        this.timerId = setTimeout(function() {self.timerId = null;self.onInput()}, 200);
    }
};

Firebug.HTMLPanel.Editors.html = HTMLPanelEditor;

// stylesheet panel

var StyleSheetEditor = function() {
    this.__noSuchMethod__ = dump;
    this.aceWindow = Firebug.Ace.win1;
    this.editor = this.aceWindow.editor;
    this.session = this.aceWindow.createSession('', '.css');
    this.onInput = FBL.bind(this.onInput, this);
    this.session.on('change', this.onInput);
    this.session.owner = 'stylesheetEditor';
    this.session.autocompletionType = 'css';

    this.cmdID = Firebug.version<'1.8'? 'cmd_toggleCSSEditing': 'cmd_togglecssEditMode';
};

StyleSheetEditor.prototype = FBL.extend(HTMLPanelEditor.prototype, {
    saveEdit: function() {
        Firebug.CSSModule.freeEdit(this.styleSheet, this.getValue())
    },

    prepare: function(target) {
        Firebug.chrome.$('fbCmdSaveButton1').collapsed = false;
        // hack to set file path on session
        try{
            var href = this.styleSheet.href || this.styleSheet.ownerNode.baseURI + '.css';
            this.session.setFileInfo(href);
        } catch(e) {}
    },

    cleanup: function(target) {
        delete this.styleSheet;
        Firebug.chrome.$('fbCmdSaveButton1').collapsed = true;
    },

    addContextMenuItems: function(items, editor, editorText) {
        var self = this;
        items.unshift(
            {
                label: $ACESTR("acebug.streamcomment"),
                command: function() {
                    editor.execCommand('toggleStreamComment');
                }
            },
            {
                label: "Load Original Source",
                command: function() {
                    Firebug.currentContext.getPanel('stylesheet').loadOriginalSource();
                }
            },
            "-"
        );
    },

});

Firebug.StyleSheetEditor = StyleSheetEditor;

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
};
// ************************************************************************************************

Firebug.registerModule(Firebug.Ace);

// ************************************************************************************************

});