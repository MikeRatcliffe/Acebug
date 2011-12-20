define("ace/theme/crimson_editor",[], function(require, exports, module) {
exports.isDark = false;
exports.cssText = ".ace-crimson-editor .ace_editor {\
  border: 2px solid rgb(159, 159, 159);\
}\
\
.ace-crimson-editor .ace_editor.ace_focus {\
  border: 2px solid #327fbd;\
}\
\
.ace-crimson-editor .ace_gutter {\
  width: 50px;\
  background: #e8e8e8;\
  color: #333;\
  overflow : hidden;\
}\
\
.ace-crimson-editor .ace_gutter-layer {\
  width: 100%;\
  text-align: right;\
}\
\
.ace-crimson-editor .ace_gutter-layer .ace_gutter-cell {\
  padding-right: 6px;\
}\
\
.ace-crimson-editor .ace_print_margin {\
  width: 1px;\
  background: #e8e8e8;\
}\
\
.ace-crimson-editor .ace_text-layer {\
  cursor: text;\
  color: rgb(64, 64, 64);\
}\
\
.ace-crimson-editor .ace_cursor {\
  border-left: 2px solid black;\
}\
\
.ace-crimson-editor .ace_cursor.ace_overwrite {\
  border-left: 0px;\
  border-bottom: 1px solid black;\
}\
\
.ace-crimson-editor .ace_line .ace_invisible {\
  color: rgb(191, 191, 191);\
}\
\
.ace-crimson-editor .ace_line .ace_identifier {\
  color: black;\
}\
\
.ace-crimson-editor .ace_line .ace_keyword {\
  color: blue;\
}\
\
.ace-crimson-editor .ace_line .ace_constant.ace_buildin {\
  color: rgb(88, 72, 246);\
}\
\
.ace-crimson-editor .ace_line .ace_constant.ace_language {\
  color: rgb(255, 156, 0);\
}\
\
.ace-crimson-editor .ace_line .ace_constant.ace_library {\
  color: rgb(6, 150, 14);\
}\
\
.ace-crimson-editor .ace_line .ace_invalid {\
  text-decoration: line-through;\
  color: rgb(224, 0, 0);\
}\
\
.ace-crimson-editor .ace_line .ace_fold {\
}\
\
.ace-crimson-editor .ace_line .ace_support.ace_function {\
  color: rgb(192, 0, 0);\
}\
\
.ace-crimson-editor .ace_line .ace_support.ace_constant {\
  color: rgb(6, 150, 14);\
}\
\
.ace-crimson-editor .ace_line .ace_support.ace_type,\
.ace-crimson-editor .ace_line .ace_support.ace_class {\
  color: rgb(109, 121, 222);\
}\
\
.ace-crimson-editor .ace_line .ace_keyword.ace_operator {\
  color: rgb(49, 132, 149);\
}\
\
.ace-crimson-editor .ace_line .ace_string {\
  color: rgb(128, 0, 128);\
}\
\
.ace-crimson-editor .ace_line .ace_comment {\
  color: rgb(76, 136, 107);\
}\
\
.ace-crimson-editor .ace_line .ace_comment.ace_doc {\
  color: rgb(0, 102, 255);\
}\
\
.ace-crimson-editor .ace_line .ace_comment.ace_doc.ace_tag {\
  color: rgb(128, 159, 191);\
}\
\
.ace-crimson-editor .ace_line .ace_constant.ace_numeric {\
  color: rgb(0, 0, 64);\
}\
\
.ace-crimson-editor .ace_line .ace_variable {\
  color: rgb(0, 64, 128);\
}\
\
.ace-crimson-editor .ace_line .ace_xml_pe {\
  color: rgb(104, 104, 91);\
}\
\
.ace-crimson-editor .ace_marker-layer .ace_selection {\
  background: rgb(181, 213, 255);\
}\
\
.ace-crimson-editor .ace_marker-layer .ace_step {\
  background: rgb(252, 255, 0);\
}\
\
.ace-crimson-editor .ace_marker-layer .ace_stack {\
  background: rgb(164, 229, 101);\
}\
\
.ace-crimson-editor .ace_marker-layer .ace_bracket {\
  margin: -1px 0 0 -1px;\
  border: 1px solid rgb(192, 192, 192);\
}\
\
.ace-crimson-editor .ace_marker-layer .ace_active_line {\
  background: rgb(232, 242, 254);\
}\
\
.ace-crimson-editor .ace_meta.ace_tag {\
  color:rgb(28, 2, 255);\
}\
\
.ace-crimson-editor .ace_marker-layer .ace_selected_word {\
  background: rgb(250, 250, 255);\
  border: 1px solid rgb(200, 200, 250);\
}\
\
.ace-crimson-editor .ace_string.ace_regex {\
  color: rgb(192, 0, 192);\
}";

exports.cssClass = "ace-crimson-editor";

    var dom = require("ace/lib/dom");
    dom.importCssString(exports.cssText);

});

