function softTabsClicked(onload) {
    var softTabsEl = document.getElementById("abSoftTabs");
    var tabSizeEl = document.getElementById("abTabSize");
    var abTabSizeLbl = document.getElementById("abTabSizeLbl");

    if (onload) {
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

function makeReq(href) {
    var req = new XMLHttpRequest;
    req.overrideMimeType("text/plain");
    req.open("GET", href, false);
    try {
        req.send(null);
    } catch (e) {
    }
    return req.responseText;
}

function getThemeNames() {
    var str = makeReq('chrome://acebug/content/ace++/res/ace');
    var themeNames = str.match(/theme-.*\.js/g).map(function(x) {
        return x.slice(6, -3);
    });
    themeNames.push('textmate');
    return themeNames.sort();
}

function addAllThemes() {
    var item;
    var themePref = document.getElementById('abTheme');
    var popup = themePref.firstChild;
    var allThemes = getThemeNames();
    var items = popup.children;
    for(var i = items.length; i--;) {
        item = items[i];
        var name = item.getAttribute("value").substr("ace/theme/".length);
        var j = allThemes.indexOf(name);
        if (j >= 0)
            allThemes.splice(j, 1);
    }
    allThemes.forEach(function(x) {
        var prettyName = x.replace(/^./, function(m) {
            return m.toUpperCase();
        }).replace(/_./g, function(m) {
            return ' ' + m[1].toUpperCase();
        });

        item = document.createElement('menuitem');
        item.setAttribute("value", "ace/theme/"+x);
        item.setAttribute("label", prettyName);
        popup.appendChild(item);
    });

    document.documentElement.firstElementChild.preferenceForElement(themePref).setElementValue(themePref);
}
addAllThemes();