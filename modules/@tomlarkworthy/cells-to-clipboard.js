const _y5656o = function _1(md){return(
md`# Save source to clipboard

\`\`\`js
import {cellsToClipboard} from '@tomlarkworthy/cells-to-clipboard'
\`\`\`

Fork of [@tophtucker/generate-copied-cells](https://observablehq.com/@tophtucker/generate-copied-cells) to expose just the raw function. It won't work unless its executing during event handling
`
)};
const _11ad3zw = function _2(copyCellButton){return(
copyCellButton(["x = Math.sin(now / 1000)", "y = Math.round(x * 10)"])
)};
const _22fbf0 = function _3(copyCellButton){return(
copyCellButton([{type: "md", value: "# Hello"}, "now"])
)};
const _1sqtx83 = function _4(md){return(
md`Once you click “Copy cells”, press Esc to focus the main page and then Cmd-V.`
)};
const _10uloef = function _5(md){return(
md`---
## Implementation`
)};
const _1seifpc = function _cellsToClipboard(makeCell){return(
(cells) => {
  function listener(e) {
    e.clipboardData.setData("text/plain", cells.join("\n\n"));
    e.clipboardData.setData(
      "application/vnd.observablehq+json",
      JSON.stringify(cells.map(makeCell))
    );
    e.preventDefault();
  }
  document.addEventListener("copy", listener);
  document.execCommand("copy");
  document.removeEventListener("copy", listener);
}
)};
const _1i8jhrq = function _copyCellButton(Inputs,cellsToClipboard){return(
(cells) =>
  Inputs.button("Copy cells", { reduce: () => cellsToClipboard(cells) })
)};
const _1ud4fa1 = function _makeCell($0,defaultJS,defaultOther){return(
value => {
  const id = $0.value++;
  if (typeof value === 'string') {
    return {
      ...defaultJS,
      id,
      value
    };
  } else if (typeof value === 'object') {
    if (value.type === 'js')
      return {
        ...defaultJS,
        id,
        ...value
      };
    return {
      ...defaultOther,
      id,
      ...value
    };
  } else {
    throw new Error('Value must be string or object');
  }
}
)};
const _h1t91h = function _defaultJS(){return(
{
  id: 0,
  value: "",
  pinned: true,
  mode: "js",
  data: null,
  name: null
}
)};
const _but2s9 = function _defaultOther(){return(
{
  id: 0,
  value: "",
  pinned: false,
  mode: "md",
  data: null,
  name: ""
}
)};
const _lj7470 = function _id(){return(
0
)};
const _1bwa5dj = (M, _) => new M(_);
const _mshfha = _ => _.generator;

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_y5656o", null, ["md"], _y5656o);  
  $def("_11ad3zw", null, ["copyCellButton"], _11ad3zw);  
  $def("_22fbf0", null, ["copyCellButton"], _22fbf0);  
  $def("_1sqtx83", null, ["md"], _1sqtx83);  
  $def("_10uloef", null, ["md"], _10uloef);  
  $def("_1seifpc", "cellsToClipboard", ["makeCell"], _1seifpc);  
  $def("_1i8jhrq", "copyCellButton", ["Inputs","cellsToClipboard"], _1i8jhrq);  
  $def("_1ud4fa1", "makeCell", ["mutable id","defaultJS","defaultOther"], _1ud4fa1);  
  $def("_h1t91h", "defaultJS", [], _h1t91h);  
  $def("_but2s9", "defaultOther", [], _but2s9);  
  $def("_lj7470", "initial id", [], _lj7470);  
  $def("_1bwa5dj", "mutable id", ["Mutable","initial id"], _1bwa5dj);  
  $def("_mshfha", "id", ["mutable id"], _mshfha);
  return main;
}