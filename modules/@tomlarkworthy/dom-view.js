const _pm5sek = function _1(md){return(
md`# DOM view

A view whose value is a DOM node, and whose view is a container of that value. 

\`\`\`js
import {domView} from '@tomlarkworthy/dom-view'
\`\`\``
)};
const _1n5sb7x = function _domView(invalidation){return(
({ className = "" } = {}) => {
  const dom = document.createElement("div");
  dom.className = className;
  dom.value = undefined;
  invalidation.then(dom.addEventListener("input", () => {}));
  Object.defineProperty(dom, "value", {
    set: (value) => {
      if (dom.firstChild) dom.textContent = "";
      if (value) dom.appendChild(value);
    },
    get: () => dom.firstChild
  });
  return dom;
}
)};
const _p5gppf = function _example(domView){return(
domView()
)};
const _4me580 = (G, _) => G.input(_);
const _ngavq7 = function _4($0,html){return(
$0.value = html`<button>❤️</button>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_pm5sek", null, ["md"], _pm5sek);  
  $def("_1n5sb7x", "domView", ["invalidation"], _1n5sb7x);  
  $def("_p5gppf", "viewof example", ["domView"], _p5gppf);  
  $def("_4me580", "example", ["Generators","viewof example"], _4me580);  
  $def("_ngavq7", null, ["viewof example","html"], _ngavq7);
  return main;
}