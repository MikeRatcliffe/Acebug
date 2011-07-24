Firebug.unregisterRep(FirebugReps.Func)

;(function(){
    rule = '.funcRepToggle{\
        background: url(chrome://firebug/skin/tabMenuTarget.png);\
        cursor: pointer;\
        width: 0.9em;\
        height: 0.9em;\
        display: inline-block\}'

    rule1 = '.funcRepToggle{'+
        'border-color: RosyBrown transparent transparent;'+
        'border-style: solid;'+
        'border-width: 9px 6px 0 0;'+
        'display: inline-block;'+
        'height: 1px;'+
        'width: 1px;}'
    rule2 = '.funcRepToggle:hover{'+
        'border-color: blue transparent transparent;'+
        'border-style: solid;'+
        'border-width: 9px 0 0 6px;'+
        'display: inline-block;'+
        'height: 1px;'+
        'width: 1px;}'

    ;[{prototype:{}}, {prototype:{parentPanel:true}}].forEach(function(x){
        var st = Firebug.chrome.getPanelDocument(x).styleSheets[0]
        st.insertRule(rule1, st.cssRules.length)
        st.insertRule(rule2, st.cssRules.length)
    })
})()

with(FBL){
FirebugReps.Func = domplate(Firebug.Rep,
{
    shortTag:
        FirebugReps.OBJECTLINK("$object|summarizeFunction2"),
    tag:
        SPAN(FirebugReps.OBJECTLINK("$object|summarizeFunction"),
            SPAN({
                onclick:'$openPopup',
                class:'funcRepToggle'
            })
        ),

    summarizeFunction: function(fn)
    {
        var fnText = safeToString(fn);
        var namedFn = /^function ([^(]+\([^)]*\)) \{/.exec(fnText);
        var anonFn  = /^function \(/.test(fnText);
        return namedFn ? namedFn[1] : (anonFn ? "function()" : fnText);
    },

    summarizeFunction2: function(fn)
    {
        var fnText = safeToString(fn);
        var namedFn = /^function ([^(]+\([^)]*\)) \{/.exec(fnText);
        var anonFn  = /^function \(/.test(fnText);
        return fnText;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    openPopup: function(event){
        var p = Firebug.chrome.$('fbDomFly')
        if (!p) {
            var doc=Firebug.chrome.window.document
            p=doc.documentElement.appendChild(doc.createElement('panel'))
            p.id='fbDomFly'
            p.setAttribute('contextmenu','fbContextMenu')
        }
        FBL.eraseNode(p)
        var n1 = p.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","pre");
        n1.style.cssText=o='-moz-user-select: text;-moz-user-focus:normal;overflow:auto;max-width:'
        +screen.width/2+'px;max-height:'+screen.height/2+'px;margin:0'

        n1.style.display='-moz-box'
        n1.style.position='absolute'
        p.appendChild(n1)
        n=p.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","pre");
        n.style.cssText=o
        //n.className="fbPopupTitle"
        n.textContent=event.target.previousSibling.repObject.toString()
        n1.appendChild(n)
        p.ownerPanel=FirebugReps.Func
        p.openPopup(event.target)

    },
    copySource: function(fn)
    {
        if (fn && typeof (fn['toSource']) == 'function')
            copyToClipboard(fn.toString());
    },

    monitor: function(fn, monitored)
    {
        if (monitored)
            Firebug.Debugger.unmonitorFunction(fn,  "monitor");
        else
            Firebug.Debugger.monitorFunction(fn, "monitor");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    className: "function",

    supportsObject: function(object, type)
    {
        return type == "function";
    },

    inspectObject: function(fn, context)
    {
        var sourceLink = findSourceForFunction(fn, context);
        if (sourceLink)
            Firebug.chrome.select(sourceLink);
        if (FBTrace.DBG_FUNCTION_NAME)
            FBTrace.sysout("reps.function.inspectObject selected sourceLink is ", sourceLink);
    },

    getTooltip: function(fn, context)
    {
        var script = findScriptForFunctionInContext(context, fn);
        if (script)
            return $STRF("Line", [normalizeURL(script.fileName), script.baseLineNumber]);
        else
            if (fn.toString)
                return fn.toString();
    },

    getTitle: function(fn, context)
    {
        var name = fn.name ? fn.name : "function";
        return name + "()";
    },

    getContextMenuItems: function(fn, target, context, script)
    {
        if (!script)
            script = findScriptForFunctionInContext(context, fn);
        if (!script)
            return;

        var scriptInfo = Firebug.SourceFile.getSourceFileAndLineByScript(context, script);
        var monitored = scriptInfo ? fbs.isMonitored(scriptInfo.sourceFile.href, scriptInfo.lineNo) : false;

        var name = script ? getFunctionName(script, context) : fn.name;
        return [
            {label: "CopySource++", command: bindFixed(this.copySource, this, fn) },
            "-",
            {label: $STRF("ShowCallsInConsole", [name]), nol10n: true,
             type: "checkbox", checked: monitored,
             command: bindFixed(this.monitor, this, fn, monitored) }
        ];
    }
});
}
Firebug.registerRep(FirebugReps.Func)

