function softTabsClicked(onload) {
    var softTabsEl = document.getElementById("abSoftTabs");
    var tabSizeEl = document.getElementById("abTabSize");
    var abTabSizeLbl = document.getElementById("abTabSizeLbl");

    if(onload) {
        tabSizeEl.disabled = !softTabsEl.checked;
        abTabSizeLbl.disabled = !softTabsEl.checked;
    } else {
        tabSizeEl.disabled = softTabsEl.checked;
        abTabSizeLbl.disabled = softTabsEl.checked;
    }
}

function reportAcebugIssue() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator);
	var mainWindow = wm.getMostRecentWindow("navigator:browser");
	mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab("https://github.com/MikeRatcliffe/Acebug/issues");
}