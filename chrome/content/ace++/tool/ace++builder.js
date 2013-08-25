#>>
var _define = function(module, deps, payload) {
    if (typeof module !== 'string') {
        if (_define.original)
            _define.original.apply(window, arguments);
        else {
            console.error('dropping module because define wasn\'t a string.');
            console.trace();
        }
        return;
    }

    if (arguments.length == 2)
        payload = deps;

    if (!define.modules)
        define.modules = {};
        
    define.modules[module] = payload;
};
if (global.define)
    _define.original = global.define;
    
global.define = _define;


/**
 * Get at functionality define()ed using the function above
 */
var _require = function(parentId, module, callback) {
    if (Object.prototype.toString.call(module) === "[object Array]") {
        var params = [];
        for (var i = 0, l = module.length; i < l; ++i) {
            var dep = lookup(parentId, module[i]);
            if (!dep && _require.original)
                return _require.original.apply(window, arguments);
            params.push(dep);
        }
        if (callback) {
            callback.apply(null, params);
        }
    }
    else if (typeof module === 'string') {
        var payload = lookup(parentId, module);
        if (!payload && _require.original)
            return _require.original.apply(window, arguments);
        
        if (callback) {
            callback();
        }
    
        return payload;
    }
    else {
        if (_require.original)
            return _require.original.apply(window, arguments);
    }
};

if (global.require)
    _require.original = global.require;
    
global.require = _require.bind(null, "");
global.require.packaged = true;

var normalizeModule = function(parentId, moduleName) {
    // normalize plugin requires
    if (moduleName.indexOf("!") !== -1) {
        var chunks = moduleName.split("!");
        return normalizeModule(parentId, chunks[0]) + "!" + normalizeModule(parentId, chunks[1]);
    }
    // normalize relative requires
    if (moduleName.charAt(0) == ".") {
        var base = parentId.split("/").slice(0, -1).join("/");
        var moduleName = base + "/" + moduleName;
        
        while(moduleName.indexOf(".") !== -1 && previous != moduleName) {
            var previous = moduleName;
            var moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
        }
    }
    
    return moduleName;
}


/**
 * Internal function to lookup moduleNames and resolve them by calling the
 * definition function if needed.
 */
var lookup = function(parentId, moduleName) {

    moduleName = normalizeModule(parentId, moduleName);

    var module = define.modules[moduleName];
    if (module == null) {
        return null;
    }

    if (typeof module === 'function') {
        var exports = {};
        module(_require.bind(this, moduleName), exports, { id: moduleName, uri: '' });
        // cache the resulting module object for next time
        define.modules[moduleName] = exports;
        return exports;
    }

    return module;
};









#>>

function stripComments(str){
    if(str.slice(0,2)=='/*'){
        var j = str.indexOf('*/')+2
        str = str.substr(j)
    }
    return str
}
function textModuleDefine(str){
    str = str.replace('\n','\\\n', 'g').replace('"','\\"', 'g')
    str='define("'+str+'");'
    return str
}
function normalizeModule(parentId, moduleName) {
    // normalize plugin requires
    if (moduleName.indexOf("!") !== -1) {
        var chunks = moduleName.split("!");
        return normalizeModule(parentId, chunks[0]) + "!" + normalizeModule(parentId, chunks[1]);
    }
    // normalize relative requires
    if (moduleName.charAt(0) == ".") {
        var base = parentId.split("/").slice(0, -1).join("/");
        var moduleName = base + "/" + moduleName;
        
        while(moduleName.indexOf(".") !== -1 && previous != moduleName) {
            var previous = moduleName;
            var moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
        }
    }
    
    return moduleName;
}
function getDeps(str,name) {
    var m = str.match(/^.*?require\(\"[^"]+"\)/gm)
    if (!m)
        return []
     
    m1 = []
    for each(var r in m){
        if(!/\s*\/\//.test(r))
            m1.push(r)
    }
    return m1.map(function(r){        
        r=r.slice(r.indexOf("(")+2, -2)
        r = normalizeModule(name, r)
        return r
    })
}

var modules = {}, deps = {}, pending = [], loaded = {}, pluginStr = "ace/requirejs/text!"
function stripPluginStr(name){
	if (name.substring(0, pluginStr.length) == pluginStr)
		name = name.substr(pluginStr.length)
	return name
}
function makeExplicitDefine(name){
    var str = stripComments(modules[name]||"")
	
	var depStr = deps[name] ? ' ["' + deps[name].join('","') + ']' : '[]'
	var depStr = '[]'
	str = str.replace(/require\(\"[^"]+"\)/gm, function(r){
        var i = r.indexOf("(")
        var rel=r.slice(i+2, -2)
        rel = stripPluginStr(rel)
        var abs = normalizeModule(name, rel)
        return r.slice(0, i+2)+abs+r.slice(-2)
    })
	return str.replace('define(', 'define("'+name + '",'+ depStr + ', ')
}
function processModule(name, text){
	var moduleName = stripPluginStr(name)
	if (moduleName != name) {
        var type = "text"
	}
	
	if (type == "text"){
		text = textModuleDefine(text)
		moduleDeps = []
	}else{
		var moduleDeps = getDeps(text, name)
		deps[moduleName] = moduleDeps.map(stripPluginStr)
	}
	modules[moduleName] = text


	loaded[name] = true
	var i = pending.indexOf(name)
	if (i != -1) {
		pending.splice(i, 1)
	}
	moduleDeps.forEach(function(x){
		if(!loaded[x] && pending.indexOf(x)==-1)
			pending.push(x)
	})
	if (pending.length)
		req()
	else
		finishReq()
}
function req() {
    var name = pending[0]
	var url = pluginStr + stripPluginStr(name)	
	
    try {
        processModule(name, require(url))
    }catch(e){
        require([url], function(x) {
			processModule(name, x);
		})
    }
    
}
function finishReq(){
    var str = ""
    for (var mn in modules){
        str+=makeExplicitDefine(mn).trim()+"\n\n"
    }
    env.editor.session.setValue(str)
}

pending = ["ace/lib/fixoldbrowsers", "ace/editor", "ace/virtual_renderer", "ace/undomanager", "ace/theme/textmate"]

loaded = {"ace/layer/gutter":true}
files = {}
files.aceUncompressed = req()
#>>
modules={}
pending = ["ace/mode/html"]
files["mode-html"] = req()

#>>

deps["ace/virtual_renderer"]
getDeps(modules["ace/virtual_renderer"],"***")
#>>

require(pluginStr+"ace/virtual_renderer")
#>>

env.editor.commands.