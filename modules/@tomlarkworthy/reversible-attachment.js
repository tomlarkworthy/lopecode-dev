const _4svcg3 = function _1(md){return(
md`# Reversible attachment

_reversibleAttach_ allows you toggle whether a view is attached to a composite view at runtime. This is useful for development when building views hierarchically, as you can use the _reversibleAttach_ to work on isolated pieces or the whole.

The value remain accessible in both places. Works with both \`Inputs.form\` and \`@tomlarkworthy/view\`, the latter supports back-driving values, which only works when the attachment is active.

\`\`\`js
import {reversibleAttach} from '@tomlarkworthy/reversible-attachment'
\`\`\``
)};
const _1fxvri0 = function _attach(Inputs){return(
Inputs.toggle({
  label: "attach"
})
)};
const _ekth9p = (G, _) => G.input(_);
const _l8mvtb = function _3(md){return(
md`## child view`
)};
const _1ugf292 = function _child(Inputs){return(
Inputs.text()
)};
const _fkpfes = (G, _) => G.input(_);
const _1r6zp4e = function _5(md){return(
md`## parent view ([@tomlarkworthy/view](https://observablehq.com/@tomlarkworthy/view))`
)};
const _11tnr8o = function _parent(view,reversibleAttach,attach,$0){return(
view`<div>
${["child", reversibleAttach(attach, $0)]}
</div>`
)};
const _13xot7o = (G, _) => G.input(_);
const _17i0ywm = function _7(md){return(
md`Note changes propogate to both`
)};
const _1xbdgmf = function _8(child){return(
child
)};
const _1tmaii0 = function _9(parent){return(
parent
)};
const _1fiujce = function _10(md){return(
md`Backdrivability works `
)};
const _1u71rvc = function _11(Inputs,$0,Event){return(
Inputs.button("backdrive parent", {
  reduce: () => {
    $0.value.child = Math.random();
    $0.child.dispatchEvent(new Event("input", { bubbles: true }));
  }
})
)};
const _citj9p = function _12(md){return(
md`## grandparent view ([Inputs.form](https://observablehq.com/@observablehq/input-form))`
)};
const _nqqgq0 = function _attach_gp(Inputs){return(
Inputs.toggle({
  label: "attach gradparent"
})
)};
const _1je8p4j = (G, _) => G.input(_);
const _1apiz36 = function _grand_parent(Inputs,reversibleAttach,attach_gp,$0){return(
Inputs.form({
  parent: reversibleAttach(attach_gp, $0)
})
)};
const _1u1yv5f = (G, _) => G.input(_);
const _1k66onn = function _15(grand_parent){return(
grand_parent
)};
const _1i4cx3s = function _16(Inputs,$0,Event){return(
Inputs.button("backdrive grand_parent", {
  reduce: () => {
    $0.value.parent.child = Math.random();
    $0.dispatchEvent(new Event("input", { bubbles: true }));
  }
})
)};
const _67zexy = function _17(md){return(
md`---`
)};
const _1padev5 = function _parents(){return(
new Map()
)};
const _ofuojt = function _reversibleAttach(parents,bindOneWay){return(
function reversibleAttach(shouldBind, view, invalidation) {
  if (!parents.has(view) && view.parentElement) {
    parents.set(view, view.parentElement);
  }
  if (shouldBind) {
    return view;
  } else {
    if (parents.has(view)) {
      const parent = parents.get(view);
      if (parent.firstChild !== view) parent.appendChild(view);
    }
    const dummy = document.createTextNode("<detached>");
    return bindOneWay(dummy, view, invalidation);
  }
}
)};
const _m6r08x = function _22(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  $def("_4svcg3", null, ["md"], _4svcg3);  
  $def("_1fxvri0", "viewof attach", ["Inputs"], _1fxvri0);  
  $def("_ekth9p", "attach", ["Generators","viewof attach"], _ekth9p);  
  $def("_l8mvtb", null, ["md"], _l8mvtb);  
  $def("_1ugf292", "viewof child", ["Inputs"], _1ugf292);  
  $def("_fkpfes", "child", ["Generators","viewof child"], _fkpfes);  
  $def("_1r6zp4e", null, ["md"], _1r6zp4e);  
  $def("_11tnr8o", "viewof parent", ["view","reversibleAttach","attach","viewof child"], _11tnr8o);  
  $def("_13xot7o", "parent", ["Generators","viewof parent"], _13xot7o);  
  $def("_17i0ywm", null, ["md"], _17i0ywm);  
  $def("_1xbdgmf", null, ["child"], _1xbdgmf);  
  $def("_1tmaii0", null, ["parent"], _1tmaii0);  
  $def("_1fiujce", null, ["md"], _1fiujce);  
  $def("_1u71rvc", null, ["Inputs","viewof parent","Event"], _1u71rvc);  
  $def("_citj9p", null, ["md"], _citj9p);  
  $def("_nqqgq0", "viewof attach_gp", ["Inputs"], _nqqgq0);  
  $def("_1je8p4j", "attach_gp", ["Generators","viewof attach_gp"], _1je8p4j);  
  $def("_1apiz36", "viewof grand_parent", ["Inputs","reversibleAttach","attach_gp","viewof parent"], _1apiz36);  
  $def("_1u1yv5f", "grand_parent", ["Generators","viewof grand_parent"], _1u1yv5f);  
  $def("_1k66onn", null, ["grand_parent"], _1k66onn);  
  $def("_1i4cx3s", null, ["Inputs","viewof grand_parent","Event"], _1i4cx3s);  
  $def("_67zexy", null, ["md"], _67zexy);  
  $def("_1padev5", "parents", [], _1padev5);  
  $def("_ofuojt", "reversibleAttach", ["parents","bindOneWay"], _ofuojt);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("bindOneWay", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("bindOneWay", _));  
  $def("_m6r08x", null, ["footer"], _m6r08x);
  return main;
}