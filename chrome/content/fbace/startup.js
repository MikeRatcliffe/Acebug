define(function(require, exports, module) {

exports.launch = function(env, options) {
    env.acebug = {require: require};
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

    env.acebug.keybindings = {
        vim: require("ace/keyboard/keybinding/vim").Vim,
        emacs: require("ace/keyboard/keybinding/emacs").Emacs
    };
    switch(options.keybinding) {
        case "Ace":
            env.editor.setKeyboardHandler(null);
        break;
        case "Vim":
            env.editor.setKeyboardHandler(env.acebug.keybindings.vim);
        break;
        case "Emacs":
            env.editor.setKeyboardHandler(env.acebug.keybindings.emacs);
        break;
    }

    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

    env.editor.setShowInvisibles(options.showinvisiblecharacters);
    env.editor.setHighlightActiveLine(options.highlightactiveline);
    env.editor.session.setUseSoftTabs(options.softtabs);
    env.editor.session.setTabSize(options.tabsize);
    env.editor.setShowPrintMargin(false);
    env.editor.session.setUseWrapMode(options.wordwrap);
    env.editor.session.setWrapLimitRange(null, null);

    function onResize() {
        editor.resize();
    }
    window.onresize = onResize;
    onResize();

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

    editor.addCommand = function(cmd) {
        var canon = require("pilot/canon");

        canon.addCommand({
            name: cmd.name,
            exec: function(env, args, request) {
                cmd.exec(env, args);
            }
        });

        var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
        var ue = require("pilot/useragent");

        if (ue.isMac)
            var bindings = require("ace/keyboard/keybinding/default_mac").bindings;
        else
            bindings = require("ace/keyboard/keybinding/default_win").bindings;

        delete bindings.reverse;
        bindings[cmd.name] = cmd.key;
        env.editor.setKeyboardHandler(new HashHandler(bindings));
    };
};
});
