/************************************************************************************/
define('fbace/startup', function(require, exports, module) {

exports.launch = function(env, options) {
    acebugOptions = options
    // requires
    event = require("ace/lib/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;

    Range = require("ace/range").Range;

    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

	HashHandler = require("ace/keyboard/hash_handler").HashHandler;
	Search = require("ace/search").Search;	
	
	
	/**************************** breakpoint handler *********************************************/

	function SmartBreakpoints() {
		this.setBreakpointsAtRows = function(rows) {
			this.$breakpoints = [];
			for (var i=0; i<rows.length; i++) {
				this.$breakpoints[rows[i]] = true;
			}
			this._dispatchEvent("changeBreakpoint", {});
		};
		this.setBreakpoints = function(bp) {
			this.$breakpoints = bp;
			this._dispatchEvent("changeBreakpoint", {});
		};
		this.clearBreakpoints = function() {
			this.$breakpoints = [];
			this._dispatchEvent("changeBreakpoint", {});
		};

		this.setBreakpoint = function(row, val) {
			this.$breakpoints[row] = val ||true;
			this._dispatchEvent("changeBreakpoint", {});
		};

		this.clearBreakpoint = function(row) {
			delete this.$breakpoints[row];
			this._dispatchEvent("changeBreakpoint", {});
		};

		this.getBreakpoints = function() {
			return this.$breakpoints;
		};

		this._delayedDispatchEvent = function(eventName, e, delay) {
			if (this[eventName+'_Timeout'] !=null || !this._eventRegistry) return;

			var listeners = this._eventRegistry[eventName];
			if (!listeners || !listeners.length) return;

			var self = this;
			this[eventName+'_Timeout'] = setTimeout(function(){
				self[eventName+'_Timeout'] = null
				self._dispatchEvent(eventName, e)
			}, delay || 20)
		};

		this.updateDataOnDocChange = function(e) {
			var delta = e.data;
			var range = delta.range;
			var len, firstRow, f1;
			
			if (delta.action == "insertText") {
				len = range.end.row - range.start.row
				firstRow = range.start.column == 0? range.start.row: range.start.row + 1;
			} else if (delta.action == "insertLines") {
				len = range.end.row - range.start.row;
				firstRow = range.start.row;
			} else if (delta.action == "removeText") {
                len = range.start.row - range.end.row;
				firstRow = range.start.row;
			} else if (delta.action == "removeLines") {
				len = range.start.row - range.end.row
				firstRow = range.start.row;
			}

			if (len > 0) {
				args = Array(len);
				args.unshift(firstRow, 0)
				this.$breakpoints.splice.apply(this.$breakpoints, args);
            } else if (len < 0) {
                var rem = this.$breakpoints.splice(firstRow + 1, -len);
				
                if(!this.$breakpoints[firstRow]){
					for each(var oldBP in rem)
						if (oldBP){
							this.$breakpoints[firstRow] = oldBP
							break
						}
				}
			}
		}
		
		this.$init = function() {
			this.doc.on('change', this.updateDataOnDocChange.bind(this));
		}
	};
	SmartBreakpoints.call(EditSession.prototype);
	
	/**************************** initialize ****************************************************/
	// global functions
    toggleGutter = function() {
        editor.renderer.setShowGutter(!editor.renderer.showGutter);
    };
	toggleWrapMode = function(useWrap, session) {
		session = session || editor.session
		if (useWrap == null)
			useWrap = !session.$useWrapMode;

		if (useWrap) {
            session.setUseWrapMode(true);
            session.setWrapLimitRange(null, null);
		} else {
            session.setUseWrapMode(false);		
		}
    };
	getExtension = function(name, mime) {
		if(mime) return (mime.toLowerCase().match(/(xml|html?|css|jsm?|xul|rdf)/i)||[,'js'])[1]
		return (name.match(/.(xml|html?|css|jsm?|xul|rdf)($|\?|\#)/i)||[,'js'])[1]
	};
	modeCache = {
		_get: function(name){
			var path = "ace/mode/"+name
			if(!this[path])
				try{
					var Mode = require(path).Mode
					delete Mode.prototype.createWorker
					this[name] = this[path] = new Mode()
					this[name].type = name
				}catch(e){}
			
			return this[path]
		},
		get: function(ext){
			if("xml|html|xul|rdf".indexOf(ext)!=-1)
				ext = "html"
			else if("jsm".indexOf(ext)!=-1 || "css".indexOf(ext)==-1)
				ext = "javascript"
			return this._get(ext)
		}
	};
	createSession = function(value, name, mimeType) {
		var s = new EditSession(value||'');
		s.setFileInfo(name.toLowerCase(), mimeType);
		s.setMode(modeCache.get(s.extension));
		s.setUndoManager(new UndoManager());

		s.setUseSoftTabs(options.softtabs);
		toggleWrapMode(options.wordwrap, s);
		s.setTabSize(options.tabsize);
		s.setWrapLimitRange(null, null);
		
		s.setUseWorker(options.validateasyoutype);
		
		//hack to support folding
		s.$init()

        return s;
    };
    EditSession.prototype.setFileInfo = function(path, mime) {
        this.extension = getExtension(path, mime);
        this.href = path;
        if (path.slice(0,5) == 'file:')
            this.filePath = path;
        else
            this.filePath = '';
    };
    env.setKeybinding = function(name) {
        if (name !='Vim' && name != 'Emacs') {
            env.editor.setKeyboardHandler(null);
            return;
        }
        var path = "ace/keyboard/keybinding/" + name.toLowerCase();
        var module = require(path);
        if (!module)
            require([path], function(module) {
                env.editor.setKeyboardHandler(env.editor.normalKeySet = module[name]);
            });
        else
            env.editor.setKeyboardHandler(env.editor.normalKeySet = module[name]);
    };

    //since we are using separate window make everything global for now
    window.env = env;

    jsDoc = createSession('', '.js');
	
	// not needed in acebug
    Renderer.prototype.moveTextAreaToCursor =
	require("ace/layer/text").Text.prototype.$pollSizeChanges = function(){}
	// selection on first/last lines

    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, options.theme));
    editor.setTheme(options.theme);
    editor.setSession(jsDoc);

    editor.setShowInvisibles(options.showinvisiblecharacters);
    editor.setHighlightActiveLine(options.highlightactiveline);
    editor.setShowPrintMargin(false);
    editor.setHighlightSelectedWord(options.highlightselectedword);
    editor.renderer.setHScrollBarAlwaysVisible(false);
	editor.setBehavioursEnabled(true);

    // not needed in acebug
    editor.textInput.onContextMenu = function() {};
    // don't let firebug's commandLinePopup to interfere
    editor.textInput.getElement().classList.add("textEditorInner");

    function onResize() {
        editor.resize();
    }
    window.onresize = onResize;
    onResize();
	
	/**************************** drag&drop *****************************************************/
    event.addListener(container, "dragover", function(e) {
        return event.preventDefault(e);
    });

    event.addListener(container, "drop", function(e) {
        try {
            if(!/javascript|text|html/.test(e.dataTransfer.files[0].type))
                return event.preventDefault(e);

            var file = e.dataTransfer.files[0];
        } catch(e) {
            return event.preventDefault(e);
        }

        if (window.FileReader) {
            var reader = new FileReader();
            reader.onload = function(e) {
                env.editor.getSelection().selectAll();
                env.editor.onTextInput(reader.result);
            };
            reader.readAsText(file);
        }

        return event.preventDefault(e);
    });

    editor.addCommand = function(cmd) {
        canon.addCommand({
            name: cmd.name,
            bindKey: {win: cmd.key, mac: cmd.key, sender: "editor"},
            exec: function(env, args, request) {
                cmd.exec(env, args);
            }
        });
    };
    /**********  handle keyboard *****/
    env.canon = canon = env.editor.commands;
	canon.getCommand = function(name){return this.commands[name]}

    env.setKeybinding(options.keybinding);

    editor.addCommands = function(commandSet) {
        for (var i in commandSet) {
            var exec = commandSet[i];
            var command = {name: i, exec: exec};
            if (bindings[i])
                command.bindKey = {win: bindings[i], mac: bindings[i], sender: "editor"};
            if (typeof exec === "function")
                canon.addCommand(command);
        }
    };

    editor.execCommand = function(name) {
        canon.getCommand(name).exec(editor);
    };

    // add key bindings
    var bindings = {
        startAutocompleter: "Ctrl-Space|Ctrl-.|Alt-.",
        execute: "Ctrl-Return",
		dirExecute: "Ctrl-Shift-Return",
        duplicate: "Ctrl-D",
		beautify: "Ctrl-Shift-B"
    };

    editor.autocompletionKeySet = new HashHandler({
        startAutocompleter: 'Ctrl-Space',
        complete: 'Return',
        completeAndReplace: 'Shift-Return',
        dotComplete: 'Ctrl-.|Alt-.',
        cancelCompletion: 'Esc',
        nextEntry: 'Down',
        previousEntry: 'Up'
    });

    // add commands
    editor.addCommands({
        startAutocompleter: function(editor) {
            startAcebugAutocompleter(editor);
        },
        toggleStreamComment: function() {
            // TODO: handle space in ' */' while toggling
            var range = editor.getSelection().getRange();

            if (range.isEmpty()) {
                range.start.column -= 2;
                range.end.column += 2;
                var session = editor.session,
                    text = session.getTextRange(range),
                    oi = text.indexOf('/*'),
                    ci = text.indexOf('*/');

                if (oi==0 && ci==2) {
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
                    if (startRange) {
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
        },

        clear: function() {
            editor.session.doc.setValue("");
        },

		beautify: function(editor){
			function a(){
				var session = editor.session
				var sel = session.selection
				var range = sel.getRange()
				
				var options = {};
				if (session.getUseSoftTabs()) {
					options.indent_size = session.getTabSize();
				} else {
					options.indent_char = "\t";
					options.indent_size = 1;
				}
				
				var line = session.getLine(range.start.row)
				var indent = line.match(/^\s*/)[0]
				if (range.start.column < indent.length) {
					var doNotTrim = true;
					range.start.column = 0
				}
				
				var value = session.getTextRange(range)
				var type = session.$mode.type
				if (/^\s*<!?\w/.test(value)) {
					var beautyfier = style_html
				} else if (
					type == "css" || (type == "html" && /{[\s-\w]+:[^}]+;/.test(value))
				) {
					var beautyfier = css_beautify
				} else {
					var beautyfier = js_beautify
				}
				
				value = beautyfier(value, options)
				value = value.replace(/^/gm, indent)
				if(!doNotTrim)
					value = value.trim()

				var end = session.replace(range, value);
				sel.setSelectionRange(Range.fromPoints(range.start, end));
			}
			if (window.js_beautify)
                a();
            else
                require(["res/beautify"], a);
        },
        uglify: function() {

        }
    });

    canon.addCommands([{
        name: "save",
        bindKey: {
            win: "Ctrl-S",
            mac: "Command-S",
        },
        exec: function(editor) {
			aceManager.saveFile(editor, "session")
        }
    }, {
        name: "save-as",
        bindKey: {
            win: "Ctrl-Shift-S",
            mac: "Command-Shift-S",
        },
        exec: function(editor) {
			aceManager.saveFile(editor, "picker")
        }
    }, {
        name: "load",
        bindKey: {
            win: "Ctrl-O",
            mac: "Command-O",
        },
        exec: function(editor) {
			aceManager.loadFile(editor)
        }
    }]);

 	/**************************** misc ***********************************************/
	canon.addCommand({
        name: "newCell",
        bindKey: {
            win: "Shift-Return",
            mac: "Shift-Return",
            sender: "editor"
        },
        exec: function(editor) {
			var editor = editor, session = editor.session
            var c = editor.getCursorPosition()
			if((c.column!=0 || c.row==0) && c.column != session.getLine(c.row).length)
				var addNewLine = true
				
			if (c.column==0)
				c1 = session.insert(c,'#>>')
			else
				c1 = session.insert(c,'\n#>>')

			if (addNewLine) {
				session.insert(c1,'\n')
				editor.selection.setSelectionRange({start:c1,end:c1})
			}
        }
    });
	

	function onGutterClick(e) {
		var s = editor.session;
		var className =  e.domEvent.target.className
		if (className.indexOf('ace_fold-widget') < 0) {
			if (className.indexOf("ace_gutter-cell") != -1 && editor.isFocused()) {
				var row = e.getDocumentPosition().row;
				s[s.$breakpoints[row]?'clearBreakpoint':'setBreakpoint'](row);
				e.stop()
			}
		}
	}
	editor.on('gutterclick', onGutterClick)

};
});