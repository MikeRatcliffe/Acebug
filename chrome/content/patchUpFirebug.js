;(function(){
	var t = Firebug.Reps.SourceLink.inspectObject
	Firebug.Reps.SourceLink.inspectObject
	Firebug.Reps.SourceLink.inspectObject = function(sourceLink, context){
		if (sourceLink.type == "ace") {
			// Firebug.chrome.selectPanel("console")
			var editor = Firebug.Ace.win2.editor
            var row = sourceLink.line - 1
            var lineText = editor.session.getLine(row)
			
			if (sourceLink.object && lineText.indexOf(sourceLink.object) != -1)
				return editor.gotoLine(row)
		}
		Firebug.Reps.SourceLink.inspectObject.original(sourceLink, context)
	}
	Firebug.Reps.SourceLink.inspectObject.original = t
	t = null
})()




