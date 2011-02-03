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

            Firebug.Ace.rightWindowWrapped = browser.contentWindow;
            Firebug.Ace.rightWindow = Firebug.Ace.rightWindowWrapped.wrappedJSObject;
            //set Firebug.largeCommandLineEditor on wrapped window so that Firebug.getElementPanel can access it
            Firebug.Ace.rightWindowWrapped.document.body.ownerPanel = Firebug.largeCommandLineEditor;
            Firebug.Ace.rightWindow.onStartupFinished = Firebug.largeCommandLineEditor.initialize;

        Firebug.CommandLine.getCommandLineLarge = function()
        {
            return Firebug.largeCommandLineEditor;
        };
    },

    showPanel: function(browser, panel) {
        if(!Firebug.Ace.env){
            Firebug.largeCommandLineEditor.initialize();
            Firebug.Ace.env = Firebug.Ace.rightWindow.env;
        }

        Firebug.Ace.rightWindow.addEventListener("resize", Firebug.largeCommandLineEditor.resizeHandler, true);
    },
};

Firebug.largeCommandLineEditor = {
    initialize: function() {
        if(!Firebug.Ace.rightWindow)
            Firebug.Ace.initializeUI();

        Firebug.Ace.env = Firebug.Ace.rightWindow.env;
        var editor = Firebug.Ace.env.editor;

        // this is wrong, but needed to keep commandline value in synch
        // firebugs commandline binding has similar listener for oninput
        editor.textInput.getElement().addEventListener( "input", function() {
            Firebug.currentContext.commandLineText = Firebug.largeCommandLineEditor.value;
        }, false);

        //add shortcuts
        Firebug.Ace.env.editor.addCommand({
            name:'execute',
            key:'Ctrl-Return',
            exec:function(){
                Firebug.CommandLine.enter(Firebug.currentContext);
            }
        });
        Firebug.Ace.env.editor.addCommand({
            name:'complete',
            key:'Ctrl-Space',
            exec:function(){
                Firebug.CommandLine.enter(Firebug.currentContext);
            }
        });
    },

    getValue: function() {
        return Firebug.Ace.env.editor.selection.doc.toString();
    },

    setValue: function(text) {
        if(!Firebug.Ace.rightWindow)
            Firebug.Ace.initializeUI();

        var editor = Firebug.Ace.env.editor;

        editor.selection.selectAll();
        editor.onTextInput(text);

        return text;
    },

    get value() {
        return this.getValue();
    },

    set value(val) {
        return this.setValue(val);
    },

    setFontSize: function(sizePercent){
        Firebug.Ace.env.editor.container.style.fontSize = sizePercent;
    },

    addEventListener: function() {
        Firebug.Ace.rightWindow.addEventListener.apply(null,arguments);
    },

    removeEventListener: function() {
        Firebug.Ace.rightWindow.removeEventListener.apply(null,arguments);
    },

    focus: function() {
        Firebug.Ace.env.editor.focus();
    },

    resizeHandler: function() {
        var editor = Firebug.Ace.env.editor;
        var session = editor.session;

        if(session.getUseWrapMode()) {
            var characterWidth = editor.renderer.layerConfig.characterWidth;
            var contentWidth = editor.container.ownerDocument.getElementsByClassName("ace_scroller")[0].clientWidth;

            session.setWrapLimit(parseInt(contentWidth / characterWidth, 10));
        }
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
                    var range = editor.getSelection().getRange(),
                        startRow = range.start.row,
                        startCol = range.start.column,
                        endRow = range.end.row,
                        endCol = range.end.column;

                    editor.clearSelection();
                    editor.moveCursorTo(endRow, endCol);
                    editor.insert(" */");
                    editor.moveCursorTo(startRow, startCol);
                    editor.insert("/* ");

                    self.focus();
                },
                disabled: !editorText
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
    },
};


/***********************************************************/
var gClipboardHelper = {
    cbHelperService: Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper),

    copyString: function(str) {
        if(str)
            this.cbHelperService.copyString(str)
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
// StyleSheetEditor

function StyleSheetEditor(doc)
{
    this.box = this.tag.replace({}, doc, this);
    this.input = this.box.firstChild;
}

StyleSheetEditor.prototype = domplate(Firebug.BaseEditor,
{
    getValue: function()
    {
        return this.input.value;
    },

    setValue: function(value)
    {
        return this.input.value = value;
    },

    show: function(target, panel, value, textSize, targetSize)
    {
        var command = Firebug.chrome.$("cmd_toggleCSSEditing");
        command.setAttribute("checked", true);

        this.target = target;
        this.panel = panel;

        this.panel.panelNode.appendChild(this.box);

        this.input.value = value;
        this.input.focus();
    },

    hide: function()
    {
        var command = Firebug.chrome.$("cmd_toggleCSSEditing");
        command.setAttribute("checked", false);

        if (this.box.parentNode == this.panel.panelNode)
            this.panel.panelNode.removeChild(this.box);

        delete this.target;
        delete this.panel;
        delete this.styleSheet;
    }
});

// ************************************************************************************************

Firebug.registerModule(Firebug.Ace);

// ************************************************************************************************

}});
