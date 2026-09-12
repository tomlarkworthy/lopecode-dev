const _17 = function viewof$attach(Inputs){return(
Inputs.toggle({
  label: "attach"
})
)};

const _7 = function viewof$child(Inputs){return(
Inputs.text()
)};

const _10 = function viewof$parent(view,reversibleAttach,attach,viewof$child){return(
view`<div>
${["child", reversibleAttach(attach, viewof$child)]}
</div>`
)};

const _31 = function(child){return(
child
)};

const _80 = function(parent){return(
parent
)};

const _199 = function(Inputs,viewof$parent,Event){return(
Inputs.button("backdrive parent", {
  reduce: () => {
    viewof$parent.value.child = Math.random();
    viewof$parent.child.dispatchEvent(new Event("input", { bubbles: true }));
  }
})
)};

const _179 = function viewof$attach_gp(Inputs){return(
Inputs.toggle({
  label: "attach gradparent"
})
)};

const _185 = function viewof$grand_parent(Inputs,reversibleAttach,attach_gp,viewof$parent){return(
Inputs.form({
  parent: reversibleAttach(attach_gp, viewof$parent)
})
)};

const _190 = function(grand_parent){return(
grand_parent
)};

const _208 = function(Inputs,viewof$grand_parent,Event){return(
Inputs.button("backdrive grand_parent", {
  reduce: () => {
    viewof$grand_parent.value.parent.child = Math.random();
    viewof$grand_parent.dispatchEvent(new Event("input", { bubbles: true }));
  }
})
)};

const _43 = function parents(){return(
new Map()
)};

const _26 = function reversibleAttach(parents,bindOneWay){return(
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

const _89 = async (__variable) => {
const {view, bindOneWay} = await (import("./view").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("view")?.import("view", module);
  outputs.get("bindOneWay")?.import("bindOneWay", module);
  return {};
}));

return {view,bindOneWay};
};

const _243 = () => {
//import { footer } from "@tomlarkworthy/footer"
};

const _260 = function(footer){return(
footer
)};

export default function define(runtime) {
  const main = runtime.module();
  main.builtin("view", (_) => _.value);
  main.define("viewof attach", ["Inputs"], _17);
  main.define("attach", ["Generators", "viewof attach"], (G, _) => G.input(_));
  main.define("viewof child", ["Inputs"], _7);
  main.define("child", ["Generators", "viewof child"], (G, _) => G.input(_));
  main.define("viewof parent", ["view","reversibleAttach","attach","viewof child"], _10);
  main.define("parent", ["Generators", "viewof parent"], (G, _) => G.input(_));
  main.define("cell 31", ["child"], _31);
  main.define("cell 80", ["parent"], _80);
  main.define("cell 199", ["Inputs","viewof parent","Event"], _199);
  main.define("viewof attach_gp", ["Inputs"], _179);
  main.define("attach_gp", ["Generators", "viewof attach_gp"], (G, _) => G.input(_));
  main.define("viewof grand_parent", ["Inputs","reversibleAttach","attach_gp","viewof parent"], _185);
  main.define("grand_parent", ["Generators", "viewof grand_parent"], (G, _) => G.input(_));
  main.define("cell 190", ["grand_parent"], _190);
  main.define("cell 208", ["Inputs","viewof grand_parent","Event"], _208);
  main.define("parents", [], _43);
  main.define("reversibleAttach", ["parents","bindOneWay"], _26);
  main.define("cell 89", ["@variable"], _89);
  main.define("view", ["cell 89"], (_) => _.view);
  main.define("bindOneWay", ["cell 89"], (_) => _.bindOneWay);
  main.define("cell 243", [], _243);
  main.define("cell 260", ["footer"], _260);
  return main;
}
