var coffeeScriptCompiler
define("ace/mode/consoleMode", function(require, exports, module) {

var oop = require("ace/lib/oop");
var TextMode = require("ace/mode/text").Mode;
var Range = require("ace/range").Range;
var jsMode = require("ace/mode/javascript").Mode

var foldMode = new (require("ace/mode/folding/cstyle").FoldMode);
foldMode.foldingStartMarker = /(^#>>)|(\{|\[)[^\}\]]*$|^\s*(\/\*)/;
foldMode.getFoldWidgetRange = function(session, foldStyle, row) {
	var line = session.getLine(row);
	var match = line.match(this.foldingStartMarker);
	if (match) {
		var i = match.index;

		if (match[1]) {
			var cell = session.$mode.getCellBounds(row)
			var start = {row: row, column: session.$mode.dl};
			var end = {row: cell.bodyEnd, column: session.getLine(cell.bodyEnd).length};
			var placeholder = session.getLine(cell.headerStart).slice(0,10) + "=====================";
			range = Range.fromPoints(start, end)
			range.placeholder = placeholder
			return range
		}
		
		if (match[3]) {
			var range = session.getCommentFoldRange(row, i + match[0].length);
			range.end.column -= 2;
			return range;
		}

		var start = {row: row, column: i+1};
		var end = session.$findClosingBracket(match[2], start);
		if (!end)
			return;

		var fw = session.foldWidgets[end.row];
		if (fw == null)
			fw = this.getFoldWidget(session, end.row);

		if (fw == "start") {
			end.row --;
			end.column = session.getLine(end.row).length;
		}
		return Range.fromPoints(start, end);
	}

	if (foldStyle !== "markbeginend")
		return;
		
	var match = line.match(this.foldingStopMarker);
	if (match) {
		var i = match.index + match[0].length;

		if (match[2]) {
			var range = session.getCommentFoldRange(row, i);
			range.end.column -= 2;
			return range;
		}

		var end = {row: row, column: i};
		var start = session.$findOpeningBracket(match[1], end);
		
		if (!start)
			return;

		start.column++;
		end.column--;

		return  Range.fromPoints(start, end);
	}
};


modes = {
	js: new jsMode,
	get coffee() {
		var req  = window.require, def = window.define
		require(["res/coffee-script"], function(){
            var cf = require("ace/mode/coffee").Mode
            modes.coffee = new cf
			
			coffeeScriptCompiler = this.CoffeeScript
			// now that we have real coffee, highlight session
			// relies on global editor
			editor.session.bgTokenizer.start()
		})
		delete this.coffee
		this.coffee = new TextMode
		return this.coffee
	}
}
jsMode = modes.js



var tk = {}
var delimiter = '#>>'
var dl = delimiter.length
function testLang(lang, fullName){
	lang=lang.toLowerCase()
	fullName=fullName.toLowerCase()
	var lastI=0
	for(var j = 0, ftLen = lang.length; j < ftLen; j++) {
		lastI = fullName.indexOf(lang[j], lastI);
		if (lastI === -1)
			return false; //doesn't match
		lastI++;
	}
	return true
}
var states = {}
var $getState = function(state, lang, isHeader){
    var g = lang + state + isHeader
    return states[g] || (states[g] = {state:state, lang:lang, isHeader:isHeader})
}
tk.getLineTokens = function(line, startState) {
	var match,lang,isHeader = 0;
	if (typeof startState == 'object') {
		lang = startState.lang;
		isHeader = startState.isHeader||0;
		startState = startState.state||"start";
	} else {
		lang = 'js'
	}

	if (line.substr(0, dl) == delimiter) {
		var index = dl
		var type = !isHeader?'firstcell.':''
		var tok = [{type:type+'cellHead', value: delimiter}]
		if(match = line.match(/lang\s*=\s*(\w+)\b/)){
			lang = testLang(match[1],'coffeeScript')?'coffee':'js'

			if(dl < match.index) {
				tok.push({type:type, value:line.substring(dl, match.index)})
			}
			tok.push({type: type+'comment.doc', value:match[0]})
			index = match.index + match[0].length
		}
		tok.push({type:type, value:line.substr(index)})
		
		if (!isHeader) {
			tok.push({type:'filler', value:' '})
		}
		ans = {
			tokens : tok,
			state : $getState("start", lang, isHeader + 1)
		};
	}
	else {	
		var ans = (modes[lang]||jsMode).$tokenizer.getLineTokens(line, startState)
		ans.state = $getState(ans.state, lang)
	}
	return ans
};

var Mode = function() {
    this.$tokenizer = tk;
	this.foldingRules = foldMode
};
oop.inherits(Mode, TextMode);

(function() {
	this.delimiter = delimiter;
	this.dl = dl;
	this.getCellBounds = function(row) {
		var lines = editor.session.doc.$lines;
		var cur = row
		
		// go to header end if row is inside header
		var line = lines[row]
		while (line && line.substr(0,dl) == delimiter) {
			line = lines[++row]
		}
		if( !line)
			line = lines[--row]

		// read up to header
		var i = row
		while(line != null){
			if(line.substr(0,dl) == delimiter)
				break
			line = lines[--i]
		}
		var minI = i+1;
		
		// read header
		while(line != null) {
			if(line.substr(0,dl) != delimiter)
				break
			line = lines[--i]
		}		
		var headerI = i+1;
		// read rest of the body
		i = row + 1
		line = lines[i]
		while (line != null) {
			if (line.substr(0, dl)==delimiter)
				break
			line = lines[++i]
		}
		var maxI = i-1;

		return {
			headerStart: headerI,
			headerEnd: minI-1,
			bodyStart: minI,
			bodyEnd: maxI,
			cursor: cur
		}
	};
	
	this.getHeaderText = function(cell) {
		if (cell) {
			cell.headerText = cell.header.join('\n')
					.replace(/lang\s*=\s*(\w+)\b/g,'')
					.replace(delimiter, '', 'g')
					.trim();
			return cell
		}	
	};
	
	this.getCurrentCell = function() {
		var cursor = editor.getCursorPosition();
		var session = editor.session
		var lines = session.doc.$lines;
		
		var cell = this.getCellBounds(cursor.row);
		cell.header = session.getLines(cell.headerStart, cell.headerEnd)
		cell.body = session.getLines(cell.bodyStart, cell.bodyEnd)
		cell.lang = session.getState(cell.headerStart).lang
		
		if (cell.lang=='coffee') {
			this.$compileJSCell(cell);
			cell.sourceLang = 'coffee '
		} else
			cell.sourceLang = ''
		
		this.getHeaderText(cell)

		return cell;			
	};
	
	this.setCellText = function(text){
		var cursor = editor.getCursorPosition();
		var session = editor.session
		
		var cell = this.getCellBounds(cursor.row);
		var end = session.getLine(cell.bodyEnd).length;
		
		if (cell.bodyStart > cell.bodyEnd) { // empty cell
			var range = new Range(cell.bodyEnd, end, cell.bodyEnd, end);
			text = '\n' + text;
		} else
			var range = new Range(cell.bodyStart, 0, cell.bodyEnd, end)
		
		session.replace(range, text)
		return text
	}
	
	this.$compileJSCell = function(cell) {
		try {			
			cell.coffeeText = coffeeScriptCompiler.compile(cell.body.join('\n'), {bare: true})
		} catch(e) {
			var m = e.message.match(/Parse error on line (\d+): (.*)/);
			if (m) {
				cell.coffeeError = {
					row: parseInt(m[1]) - 1,
					column: null,
					text: m[2],
					source: ""
				};
			}
			if (e instanceof SyntaxError) {
                var m = e.message.match(/ on line (\d+)/);
                if (m) {                    
                    cell.coffeeError = {
                        row: parseInt(m[1]) - 1,
                        column: null,
                        text: e.message.replace(m[0], ""),
                        source: ""
                    };
                }
            }
		}
	};
	
    this.toggleCommentLines = function(state, doc, startRow, endRow) {
		(modes[state.lang]||jsMode).toggleCommentLines(state.state, doc, startRow, endRow)
    };

    this.getNextLineIndent = function(state, line, tab, lineEnd) {
        return (modes[state.lang]||jsMode).getNextLineIndent(state.state, line, tab, lineEnd);
    };

    this.checkOutdent = function(state, line, input) {
        return (modes[state.lang]||jsMode).checkOutdent(state.state, line, input);
    };

    this.autoOutdent = function(state, doc, row) {
        return (modes[state.lang]||jsMode).autoOutdent(state.state, doc, row);
    };
    
    this.createWorker = function(session) {
        var cw = require("fbace/worker").ConsoleWorker
        var worker = new cw(session)

        return worker;
    };
	
	this.transformAction = function(state, action, editor, session, param) {
        return (modes[state.lang]||jsMode).transformAction(state.state, action, editor, session, param);
    }

}).call(Mode.prototype);

exports.Mode = Mode;
});

