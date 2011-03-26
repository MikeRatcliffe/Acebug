/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************

/*****************************************************************
 *  code completion utils
 *****************************************************************/
function treeView(table) {
    this.rowCount = table.length;
    this.getCellText  = function(row, col){return table[row][col.id];};
    this.getCellValue = function(row, col){return table[row][col.id];};
    this.setTree = function(treebox){this.treebox = treebox;};
    this.isEditable = function(row, col){return false;};

    this.isContainer = function(row){return false;};
    this.isContainerOpen = function(row){return false;};
    this.isContainerEmpty = function(row){return true;};
    this.getParentIndex = function(row){ return 0;};
    this.getLevel = function(row){return 0;};
    this.hasNextSibling = function(row){return false;};

    this.isSeparator = function(row){return false;};
    this.isSorted = function(){return false;};
    this.getImageSrc = function(row, col) {}; // return "chrome://global/skin/checkbox/cbox-check.gif"; };
    this.getRowProperties = function(row, props) {
        //var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
        //props.AppendElement(aserv.getAtom(table[row].depth));
        //props.AppendElement(aserv.getAtom('a'));
    };
    this.getCellProperties = function(row, col, props) {
        var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
        props.AppendElement(aserv.getAtom('d'+table[row].depth));
    };
    this.getColumnProperties = function(colid, col, props) {};
    this.cycleHeader = function(col, elem) {};
};

/**************************************/

Firebug.Ace.autocompleter = {
    onEvalSuccess: function(result, context) {
        this.object = result;
        this.unfilteredArray = getProps(result);

        if(this.specFunc)
            this.getSpecialEntries();

        this.filter(this.unfilteredArray, this.text);
        this.showPanel();
    },

    onEvalFail: function(result, context) {
        alert(result);
    },

    eval: function(string, context) {
        context=context || Firebug.currentContext;
        if(!string)
            this.onEvalSuccess(context.global, context);
        else
            Firebug.CommandLine.evaluate(string, context, context.thisValue, null,
                bind(this.onEvalSuccess, this),
                bind(this.onEvalFail, this)
            );
    },

    start: function(editor) {
        this.editor = editor || this.editor;
        var range = editor.selection.getRange();
        this.filterRange = range.clone();
        range.end.column = range.start.column;
        range.start.column = 0;
        var evalString = editor.session.getTextRange(range);

        var [objString, filterText] = this.parseJSFragment(evalString);

        range.end.column = range.end.column - filterText.length - 1;
        range.start.column = range.end.column - objString.length -1;
        this.baseRange = range;

        this.filterRange.start.column = this.filterRange.end.column - filterText.length;

        this.text = filterText;
        this.eval(objString);
    },

    initPanel: function(panelH, panelW){
		this.panel=$("aceAutocompletePanel");
		this.panel.height = panelH;
		this.panel.width = panelW;
		this.tree = this.panel.getElementsByTagName('tree')[0];
		this.number = this.panel.getElementsByTagName('label')[0];

		this.bubble = document.getElementById("autocomplate-info-bubble");
		//set handlers
		this.panel.setAttribute('onpopupshown','Firebug.Ace.autocompleter.setView(0)');
		this.panel.setAttribute('onpopuphidden','Firebug.Ace.autocompleter.finish()');
		this.tree.setAttribute('ondblclick','Firebug.Ace.autocompleter.insertSuggestedText();Firebug.Ace.autocompleter.finish()');
		this.tree.setAttribute('onclick','Firebug.Ace.autocompleter.editor.focus()');
		this.tree.setAttribute('onselect','Firebug.Ace.autocompleter.onSelect()');
		this.panel.getElementsByTagName('toolbarbutton')[0].setAttribute('oncommand','Firebug.Ace.autocompleter.compare()');
	},

    showPanel: function() {
        this.hidden = false;
        var panelH = 250, panelW = 200;

        if(!this.panel)//get domNodes
            this.initPanel(panelH, panelW)
        
        var editor = this.editor;
        var win = editor.container.ownerDocument.defaultView;
        var innerPos = editor.renderer.textToScreenCoordinates(editor.getCursorPosition());
        var posX = innerPos.pageX + win.mozInnerScreenX;
        var posY = innerPos.pageY + win.mozInnerScreenY;
        var maxX = window.screen.width;
        var minX = window.screen.left;
        var maxY = window.screen.height-50;

        if(panelH + posY > maxY)
            posY -= panelH + 5;
        else
            posY += 20;

        if(this.panel.state === 'open') {
            this.setView(0);
            this.panel.moveTo(posX, posY);
        } else {
            this.panel.showPopup(null, posX, posY, "popup");
        }

        // add editor handlers
        this.editor.setKeyboardHandler(this.editor.autocompletionKeySet);
        if(!this.editor.autocompleteCommandsAdded)
            this.addComandsToEditor();
        if(!this.selectionListener)
            this.selectionListener = bind(this.$selectionListener, this);

        this.editor.selection.on('changeCursor', this.selectionListener);

        var bubbleX = posX - minX > maxX - posX -panelW ? minX + 10 : maxX - panelW * 1.5 - 10;
        this.bubblePos = {w: panelW * 1.7, h: panelH * 1.5, l: bubbleX, t: posY};
        this.bubble.height = this.bubblePos.h;
        this.bubble.width = this.bubblePos.w;
        this.bubble.showPopup(null, this.bubblePos.l, this.bubblePos.t, "popup");
    },

    $selectionListener: function(e) {
        e.data = this.editor.selection.getCursor();
        if(this.baseRange.contains(e.data.row, e.data.column) || this.hidden)
            return this.finish();

        this.filterRange.end = e.data;
        this.text = this.editor.session.getTextRange(this.filterRange);
        dump(this.text);
        if( /[\+\-;,= \(\)\[\]\{\}\!><]/.test(this.text))
            return this.finish();
        this.filter(this.unfilteredArray,this.text);
        this.setView(0);
    },

    addComandsToEditor: function(){
        var self = this;
        this.editor.addCommands({
            nextEntry: function(){
                self.moveTreeSelection(1);
            },

            previousEntry: function(){
                self.moveTreeSelection(-1);
            },

            dotComplete: function(){
                var o = self.sortedArray[self.tree.currentIndex];
                if(o) {
                    self.insertSuggestedText('.');
                    var cursor = self.editor.selection.getCursor();
                    self.baseRange.end.column = cursor.column - 1;
                    var fr = self.filterRange;
                    fr.end.column = fr.start.column = cursor.column;
                    fr.end.row = fr.start.row = cursor.row;
                    self.text = '';
                    self.onEvalSuccess(o.object);
                }
            },

            complete: function(){
                self.insertSuggestedText();
                self.finish();
            },

            cancelCompletion: function(){
                self.finish();
            }
        });

        this.editor.autocompleteCommandsAdded = true;
    },
    // *****************
    onSelect: function(immediate){
        if(!immediate){
            if(this.onSelectTimeOut)
                clearTimeout(this.onSelectTimeOut);
            var self = this;
            this.onSelectTimeOut = setTimeout(function(){self.onSelect(true);},10);
            return;
        }
        /**	 doOnselect  **/
        this.onSelectTimeOut = null;

        try{
            var si = this.tree.currentIndex;
            this.number.value = si + ':' +this.sortedArray.length + "/" + this.unfilteredArray.length;

            if(si <0 || si > this.tree.view.rowCount){
                this.sayInBubble(jn.inspect(this.object));
                return;
            }
            var o = this.sortedArray[si];
            var longName = jn.inspect(o.object, "long");
            var text = jn.lookupSetter(this.object, o.name);
            this.sayInBubble(longName+'\n'+text);
        } catch(e) {}
    },

    sayInBubble: function(text) {
        if(this.hidden)
            return;
        var item = this.bubble.firstChild;
        item.value = text;
    },

    insertSuggestedText: function(additionalText){
        var c = this.tree.view.selection.currentIndex;
        if(c<0)
            return;
        c = this.sortedArray[c];
        var isSpecial = c.special;
        var text = c.name;

        var s = this.baseRange.end.column + 1;
        if(isSpecial){
            text=text.substr(1);
        } else if (/^\d*$/.test(text)) {
            text = "[" + text + "]";
            s--;
        } else if (!/^[a-z$_][a-z$_0-9]*$/i.test(text)) {
            text = '["' + text + '"]';
            s--;
        }

        if (additionalText) {
            text = text+additionalText;
            //l -= additionalText.length + 1;
        }
        var range = this.editor.selection.getRange();
        range.start.column = s;
        this.editor.selection.setSelectionRange(range);
        this.editor.onTextInput(text);
    },
    // *****************
    getSpecialEntries: function() {
        var [spo, funcName] = this.specFunc;
        var ans = [];
        try {
            if (funcName === "QueryInterface") {
                var spo = EJS_evalStringOnTarget(spo);
                supportedInterfaces(spo).forEach(function(x) {
                    ans.push({name:'\u2555Ci.'+x+')',comName: 'ci.'+x.toString().toLowerCase(),description:"interface", depth:-1,special:true});
                });
            } else if (funcName === "getInterface") {
                spo = EJS_evalStringOnTarget(spo);
                supportedgetInterfaces(spo).forEach(function(x){
                    ans.push({name:'\u2555Ci.'+x+')',comName: 'ci.'+x.toString().toLowerCase(),description:"interface", depth:-1,special:true});
                });
            } else if (funcName === "getElementById") {
                ans = getIDsInDoc();
            } else if(funcName === "getElementsByClassName") {
                ans = getIDsInDoc();
            } else if(funcName === "getAttribute" || funcName === "setAttribute" || funcName === "hasAttribute") {
                spo = EJS_evalStringOnTarget(spo);
                var att = spo.attributes;
                for(var i=0; i < att.length; i++) {
                    var x = att[i];
                    ans.push({name:'\u2555"'+x.nodeName+'")',comName: '"'+x.nodeName.toLowerCase(),description:x.value, depth:-1,special:true});
                }
            }
        } catch(e) {
            Cu.reportError(e);
        }
        this.unfilteredArray=ans.concat(this.unfilteredArray);
    },

    setView: function(si) {
        if(typeof si !== "number")
            si = this.tree.currentIndex;
        this.tree.view = new treeView(this.sortedArray);
        this.tree.view.selection.select(si);
        this.tree.treeBoxObject.ensureRowIsVisible(si);
        this.number.value = si + ':' + this.sortedArray.length + "/" + this.unfilteredArray.length;
    },

    moveTreeSelectionLong: function(to) {
        var c;
        var tree = this.tree;
        var view = tree.view;

        switch(to) {
            case "end":
                c = view.rowCount - 1;
            break;
            case "top":
                c = 0;
            break;
            case "pup":
                c = view.rowCount - 1;
                break;
            default:
                return;
        }
        view.selection.timedSelect(c, tree._selectDelay);
        tree.treeBoxObject.ensureRowIsVisible(c); //(c>0?c:0)
    },

    moveTreeSelection: function(direction) {
        var tree = this.tree;
        var view = tree.view;
        var c = view.selection.currentIndex;

        c += direction;
        if(c >= view.rowCount)
            c = -1;
        if(c < -1)
            c = view.rowCount - 1;
        view.selection.timedSelect(c, tree._selectDelay);

        if(c >= 0)
            tree.treeBoxObject.ensureRowIsVisible(c);
        else if (direction > 0)
            tree.treeBoxObject.ensureRowIsVisible(0);
        else
            tree.treeBoxObject.ensureRowIsVisible(view.rowCount - 1);
    },
    
    filter: function(data, text) {
        var table = [];
        if (!text) {
            data.forEach(function(val) {
                table.push(val);
            });
            table.sort();
            this.sortedArray = table;
            return;
        }
        var filterText = text.toLowerCase();
        var filterTextCase = this.text;

        //**funcs*****/
        function springyIndex(val) {
            var lowVal = val.comName;
            var priority = 0;
            var lastI = 0;
            var ind1 = 0;
            if(val.name.indexOf(filterTextCase) === 0) {
                val.priority = -2;
                table.push(val);
                return;//exact match
            }
            for(var j = 0, ftLen = filterText.length; j < ftLen; j++) {
                lastI = lowVal.indexOf(filterText[j],ind1);
                if(lastI === -1)
                    break; //doesn't match
                priority += lastI - ind1;
                ind1 = lastI+1;
            }
            if (lastI != -1) {
                val.priority = priority;
                table.push(val);
            }
        }

        function sorter(a,b) {

        }
        var sortVals = ["priority", "depth", "comName"];

        data.forEach(springyIndex);
        table.sort(function (a, b) {
            if(!a.special && b.special)
                return 1;
            if(a.special && !b.special)
                return -1;
            for each(var i in sortVals) {
              if (a[i] < b[i])
                  return -1;
              if (a[i] > b[i])
                  return 1;
            }
            return 0;
        });
        this.sortedArray = table;
    },

    finish: function(i) {
        if (this.hidden)
            return;
        this.hidden = true;
        this.editor.selection.removeEventListener('changeCursor', this.selectionListener);
        this.text = this.sortedArray = this.unfilteredArray = this.object = this.text = null;
        this.editor.setKeyboardHandler(this.editor.normalKeySet);
        this.panel.hidePopup();
        this.bubble.hidePopup();
    },

    parseJSFragment: function(evalString){
        var i0, next, iBuff;
        var i = evalString.length - 1;
        var rx = /[a-z$_0-9]/i;
        var skipWord = function() {
            i0 = i;
            while(rx.test(next = evalString.charAt(i))) {
                i--;
            }
        };
        var skipString = function(comma) {
            next = evalString.charAt(--i);
            while(next && (next != comma || evalString.charAt(i-1) === "\\")) {
                next = evalString.charAt(--i);
            }
        };
        var skipStacks = function() {
            var stack = [];
            while(next = evalString.charAt(--i)) {
                skipWord(); //print(next)
                switch(next) {
                    case ".":
                        skipWord();//print(next)
                    break;
                    case "'":
                    case '"':
                        skipString(next);
                    break;
                    case '}':
                        stack.push("{");
                    break;
                    case ']':
                        stack.push("[");
                    break;
                    case ')':
                        stack.push("(");
                    break;
                        stack.push(next);
                    break;
                    case '{':
                    case '[':
                    case '(':
                        //print(next + "bb");
                        if(stack.pop() !== next)
                            return;
                        //print(next + "bb2");
                    break;
                    default:
                        //print(next+22);
                        if(stack.length === 0)
                            return;
                }
            }
        ++i;
        };

        var ans = {evalString:'', nameFragment:'', functionName:''};
    	
		skipWord();		
        iBuff = i;
		ans.nameFragment = evalString.substr(iBuff + 1)
		
        if(next === "(") {
            iBuff = i;
			i--
            skipWord();
            ans.functionName = evalString.substring(i+1, iBuff);
        }
		
        if(next === ".") {
			iBuff = i;
			skipStacks();
			if(next||i<0)
				i++
            ans.evalString = evalString.substr(i, iBuff-i)
        }
		dump( ans.evalString, ans.nameFragment, ans.functionName)
        return [ans.evalString, ans.nameFragment];
    },

    compare: function() {
        this.sayInBubble(compareWithPrototype.compare(this.object).join("\n"));
    }
};



//js completion helpers
var getIDsInDoc = function() {
    var doc = EJS_currentTargetWin.document;
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(doc.documentElement);
    var result = xpe.evaluate('//*[@id]', doc.documentElement, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var ans=[];

    for(let i = 0, snapLen = result.snapshotLength; i < snapLen; i++) {
        let x = result.snapshotItem(i).id;
        ans[i] = {name:' "' + x + '")', comName: "ci." + x.toString().toLowerCase(), description: "id", depth: -1, special: true};
    }

    return ans;
};

var getClassesInDoc = function(doc) {
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(doc.documentElement);
    var result = xpe.evaluate('//*[@class]', doc.documentElement, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var ans = [];

    for(let i = 0, snapLen = result.snapshotLength; i < snapLen; i++) {
        let x = result.snapshotItem(i).className;
        if(ans.indexOf(x) === -1)
            ans.push(x);
    }

    return ans;
};

var modernfox = !!Object.getOwnPropertyNames;
/**============-=========-================**/
var getProps;
if (!modernfox) { //for old versions
    getProps = function(targetObj) { //var t=Date.now()
        var i, o, d;

        if (!targetObj)
            return [];
        var data = [];
        var x = targetObj.wrappedJSObject;
        if (x) {
            //data.push({name:'wrappedJSObject', comName: 'wrappedjsobject',description:'', depth:-1})
            targetObj = x;
        }

        var protoList = [targetObj];
        var p = targetObj;
        if(typeof p !== "xml") {
            while(p = p.__proto__) {
                protoList.push(p);
            }
        }

        for(i in targetObj) {
            for(var depth in protoList) {
                try {
                    if(protoList[depth].hasOwnProperty(i))
                        break;
                } catch(e){
                    Cu.reportError(depth+protoList+i);
                }
            }
            /* data.push({name:i, comName: i.toLowerCase(),get description
function(){dump(this.name); delete this.description; this.description=jn.inspect(autocompleter.object[this.name]); return this.description}
            , depth:depth}) */
            try{
                o = targetObj[i];
                d = jn.inspect(o);
            } catch(e) {
                d = e.message;
                o = "error";
            }
            data.push({name:i, comName: i.toLowerCase(), description: d, depth: depth, object: o});
        } //dump('-----------------------------**',t-Date.now())
        //special cases
        try{
            if('QueryInterface' in targetObj){
                i = "QueryInterface";

                try{
                    d = jn.inspect(targetObj[i]);
                } catch(e) {
                    d = e.message;
                }
                data.push({name: i, comName: i.toLowerCase(), description: d, depth: 0});
            }
        } catch(e) {}

        return data;
    };
} else {//4.0b2+
    getProps = function(targetObj) {
        if (!targetObj)
            return [];

        var d, o;
        var x = targetObj.wrappedJSObject;
        var data = [];
        var protoList = [];
        var depth = 0;
        var allProps = [];
        if (x)
            1;//data.push({name:'wrappedJSObject', comName: 'wrappedjsobject',description:'', depth:-1})
        else x = targetObj;

        if(typeof x !== "object" && typeof x !== "function") {
            x = x.constructor;
        }
        if(typeof x === "xml")
            return [];

        while(x) {
            var props = Object.getOwnPropertyNames(x);
            outerloop:for each(var i in props) {
                if(allProps.indexOf(i) > -1)
                    continue outerloop;
                /*if(!x.hasOwnProperty(i)){
                    data.push({name:i+'---', comName: i+'---',description:i, depth:depth})
                    continue outerloop
                }
                for(var p in protoList){//dont show same prop twice
                    if(protoList[p].hasOwnProperty(i))
                        continue outerloop
                }*/
                /* data.push({name:i, comName: i.toLowerCase(),get description function(){
                    dump(this.name);
                    delete this.description;
                    this.description=jn.inspect(autocompleter.object[this.name]);
                    return this.description}
                    , depth:depth}) */
                try {
                    o = targetObj[i];
                    d = jn.inspect(o);
                } catch(e) {
                    d = e.message;
                    o = "error";
                }
                data.push({name: i, comName: i.toLowerCase(), description: d, depth:depth, object: o});
            }
            protoList.push(x);
            x = x.__proto__;
            depth++;
            allProps = allProps.concat(props);

            try {
                if (targetObj instanceof Ci.nsIDOMWindow && "Components" in targetObj) {
                    i = "Components";
                try{
                    d = jn.inspect(targetObj[i]);
                } catch(e){
                    d = e.message;
                }
                data.push({name: i, comName: i.toLowerCase(), description: d, depth: 0});
            }} catch(e) {}

            try {
                if("QueryInterface" in targetObj) {
                    i = "QueryInterface";
                try{
                    d = jn.inspect(targetObj[i]);
                } catch(e) {
                    d = e.message;
                }
                data.push({name: i, comName: i.toLowerCase(), description: d, depth: 0});
            }} catch(e) {}

            return data;
        }
    };
}

/**======================-==-======================*/

// todo: cleanup
var jn = {};

jn.inspect = function(x, isLong) {
    if(x == null)
        return String(x);

    var c, i, l;
    var nameList = [];
    var t = typeof x;
    var Class = Object.prototype.toString.call(x);
    var string = x.toString();
    if (Class == string)
        string = ""; //most objects have same class and toString

    Class = Class.slice(8,-1);

    if (Class === "Function") {
        var isNative = /\[native code\]\s*}$/.test(string); //is native function
        if (!isLong) {
            i = string.indexOf("{");
            if(isNative)
                t = 'function[n]';
            else
                t = 'function';

            return t + string.substring(string.indexOf(" "), i - 1) + "~" + x.length;
        }
        if (isNative) {
            return string.replace("()", "(~" + x.length + ")");
        }
        return	string;
    }
    if(Class === "XML")
        return Class + "`\n" + x.toXMLString();
    if(t !== "object")
        return Class + "`\n" + string;

    if(Class === "Array") {
        l = x.length;
        nameList.push("`" + Class + "` ~" + l);
        l = Math.min(isLong?100:10, l);
        for(i = 0; i < l; i++) {
            nameList.push(x[i].toString());
        }
        return nameList.join(',\n   ');
    }

    nameList.push("`", Class, "`\n", string);
    //special cases
    var h = InspectHandlers[Class];
    if (h)
        return nameList.join("") + h(x);

    try{
        l = x.length;
    } catch(e) {}
    //if(typeof l==='number' && l>0)


    //d.constructor

    //\u25b7'\u25ba'
    if(Class === "Object") {
        c = x.constructor;
        c = c.name;
        if (c && c !== "Object")
            nameList.push(":", c, ":");
    }
    try {
        //for files
        if(c = x.spec || x.path)
            nameList.push(" ", c);
        //for dom nodes
        if((c = x.nodeName || x.name) && (c != string))
            nameList.push(c);

        if(c = x.id)
            nameList.push("#", c);

        if(c = x.className)
            if(typeof c === "string")
                nameList.push(".", c.replace(" ", ".", "g"));

        if((c = x.value || x.nodeValue) && typeof c === "string") {
            if (c.length > 50)
                c = c.substring(0, 50) + '...';
            nameList.push(" =", c.toSource().slice(12,-2));
        }
        if(typeof l === "number")
            nameList.push(' ~', l);
    } catch(e) {}

    if(isLong) {
        var propList = [];
        propList.push("{\n    ");
        for(i in x){
            if(propList.length > 10){
                propList.push('..more..');
                break;
            }
            propList.push(i, ',\n    ');
        }
        propList.push("\n}\n");
        nameList.push(propList.join(''));
    } else if(nameList.length < 6) {
        nameList.push("{");
        for(i in x){
            if(nameList.length > 12)
                break;
            nameList.push(i, ",");
        }
        nameList.push("}");
    }

    return nameList.join("");
};

var InspectHandlers = {
     CSSStyleSheet:function(x)'~'+x.cssRules.length+' ->'+x.href
    ,CSSNameSpaceRule:function(x)x.cssText
    ,CSSStyleRule:function(x)x.cssText
};

var getParent = function(a) {
    var utils = (window.getInterface ||
        window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface)(Ci.nsIDOMWindowUtils);

    function handlerMaker(obj) {
        return {
            getOwnPropertyDescriptor: function(name) {
                var desc = Object.getOwnPropertyDescriptor(obj, name);
                // a trapping proxy's properties must always be configurable
                desc.configurable = true;
                return desc;
            },

            getPropertyDescriptor:  function(name) {
                var desc = Object.getPropertyDescriptor(obj, name); // assumed
                // a trapping proxy's properties must always be configurable
                desc.configurable = true;
                return desc;
            },

            getOwnPropertyNames: function() {
                return Object.getOwnPropertyNames(obj);
            },

            defineProperty: function(name, desc) {
                Object.defineProperty(obj, name, desc);
            },

            delete: function(name) {
                return delete obj[name];
            },

            fix: function() {
                if (Object.isFrozen(obj)) {
                    return Object.getOwnProperties(obj); // assumed
                }
                // As long as obj is not frozen, the proxy won't allow itself to be fixed
                return undefined; // will cause a TypeError to be thrown
            },

            has: function(name) {
                return name in obj;
            },

            hasOwn: function(name) {
                return ({}).hasOwnProperty.call(obj, name);
            },

            get: function(receiver, name) {
                return name === "toString" ? function() {
                    return "[object functionCall proxy]";
                } : obj[name];
            },

            set: function(receiver, name, val) {
                obj[name] = val;
                return true;
            }, // bad behavior when set fails in non-strict mode

            enumerate: function() {
                var result = [];
                for (var name in obj) {
                    result.push(name);
                }
                return result;
            },

            keys: function() {
                return Object.keys(obj);
            }
        };
    }

    var parent = utils.getParent(a);
    if(parent.toString)
        return parent;
    return Proxy.create(handlerMaker(parent));
};

jn.getClass = function(x) {
    return Object.prototype.toString.call(x).slice(8,-1);
};

jn.lookupSetter = function (object,prop) {
    object = FBL.unwrapObject(object);
    var s;
    var ans = [];
    try {
        s = object.__lookupSetter__(prop);
        if(s)
            ans.push(jn.inspect(s, "long").replace(/^.*\)/,"set " + prop + "()"));
        s = object.__lookupGetter__(prop);
        if(s)
            ans.push(jn.inspect(s, "long").replace(/^.*\)/,"get " + prop + "()"));
    } catch(e) {
        Components.utils.reportError(e);
    }
    return ans.join("\n");
};

jn.compare = function(a, b) {
    var ans = [];

    for(let i in a) {
        try{
            try{
                var ai = a[i];
            } catch(e) {
                ai = null;
            }
            try{
                var bi = b[i];
            } catch(e) {
                bi = null;
            }

            if(ai != bi) {
                if(typeof(ai) === "function" && ai.toString() === bi.toString())
                    continue;
                ans.push([i, a[i], b[i]]);
            }
        } catch(e) {
            ans.push([i, ai, bi]);
        }
    }

    return ans;
};

var compareWithPrototype = {
    getProto: function(object){
        var className = jn.getClass(object);
        if (className !== "Object" && className in window) {
            try {
                var proto = window[className].prototype;
            } catch(e) {}
        }

        return proto;
    },

    compare: function(object) {
        return jn.compare(object, object.__proto__);
    }
};


// ************************************************************************************************
/*
var req = new XMLHttpRequest;
    req.open("GET", 'chrome://acebug/content/reference.xml', false);
    try {
        req.send(null);
    } catch (e) {
    }
   doc= req.responseXML;
l=doc.getElementsByTagName('param')


for(var i=l.length;i--;){
l[i].firstChild.replaceWholeText(l[i].firstChild.wholeText.trim())
}

s=new XMLSerializer()

s.serializeToString(doc)


doc.querySelector('[name="scrollMaxX"]')
*/
}});
