const _182981h = function _1(md){return(
md`# localStorageView: Non-invasive local persistance`
)};
const _8spwep = function _2(md){return(
md`Lets make it simple to add local storage to a UI control (e.g. [@observablehq/inputs](/@observablehq/inputs))


We exploit back-writability and input binding to avoid having to mess with existing UI control code.

_localStorageView(key)_ creates a read/write view of a [safe-local-storage](/@mbostock/safe-local-storage). Because it's a view it can be [_synchronized_](https://observablehq.com/@observablehq/synchronized-inputs) to any control we want to provide persistence for.

We avoid having to write any _setItem_/_getItem_ imperative wiring.

If you want all users to share a networked value, consider [shareview](https://observablehq.com/@tomlarkworthy/shareview).

This works with an view that follows [design guidelines for views](https://observablehq.com/@tomlarkworthy/ui-linter?collection=@tomlarkworthy/ui). A similar notebook for URL query fields is the [urlQueryFieldView](https://observablehq.com/@tomlarkworthy/url-query-field-view).

~~~js
    import {localStorageView} from '@tomlarkworthy/local-storage-view'
~~~

### Change log
- 2021-11-21: Added json option which is true uses JSON.stringify/parse
- 2021-10-09: Added defaultValue option
`
)};
const _1e6fj3u = function _3(md){return(
md`### Demo

So starting with an ordinary control:`
)};
const _mmuwnm = function _example1(Inputs){return(
Inputs.range()
)};
const _1jzejjl = (G, _) => G.input(_);
const _3wyikd = function _5(md){return(
md`We will use the excellent  [@mbostock/safe-local-storage](/@mbostock/safe-local-storage) which very nicely abstracts over enhanced privacy controls with an in memory fallback.`
)};
const _12vgtec = function _7(md){return(
md`However, we don't want to have to mess around with our original control to add local persistence. Instead we create a writable [view](https://observablehq.com/@observablehq/introduction-to-views) of a local storage key`
)};
const _73wbaa = function _example1storage(localStorageView){return(
localStorageView("example1")
)};
const _1jqow1s = (G, _) => G.input(_);
const _gkyhag = function _localStorageView(DOM,htl,inspect,localStorage,Inputs){return(
(
  key,
  { bindTo = undefined, defaultValue = null, json = false } = {}
) => {
  const id = DOM.uid().id;
  const ui = htl.html`<div class="observablehq--inspect" style="display:flex">
    <code>localStorageView(<span class="observablehq--string">"${key}"</span>): </code><span id="${id}">${inspect(
    localStorage.getItem(key) || defaultValue
  )}</span>
  </div>`;
  const holder = ui.querySelector(`#${id}`);

  const view = Object.defineProperty(ui, "value", {
    get: () => {
      const val = json
        ? JSON.parse(localStorage.getItem(key))
        : localStorage.getItem(key);
      return val || defaultValue;
    },
    set: (value) => {
      value = json ? JSON.stringify(value) : value;
      holder.removeChild(holder.firstChild);
      holder.appendChild(inspect(localStorage.getItem(key) || defaultValue));
      localStorage.setItem(key, value);
    },
    enumerable: true
  });

  if (bindTo) {
    Inputs.bind(bindTo, view);
  }

  return view;
}
)};
const _1iqrn5d = function _10(localStorageView){return(
localStorageView.value
)};
const _z63pz7 = function _11(md){return(
md`And we bind our original control to the key view`
)};
const _8qx9i8 = function _12(Inputs,$0,$1){return(
Inputs.bind($0, $1)
)};
const _qmvxa6 = function _13(md){return(
md`Tada! that control will now persist its state across page refreshes.`
)};
const _miawoh = function _14(md){return(
md`### JSON support

Set *json* to true to *serde*.`
)};
const _1987pc1 = function _jsonView(localStorageView){return(
localStorageView("json", {
  json: true
})
)};
const _17aqur = (G, _) => G.input(_);
const _kfjf9m = function _16(jsonView){return(
jsonView
)};
const _19gwt0c = function _17($0){return(
$0.value
)};
const _1dz41gz = function _18(md){return(
md`### Writing`
)};
const _17vm6d3 = function _19($0,Event)
{
  $0.value = {
    rnd: Math.random()
  };
  $0.dispatchEvent(new Event("input", { bubbles: true }));
};
const _1g2fr6s = function _20(md){return(
md`### In two cells

It is quite likely we often just want to create the view and bind it to a ui control so just pass the viewof in as the _bindTo_ option in the 2nd argument
`
)};
const _1a7s05z = function _example2(Inputs){return(
Inputs.textarea()
)};
const _36jjyw = (G, _) => G.input(_);
const _l1d220 = function _22(localStorageView,$0){return(
localStorageView("example2", {
  bindTo: $0
})
)};
const _dwfe65 = function _23(md){return(
md`### In a single cell!

You can even declare a UI control, wrap it with local storage and return in a single cell! (thanks @mbostock!)
`
)};
const _1vldl4e = function _example3(Inputs,localStorageView){return(
Inputs.bind(Inputs.textarea(), localStorageView("example3"))
)};
const _fyim03 = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @mbostock/safe-local-storage", async () => runtime.module((await import("/@mbostock/safe-local-storage.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  $def("_182981h", null, ["md"], _182981h);  
  $def("_8spwep", null, ["md"], _8spwep);  
  $def("_1e6fj3u", null, ["md"], _1e6fj3u);  
  $def("_mmuwnm", "viewof example1", ["Inputs"], _mmuwnm);  
  $def("_1jzejjl", "example1", ["Generators","viewof example1"], _1jzejjl);  
  $def("_3wyikd", null, ["md"], _3wyikd);  
  main.define("localStorage", ["module @mbostock/safe-local-storage", "@variable"], (_, v) => v.import("localStorage", _));  
  $def("_12vgtec", null, ["md"], _12vgtec);  
  $def("_73wbaa", "viewof example1storage", ["localStorageView"], _73wbaa);  
  $def("_1jqow1s", "example1storage", ["Generators","viewof example1storage"], _1jqow1s);  
  $def("_gkyhag", "localStorageView", ["DOM","htl","inspect","localStorage","Inputs"], _gkyhag);  
  $def("_1iqrn5d", null, ["localStorageView"], _1iqrn5d);  
  $def("_z63pz7", null, ["md"], _z63pz7);  
  $def("_8qx9i8", null, ["Inputs","viewof example1","viewof example1storage"], _8qx9i8);  
  $def("_qmvxa6", null, ["md"], _qmvxa6);  
  $def("_miawoh", null, ["md"], _miawoh);  
  $def("_1987pc1", "viewof jsonView", ["localStorageView"], _1987pc1);  
  $def("_17aqur", "jsonView", ["Generators","viewof jsonView"], _17aqur);  
  $def("_kfjf9m", null, ["jsonView"], _kfjf9m);  
  $def("_19gwt0c", null, ["viewof jsonView"], _19gwt0c);  
  $def("_1dz41gz", null, ["md"], _1dz41gz);  
  $def("_17vm6d3", null, ["viewof jsonView","Event"], _17vm6d3);  
  $def("_1g2fr6s", null, ["md"], _1g2fr6s);  
  $def("_1a7s05z", "viewof example2", ["Inputs"], _1a7s05z);  
  $def("_36jjyw", "example2", ["Generators","viewof example2"], _36jjyw);  
  $def("_l1d220", null, ["localStorageView","viewof example2"], _l1d220);  
  $def("_dwfe65", null, ["md"], _dwfe65);  
  $def("_1vldl4e", "viewof example3", ["Inputs","localStorageView"], _1vldl4e);  
  $def("_fyim03", "example3", ["Generators","viewof example3"], _fyim03);  
  main.define("inspect", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("inspect", _));
  return main;
}