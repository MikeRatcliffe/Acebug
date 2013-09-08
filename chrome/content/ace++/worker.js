define("ace++/worker", function(require, exports, module) {

window.__defineGetter__("document", function() {
    delete window.document
    return 1
})
importScripts("worker-coffee.js")

var Js = require("ace/mode/javascript_worker").JavaScriptWorker
var Cf = require("ace/mode/coffee_worker").Worker
var Mirror = require("ace/worker/mirror").Mirror;
var oop = require("ace/lib/oop");

var ConsoleWorker = exports.ConsoleWorker = function(sender) {
    var fakeSender = {
        on: function() {},
        emit: function(name, e) {           
            this.result = name == "error" ? [e] : e
        },
        result: []
    }
    var js = new Js(fakeSender)
    var cf = new Cf(fakeSender)
    var ls //todo
    
    var val = "", lang = js
    js.doc.getValue = cf.doc.getValue = function() {
        return val
    }
    
    this.readErrors = function(err, start) {
        if (!lang) return
        lang.onUpdate();
        errors = fakeSender.result;
        fakeSender.result = null;
        if (!errors || ! errors.forEach) return
        errors.forEach(function(e) {
            if (e) e.row += start
        })
        err.push.apply(err, errors);
    }
    
    var delimiter = '#>>'
    
    this.onUpdate = function() {
        var lines = this.doc.$lines;
        var errors = [];

        val = ""; lang = js; start = 0;
        for (var i = 0, n = lines.length; i < n; i++){
            var line = lines[i]
            if (line.lastIndexOf(delimiter, 0) === 0) {
                val && this.readErrors(errors, start)
                start = i + 1
                val = ""
                var m = /lang=(\w)/.exec(line)
                if (m)
                    lang = m[1] === "j" ? js : m[1] === "c" ? cf : null;
            } else {
                val += line + "\n"
            }
        }
        val && this.readErrors(errors, start);
        
        this.sender.emit("jslint", errors);
    }
    
    Mirror.call(this, sender);
    this.setTimeout(500);
}
oop.inherits(ConsoleWorker, Mirror);

(function() {

}).call(ConsoleWorker.prototype)

