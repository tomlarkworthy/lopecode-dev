const _1334uwu = function _1(md){return(
md`# Secure random ID

~~~js
import {randomId} from '@tomlarkworthy/randomid'
~~~

`
)};
const _1f76wdz = function _chars(){return(
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
)};
const _11npmwz = function _example(randomId){return(
randomId()
)};
const _68e296 = function _randomId(chars){return(
(len = 8) => {
  var array = new Uint32Array(len);
  window.crypto.getRandomValues(array);
  return [...array].map(v => chars[v % chars.length]).join('');
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1334uwu", null, ["md"], _1334uwu);  
  $def("_1f76wdz", "chars", [], _1f76wdz);  
  $def("_11npmwz", "example", ["randomId"], _11npmwz);  
  $def("_68e296", "randomId", ["chars"], _68e296);
  return main;
}