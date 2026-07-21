const _oz61oo = function _1(md){return(
md`# Firestore Messaging`
)};
const _1rax0fb = function _https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js() {
    return import('https://www.gstatic.com/firebasejs/9.9.2/firebase-messaging.js');
};
const _16c11wk = function _deleteToken(https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js){return(
https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js['deleteToken']
)};
const _10nvx3e = function _getMessaging(https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js){return(
https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js['getMessaging']
)};
const _1pyxbxh = function _getToken(https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js){return(
https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js['getToken']
)};
const _8su33y = function _isSupported(https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js){return(
https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js['isSupported']
)};
const _dezvi4 = function _onMessage(https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js){return(
https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js['onMessage']
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_oz61oo", null, ["md"], _oz61oo);  
  $def("_1rax0fb", "https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js", [], _1rax0fb);  
  $def("_16c11wk", "deleteToken", ["https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js"], _16c11wk);  
  $def("_10nvx3e", "getMessaging", ["https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js"], _10nvx3e);  
  $def("_1pyxbxh", "getToken", ["https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js"], _1pyxbxh);  
  $def("_8su33y", "isSupported", ["https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js"], _8su33y);  
  $def("_dezvi4", "onMessage", ["https___www_gstatic_com_firebasejs_9_9_2_firebase_messaging_js"], _dezvi4);
  return main;
}