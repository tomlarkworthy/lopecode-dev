const _j8bt44 = function _1(md){return(
md`# SummarizeJS

Wraps [Observable's inspect](https://github.com/observablehq/inspector) to a single string and enforces a size limit, intended for sending Javascript values to LLM. Inspect is a good base because it includes type information, common edge cases (typed arrays, regex, symbols), truncates long lists and has functionality to expand and contract the represention. For this use-case we expand up to the max_size when possible.`
)};
const _isrmzq = function _max_size(Inputs){return(
Inputs.range([3, 500], { label: "max size", step: 1 })
)};
const _vrmeqm = (G, _) => G.input(_);
const _ptnkl7 = function _example(summarizeJS,data,max_size){return(
summarizeJS(data, { max_size })
)};
const _1m34ydj = function _4(example){return(
example.length
)};
const _1rosxg0 = function _data(){return(
{
  nested: {
    date: new Date(),
    fn: function (arg) {},
    symbol: Symbol("cool"),
    nesting: {
      regex: /dsds/,
      map: new Map([
        ["key", "value"],
        ["key2", "value2"]
      ]),
      bar: Array.from({ length: 1000 }).map((_, i) => i)
    }
  },
  obj: {
    nested: Array.from({ length: 1000 }).map((_, i) => i)
  },
  cls: class foo {},
  instance: new URL("https://google.com")
}
)};
const _ygg2hv = function _summarizeJS(html,inspect,postProcess,MouseEvent){return(
function summarizeJS(value, { max_size = 5000 } = {}) {
  // Render the inspected HTML into a temporary <div>. inspect() inlines a live DOM node by moving the
  // original into its output, so summarizing a DOM value would yank it out of the page — clone first.
  const inspected = (typeof Node !== "undefined" && value instanceof Node) ? value.cloneNode(true) : value;
  const inspection = html`<div>${inspect(inspected)}`;
  let text = postProcess(inspection);
  let prior = undefined;

  // Helper to find all currently collapsed nodes
  const getCollapsed = () => [];

  // Expand collapsed nodes one by one until we exceed max_size
  let el;
  while ((el = inspection.querySelector(".observablehq--collapsed"))) {
    if (!el) break;
    if (text.length >= max_size) break;
    el.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    prior = text;
    text = postProcess(inspection);
  }
  // If we've gone over max_size, return the last “prior” snapshot; otherwise current
  const best = prior && text.length > max_size ? prior : text;

  if (best.length > max_size) {
    const trimmed =
      best.slice(0, (max_size - 1) / 2) +
      "…" +
      best.slice(best.length - (max_size - 1) / 2, best.length);
    return trimmed;
  } else return best;
}
)};
const _wtf5dq = function _walked(postProcess,inspect,data){return(
postProcess(inspect(data))
)};
const _1l6vroc = function _postProcess(walk){return(
(dom) => walk(dom).join("")
)};
const _1brf10r = function _TEXT(){return(
3
)};
const _dqrmjj = function _11(walk,inspect,data){return(
walk(inspect(data))
)};
const _toirfb = function _walk(TEXT){return(
function walk(dom, elements = []) {
  if (dom.nodeType === TEXT) {
    if (dom.parentNode.className.baseVal == "observablehq--caret") {
    } else if (dom.parentNode.className == "observablehq--key") {
      elements.push(dom.nodeValue.trim());
    } else if (dom.nodeValue == "  … more") {
      elements.push("…more");
    } else {
      elements.push(dom.nodeValue);
    }
    return;
  }
  let skipNext = false;
  let previous = undefined;
  for (let child of dom.childNodes) {
    if (
      child.className == "observablehq--field" &&
      child.firstChild.className == "observablehq--prototype-key"
    ) {
      continue;
    }
    if (
      child.className == "observablehq--field" &&
      previous?.className == "observablehq--field"
    ) {
      elements.push(", ");
    }

    if (child.className == "observablehq--index") {
      skipNext = true;
      continue;
    }
    if (skipNext) {
      skipNext = false;
      continue;
    }
    walk(child, elements);
    previous = child;
  }
  return elements;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  $def("_j8bt44", null, ["md"], _j8bt44);  
  $def("_isrmzq", "viewof max_size", ["Inputs"], _isrmzq);  
  $def("_vrmeqm", "max_size", ["Generators","viewof max_size"], _vrmeqm);  
  $def("_ptnkl7", "example", ["summarizeJS","data","max_size"], _ptnkl7);  
  $def("_1m34ydj", null, ["example"], _1m34ydj);  
  main.define("inspect", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("inspect", _));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("src", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("src", _));  
  $def("_1rosxg0", "data", [], _1rosxg0);  
  $def("_ygg2hv", "summarizeJS", ["html","inspect","postProcess","MouseEvent"], _ygg2hv);  
  $def("_wtf5dq", "walked", ["postProcess","inspect","data"], _wtf5dq);  
  $def("_1l6vroc", "postProcess", ["walk"], _1l6vroc);  
  $def("_1brf10r", "TEXT", [], _1brf10r);  
  $def("_dqrmjj", null, ["walk","inspect","data"], _dqrmjj);  
  $def("_toirfb", "walk", ["TEXT"], _toirfb);
  return main;
}