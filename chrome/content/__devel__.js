//var orig=FBL.ns
FBL.ns=function(a){alert(5);a()}

s=document.createElementNS('http://www.w3.org/1999/xhtml', "script")
s.type = "text/javascript;version=1.8";
s.src = 'chrome://acebug/content/autocompleter.js'
s.onlad = dump

document.documentElement.appendChild(s)