define("fbace/worker", function(require, exports, module) {

var lint = require("ace/worker/jshint").JSHINT;


var callWhenIdle = function(fcn) {
    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var deferred = function(timeout) {
        if (timer != null)
            deferred.cancel();
        timer = setTimeout(callback, timeout||0);

        return deferred;
    }

    deferred.schedule = deferred;

    deferred.call = function() {
        this.cancel();
        fcn();
        return deferred;
    };

    deferred.cancel = function() {
        clearTimeout(timer);
        timer = null;
        return deferred;
    };

    return deferred;
};

var delimiter = '#>>'
var dl = delimiter.length

exports.ConsoleWorker = function(session) {
    this.lintOptions = acebugOptions.lintOptions || {undef: false, onevar: false, passfail: false, asi: true}

    this.session = session;
    this.deferredUpdate = callWhenIdle(this.updateAnnotations.bind(this));

    this.session.$annotations = {}
    this.onUpdate = this.onUpdate.bind(this)
    session.on("change", this.onUpdate);
};

(function() {
    this.$timeout = 600;

    this.setTimeout = function(timeout) {
        this.$timeout = timeout;
    };

    this.onUpdate = function(e) {
        var range = e.data.range;

        if (range.end.row != range.start.row)
            this.session.setAnnotations([])
        else
            delete this.session.$annotations[range.start.row]
        this.deferredUpdate.schedule(this.$timeout);
    };

    this.updateAnnotations = function() {
        var lines = this.session.doc.$lines;
        var errors = [];

        var startTime = new Date();
        var n = lines.length
        for (var start = 0, end = 0; end < n; end++){
            if (lines[end].slice(0, dl) != delimiter)
            //if (!this.session.getState(end).isHeader)
                continue;

            if (start < end){
                if (this.session.getState(start).lang == 'js')
                    this.lintJS(errors, lines.slice(start, end).join('\n'), start);
                else
                    this.lintCoffee(errors, lines.slice(start, end).join('\n'), start);
            }

            while (end < n && this.session.getState(end).isHeader)
                end++;
            start = end;
        }

        if (start < end){
            if (this.session.getState(start).lang == 'js')
                this.lintJS(errors, lines.slice(start, end).join('\n'), start)
            else
                this.lintCoffee(errors, lines.slice(start, end).join('\n'), start)
        }

        // console.log("lint time: " + (new Date() - startTime));

        this.session.setAnnotations(errors)
    }

    this.lintJS = function(errors, value, startLineNumber){
        lint(value, this.lintOptions)

        for (var i=0; i < lint.errors.length; i++) {
            var error = lint.errors[i];
            if (error)
                errors.push({
                    row: error.line-1+startLineNumber,
                    column: error.character-1,
                    text: error.reason,
                    type: error.reason.slice(0, 9) == 'Stopping,'? "error": "warning",
                    lint: error
                })
        }
    }

    this.lintCoffee = function(errors, value, startLineNumber){
        try {
            coffeeScriptCompiler.compile(value, {bare: true})
        } catch(e) {
            var m = e.message.match(/Parse error on line (\d+): (.*)/);
            if (m) {
                errors.push({
                    row: parseInt(m[1]) - 1 + startLineNumber,
                    column: null,
                    text: m[2],
                    type: "error"
                });
            }
            if (e instanceof SyntaxError) {
                var m = e.message.match(/ on line (\d+)/);
                if (m) {
                    errors.push({
                        row: parseInt(m[1]) - 1 + startLineNumber,
                        column: null,
                        text: e.message.replace(m[0], ""),
                        type: "error"
                    });
                }
            }
        }
    }

    this.terminate = function() {
        session.clearAnnotations();
        session.removeEventListener("change", this.onUpdate)
    };

}).call(exports.ConsoleWorker.prototype);

})


