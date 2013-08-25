/*
 * This is a JavaScript Scratchpad.
 *
 * Enter some JavaScript, then Right Click or choose from the Execute Menu:
 * 1. Run to evaluate the selected text (Ctrl+R),
 * 2. Inspect to bring up an Object Inspector on the result (Ctrl+I), or,
 * 3. Display to insert the result in a comment after the selection. (Ctrl+L)
 */

t=makeReq("https://raw.github.com/einars/js-beautify/master/js/lib/beautify.js")+
makeReq("https://raw.github.com/einars/js-beautify/master/js/lib/beautify-css.js")+
makeReq("https://raw.github.com/einars/js-beautify/master/js/lib/beautify-html.js")

f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
f.initWithPath("D:\\ffaddons\\shadia-the-light@inspector.am\\chrome\\ace++\\res\\beautify.js")

writeToFile(f, t)


t=makeReq("https://raw.github.com/jashkenas/coffee-script/master/extras/coffee-script.js")
f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
f.initWithPath("D:\\ffaddons\\shadia-the-light@inspector.am\\chrome\\ace++\\res\\coffee-script.js")

writeToFile(f, t)





t=makeReq("https://raw.github.com/gkz/LiveScript/master/extras/livescript.js")
f=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
f.initWithPath("D:\\ffaddons\\shadia-the-light@inspector.am\\chrome\\ace++\\res\\livescript.js")

writeToFile(f, t)

1


sshfs mechins:Ma7aK:3bd@www.mechins.sci.am:22022 ftpmount/