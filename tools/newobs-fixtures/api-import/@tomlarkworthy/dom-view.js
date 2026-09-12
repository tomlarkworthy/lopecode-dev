const _8 = function domView(invalidation){return(
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

const _16 = function viewof$example(domView){return(
domView()
)};

const _19 = function(viewof$example,html){return(
viewof$example.value = html`<button>❤️</button>`
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("domView", ["invalidation"], _8);
  main.define("viewof example", ["domView"], _16);
  main.define("example", ["Generators", "viewof example"], (G, _) => G.input(_));
  main.define("cell 19", ["viewof example","html"], _19);
  return main;
}
