define(function(require, exports, module) {

exports.launch = function(env) {
	//since we are using separate window make everything global for now
    window.env = env;
    event = require("pilot/event");
    Editor = require("ace/editor").Editor;
    Renderer = require("ace/virtual_renderer").VirtualRenderer;
    theme = require("ace/theme/textmate");
    EditSession = require("ace/edit_session").EditSession;
    UndoManager = require("ace/undomanager").UndoManager;
    
	JavaScriptMode = require("ace/mode/javascript").Mode;
	// worker is more of nuisance now
	JavaScriptMode.prototype.createWorker = function(session) {
        return null;
    };
	

    var vim = require("ace/keyboard/keybinding/vim").Vim;
    var emacs = require("ace/keyboard/keybinding/emacs").Emacs;
    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
  
	//empty gutter is annoying, so put space into document
    jsDoc = new EditSession(' ');
    jsDoc.setMode(new JavaScriptMode());
    jsDoc.setUndoManager(new UndoManager());

   


    var container = document.getElementById("editor");
	//TODO: Editor focuses itself on creation, try to find workaround or change this in ace
    editor = env.editor = new Editor(new Renderer(container, theme));
    env.editor.setSession(jsDoc);

   
    function onResize() {
        env.editor.resize();
    };

    window.onresize = onResize;
    onResize();
	
	//do we need to prevent dragging?
	event.addListener(container, "dragover", function(e) {
        return event.preventDefault(e);
    });

    event.addListener(container, "drop", function(e) {
        return event.preventDefault(e);
    });
 
		
	// global functions
	toggleGutter=function() {
		env.editor.renderer.setShowGutter(!env.editor.renderer.showGutter);
	}
	/*custom = new HashHandler({
          "gotoright": "Tab"
    })*/
	// TODO: use hashandler
	editor.addCommand=function(x){
		var conf=editor.keyBinding.config
		delete conf.reverse
		canon.addCommand({
			name: x.name,
			exec: function(env, args, request) { 
				x.exec(env, args)
			}
		});
		conf[x.name]=x.key
		editor.keyBinding.setConfig(conf)
	}
	
};

});
