define('ace/mode/consoleMode', function(require, exports, module) {

var oop = require("pilot/oop");
var TextMode = require("ace/mode/text").Mode;
var Range = require("ace/range").Range;
var modes, jsMode

function initModes(){
	var JavaScriptMode = require("ace/mode/javascript").Mode;	
	var CoffeeMode = require("ace/mode/coffee").Mode;
	/*var CssMode = require("ace/mode/css").Mode;
	var HtmlMode = require("ace/mode/html").Mode;
	var XmlMode = require("ace/mode/xml").Mode;
	var PythonMode = require("ace/mode/python").Mode;
	var PhpMode = require("ace/mode/php").Mode;
	var JavaMode = require("ace/mode/java").Mode;
	var CSharpMode = require("ace/mode/csharp").Mode;
	var RubyMode = require("ace/mode/ruby").Mode;
	var CCPPMode = require("ace/mode/c_cpp").Mode;
	var PerlMode = require("ace/mode/perl").Mode;
	var OcamlMode = require("ace/mode/ocaml").Mode;
	var SvgMode = require("ace/mode/svg").Mode;
	var TextileMode = require("ace/mode/textile").Mode;
	var TextMode = require("ace/mode/text").Mode;*/
	 
	modes = {
		/*text: new TextMode(),
		textile: new TextileMode(),
		svg: new SvgMode(),
		xml: new XmlMode(),
		html: new HtmlMode(),
		css: new CssMode(),
		python: new PythonMode(),
		php: new PhpMode(),
		java: new JavaMode(),
		ruby: new RubyMode(),
		c_cpp: new CCPPMode(),
		perl: new PerlMode(),
		ocaml: new OcamlMode(),
		csharp: new CSharpMode()*/
		javascript: new JavaScriptMode(),
		coffee: new CoffeeMode(),
	};
	//modes.c = modes.c_cpp
	modes.js = modes.javascript
	modes.cf = modes.coffee
	//modes.py = modes.python
	jsMode = modes.js
}	
var tk = {}
var delimiter = '#>>'
var dl = delimiter.length

getCurrentCell = function() {
	var lines = editor.session.doc.$lines;
	var cursor = editor.getCursorPosition();

	var i = cursor.row+1
	var line = lines[i]
	while(line != null){
		if(line.substr(0,dl)==delimiter)
			break
		line = lines[++i]
	}
	var maxI = i-1;

	i = cursor.row
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
		header: editor.session.getLines(headerI, minI-1 ),
		body: editor.session.getLines(minI, maxI)
	}
}

tk.getLineTokens = function(line, startState) {
	var match,lang,isHeader;
	if (typeof startState == 'object') {
		lang = startState.lang;
		isHeader = startState.isHeader
		startState = startState.state||"start";
	} else {
		lang = 'js'
	}

	if (line.substr(0, dl) == delimiter){
		var tok = [{type:'cellHead', value: delimiter}]
		var index = dl
		if(match = line.match(/lang\s*=\s*(\w+)\b/)){
			lang = match[1]
			if(dl < match.index){
				tok.push({type:'cell', value:line.substring(dl, match.index)})
			}
			tok.push({type:'cell.comment.doc', value:match[0]})
			index = match.index + match[0].length
		}
		tok.push({type:'cell', value:line.substr(index)})
		
		if (!isHeader) {
			tok.push({type:'filler', value:' '})
		}
		ans = {
			tokens : tok,
			state : {state:"start",lang:lang,isHeader:true}
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
	if(!modes)
		initModes()
};
oop.inherits(Mode, TextMode);

(function() {
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
