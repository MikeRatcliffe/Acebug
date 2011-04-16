parseJSFragment: function(evalString) {
        var i0, next;
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
                        if (stack.pop() !== next)
                            return;
                        //print(next + "bb2");
                    break;
                    default:
                        //print(next+22);
                        if (stack.length === 0)
                            return;
                }
            }
        ++i;
        };

        skipWord();
        var it = i;
        this.specFunc = false;
        if (next === ".") {
            skipStacks();
            i++;
        } else if (next === "(") {
            var irestore = i;
            i--;
            skipWord();
            dump('-->', next, i0, i, it);
            var funcName = evalString.substring(i+1, it);
            if (funcName && "getAttribute,setAttribute,hasAttribute,removeAttribute".indexOf(funcName) !== -1) {
                var jsf = this.parseJSFragment(evalString.substring(0, i + 1))[0];
                dump(jsf,funcName,evalString.substr(it+1));
                this.specFunc = [jsf,funcName];
            } else if (funcName === "getElementById" || funcName === "getElementsByClassName" || funcName === "$") {
                this.specFunc=["", funcName];
            }
            i = irestore;
        }
        return [evalString.substr(i, it-i), evalString.substr(it + 1)];
    },




// Demo code (the actual new parser character stream implementation)

function StringStream(string) {
  this.pos = 0;
  this.string = string;
}

StringStream.prototype = {
  done: function() {return this.pos >= this.string.length;},
  peek: function() {return this.string.charAt(this.pos);},
  next: function() {
    if (this.pos < this.string.length)
      return this.string.charAt(this.pos++);
  },
  eat: function(match) {
    var ch = this.string.charAt(this.pos);
    if (typeof match == "string") var ok = ch == match;
    else var ok = ch && match.test ? match.test(ch) : match(ch);
    if (ok) {this.pos++; return ch;}
  },
  eatWhile: function(match) {
    var start = this.pos;
    while (this.eat(match));
    if (this.pos > start) return this.string.slice(start, this.pos);
  },
  backUp: function(n) {this.pos -= n;},
  column: function() {return this.pos;},
  eatSpace: function() {
    var start = this.pos;
    while (/\s/.test(this.string.charAt(this.pos))) this.pos++;
    return this.pos - start;
  },
  match: function(pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      function cased(str) {return caseInsensitive ? str.toLowerCase() : str;}
      if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
        if (consume !== false) this.pos += str.length;
        return true;
      }
    }
    else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && consume !== false) this.pos += match[0].length;
      return match;
    }
  }
};




sillyParser={
    parse: function() {
        var i, i0, prev;
        var rx=/[\w$\-\[\]\(\)]/;
        var skipWord = function() {
            i0 = i;
            while(rx.test(prev = str.charAt(i)))
                i--;
        };
        var str = codebox.value;
        i = codebox.selectionStart - 1;
        prev = str.charAt(i);

        //*************
        skipWord();
        var curWord = str.substring(i + 1, i0 + 1);
        var termChar = prev;
        //****************
        var colonSeen, mode;
        if (prev == ':' && str.charAt(i - 1) == ':') {
            termChar = '::';
            mode = 'selector';
            return [mode,termChar,curWord]
        }
        if (prev == ' ') {
            var j = i;
            while(str.charAt(--j) == ' ');
            if (str.charAt(j) && !rx.test(str.charAt(j)))
                termChar=str.charAt(j);
        }
        if (prev==':')
            colonSeen = true;

        while(prev = str.charAt(i--)) {
            //dump(prev,i)
            if (prev == '}') {
                mode = 'selector';
                return [mode, termChar, curWord]
            } else if (prev == ':') {
                colonSeen = true;
                iColon = i;
            } else if (prev==';' || prev=='{') {
                mode = colonSeen? 'propValue' : 'propName';
                if (colonSeen) {
                    return [mode, termChar, curWord, str.substring(i+2, iColon + 1).trim()];
                }
                return [mode, termChar, curWord];

            }
        }
        return  ['selector',termChar,curWord]

    },

    complete: function(im) {
        var t = Date.now();
        clearTimeout(this.timeout);
        if (!im) {
            this.timeout = setTimeout(function() {
                sillyParser.complete(true);
            }, 100);
            return;
        }
        var p = this.parse();

        document.getElementById('autobox').value = p.join('\n');
        completionProvider.tree = document.getElementById('autotree');
        dump(t-Date.now());
        completionProvider[p[0]](p);
        completionProvider.setView();
    },

};

completionProvider={
    propName: function(fragment) {
        if (!gCSSProperties.keys) {
            var table = [];
            for(var i in gCSSProperties) {
                table.push({name: i});
            }
            gCSSProperties.keys = table;
        }
        this.filter(gCSSProperties.keys,fragment[2]);
    },

    propValue: function(fragment) {
        var i;
        var a = gCSSProperties[fragment[3]];
        if (!a)
            return [];

        var table = [];
        for each(i in a.initial_values) {
            table.push({name: i});
        }
        for each(i in a.other_values) {
            table.push({name: i});
        }

        this.filter(table, fragment[2]);
    },

    selector: function(fragment) {
        var i;
        var table = [];

        if (fragment[1] == ':') {
            for each(i in mozPseudoClasses) {
                table.push({name: i});
            }
            for each(i in pseudoClasses) {
                table.push({name: i});
            }
            for each(i in pseudoElements) {
                table.push({name: i});
            }
        }

        this.filter(table, ':' + fragment[2]);
    },

    filter: function(data, text) {
        var table = [];
        if (!text) {
            data.forEach(function(val) {
                table.push(val);
            });
            //table.sort()
            this.sortedArray = table;
            return;
        }
        var filterText = text.toLowerCase();
        var filterTextCase = this.text;

        //**funcs*****/
        function springyIndex(val) {
            var lowVal = val.name; //.comName
            var priority = 0, lastI = 0, ind1 = 0;
            if (val.name.indexOf(filterTextCase) === 0) {
                val.priority = -2;
                table.push(val);
                return; //exact match
            }
            for(var j=0; j < filterText.length; j++) {
                lastI = lowVal.indexOf(filterText[j],ind1);
                if (lastI===-1)
                    break;//doesn't match
                priority += lastI - ind1;
                ind1 = lastI + 1;
            }
            if (lastI != -1) {
                val.priority = priority;
                table.push(val);
            }
        }

        function sorter(a, b) {
            if (!a.special && b.special) return 1;
            if (a.special && !b.special) return -1; //???
            for each(var i in sortVals) {
              if (a[i] < b[i]) return -1;
              if (a[i] > b[i]) return 1;
            }
            return 0;
        }
        var sortVals = ['priority', 'depth', 'name'];

        data.forEach(springyIndex);
        table.sort(sorter);
        this.sortedArray = table;
    },

    setView: function(si) {
        if (typeof si !== 'number')
            si = this.tree.currentIndex;
        this.tree.view = new treeView(this.sortedArray);
        this.tree.view.selection.select(si);
        this.tree.treeBoxObject.ensureRowIsVisible(si);
        //this.number.value=si+':'+this.sortedArray.length+'/'+this.unfilteredArray.length;
    },
};
