const _26bzme = function _1(md){return(
md`# Tom Services Footer

~~~js
import {footer} from "@tomlarkworthy/footer"
~~~
`
)};
const _5psd29 = function _footer(exporter){return(
exporter()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  $def("_26bzme", null, ["md"], _26bzme);  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_5psd29", "footer", ["exporter"], _5psd29);
  return main;
}