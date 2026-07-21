const _1334uwu = function _1(md){return(
md`# Secure random ID

~~~js
import {randomId} from '@tomlarkworthy/randomid'
~~~

`
)};
const _11npmwz = function _example(randomId){return(
randomId()
)};
const _1oo0ou8 = function _randomId(){return(
(len = 8) => {
  // From 'https://observablehq.com/@tomlarkworthy/randomid'
  // Avoid / and + and - and _ typof chars seen in base64
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var array = new Uint32Array(len);
  window.crypto.getRandomValues(array);
  return [...array].map((v) => chars[v % chars.length]).join("");
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1334uwu", null, ["md"], _1334uwu);  
  $def("_11npmwz", "example", ["randomId"], _11npmwz);  
  $def("_1oo0ou8", "randomId", [], _1oo0ou8);
  return main;
}