define('ace/keyboard/hash_handler', function(require, exports, module) {

var keyUtil  = require("pilot/keys");

function HashHandler(config) {
    this.setConfig(config);
}

(function() {
    function splitSafe(s, separator, limit, bLowerCase) {
        return (bLowerCase && s.toLowerCase() || s)
            .replace(/(?:^\s+|\n|\s+$)/g, "")
            .split(new RegExp("[\\s ]*" + separator + "[\\s ]*", "g"), limit || 999);
    }

    function parseKeys(keys, val, ret) {
        var key,
            hashId = 0,
            parts  = splitSafe(keys, "\\-", null, true),
            i      = 0,
            l      = parts.length;

        for (; i < l; ++i) {
            if (keyUtil.KEY_MODS[parts[i]])
                hashId = hashId | keyUtil.KEY_MODS[parts[i]];
            else
                key = parts[i] || "-"; //when empty, the splitSafe removed a '-'
        }

        (ret[hashId] || (ret[hashId] = {}))[key] = val;
        return ret;
    }

    function objectReverse(obj, keySplit) {
        var i, j, l, key,
            ret = {};
        for (i in obj) {
            key = obj[i];
            if (keySplit && typeof key == "string") {
                key = key.split(keySplit);
                for (j = 0, l = key.length; j < l; ++j)
                    parseKeys.call(this, key[j], i, ret);
            }
            else {
                parseKeys.call(this, key, i, ret);
            }
        }
        return ret;
    }

    this.setConfig = function(config) {
        this.$config = config;
        if (typeof this.$config.reverse == "undefined")
            this.$config.reverse = objectReverse.call(this, this.$config, "|");
    };

    /**
     * This function is called by keyBinding.
     */
    this.handleKeyboard = function(data, hashId, textOrKey, keyCode) {
        // Figure out if a commandKey was pressed or just some text was insert.
        if (hashId != 0 || keyCode != 0) {
            return {
                command: (this.$config.reverse[hashId] || {})[textOrKey]
            }
        } else {
            return {
                command: "inserttext",
                args: {
                    text: textOrKey
                }
            }
        }
    }
}).call(HashHandler.prototype);

exports.HashHandler = HashHandler;
});


define('fbace/startup', function(require, exports, module) {

exports.launch = function(env, options) {
    // requires
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;

    Range = require("ace/range").Range;

    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;

    CSSMode = require("ace/mode/css").Mode;
    HTMLMode = require("ace/mode/html").Mode;
    XMLMode = require("ace/mode/xml").Mode;
	JSMode = require("ace/mode/javascript").Mode;

	var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
	var Search = require("ace/search").Search;	
	
	
	/**************************** breakpoint handler *********************************************/

	function CStyleFolding(){
		this.isLineFoldable = function(row) {
			return this.getLine(row).search(/(\{|\[)\s*(\/\/.*)?$/) != -1 ||
					this.getState(row).isHeader==1
			
			editor.session.getState(i).isHeader
			if (!this.foldWidgets)
				this.foldWidgets = []
			if (this.foldWidgets[row] != null)
				return this.foldWidgets[row]
			else
				return this.foldWidgets[row] = !!this.getLine(row).match(/(\{|\[)\s*(\/\/.*)?$/)		
		}

		this.setBreakpoints = function(rows) {
			this.$breakpoints = [];
			for (var i=0; i<rows.length; i++) {
				this.$breakpoints[rows[i]] = true;
			}
			this.$lastBreakpoint = this.$breakpoints.lastIndexOf(true);
			this._dispatchEvent("changeBreakpoint", {});
		};

		this.clearBreakpoints = function() {
			this.$breakpoints = [];
			this.$breakpoints.last = 0;
			this._dispatchEvent("changeBreakpoint", {});
		};

		this.setBreakpoint = function(row) {
			this.$breakpoints[row] = true;
			this.$breakpoints.last = this.$breakpoints.lastIndexOf(true);
			this._dispatchEvent("changeBreakpoint", {});
		};

		this.clearBreakpoint = function(row) {
			delete this.$breakpoints[row];
			this.$breakpoints.last = this.$breakpoints.lastIndexOf(true);
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

		this.updateDataOnDocChange = function(e){
			ert=e
			console.log(ert.data)
		}
	};
	CStyleFolding.call(EditSession.prototype);
	
	/**************************** initialize ****************************************************/
	
	// global functions
    toggleGutter = function() {
        editor.renderer.setShowGutter(!env.editor.renderer.showGutter);
    };
	getExtension = function(name, mime) {
		if(mime) return (mime.toLowerCase().match(/(xml|html?|css|jsm?|xul|rdf)/i)||[,'js'])[1]
		return (name.match(/.(xml|html?|css|jsm?|xul|rdf)($|\?|\#)/i)||[,'js'])[1]
	};
	getMode = function(ext) {
		if("xml|html|xul|rdf".indexOf(ext)!=-1)return HTMLMode
		if("css".indexOf(ext)!=-1)return CSSMode
		if("jsm".indexOf(ext)!=-1)return JSMode
		// default
		return JSMode
	};
	createSession = function(value, name, mimeType) {
		var s = new EditSession(value);
		s.setFileInfo(name.toLowerCase(), mimeType);
		s.setMode(new (getMode(s.extension)));
		s.setUndoManager(new UndoManager());

		s.setUseSoftTabs(options.softtabs);
		s.setUseWrapMode(options.wordwrap);
		s.setTabSize(options.tabsize);
		s.setWrapLimitRange(null, null);
		
		//hack to support folding
		s.doc.on('change', s.updateDataOnDocChange)

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
	require("ace/layer/text").Text.prototype.$pollSizeChanges=function(){}

    var container = document.getElementById("editor");
    editor = env.editor = new Editor(new Renderer(container, options.theme));
    editor.setTheme(options.theme);
    editor.setSession(jsDoc);

    editor.setShowInvisibles(options.showinvisiblecharacters);
    editor.setHighlightActiveLine(options.highlightactiveline);
    editor.setShowPrintMargin(false);
    editor.setHighlightSelectedWord(options.highlightselectedword);
    editor.session.setUseWorker(options.validateasyoutype);
    editor.renderer.setHScrollBarAlwaysVisible(false);

    // not needed in acebug
    editor.textInput.onContextMenu = function() {};
    // don't let firebug's commandLinePopup to interfere
    editor.textInput.getElement().classList.add("textEditorInner");

    function onResize() {
        editor.resize();
    }
    window.onresize = onResize;
    onResize();

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
    env.canon = canon = require("pilot/canon");

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
        canon.getCommand(name).exec(env);
    };

    // add key bindings
    var bindings = {
        startAutocompleter: "Ctrl-Space|Ctrl-.|Alt-.",
        execute: "Ctrl-Return",
		dirExecute: "Ctrl-Shift-Return",
        duplicate: "Ctrl-D|Alt-D"
    };

    editor.autocompletionKeySet = new HashHandler({
        startAutocompleter: 'Ctrl-Space',
        complete: 'Return',
        dotComplete: 'Ctrl-.|Alt-.',
        cancelCompletion: 'Esc',
        nextEntry: 'Down',
        previousEntry: 'Up'
    });

    // add commands
    editor.addCommands({
        duplicate: function(env, args, request) {
            var editor = env.editor;
            var sel = editor.selection;
            var doc = editor.session;
            var range = sel.getRange();
            if (range.isEmpty()) {
                var row = range.start.row;
                doc.duplicateLines(row, row);
                //ed.copyLinesDown();
            } else {
                doc.insert(sel.selectionLead, doc.getTextRange(range), false);
            }
        },
        startAutocompleter: function(env, args, request) {
            var editor = env.editor;
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
    });
 
 	/**************************** folding commands ***********************************************/
	canon.addCommand({
        name: "newCell",
        bindKey: {
            win: "Shift-Return",
            mac: "Shift-Return",
            sender: "editor"
        },
        exec: function(env) {
			var editor = env.editor, session = editor.session
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
	
	canon.addCommand({
        name: "fold",
        bindKey: {
            win: "Alt-L",
            mac: "Alt-L",
            sender: "editor"
        },
        exec: function(env) {
            toggleFold(env, false)
        }
    });

    canon.addCommand({
        name: "unfold",
        bindKey: {
            win: "Alt-Shift-L",
            mac: "Alt-Shift-L",
            sender: "editor"
        },
        exec: function(env) {
            toggleFold(env, true)
        }
    });

    function isCommentRow(row) {
        var session = env.editor.session;
        var token;
        var tokens = session.getTokens(row, row)[0].tokens;
        var c = 0;
        for (var i = 0; i < tokens.length; i++) {
            token = tokens[i];
            if (/^comment/.test(token.type)) {
                return c;
            } else if (!/^text/.test(token.type)) {
                return false;
            }
            c += token.value.length;
        }
        return false;
    };

    function toggleFold(env, tryToUnfold) {
        var session = env.editor.session;
        var selection = env.editor.selection;
        var range = selection.getRange();
        var addFold;

        if(range.isEmpty()) {
            var br = session.findMatchingBracket(range.start);
            var fold = session.getFoldAt(range.start.row, range.start.column);
            var column;

            if(fold) {
                session.expandFold(fold);
                selection.setSelectionRange(fold.range)
            } else if(br) {
                if(range.compare(br.row,br.column) == 1)
                    range.end = br;
                else
                    range.start = br;
                addFold = true;
            } else if ((column = isCommentRow(range.start.row)) !== false) {
                var firstCommentRow = range.start.row;
                var lastCommentRow = range.start.row;
                var t;
                while ((t = isCommentRow(firstCommentRow - 1)) !== false) {
                    firstCommentRow --;
                    column = t;
                }
                while (isCommentRow(lastCommentRow + 1) !== false) {
                    lastCommentRow ++;
                }
                range.start.row = firstCommentRow;
                range.start.column = column + 2;
                range.end.row = lastCommentRow;
                range.end.column = session.getLine(lastCommentRow).length - 1;
                addFold = true;
            }
        } else {
            var folds = session.getFoldsInRange(range);
            if(tryToUnfold && folds.length)
                session.expandFolds(folds);
            else if(folds.length == 1 ) {
                var r1 = folds[0].range
                if (r1.start.row == range.start.row &&
                      r1.end.row ==  range.end.row &&
                      r1.start.column == range.start.column &&
                      r1.end.column == range.end.column)
                    session.expandFold(folds[0]);
                else
                    addFold = true;
            } else
                addFold = true;
        }
        if(addFold) {
            var placeHolder = session.getTextRange(range);
            if(placeHolder.length < 3)
                return;
            placeHolder = placeHolder.trim().substring(0, 3).replace(' ','','g') + "...";
            session.addFold(placeHolder, range);
        }
    }

	function onGutterClick(e) {
		var editor = env.editor, s = editor.session, row = e.row;
		if (e.htmlEvent.target.className.indexOf('ace_fold-widget') < 0)
			s[s.$breakpoints[e.row]?'clearBreakpoint':'setBreakpoint'](row);
		else {
			var line = s.getLine(row)
			var match = line.match(/(\{|\[)\s*(\/\/.*)?$/)
			if (match) {
				var i = match.index
				var fold = s.getFoldAt(row, i+1, 1)
				if (fold) {
					s.expandFold(fold)
				} else {
					var start = {row:row,column:i+1}
					var end = s.$findClosingBracket(match[1], start)
					if(end)
						s.addFold("...", Range.fromPoints(start, end));
				}
			}
		}
	}
	env.editor.renderer.on('gutterclick',onGutterClick)

};
});
