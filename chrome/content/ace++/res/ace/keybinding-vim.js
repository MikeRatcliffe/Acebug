define("ace/keyboard/vim",[], function(require, exports, module) {

"never use strict";

var commands = require("ace/keyboard/vim/commands");
var util = require("ace/keyboard/vim/maps/util");

exports.handler = require("ace/keyboard/vim/keyboard").handler;

exports.onCursorMove = function(e) {
    commands.onCursorMove(e.editor);
    exports.onCursorMove.scheduled = false;
};

exports.handler.attach = function(editor) {
    editor.on("click", exports.onCursorMove);
    if (util.currentMode !== "insert")
        commands.coreCommands.stop.exec(editor);
};

exports.handler.detach = function(editor) {
    editor.removeListener("click", exports.onCursorMove);
    commands.coreCommands.start.exec(editor);
    util.currentMode = "normal";
};

});

define("ace/keyboard/vim/commands",[], function(require, exports, module) {

"never use strict";

var util = require("ace/keyboard/vim/maps/util");
var motions = require("ace/keyboard/vim/maps/motions");
var operators = require("ace/keyboard/vim/maps/operators");
var alias = require("ace/keyboard/vim/maps/aliases");
var registers = require("ace/keyboard/vim/registers");

var NUMBER   = 1;
var OPERATOR = 2;
var MOTION   = 3;
var ACTION   = 4;

//var NORMAL_MODE = 0;
//var INSERT_MODE = 1;
//var VISUAL_MODE = 2;
//getSelectionLead

exports.searchStore = {
    current: "",
    options: {
        needle: "",
        backwards: false,
        wrap: true,
        caseSensitive: false,
        wholeWord: false,
        regExp: false
    }
};

var repeat = function repeat(fn, count, args) {
    count = parseInt(count);
    while (0 < count--)
        fn.apply(this, args);
};

var actions = {
    "z": {
        param: true,
        fn: function(editor, range, count, param) {
            switch (param) {
                case "z":
                    editor.centerSelection();
                    break;
                case "t":
                    editor.scrollToRow(editor.getCursorPosition().row);
                    break;
            }
        }
    },
    "r": {
        param: true,
        fn: function(editor, range, count, param) {
            param = util.toRealChar(param);
            if (param && param.length) {
                repeat(function() { editor.insert(param); }, count || 1);
                editor.navigateLeft();
            }
        }
    },
    // "~" HACK
    "shift-`": {
        fn: function(editor, range, count) {
            repeat(function() {
                var pos = editor.getCursorPosition();
                var line = editor.session.getLine(pos.row);
                var ch = line[pos.column];
                editor.insert(toggleCase(ch));
            }, count || 1);
        }
    },
    "*": {
        fn: function(editor, range, count, param) {
            editor.selection.selectWord();
            editor.findNext();
            var cursor = editor.selection.getCursor();
            var range  = editor.session.getWordRange(cursor.row, cursor.column);
            editor.selection.setSelectionRange(range, true);
        }
    },
    "#": {
        fn: function(editor, range, count, param) {
            editor.selection.selectWord();
            editor.findPrevious();
            var cursor = editor.selection.getCursor();
            var range  = editor.session.getWordRange(cursor.row, cursor.column);
            editor.selection.setSelectionRange(range, true);
        }
    },
    "n": {
        fn: function(editor, range, count, param) {
            editor.findNext(editor.getLastSearchOptions());
            editor.selection.clearSelection();
            //editor.navigateWordLeft();
        }
    },
    "shift-n": {
        fn: function(editor, range, count, param) {
            editor.findPrevious(editor.getLastSearchOptions());
            editor.selection.clearSelection();
            //editor.navigateWordLeft();
        }
    },
    "v": {
        fn: function(editor, range, count, param) {
            editor.selection.selectRight();
            util.onVisualMode = true;
            util.onVisualLineMode = false;
            var cursor = document.getElementsByClassName("ace_cursor")[0];
            cursor.style.display = "none";
        }
    },
    "shift-v": {
        fn: function(editor, range, count, param) {
            util.onVisualLineMode = true;
            //editor.selection.selectLine();
            //editor.selection.selectLeft();
            var row = editor.getCursorPosition().row;
            editor.selection.clearSelection();
            editor.selection.moveCursorTo(row, 0);
            editor.selection.selectLineEnd();
            editor.selection.visualLineStart = row;
        }
    },
    "shift-y": {
        fn: function(editor, range, count, param) {
            util.copyLine(editor);
        }
    },
    "p": {
        fn: function(editor, range, count, param) {
            var defaultReg = registers._default;

            editor.setOverwrite(false);
            if (defaultReg.isLine) {
                var pos = editor.getCursorPosition();
                var lines = defaultReg.text.split("\n");
                editor.session.getDocument().insertLines(pos.row + 1, lines);
                editor.moveCursorTo(pos.row + 1, 0);
            }
            else {
                editor.navigateRight();
                editor.insert(defaultReg.text);
                editor.navigateLeft();
            }
            editor.setOverwrite(true);
            editor.selection.clearSelection();
        }
    },
    "shift-p": {
        fn: function(editor, range, count, param) {
            var defaultReg = registers._default;
            editor.setOverwrite(false);

            if (defaultReg.isLine) {
                var pos = editor.getCursorPosition();
                var lines = defaultReg.text.split("\n");
                editor.session.getDocument().insertLines(pos.row, lines);
                editor.moveCursorTo(pos.row, 0);
            }
            else {
                editor.insert(defaultReg.text);
            }
            editor.setOverwrite(true);
            editor.selection.clearSelection();
        }
    },
    "shift-j": {
        fn: function(editor, range, count, param) {
            var pos = editor.getCursorPosition();

            if (editor.session.getLength() === pos.row + 1)
                return;

            var nextLine = editor.session.getLine(pos.row + 1);
            var cleanLine = /^\s*(.*)$/.exec(nextLine)[1];

            editor.navigateDown();
            editor.removeLines();

            if (editor.session.getLength() > editor.getCursorPosition().row + 1)
                editor.navigateUp();

            editor.navigateLineEnd();
            editor.insert(" " + (cleanLine || ""));
            editor.moveCursorTo(pos.row, pos.column);

        }
    },
    "u": {
        fn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            for (var i = 0; i < count; i++) {
                editor.undo();
            }
            editor.selection.clearSelection();
        }
    },
    "ctrl-r": {
        fn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            for (var i = 0; i < count; i++) {
                editor.redo();
            }
            editor.selection.clearSelection();
        }
    },
    ":": {
        fn: function(editor, range, count, param) {
            editor.blur();
            txtConsoleInput.focus();
            txtConsoleInput.setValue(":");
        }
    },
    "/": {
        fn: function(editor, range, count, param) {
            editor.blur();
            txtConsoleInput.focus();
            txtConsoleInput.setValue("/");
        }
    },
    ".": {
        fn: function(editor, range, count, param) {
            var previous = inputBuffer.previous;
            util.onInsertReplaySequence = inputBuffer.lastInsertCommands;
            inputBuffer.exec(editor, previous.action, previous.param);
        }
    }
};

var inputBuffer = exports.inputBuffer = {
    accepting: [NUMBER, OPERATOR, MOTION, ACTION],
    currentCmd: null,
    //currentMode: 0,
    currentCount: "",

    // Types
    operator: null,
    motion: null,

    lastInsertCommands: [],

    push: function(editor, char, keyId) {
        if (char && char.length > 1) { // There is a modifier key
            if (!char[char.length - 1].match(/[A-za-z]/) && keyId) // It is a letter
                char = keyId;
        }

        this.idle = false;
        var wObj = this.waitingForParam;
        if (wObj) {
            this.exec(editor, wObj, char);
        }
        // If input is a number (that doesn't start with 0)
        else if (!(char === "0" && !this.currentCount.length) &&
            (char.match(/^\d+$/) && this.isAccepting(NUMBER))) {
            // Assuming that char is always of type String, and not Number
            this.currentCount += char;
            this.currentCmd = NUMBER;
            this.accepting = [NUMBER, OPERATOR, MOTION, ACTION];
        }
        else if (!this.operator && this.isAccepting(OPERATOR) && operators[char]) {
            this.operator = {
                char: char,
                count: this.getCount()
            };
            this.currentCmd = OPERATOR;
            this.accepting = [NUMBER, MOTION, ACTION];
            this.exec(editor, { operator: this.operator });
        }
        else if (motions[char] && this.isAccepting(MOTION)) {
            this.currentCmd = MOTION;

            var ctx = {
                operator: this.operator,
                motion: {
                    char: char,
                    count: this.getCount()
                }
            };

            if (motions[char].param)
                this.waitForParam(ctx);
            else
                this.exec(editor, ctx);
        }
        else if (alias[char] && this.isAccepting(MOTION)) {
            alias[char].operator.count = this.getCount();
            this.exec(editor, alias[char]);
        }
        else if (actions[char] && this.isAccepting(ACTION)) {
            var actionObj = {
                action: {
                    fn: actions[char].fn,
                    count: this.getCount()
                }
            };

            if (actions[char].param) {
                this.waitForParam(actionObj);
            }
            else {
                this.exec(editor, actionObj);
            }
        }
        else if (this.operator) {
            this.exec(editor, { operator: this.operator }, char);
        }
        else {
            this.reset();
        }
    },

    waitForParam: function(cmd) {
        this.waitingForParam = cmd;
    },

    getCount: function() {
        var count = this.currentCount;
        this.currentCount = "";
        return count;
    },

    exec: function(editor, action, param) {
        var m = action.motion;
        var o = action.operator;
        var a = action.action;

        if(o) {
            this.previous = {
                action: action,
                param: param
            };
        }

        if (o && !editor.selection.isEmpty()) {
            if (operators[o.char].selFn) {
                operators[o.char].selFn(editor, editor.getSelectionRange(), o.count, param);
                this.reset();
            }
            return;
        }

        // There is an operator, but no motion or action. We try to pass the
        // current char to the operator to see if it responds to it (an example
        // of this is the 'dd' operator).
        else if (!m && !a && o && param) {
            operators[o.char].fn(editor, null, o.count, param);
            this.reset();
        }
        else if (m) {
            var run = function(fn) {
                if (fn && typeof fn === "function") { // There should always be a motion
                    if (m.count)
                        repeat(fn, m.count, [editor, null, m.count, param]);
                    else
                        fn(editor, null, m.count, param);
                }
            };

            var motionObj = motions[m.char];
            var selectable = motionObj.sel;

            if (!o) {
                if ((util.onVisualMode || util.onVisualLineMode) && selectable)
                    run(motionObj.sel);
                else
                    run(motionObj.nav);
            }
            else if (selectable) {
                repeat(function() {
                    run(motionObj.sel);
                    operators[o.char].fn(editor, editor.getSelectionRange(), o.count, param);
                }, o.count || 1);
            }
            this.reset();
        }
        else if (a) {
            a.fn(editor, editor.getSelectionRange(), a.count, param);
            this.reset();
        }
        handleCursorMove(editor);
    },

    isAccepting: function(type) {
        return this.accepting.indexOf(type) !== -1;
    },

    reset: function() {
        this.operator = null;
        this.motion = null;
        this.currentCount = "";
        this.accepting = [NUMBER, OPERATOR, MOTION, ACTION];
        this.idle = true;
        this.waitingForParam = null;
    }
};

function setPreviousCommand(fn) {
    inputBuffer.previous = { action: { action: { fn: fn } } };
}

exports.coreCommands = {
    start: {
        exec: function start(editor) {
            util.insertMode(editor);
            setPreviousCommand(start);
        }
    },
    startBeginning: {
        exec: function startBeginning(editor) {
            editor.navigateLineStart();
            util.insertMode(editor);
            setPreviousCommand(startBeginning);
        }
    },
    // Stop Insert mode as soon as possible. Works like typing <Esc> in
    // insert mode.
    stop: {
        exec: function stop(editor) {
            inputBuffer.reset();
            util.onVisualMode = false;
            util.onVisualLineMode = false;
            inputBuffer.lastInsertCommands = util.normalMode(editor);
        }
    },
    append: {
        exec: function append(editor) {
            var pos = editor.getCursorPosition();
            var lineLen = editor.session.getLine(pos.row).length;
            if (lineLen)
                editor.navigateRight();
            util.insertMode(editor);
            setPreviousCommand(append);
        }
    },
    appendEnd: {
        exec: function appendEnd(editor) {
            editor.navigateLineEnd();
            util.insertMode(editor);
            setPreviousCommand(appendEnd);
        }
    },
    builder: {
        exec: function builder(editor) {}
    }
};

var handleCursorMove = exports.onCursorMove = function(editor) {
    if(util.currentMode === 'insert' || handleCursorMove.running)
        return;
    else if(!editor.selection.isEmpty()) {
        handleCursorMove.running = true;
        if(util.onVisualLineMode) {
            var originRow = editor.selection.visualLineStart;
            var cursorRow = editor.getCursorPosition().row;
            if(originRow <= cursorRow) {
                var endLine = editor.session.getLine(cursorRow);
                editor.selection.clearSelection();
                editor.selection.moveCursorTo(originRow, 0);
                editor.selection.selectTo(cursorRow, endLine.length);
            } else {
                var endLine = editor.session.getLine(originRow);
                editor.selection.clearSelection();
                editor.selection.moveCursorTo(originRow, endLine.length);
                editor.selection.selectTo(cursorRow, 0);
            }
        }
        handleCursorMove.running = false;
        return;
    }
    else {
        handleCursorMove.running = true;
        var pos = editor.getCursorPosition();
        var lineLen = editor.session.getLine(pos.row).length;

        if (lineLen && pos.column === lineLen)
            editor.navigateLeft();
        handleCursorMove.running = false;
    }
};

function toggleCase(ch) {
    if(ch.toUpperCase() === ch)
        return ch.toLowerCase();
    else
        return ch.toUpperCase();
}

});

define("ace/keyboard/vim/maps/util",[], function(require, exports, module) {
var registers = require("ace/keyboard/vim/registers");

module.exports = {
    onVisualMode: false,
    onVisualLineMode: false,
    currentMode: 'normal',
    insertMode: function(editor) {
        var _self = this;
        var theme = editor && editor.getTheme() || "ace/theme/textmate";

        require(["require", theme], function (require) {
            var isDarkTheme = require(theme).isDark;

            _self.currentMode = 'insert';
            // Switch editor to insert mode
            editor.unsetStyle('insert-mode');

            var cursor = document.getElementsByClassName("ace_cursor")[0];
            if (cursor) {
                cursor.style.display = null;
                cursor.style.backgroundColor = null;
                cursor.style.opacity = null;
                cursor.style.border = null;
                cursor.style.borderLeftColor = isDarkTheme? "#eeeeee" : "#333333";
                cursor.style.borderLeftStyle = "solid";
                cursor.style.borderLeftWidth = "2px";
            }

            editor.setOverwrite(false);
            editor.keyBinding.$data.buffer = "";
            editor.keyBinding.$data.state = "insertMode";
            _self.onVisualMode = false;
            _self.onVisualLineMode = false;
            if(_self.onInsertReplaySequence) {
                // Ok, we're apparently replaying ("."), so let's do it
                editor.commands.macro = _self.onInsertReplaySequence;
                editor.commands.replay(editor);
                _self.onInsertReplaySequence = null;
                _self.normalMode(editor);
            } else {
                // Record any movements, insertions in insert mode
                if(!editor.commands.recording)
                    editor.commands.toggleRecording();
            }
        });
    },
    normalMode: function(editor) {
        // Switch editor to normal mode
        this.currentMode = 'normal';

        editor.setStyle('normal-mode');
        editor.clearSelection();

        var cursor = document.getElementsByClassName("ace_cursor")[0];
        if (cursor) {
            cursor.style.display = null;
            cursor.style.backgroundColor = "red";
            cursor.style.opacity = ".5";
            cursor.style.border = "0";
        }

        var pos;
        if (!editor.getOverwrite()) {
            pos = editor.getCursorPosition();
            if (pos.column > 0)
                editor.navigateLeft();
        }
        editor.setOverwrite(true);
        editor.keyBinding.$data.buffer = "";
        editor.keyBinding.$data.state = "start";
        this.onVisualMode = false;
        this.onVisualLineMode = false;
        // Save recorded keystrokes
        if(editor.commands.recording) {
            editor.commands.toggleRecording();
            return editor.commands.macro;
        }
        else {
            return [];
        }
    },
    getRightNthChar: function(editor, cursor, char, n) {
        var line = editor.getSession().getLine(cursor.row);
        var matches = line.substr(cursor.column + 1).split(char);

        return n < matches.length ? matches.slice(0, n).join(char).length : 0;
    },
    getLeftNthChar: function(editor, cursor, char, n) {
        var line = editor.getSession().getLine(cursor.row);
        var matches = line.substr(0, cursor.column + 1).split(char);

        return n < matches.length ? matches.slice(-1 * n).join(char).length + 1: 0;
    },
    toRealChar: function(char) {
        if (char.length === 1)
            return char;

        if (/^shift-./.test(char))
            return char[char.length - 1].toUpperCase();
        else
            return "";
    },
    copyLine: function(editor) {
        var pos = editor.getCursorPosition();
        editor.selection.clearSelection();
        editor.moveCursorTo(pos.row, pos.column);
        editor.selection.selectLine();
        registers._default.isLine = true;
        registers._default.text = editor.getCopyText().replace(/\n$/, "");
        editor.selection.clearSelection();
        editor.moveCursorTo(pos.row, pos.column);
    }
};
});

define("ace/keyboard/vim/keyboard",[], function(require, exports, module) {

"never use strict";

var StateHandler = require("ace/keyboard/state_handler").StateHandler;
var cmds = require("ace/keyboard/vim/commands");
var coreCommands = cmds.coreCommands;

var matchChar = function(buffer, hashId, key, symbolicName, keyId) {
    // If no command keys are pressed, then catch the input.
    // If only the shift key is pressed and a character key, then
    // catch that input as well.
    // Otherwise, we let the input got through.
    var matched = ((hashId === 0) || (((hashId === 1) || (hashId === 4)) && key.length === 1));
    //console.log("INFO", arguments)

    if (matched) {
        if (keyId) {
            keyId = String.fromCharCode(parseInt(keyId.replace("U+", "0x"), 10));
        }

        coreCommands.builder.exec = function(editor) {
            cmds.inputBuffer.push.call(cmds.inputBuffer, editor, symbolicName, keyId);
        }
    }
    return matched;
};

var inIdleState = function() {
    if (cmds.inputBuffer.idle) {
        return true;
    }
    return false;
};

var states = exports.states = {
    start: [ // normal mode
        {
            key: "esc",
            exec: coreCommands.stop,
            then: "start"
        },
        {
            regex: "^i$",
            match: inIdleState,
            exec: coreCommands.start,
            then: "insertMode"
        },
        {
            regex: "^shift-i$",
            match: inIdleState,
            exec: coreCommands.startBeginning,
            then: "insertMode"
        },
        {
            regex: "^a$",
            match: inIdleState,
            exec: coreCommands.append,
            then: "insertMode"
        },
        {
            regex: "^shift-a$",
            match: inIdleState,
            exec: coreCommands.appendEnd,
            then: "insertMode"
        },
        {
            // The rest of input will be processed here
            match: matchChar,
            exec: coreCommands.builder
        }
    ],
    insertMode: [
        {
            key: "esc",
            exec: coreCommands.stop,
            then: "start"
        },
        {
            key: "backspace",
            exec: "backspace"
        }
    ]
};

exports.handler = new StateHandler(states);
});

"never use strict"

define("ace/keyboard/vim/maps/motions",[], function(require, exports, module) {

var util = require("ace/keyboard/vim/maps/util");

var keepScrollPosition = function(editor, fn) {
    var scrollTopRow = editor.renderer.getScrollTopRow();
    var initialRow = editor.getCursorPosition().row;
    var diff = initialRow - scrollTopRow;
    fn && fn.call(editor);
    editor.renderer.scrollToRow(editor.getCursorPosition().row - diff);
};

module.exports = {
    "w": {
        nav: function(editor) {
            editor.navigateWordRight();
        },
        sel: function(editor) {
            editor.selection.selectWordRight();
        }
    },
    "b": {
        nav: function(editor) {
            editor.navigateWordLeft();
        },
        sel: function(editor) {
            editor.selection.selectWordLeft();
        }
    },
    "l": {
        nav: function(editor) {
            editor.navigateRight();
        },
        sel: function(editor) {
            var pos = editor.getCursorPosition();
            var col = pos.column;
            var lineLen = editor.session.getLine(pos.row).length;

            // Solving the behavior at the end of the line due to the
            // different 0 index-based colum positions in ACE.
            if (lineLen && col !== lineLen) //In selection mode you can select the newline
                editor.selection.selectRight();
        }
    },
    "h": {
        nav: function(editor) {
            var pos = editor.getCursorPosition();
            if (pos.column > 0)
                editor.navigateLeft();
        },
        sel: function(editor) {
            var pos = editor.getCursorPosition();
            if (pos.column > 0)
                editor.selection.selectLeft();
        }
    },
    "k": {
        nav: function(editor) {
            editor.navigateUp();
        },
        sel: function(editor) {
            editor.selection.selectUp();
        }
    },
    "j": {
        nav: function(editor) {
            editor.navigateDown();
        },
        sel: function(editor) {
            editor.selection.selectDown();
        }
    },
    "i": {
        param: true,
        sel: function(editor, range, count, param) {
            switch (param) {
                case "w":
                    editor.selection.selectWord();
            }
        }
    },
    "a": {
        param: true,
        sel: function(editor, range, count, param) {
            switch (param) {
                case "w":
                    editor.selection.selectAWord();
            }
        }
    },
    "f": {
        param: true,
        nav: function(editor, range, count, param) {
            count = parseInt(count, 10) || 1;
            var ed = editor;
            var cursor = ed.getCursorPosition();
            var column = util.getRightNthChar(editor, cursor, param, count);

            if (typeof column === "number") {
                ed.selection.clearSelection(); // Why does it select in the first place?
                ed.moveCursorTo(cursor.row, column + cursor.column + 1);
            }
        },
        sel: function(editor, range, count, param) {
            count = parseInt(count, 10) || 1;
            var ed = editor;
            var cursor = ed.getCursorPosition();
            var column = util.getRightNthChar(editor, cursor, param, count);

            if (typeof column === "number") {
                ed.moveCursorTo(cursor.row, column + cursor.column + 1);
            }
        }
    },
    "t": {
        param: true,
        nav: function(editor, range, count, param) {
            count = parseInt(count, 10) || 1;
            var ed = editor;
            var cursor = ed.getCursorPosition();
            var column = util.getRightNthChar(editor, cursor, param, count);

            if (typeof column === "number") {
                ed.selection.clearSelection(); // Why does it select in the first place?
                ed.moveCursorTo(cursor.row, column + cursor.column);
            }
        },
        sel: function(editor, range, count, param) {
            count = parseInt(count, 10) || 1;
            var ed = editor;
            var cursor = ed.getCursorPosition();
            var column = util.getRightNthChar(editor, cursor, param, count);

            if (typeof column === "number") {
                ed.moveCursorTo(cursor.row, column + cursor.column);
            }
        }
    },
    "^": {
        nav: function(editor) {
            editor.navigateLineStart();
        },
        sel: function(editor) {
            editor.selection.selectLineStart();
        }
    },
    "$": {
        nav: function(editor) {
            editor.navigateLineEnd();
        },
        sel: function(editor) {
            editor.selection.selectLineEnd();
        }
    },
    "0": {
        nav: function(editor) {
            var ed = editor;
            ed.navigateTo(ed.selection.selectionLead.row, 0);
        },
        sel: function(editor) {
            var ed = editor;
            ed.selectTo(ed.selection.selectionLead.row, 0);
        }
    },
    "shift-g": {
        nav: function(editor, range, count, param) {
            count = parseInt(count, 10);
            if (!count && count !== 0) { // Stupid JS
                count = editor.session.getLength();
            }
            editor.gotoLine(count);
        },
        sel: function(editor, range, count, param) {
            count = parseInt(count, 10);
            if (!count && count !== 0) { // Stupid JS
                count = editor.session.getLength();
            }
            editor.selection.selectTo(count, 0);
        }
    },
    "ctrl-d": {
        nav: function(editor, range, count, param) {
            editor.selection.clearSelection();
            keepScrollPosition(editor, editor.gotoPageDown);
        },
        sel: function(editor, range, count, param) {
            keepScrollPosition(editor, editor.selectPageDown);
        }
    },
    "ctrl-u": {
        nav: function(editor, range, count, param) {
            editor.selection.clearSelection();
            keepScrollPosition(editor, editor.gotoPageUp);

        },
        sel: function(editor, range, count, param) {
            keepScrollPosition(editor, editor.selectPageUp);
        }
    },
    "g": {
        param: true,
        nav: function(editor, range, count, param) {
            switch(param) {
                case "m":
                    console.log("Middle line");
                    break;
                case "e":
                    console.log("End of prev word");
                    break;
                case "g":
                    editor.gotoLine(count || 0);
            }
        },
        sel: function(editor, range, count, param) {
            switch(param) {
                case "m":
                    console.log("Middle line");
                    break;
                case "e":
                    console.log("End of prev word");
                    break;
                case "g":
                    editor.selection.selectTo(count || 0, 0);
            }
        }
    },
    "o": {
        nav: function(editor, range, count, param) {
            count = count || 1;
            var content = "";
            while (0 < count--)
                content += "\n";

            if (content.length) {
                editor.navigateLineEnd()
                editor.insert(content);
                util.insertMode(editor);
            }
        }
    },
    "shift-o": {
        nav: function(editor, range, count, param) {
            var row = editor.getCursorPosition().row;
            count = count || 1;
            var content = "";
            while (0 < count--)
                content += "\n";

            if (content.length) {
                if(row > 0) {
                    editor.navigateUp();
                    editor.navigateLineEnd()
                    editor.insert(content);
                } else {
                    editor.session.insert({row: 0, column: 0}, content);
                    editor.navigateUp();
                }
                util.insertMode(editor);
            }
        }
    },
    "%": {
        nav: function(editor, range, count, param) {
            var cursor = editor.getCursorPosition();
            var match = editor.session.findMatchingBracket({
                row: cursor.row,
                column: cursor.column + 1
            });

            if (match)
                editor.moveCursorTo(match.row, match.column);
        }
    }
};

module.exports.backspace = module.exports.left = module.exports.h;
module.exports.right = module.exports.l;
module.exports.up = module.exports.k;
module.exports.down = module.exports.j;
module.exports.pagedown = module.exports["ctrl-d"];
module.exports.pageup = module.exports["ctrl-u"];

});

define("ace/keyboard/vim/maps/operators",[], function(require, exports, module) {

"never use strict";

var util = require("ace/keyboard/vim/maps/util");
var registers = require("ace/keyboard/vim/registers");

module.exports = {
    "d": {
            selFn: function(editor, range, count, param) {
                registers._default.text = editor.getCopyText();
                registers._default.isLine = util.onVisualLineMode;
                if(util.onVisualLineMode)
                    editor.removeLines();
                else
                    editor.session.remove(range);
                util.normalMode(editor);
            },
            fn: function(editor, range, count, param) {
                count = parseInt(count || 1, 10);
                switch (param) {
                    case "d":
                        registers._default.text = "";
                        registers._default.isLine = true;
                        for (var i=0; i<count; i++) {
                            editor.selection.selectLine();
                            registers._default.text += editor.getCopyText();
                            var selRange = editor.getSelectionRange();
                            editor.session.remove(selRange);
                            editor.selection.clearSelection();
                        }
                        registers._default.text = registers._default.text.replace(/\n$/, "");
                        break;
                    default:
                        if (range) {
                            editor.selection.setSelectionRange(range);
                            registers._default.text = editor.getCopyText();
                            registers._default.isLine = false;
                            editor.session.remove(range);
                            editor.selection.clearSelection();
                        }
                }
            }
    },
    "c": {
            selFn: function(editor, range, count, param) {
                editor.session.remove(range);
                util.insertMode(editor);
            },
            fn: function(editor, range, count, param) {
                count = parseInt(count || 1, 10);
                switch (param) {
                    case "c":
                        for (var i=0; i < count; i++) {
                            editor.removeLines();
                            util.insertMode(editor);
                        }

                        break;
                    default:
                        if (range) {
                            editor.session.remove(range);
                            util.insertMode(editor);
                        }
                }
            }
    },
    "y": {
        selFn: function(editor, range, count, param) {
            registers._default.text = editor.getCopyText();
            registers._default.isLine = util.onVisualLineMode;
            editor.selection.clearSelection();
            util.normalMode(editor);
        },
        fn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            switch (param) {
                case "y":
                    var pos = editor.getCursorPosition();
                    editor.selection.selectLine();
                    for (var i = 0; i < count - 1; i++) {
                        editor.selection.moveCursorDown();
                    }
                    registers._default.text = editor.getCopyText().replace(/\n$/, "");
                    editor.selection.clearSelection();
                    registers._default.isLine = true;
                    editor.moveCursorToPosition(pos);
                    break;
                default:
                    if (range) {
                        var pos = editor.getCursorPosition();
                        editor.selection.setSelectionRange(range);
                        registers._default.text = editor.getCopyText();
                        registers._default.isLine = false;
                        editor.selection.clearSelection();
                        editor.moveCursorTo(pos.row, pos.column);
                    }
            }
        }
    },
    ">": {
        selFn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            for (var i = 0; i < count; i++) {
                editor.indent();
            }
            util.normalMode(editor);
        },
        fn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            switch (param) {
                case ">":
                    var pos = editor.getCursorPosition();
                    editor.selection.selectLine();
                    for (var i = 0; i < count - 1; i++) {
                        editor.selection.moveCursorDown();
                    }
                    editor.indent();
                    editor.selection.clearSelection();
                    editor.moveCursorToPosition(pos);
                    editor.navigateLineEnd();
                    editor.navigateLineStart();
                    break;
            }
        }
    },
    "<": {
        selFn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            for (var i = 0; i < count; i++) {
                editor.blockOutdent();
            }
            util.normalMode(editor);
        },
        fn: function(editor, range, count, param) {
            count = parseInt(count || 1, 10);
            switch (param) {
                case "<":
                    var pos = editor.getCursorPosition();
                    editor.selection.selectLine();
                    for (var i = 0; i < count - 1; i++) {
                        editor.selection.moveCursorDown();
                    }
                    editor.blockOutdent();
                    editor.selection.clearSelection();
                    editor.moveCursorToPosition(pos);
                    editor.navigateLineEnd();
                    editor.navigateLineStart();
                    break;
            }
        }
    }
};
});

"never use strict"

define("ace/keyboard/vim/maps/aliases",[], function(require, exports, module) {
module.exports = {
    "x": {
        operator: {
            char: "d",
            count: 1
        },
        motion: {
            char: "l",
            count: 1
        }
    },
    "shift-x": {
        operator: {
            char: "d",
            count: 1
        },
        motion: {
            char: "h",
            count: 1
        }
    },
    "shift-d": {
        operator: {
            char: "d",
            count: 1
        },
        motion: {
            char: "$",
            count: 1
        }
    },
    "shift-c": {
        operator: {
            char: "c",
            count: 1
        },
        motion: {
            char: "$",
            count: 1
        }
    },
    "s": {
        operator: {
            char: "c",
            count: 1
        },
        motion: {
            char: "l",
            count: 1
        }
    },
    "shift-s": {
        operator: {
            char: "c",
            count: 1
        },
        motion: {
            char: "l",
            count: 1
        }
    }
};
});

define("ace/keyboard/vim/registers",[], function(require, exports, module) {

"never use strict";

module.exports = {
    _default: {
        text: "",
        isLine: false
    }
};

});

