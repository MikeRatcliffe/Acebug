var coffeeScriptCompiler
define('ace/mode/consoleMode', function(require, exports, module) {

var oop = require("pilot/oop");
var TextMode = require("ace/mode/text").Mode;
var Range = require("ace/range").Range;
var jsMode = require("ace/mode/javascript").Mode
modes = {
	js: new jsMode,
	get coffee(){
		var req  = window.require, def = window.define
		require(["ace/mode/coffee", /*"worker-coffee"*/"fbace/coffee-script"], function(){
			var cf = require("ace/mode/coffee").Mode
			modes.coffee = new cf
			coffeeScriptCompiler = this.CoffeeScript
		})
		delete this.coffee
		this.coffee = new TextMode
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
			state : {state:"start", lang:lang, isHeader:isHeader + 1}
		};
	}
	else {	
		var ans = (modes[lang]||jsMode).$tokenizer.getLineTokens(line, startState)
		ans.state = {lang: lang, state: ans.state}		
	}
	return ans
};

var Mode = function() {
    this.$tokenizer = tk;
};
oop.inherits(Mode, TextMode);

(function() {
	this.delimiter = delimiter;
	this.dl = dl;
	this.getCellBounds = function(row) {
		var lines = editor.session.doc.$lines;

		var i = row+1
		var line = lines[i]
		while(line != null){
			if(line.substr(0,dl)==delimiter)
				break
			line = lines[++i]
		}
		var maxI = i-1;

		i = row
		line = lines[i]
		while(line != null){
			if(line.substr(0,dl)==delimiter)
				break
			line = lines[--i]
		}
		var minI = i+1
		
		while(line != null) {
			if(line.substr(0,dl)!=delimiter)
				break
			line = lines[--i]
		}
		
		var headerI = i+1

		return {
			headerStart: headerI,
			headerEnd: minI-1,
			bodyStart: minI,
			bodyEnd: maxI
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
			compileJSCell(cell);
			cell.sourceLang = 'coffee '
		} else
			cell.sourceLang = ''
		
		cell.headerText = cell.header.join('\n')
					.replace(/lang\s*=\s*(\w+)\b/g,'')
					.replace(delimiter, '', 'g')
					.trim();

		return cell;			
	};
	
	function compileJSCell(cell) {
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
        //return this.jsMode.createWorker(session);
    };
	
	this.transformAction = function(state, action, editor, session, param) {
        return (modes[state.lang]||jsMode).transformAction(state, action, editor, session, param);
    }

}).call(Mode.prototype);

exports.Mode = Mode;
});


initConsoleMode = function(editor){
	var consoleMode = require('ace/mode/consoleMode').Mode
	console.log(editor)
	editor.session.setMode(new consoleMode);
}

function isLineFoldable(row) {
	return !!this.getLine(row).match(/(\{|\[)\s*(\/\/.*)?$/)
	
	if (!this.foldWidgets)
		this.foldWidgets = []
	if (this.foldWidgets[row] != null)
		return this.foldWidgets[row]
	else
		return this.foldWidgets[row] = !!this.getLine(row).match(/(\{|\[)\s*(\/\/.*)?$/)		
}


define('ace/layer/gutter', function(require, exports, module) {
var dom = require("pilot/dom");

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
        var fold = this.session.getNextFold(i);
        var foldStart = fold ? fold.start.row : Infinity;

        while (true) {
            if(i > foldStart) {
                i = fold.end.row + 1;
                fold = this.session.getNextFold(i);
                foldStart = fold ?fold.start.row :Infinity;
            }
            if(i > lastRow)
                break;

            var annotation = this.$annotations[i] || emptyAnno;
            html.push("<div class='ace_gutter-cell",
                this.$decorations[i] || "",
                breakpoints[i] ? " ace_breakpoint " : " ",
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
                html.push("</div><div class='ace_gutter-cell' style='height:", config.lineHeight, "px'>&brvbar;</div>");
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
