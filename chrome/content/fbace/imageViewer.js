define('fbace/imageViewer', function(require, exports, module) {

window.imageViewer = exports
exports.showImage = function(data) {
	if(!this.iframe){
		this.iframe = document.createElement('iframe')
		document.body.appendChild(this.iframe)		
	}
	this.iframe.style.display = ''
	this.iframe.style.position='absolute'
	this.iframe.style.width='100%'
	this.iframe.style.height='100%'
	this.iframe.style.background='white'
	this.iframe.style.zIndex='1000'
	
	this.iframe.setAttribute('src', 'view-source:'+data.href)
	
	this.isOpen = true
	
};
exports.hide = function(data) {
	if(!this.iframe){
		return
	}
	this.iframe.style.display = 'none'
	
	this.isOpen = false
};

// Firebug.Ace.win1.imageViewer.showImage

});
