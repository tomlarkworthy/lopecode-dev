const _114fdbc = function _1(md){return(
md`# urlQueryFieldView: Non-invasive URL field persistence`
)};
const _5m8xe6 = function _2(md){return(
md`Lets make it simple to bind a URL query field to a UI control (e.g. [@observablehq/inputs](/@observablehq/inputs))

We exploit back-writability and input binding to avoid having to mess with existing UI control code.

_urlQueryFieldView(field)_ creates a URL decoded view of the field in the URL query string. Because it's a view it can be [_synchronized_](https://observablehq.com/@observablehq/synchronized-inputs) to any control we want to provide persistence for.

If you want all users to share a networked value, consider [shareview](https://observablehq.com/@tomlarkworthy/shareview).

This works with an view that follows [design guidelines for views](https://observablehq.com/@tomlarkworthy/ui-linter?collection=@tomlarkworthy/ui). A similar notebook that uses local storageis the [localStorageView](https://observablehq.com/@tomlarkworthy/local-storage-view).

~~~js
    import {urlQueryFieldView} from '@tomlarkworthy/url-query-field-view'
~~~

`
)};
const _16xqxzg = function _urlQueryFieldView(DOM,URLSearchParams,location,htl,inspect,html,Inputs){return(
(
  field,
  {
    defaultValue = undefined,
    decode = (field) => field,
    write = false,
    hash = undefined,
    bindTo = undefined
  } = {}
) => {
  if (typeof decode !== "function")
    throw new Error("decode must be a function");

  const id = DOM.uid().id;

  const readField = () => {
    const v =
      new URLSearchParams(
        /*allow overriding */ window.rEPseDFzXFSPYkNz || location.search
      ).get(field) || undefined;
    return v ? decode(v) : defaultValue;
  };

  let cache = readField();

  const ui = htl.html`<div class="observablehq--inspect" style="display:flex">
    <code>urlQueryFieldView(<span class="observablehq--string">"${field}"</span>): </code><span id="${id}">${inspect(
    cache
  )}</span>
  </div>`;
  const holder = ui.querySelector(`#${id}`);

  const view = Object.defineProperty(ui, "value", {
    get: () => {
      return cache;
    },
    set: (value) => {
      const search = new URLSearchParams(location.search);
      search.set(field, value);
      cache = value;
      if (write) {
        if (!hash.startsWith("#")) hash = "#" + hash;
        html`<a href="?${
          search.toString() + (hash || location.hash)
        }">`.click();
      }
    },
    enumerable: true
  });

  if (bindTo) {
    Inputs.bind(bindTo, view);
  }

  return view;
}
)};
const _16ze9us = function _4(md){return(
md`## Examples`
)};
const _15xrlhx = function _5(md){return(
md`We can bind to a UI component inline with instanciating it with

\`Inputs.bind(<CONTROL>, urlQueryFieldView(<FIELD>))\``
)};
const _1vvtqj4 = function _c1(Inputs,urlQueryFieldView){return(
Inputs.bind(Inputs.text({ label: "c1" }), urlQueryFieldView("c1"))
)};
const _1a56kfc = (G, _) => G.input(_);
const _1sqgney = function _7(c1){return(
c1
)};
const _1j81995 = function _8(md){return(
md`Or we can bind in an adjacent cells with

\`Inputs.bind(viewof <CELL>, urlQueryFieldView(<FIELD>));\``
)};
const _15tazgz = function _c2(Inputs){return(
Inputs.text({ label: "c2" })
)};
const _skejwh = (G, _) => G.input(_);
const _4byfra = function _c2sideBind(Inputs,$0,urlQueryFieldView)
{
  Inputs.bind($0, urlQueryFieldView("c2"));
};
const _19nt16t = function _11(md){return(
md`### Links

To demonstrate it works just follow this links which updated the URL


set [c1=foo](?c1=foo#c1)

set [c2=nice](?c2=nice#c2)


set [c1=bar&c2=nice](?c1=bar&c2=nice#c1)
`
)};
const _1viwccr = function _12(md){return(
md`Tada! note the UI controls update based on the URL, if you know the name of the cells you can also set the URL hash to get the page to navigate after the load too`
)};
const _h32wmw = function _13(md){return(
md`### Custom decode

The second argument is the *options*, which includes "decode". Here you can apply a function to the value so you can decode to types other than strings. Note all params have \`decodeURIComponent\` applied first


try clicking [json=[{t:0, c: red}]](?json=${encodeURIComponent(JSON.stringify({t:0, c: "red"}))}#json)`
)};
const _19ak8qq = function _json(urlQueryFieldView){return(
urlQueryFieldView("json", { decode: JSON.parse })
)};
const _he7deu = (G, _) => G.input(_);
const _jsfn17 = function _15(json){return(
json
)};
const _at248r = function _16(md){return(
md`## Back-writing

The view supports backwriting, which will cause a navigation event. As this is intrusive and not often required, it is turned off by default. To enable it, set the option \`write\` to \`true\`. This will do a top level navigation via link automation, so it will only works if the user initiates the action. It keeps unrelated fields and the URL hash unchanged.

By adding a \`hash\` parameter you can also control the URL hash`
)};
const _uup9pt = function _c3(Inputs,urlQueryFieldView){return(
Inputs.bind(
  Inputs.text({
    label: "c3",
    submit: true,
    placeholder: "try something"
  }),
  urlQueryFieldView("c3", { write: true, hash: "c3" })
)
)};
const _1yapuye = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  $def("_114fdbc", null, ["md"], _114fdbc);  
  $def("_5m8xe6", null, ["md"], _5m8xe6);  
  $def("_16xqxzg", "urlQueryFieldView", ["DOM","URLSearchParams","location","htl","inspect","html","Inputs"], _16xqxzg);  
  $def("_16ze9us", null, ["md"], _16ze9us);  
  $def("_15xrlhx", null, ["md"], _15xrlhx);  
  $def("_1vvtqj4", "viewof c1", ["Inputs","urlQueryFieldView"], _1vvtqj4);  
  $def("_1a56kfc", "c1", ["Generators","viewof c1"], _1a56kfc);  
  $def("_1sqgney", null, ["c1"], _1sqgney);  
  $def("_1j81995", null, ["md"], _1j81995);  
  $def("_15tazgz", "viewof c2", ["Inputs"], _15tazgz);  
  $def("_skejwh", "c2", ["Generators","viewof c2"], _skejwh);  
  $def("_4byfra", "c2sideBind", ["Inputs","viewof c2","urlQueryFieldView"], _4byfra);  
  $def("_19nt16t", null, ["md"], _19nt16t);  
  $def("_1viwccr", null, ["md"], _1viwccr);  
  $def("_h32wmw", null, ["md"], _h32wmw);  
  $def("_19ak8qq", "viewof json", ["urlQueryFieldView"], _19ak8qq);  
  $def("_he7deu", "json", ["Generators","viewof json"], _he7deu);  
  $def("_jsfn17", null, ["json"], _jsfn17);  
  $def("_at248r", null, ["md"], _at248r);  
  $def("_uup9pt", "viewof c3", ["Inputs","urlQueryFieldView"], _uup9pt);  
  $def("_1yapuye", "c3", ["Generators","viewof c3"], _1yapuye);  
  main.define("inspect", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("inspect", _));
  return main;
}