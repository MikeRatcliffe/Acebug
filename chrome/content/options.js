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
