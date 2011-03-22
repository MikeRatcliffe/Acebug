define('fbace/startup', function(require, exports, module) {

exports.launch = function(env, options) {
	// global functions
    toggleGutter = function() {
        editor.renderer.setShowGutter(!env.editor.renderer.showGutter);
    };
	getMode = function(name) {
		var mode = (name.match(/.(xml|html?|css|js)($|\?|\#)/)||[,'js'])[1]
		var map = {html:'HTMLMode', htm:'HTMLMode', js:'JavaScriptMode', css:'CSSMode', xml:'XMLMode'}
		return new window[map[mode]]();
	};
	createSession = function(value, name) {
		var s = new EditSession(value);
		s.setMode(getMode(name));
		s.setUndoManager(new UndoManager());
		s.setUseSoftTabs(options.softtabs);
		s.setTabSize(options.tabsize);
		s.setUseWrapMode(options.wordwrap);
		s.setWrapLimitRange(null, null);
		return s
	}
    
    //since we are using separate window make everything global for now
    window.env = env;
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;

    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

    CSSMode = require("ace/mode/css").Mode;
    HTMLMode = require("ace/mode/html").Mode;
    XMLMode = require("ace/mode/xml").Mode;
	JavaScriptMode = require("ace/mode/javascript").Mode;
    // worker is more of nuisance now
    JavaScriptMode.prototype.createWorker = function(session) {
        return null;
    };

    jsDoc = createSession('', '.js');
    
    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, options.theme));
	editor.setTheme(options.theme);
    editor.setSession(jsDoc);

    editor.setShowInvisibles(options.showinvisiblecharacters);
    editor.setHighlightActiveLine(options.highlightactiveline);
    editor.setShowPrintMargin(false);
	editor.setHighlightSelectedWord(true);
    editor.renderer.setHScrollBarAlwaysVisible(false);

	// not needed in acebug
	editor.renderer.moveTextAreaToCursor =
	editor.textInput.onContextMenu = function(){};


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


    editor.addCommand = function(cmd) {
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
    /**********  handle keyboard *****/
	var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
	var Search = require("ace/search").Search;
    env.canon = canon = require("pilot/canon");

	env.setKeybinding = function(name){
		if(name !='Vim' && name != 'Emacs'){
			env.editor.setKeyboardHandler(null);
			return;
		}
		var path = "ace/keyboard/keybinding/" + name.toLowerCase();
		var module = require(path);
		if(!module)
			require([path], function(module){
				env.editor.setKeyboardHandler(env.editor.normalKeySet = module[name]);
			});
		else
			env.editor.setKeyboardHandler(env.editor.normalKeySet = module[name]);
	};

	env.setKeybinding(options.keybinding);

	editor.addCommands = function(commandSet) {
		for (var i in commandSet) {
			var exec = commandSet[i];
			if(typeof exec === "function")
				canon.addCommand({name: i, exec: exec});
		}
	};

	editor.execCommand = function(name){
		canon.getCommand(name).exec(env);
	};

	//add commands to default binding
	editor.keyBinding.$defaulKeyboardHandler.$config;
	var bindings = editor.keyBinding.$defaulKeyboardHandler.$config;

	bindings.startAutocompleter = "Ctrl-Space|Ctrl-.|Alt-.";
	bindings.execute = "Ctrl-Return";
	delete bindings.reverse;
	new HashHandler(bindings);


	editor.autocompletionKeySet = new HashHandler({
		startAutocompleter: 'Ctrl-Space',
		complete: 'Return',
		dotComplete: 'Ctrl-.|Alt-.',
		execute: 'Ctrl-Return',
		cancelCompletion: 'Esc',
		nextEntry: 'Down',
		previousEntry: 'Up'
	});

	//editor.setKeyboardHandler(editor.normalKeySet);
	//breakpoint handlers
	event.addListener(editor.renderer.$gutter, 'mousedown', function(e){
		if(e.target.className.indexOf('gutter-cell') === -1)
			return;
		var lineNo = parseInt(e.target.textContent, 10) - 1;
        var state;
		if(state = editor.session.$breakpoints[lineNo])
			editor.session.clearBreakpoint(lineNo);
		else
			editor.session.setBreakpoint(lineNo);
		//editor.session.panel.setBreakpoint(lineNo, state)
	});

	editor.addCommands({
		toggleStreamComment: function() {
			// TODO: handle space in ' */' while toggling
			var range = editor.getSelection().getRange();

			if (range.isEmpty()){
				range.start.column -= 2;
				range.end.column += 2;
				var session = editor.session,
					text = session.getTextRange(range),
					oi = text.indexOf('/*'),
					ci = text.indexOf('*/');

				if (oi==0 && ci==2){
					editor.session.remove(range);
					return;
				} else if (oi > ci) {
					editor.moveCursorToPosition(range.end);
				} else if (oi < ci) {
					editor.moveCursorToPosition(range.start);
				}

				var currentOptions = editor.$search.getOptions();
				var newOptions = {
					backwards: false,
					wrap: false,
					caseSensitive: false,
					wholeWord: false,
					regExp: false
				};
				newOptions.needle = "*/";
				editor.$search.set(newOptions);
				var endRange = editor.$search.find(session);
				if (endRange) {
					editor.moveCursorToPosition(endRange.start);
					newOptions.needle = '/*';
					newOptions.backwards = true;
					editor.$search.set(newOptions);
					var startRange = editor.$search.find(session);
					if(startRange) {
						editor.session.remove(endRange);
						editor.session.remove(startRange);
						editor.selection.setSelectionAnchor(startRange.start.row, startRange.start.column);
					}
				}
		        editor.$search.set(currentOptions);
			} else {
				editor.clearSelection();
				editor.moveCursorToPosition(range.end);
				editor.insert("*/");
				var newPos = editor.getCursorPosition();
				editor.moveCursorToPosition(range.start);
				editor.insert("/*");
				if (range.start.row == newPos.row)
					newPos.column += 2;
				editor.moveCursorTo(newPos.row, newPos.column);
			}
		}
	});
};
});
