define('fbace/imageViewer', function(require, exports, module) {

if (window.imageViewer)
    return

window.imageViewer = exports;
exports.showImage = function(data) {
    if (!this.iframe) {
        this.iframe = document.createElement('iframe');
        this.iframe.style.position = 'absolute';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.background = 'white';
        this.iframe.style.zIndex = '1000';
        document.body.appendChild(this.iframe)

        this.buttons = document.getElementById('source-buttons')
    }
    this.iframe.style.display = '';
    // this.buttons.style.display = '';

    this.iframe.setAttribute('src', 'view-source:' + data.href);
	this.iframe.className=""
	this.iframe.parentNode.appendChild(this.iframe)
    this.isOpen = true;

};

exports.hide = function(data) {
    if (!this.iframe) {
        return;
    }
    this.iframe.style.display = 'none';
    this.isOpen = false;
};

// Firebug.Ace.win1.imageViewer.showImage

});
