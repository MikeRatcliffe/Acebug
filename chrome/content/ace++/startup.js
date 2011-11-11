define('ace/keyboard/hash_handler', function(require, exports, module) {

var keyUtil  = require("ace/lib/keys");

function HashHandler(config) {
    this.setConfig(config);
}

(function() {
	function splitSafe(s, separator, limit, bLowerCase) {
        return s.toLowerCase().split('-');
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


/************************************************************************************/
define('ace/layer/gutter', function(require, exports, module) {
var dom = require("ace/lib/dom");

var Gutter = function(parentEl) {
    this.element = dom.createElement("div");
    this.element.className = "ace_layer ace_gutter-layer";
    parentEl.appendChild(this.element);

    this.$breakpoints = [];
    this.$annotations = [];
    this.$decorations = [];
};

(function() {

    this.setSession = function(session) {
        this.session = session;
    };

    this.addGutterDecoration = function(row, className){
        if (!this.$decorations[row])
            this.$decorations[row] = "";
        this.$decorations[row] += " ace_" + className;
    }

    this.removeGutterDecoration = function(row, className){
        this.$decorations[row] = this.$decorations[row].replace(" ace_" + className, "");
    };

    this.setBreakpoints = function(rows) {
    };

    this.setAnnotations = function(annotations) {
        // iterate over sparse array
        this.$annotations = [];
        for (var row in annotations) if (annotations.hasOwnProperty(row)) {
            var rowAnnotations = annotations[row];
            if (!rowAnnotations)
                continue;

            var rowInfo = this.$annotations[row] = {
                text: []
            };
            for (var i=0; i<rowAnnotations.length; i++) {
                var annotation = rowAnnotations[i];
                rowInfo.text.push(annotation.text.replace(/"/g, "&quot;").replace(/'/g, "&#8217;").replace(/</, "&lt;"));
                var type = annotation.type;
                if (type == "error")
                    rowInfo.className = "ace_error";
                else if (type == "warning" && rowInfo.className != "ace_error")
                    rowInfo.className = "ace_warning";
                else if (type == "info" && (!rowInfo.className))
                    rowInfo.className = "ace_info";
            }
        }
    };

    this.update = function(config) {
        this.$config = config;

        var emptyAnno = {className: "", text: []};
        var breakpoints = this.session.$breakpoints;
        var html = [];
        var i = config.firstRow;
        var lastRow = config.lastRow;
        var fold = this.session.getNextFoldLine(i);
        var foldStart = fold ? fold.start.row : Infinity;

        while (true) {
            if(i > foldStart) {
                i = fold.end.row + 1;
                fold = this.session.getNextFoldLine(i);
                foldStart = fold ?fold.start.row :Infinity;
            }
            if(i > lastRow)
                break;

            var annotation = this.$annotations[i] || emptyAnno;
            html.push("<div class='ace_gutter-cell",
                this.$decorations[i] || "",
                breakpoints[i] ? " ace_breakpoint " + breakpoints[i] : " ",
                annotation.className,
                "' title='", annotation.text.join("\n"),
                "' style='height:", config.lineHeight, "px;'>" 
				);
			if (this.session.isLineFoldable(i)){
				html.push(
					"<span class='ace_fold-widget ",
					i == foldStart?"closed":"open",
					"'>", i, "</span>"
				)
			} else
				html.push(i)

            var wrappedRowLength = this.session.getRowLength(i) - 1;
            while (wrappedRowLength--) {
                html.push("</div><div class='ace_gutter-cell' style='height:", config.lineHeight, "px'>&#166;");
            }

            html.push("</div>");

            i++;
        }
        this.element = dom.setInnerHtml(this.element, html.join(""));
        this.element.style.height = config.minHeight + "px";
    };

}).call(Gutter.prototype);

exports.Gutter = Gutter;

});


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

	function CStyleFolding() {
		this.isLineFoldable = function(row) {
			if (this.foldWidgets[row] != null)
				return this.foldWidgets[row]
			else {
				return this.foldWidgets[row] = this.getLine(row).search(/(\{|\[)\s*(\/\/.*)?$/) != -1 ||
					(this.getState(row).isHeader == 1 && row + 1 < env.editor.session.getLength())
			}
		}

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
				
				args[0] = range.start.row
				this.foldWidgets.splice.apply(this.foldWidgets, args);

                this.foldWidgets[range.end.row] = null;
            } else if (len < 0) {
                var rem = this.$breakpoints.splice(firstRow + 1, -len);
				
                if(!this.$breakpoints[firstRow]){
					for each(var oldBP in rem)
						if (oldBP){
							this.$breakpoints[firstRow] = oldBP
							break
						}
				}
				
                this.foldWidgets.splice(firstRow, -len);

                this.foldWidgets[range.start.row] = null;
			} else if (len == 0) {
				this.foldWidgets[range.start.row] = null;
			}
		}
		
		this.$init = function() {
			this.foldWidgets = [];
			this.doc.on('change', this.updateDataOnDocChange.bind(this));
		}
	};
	CStyleFolding.call(EditSession.prototype);
	
	/**************************** initialize ****************************************************/
    // fix event addCommandKeyListener
    event.addCommandKeyListener = function(el, callback) {
        var keys = require("ace/lib/keys");
        var lastKeyDownKeyCode = null;
        el.addEventListener("keydown", function(e) {
            lastKeyDownKeyCode = e.keyCode in keys.MODIFIER_KEYS? 0: e.keyCode;
        }, true);
        el.addEventListener("keypress", function(e) {
            return normalizeCommandKeys(callback, e, lastKeyDownKeyCode);
        }, true);
        function normalizeCommandKeys(callback, e, keyCode) {
            var hashId = 0 | (e.ctrlKey ? 1 : 0) | (e.altKey ? 2 : 0)
                    | (e.shiftKey ? 4 : 0) | (e.metaKey ? 8 : 0);

            // workaround for windows right alt bug
            if (keyCode==0 && e.type == "keypress")
                return callback(e, hashId, e.charCode);

            if (keyCode in keys.MODIFIER_KEYS) {
                switch (keys.MODIFIER_KEYS[keyCode]) {
                    case "Alt":
                        hashId = 2;
                        break;
                    case "Shift":
                        hashId = 4;
                        break
                    case "Ctrl":
                        hashId = 1;
                        break;
                    default:
                        hashId = 8;
                        break;
                }
                keyCode = 0;
            }

            if (hashId & 8 && (keyCode == 91 || keyCode == 93)) {
                keyCode = 0;
            }

            // If there is no hashID and the keyCode is not a function key, then
            // we don't call the callback as we don't handle a command key here
            // (it's a normal key/character input).
            if (hashId == 0 && !(keyCode in keys.FUNCTION_KEYS)) {
                return false;
            }

            return callback(e, hashId, keyCode);
        }
    };

	// global functions
    toggleGutter = function() {
        editor.renderer.setShowGutter(!env.editor.renderer.showGutter);
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
			name = "ace/mode/"+name
			if(!this[name])
				try{
					var Mode = require(name).Mode
					delete Mode.prototype.createWorker
					this[name] = new Mode()
				}catch(e){}
			
			return this[name]
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
	require("ace/layer/text").Text.prototype.$pollSizeChanges=function(){}
	Editor.prototype.setFontSize= function(size){
		this.container.style.fontSize = size
		this.renderer.$textLayer.checkForSizeChanges()
	}
	// selection on first/last lines
	Renderer.prototype.screenToTextCoordinates = function(pageX, pageY) {
        var canvasPos = this.scroller.getBoundingClientRect();

        var col = Math.round((pageX + this.scroller.scrollLeft - canvasPos.left - this.$padding - window.pageYOffset)
                / this.characterWidth);
        var row = Math.floor((pageY + this.scrollTop - canvasPos.top - window.pageYOffset)
                / this.lineHeight);
		if(row<0)
			row=0
		else {
			var maxRow = this.layerConfig.maxHeight/this.layerConfig.lineHeight-1
			if(row> maxRow)
				row = maxRow
		}
		
        return this.session.screenToDocumentPosition(row, Math.max(col, 0));
    };

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
        canon.getCommand(name).exec(env);
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

		beautify: function(){
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
				if(range.start.column<indent.length){
					var doNotTrim = true;
					range.start.column = 0
				}
				var value = session.getTextRange(range)
				value = (/^\s*<!?\w/.test(value)? style_html :js_beautify)(value, options)
				value = value.replace(/^/gm, indent)
				if(!doNotTrim)
					value = value.trim()

				var end = session.replace(range, value);
				sel.setSelectionRange(Range.fromPoints(range.start, end));
			}
			if (window.js_beautify)
                a();
            else
                require(["res/beautify","res/beautify-html"], a);
        },
        uglify: function() {

        }
    });

    var com = canon.getCommand('removeline')
    com.bindKey.win = com.bindKey.mac = 'Alt-D'
    //canon.removeCommand('removeline')
    canon.addCommand(com)

    canon.addCommand({
        name: "save",
        bindKey: {
            win: "Ctrl-S",
            mac: "Command-S",
            sender: "editor"
        },
        exec: function(env) {
			aceManager.saveFile(env.editor, "session")
        }
    });
    canon.addCommand({
        name: "save",
        bindKey: {
            win: "Ctrl-Shift-S",
            mac: "Command-Shift-S",
            sender: "editor"
        },
        exec: function(env) {
			aceManager.saveFile(env.editor, "picker")
        }
    });
	canon.addCommand({
        name: "load",
        bindKey: {
            win: "Ctrl-O",
            mac: "Command-O",
            sender: "editor"
        },
        exec: function(env) {
			aceManager.loadFile(env.editor)
        }
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
	

	function onGutterClick(e) {
		var editor = env.editor, s = editor.session, row = e.row;
		var className =  e.htmlEvent.target.className
		if (className.indexOf('ace_fold-widget') < 0) {
			if(className.indexOf("ace_gutter-cell") != -1 && editor.isFocused())
				s[s.$breakpoints[row]?'clearBreakpoint':'setBreakpoint'](row);
		} else {
			var line = s.getLine(row)
			var match = line.match(/(\{|\[)\s*(\/\/.*)?$/)
			if (match) {
				var i = match.index
				var fold = s.getFoldAt(row, i+1, 1)
				if (fold) {
					s.expandFold(fold)
					//editor.renderer.scrollCursorIntoView()
					//editor.renderer.scrollToRow(row)
				} else {
					var start = {row:row,column:i+1}
					var end = s.$findClosingBracket(match[1], start)
					if (end)
						s.addFold("...", Range.fromPoints(start, end));
				}
				return
			}
			var mode = s.$mode
			if (!mode.delimiter)
				return

			if (line.substr(0, mode.dl) == mode.delimiter) {
				var fold = s.getFoldAt(row, 0, 1)
				if (!fold){
					var foldLine = s.getFoldLine(row);
					if(foldLine && foldLine.start.row != foldLine.end.row) {
						s.expandFolds(foldLine.folds)
						return
					}
				}
				
				if (fold) {
					s.expandFold(fold)
					//editor.renderer.scrollCursorIntoView()
				} else {
					var cell = mode.getCellBounds(row)
					var start = {row: row, column: 0};
					var end = {row: cell.bodyEnd, column: s.getLine(cell.bodyEnd).length};
					var placeholder = s.getLine(cell.headerStart).slice(0,10) + "=====================";
					s.addFold(placeholder, Range.fromPoints(start, end));
				}
				return
			}
		}
	}
	env.editor.renderer.on('gutterclick', onGutterClick)

};
});