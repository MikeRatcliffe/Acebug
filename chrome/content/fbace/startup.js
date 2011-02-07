define(function(require, exports, module) {

exports.launch = function(env, options) {
    //since we are using separate window make everything global for now
    window.env = env;
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;

    switch(options.theme) {
        case "ace/theme/clouds":
            theme = require("ace/theme/clouds");
        break;
        case "ace/theme/clouds_midnight":
            theme = require("ace/theme/clouds_midnight");
        break;
        case "ace/theme/cobalt":
            theme = require("ace/theme/cobalt");
        break;
        case "ace/theme/dawn":
            theme = require("ace/theme/dawn");
        break;
        case "ace/theme/eclipse":
            theme = require("ace/theme/eclipse");
        break;
        case "ace/theme/idle_fingers":
            theme = require("ace/theme/idle_fingers");
        break;
        case "ace/theme/kr_theme":
            theme = require("ace/theme/kr_theme");
        break;
        case "ace/theme/mono_industrial":
            theme = require("ace/theme/mono_industrial");
        break;
        case "ace/theme/monokai":
            theme = require("ace/theme/monokai");
        break;
        case "ace/theme/pastel_on_dark":
            theme = require("ace/theme/pastel_on_dark");
        break;
        case "ace/theme/textmate":
            theme = require("ace/theme/textmate");
        break;
        case "ace/theme/twilight":
            theme = require("ace/theme/twilight");
        break;
    }

    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

    JavaScriptMode = require("ace/mode/javascript").Mode;
    // worker is more of nuisance now
    JavaScriptMode.prototype.createWorker = function(session) {
        return null;
    };

    //empty gutter is annoying, so put space into document
    jsDoc = new EditSession(' ');
    jsDoc.setMode(new JavaScriptMode());
    jsDoc.setUndoManager(new UndoManager());

    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, theme));
    env.editor.setSession(jsDoc);

    var vim = require("ace/keyboard/keybinding/vim").Vim;
    var emacs = require("ace/keyboard/keybinding/emacs").Emacs;
    switch(options.keybinding) {
        case "Ace":
            env.editor.setKeyboardHandler(null);
        break;
        case "Vim":
            env.editor.setKeyboardHandler(vim);
        break;
        case "Emacs":
            env.editor.setKeyboardHandler(emacs);
        break;
    }

    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

    env.editor.setShowInvisibles(options.showinvisiblecharacters);
    env.editor.setHighlightActiveLine(options.highlightactiveline);
    env.editor.session.setUseSoftTabs(options.softtabs);
    env.editor.session.setTabSize(options.tabsize);
    env.editor.session.setUseWrapMode(options.wordwrap);
    env.editor.setShowPrintMargin(false);

    function onResize() {
        var session = editor.session;

        editor.resize();
        if(session.getUseWrapMode()) {
            var characterWidth = editor.renderer.characterWidth;
            var contentWidth = editor.renderer.scroller.clientWidth;

            if(contentWidth > 0) {
                session.setWrapLimit(parseInt(contentWidth / characterWidth, 10));
            }
        }
    }
    window.onresize = onResize;
    onResize();

    //do we need to prevent dragging?
    event.addListener(container, "dragover", function(e) {
        return event.preventDefault(e);
    });

    event.addListener(container, "drop", function(e) {
        return event.preventDefault(e);
    });

    // global functions
    window.toggleGutter = function() {
        env.editor.renderer.setShowGutter(!env.editor.renderer.showGutter);
    };

    /**********  handle shortcuts *****/
    // TODO: find better way
    var Search = require("ace/search").Search;
    var canon = require("pilot/canon");

    var customKeySet = {};
    editor.addCommand = function(x) {
        canon.addCommand({
            name: x.name,
            exec: function(env, args, request) {
                x.exec(env, args);
            }
        });
        delete customKeySet.reverse;
        customKeySet[x.name] = x.key;
        env.editor.setKeyboardHandler(new HashHandler(customKeySet));
    };
};

});
