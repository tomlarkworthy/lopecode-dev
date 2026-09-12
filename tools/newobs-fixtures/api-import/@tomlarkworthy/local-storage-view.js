const _0 = function(md){return(
md`# localStorageView: Non-invasive local persistance`
)};

const _14 = function(md){return(
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

const _136 = function(md){return(
md`### Demo

So starting with an ordinary control:`
)};

const _18 = function viewof$example1(Inputs){return(
Inputs.range()
)};

const _26 = function(md){return(
md`We will use the excellent  [@mbostock/safe-local-storage](/@mbostock/safe-local-storage) which very nicely abstracts over enhanced privacy controls with an in memory fallback.`
)};

const _11 = async (__variable) => {
const {localStorage} = await (import("../@mbostock/safe-local-storage").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("localStorage")?.import("localStorage", module);
  return {};
}));

return {localStorage};
};

const _30 = function(md){return(
md`However, we don't want to have to mess around with our original control to add local persistence. Instead we create a writable [view](https://observablehq.com/@observablehq/introduction-to-views) of a local storage key`
)};

const _40 = function viewof$example1storage(localStorageView){return(
localStorageView("example1")
)};

const _37 = function localStorageView(DOM,htl,inspect,localStorage,Inputs){return(
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

const _211 = function(localStorageView){return(
localStorageView.value
)};

const _70 = function(md){return(
md`And we bind our original control to the key view`
)};

const _72 = function(Inputs,viewof$example1,viewof$example1storage){return(
Inputs.bind(viewof$example1, viewof$example1storage)
)};

const _139 = function(md){return(
md`Tada! that control will now persist its state across page refreshes.`
)};

const _244 = function viewof$jsonView(localStorageView){return(
localStorageView("json", {
  json: true
})
)};

const _225 = function(jsonView){return(
jsonView
)};

const _230 = function(viewof$jsonView){return(
viewof$jsonView.value
)};

const _238 = function(viewof$jsonView,Event)
{
  viewof$jsonView.value = {
    rnd: Math.random()
  };
  viewof$jsonView.dispatchEvent(new Event("input", { bubbles: true }));
}
;

const _176 = function(md){return(
md`### In two cells

It is quite likely we often just want to create the view and bind it to a ui control so just pass the viewof in as the _bindTo_ option in the 2nd argument
`
)};

const _185 = function viewof$example2(Inputs){return(
Inputs.textarea()
)};

const _183 = function(localStorageView,viewof$example2){return(
localStorageView("example2", {
  bindTo: viewof$example2
})
)};

const _198 = function(md){return(
md`### In a single cell!

You can even declare a UI control, wrap it with local storage and return in a single cell! (thanks @mbostock!)
`
)};

const _196 = function viewof$example3(Inputs,localStorageView){return(
Inputs.bind(Inputs.textarea(), localStorageView("example3"))
)};

const _51 = async (__variable) => {
const {inspect} = await (import("./inspector").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("inspect")?.import("inspect", module);
  return {};
}));

return {inspect};
};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 0", ["md"], _0);
  main.define("cell 14", ["md"], _14);
  main.define("cell 136", ["md"], _136);
  main.define("viewof example1", ["Inputs"], _18);
  main.define("example1", ["Generators", "viewof example1"], (G, _) => G.input(_));
  main.define("cell 26", ["md"], _26);
  main.define("cell 11", ["@variable"], _11);
  main.define("localStorage", ["cell 11"], (_) => _.localStorage);
  main.define("cell 30", ["md"], _30);
  main.define("viewof example1storage", ["localStorageView"], _40);
  main.define("example1storage", ["Generators", "viewof example1storage"], (G, _) => G.input(_));
  main.define("localStorageView", ["DOM","htl","inspect","localStorage","Inputs"], _37);
  main.define("cell 211", ["localStorageView"], _211);
  main.define("cell 70", ["md"], _70);
  main.define("cell 72", ["Inputs","viewof example1","viewof example1storage"], _72);
  main.define("cell 139", ["md"], _139);
  main.define("viewof jsonView", ["localStorageView"], _244);
  main.define("jsonView", ["Generators", "viewof jsonView"], (G, _) => G.input(_));
  main.define("cell 225", ["jsonView"], _225);
  main.define("cell 230", ["viewof jsonView"], _230);
  main.define("cell 238", ["viewof jsonView","Event"], _238);
  main.define("cell 176", ["md"], _176);
  main.define("viewof example2", ["Inputs"], _185);
  main.define("example2", ["Generators", "viewof example2"], (G, _) => G.input(_));
  main.define("cell 183", ["localStorageView","viewof example2"], _183);
  main.define("cell 198", ["md"], _198);
  main.define("viewof example3", ["Inputs","localStorageView"], _196);
  main.define("example3", ["Generators", "viewof example3"], (G, _) => G.input(_));
  main.define("cell 51", ["@variable"], _51);
  main.define("inspect", ["cell 51"], (_) => _.inspect);
  return main;
}
