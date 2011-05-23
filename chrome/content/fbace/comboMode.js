define('ace/keyboard/hash_handler', function(require, exports, module) {

var oop = require("pilot/oop");
var TextMode = require("ace/mode/text").Mode;
var Range = require("ace/range").Range;
var modes, jsMode

function initModes(){
	var JavaScriptMode = require("ace/mode/javascript").Mode;	
	var CssMode = require("ace/mode/css").Mode;
	var HtmlMode = require("ace/mode/html").Mode;
	var XmlMode = require("ace/mode/xml").Mode;
	var PythonMode = require("ace/mode/python").Mode;
	var PhpMode = require("ace/mode/php").Mode;
	var JavaMode = require("ace/mode/java").Mode;
	var CSharpMode = require("ace/mode/csharp").Mode;
	var RubyMode = require("ace/mode/ruby").Mode;
	var CCPPMode = require("ace/mode/c_cpp").Mode;
	var CoffeeMode = require("ace/mode/coffee").Mode;
	var PerlMode = require("ace/mode/perl").Mode;
	var OcamlMode = require("ace/mode/ocaml").Mode;
	var SvgMode = require("ace/mode/svg").Mode;
	var TextileMode = require("ace/mode/textile").Mode;
	var TextMode = require("ace/mode/text").Mode;
	 
	modes = {
		text: new TextMode(),
		textile: new TextileMode(),
		svg: new SvgMode(),
		xml: new XmlMode(),
		html: new HtmlMode(),
		css: new CssMode(),
		javascript: new JavaScriptMode(),
		python: new PythonMode(),
		php: new PhpMode(),
		java: new JavaMode(),
		ruby: new RubyMode(),
		c_cpp: new CCPPMode(),
		coffee: new CoffeeMode(),
		perl: new PerlMode(),
		ocaml: new OcamlMode(),
		csharp: new CSharpMode()
	};
	modes.c = modes.c_cpp
	modes.js = modes.javascript
	modes.cf = modes.coffee
	modes.py = modes.python
	jsMode = modes.js
}	
var tk = {}
tk.getLineTokens = function(line, startState) {
	var match,lang,isHeader;
	if (typeof startState == 'object') {
		lang = startState.lang;
		isHeader = startState.isHeader
		startState = startState.state||"start";
	} else {
		lang = 'js'
	}
	if (line.substr(0,2)=='#>'){
		if(match = line.match(/lang\s*=\s*(\w+)\b/))
			lang = match[1]
		ans = {
			tokens : [
				{type:'cellHead', value:'#>'},
				{type:'cell', value:line.substr(2)}						
			],
			state : {state:"start",lang:lang,isHeader:true}
		};
		if (!isHeader) {
			ans.tokens.push({type:'filler', value:' '})
		}
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