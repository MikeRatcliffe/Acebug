define(function(require, exports, module) {

exports.launch = function(env) {
	//since we are using separate window make everything global for now
    window.env = env;
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;
    theme = require("ace/theme/textmate");
    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

	JavaScriptMode = require("ace/mode/javascript").Mode;
	// worker is more of nuisance now
	JavaScriptMode.prototype.createWorker = function(session) {
        return null;
    };

    var vim = require("ace/keyboard/keybinding/vim").Vim;
    var emacs = require("ace/keyboard/keybinding/emacs").Emacs;
    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

	//empty gutter is annoying, so put space into document
    jsDoc = new EditSession(' ');
    jsDoc.setMode(new JavaScriptMode());
    jsDoc.setUndoManager(new UndoManager());

    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, theme));
    env.editor.setSession(jsDoc);
    env.editor.session.setUseWrapMode(true);

    function onResize() {
        env.editor.resize();
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
