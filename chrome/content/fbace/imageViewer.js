define('fbace/imageViewer', function(require, exports, module) {

window.imageViewer = exports
exports.showImage = function(data) {
	if(!this.iframe){
		this.iframe = document.createElement('iframe')
		//this.iframe.visibility = 'collapse'
		document.body.appendChild(this.iframe)		
	}
	this.iframe.setAttribute('src', data.href)
};

// Firebug.Ace.win1.imageViewer.showImage
// Firebug.Ace.win1.imageViewer.iframe.style.position='absolute'
// Firebug.Ace.win1.imageViewer.iframe.style.width='100%'
// Firebug.Ace.win1.imageViewer.iframe.style.height='100%'
// Firebug.Ace.win1.imageViewer.iframe.style.background='lightblue'
// Firebug.Ace.win1.imageViewer.iframe.style.zIndex='1000'
});
