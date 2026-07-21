const _vo7hij = function _1(md,id){return(
md`# Notebook Visualizer for Teams

To use, paste the URL of a public or shared notebook below, or type and click submit. For more on what this graph means, see [How Observable Runs](/@observablehq/how-observable-runs). Use the cell menu <svg viewBox="0 0 8 14" fill="currentColor" stroke="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="8" height="14"><circle r="1.5" cx="4" cy="2"></circle><circle r="1.5" cx="4" cy="7"></circle><circle r="1.5" cx="4" cy="12"></circle></svg> below to save your graph as PNG or SVG if desired.

To share a link to your dependency graph, [click here](?id=${id}).`
)};
const _1gf3nzl = function _id(Text,location,Promises,Event)
{
  const text = Text({
    value: new URL(location).searchParams.get("id") || "@mbostock/liquidfun",
    submit: true,
    label: "Notebook"
  });
  const input = text.querySelector("input");
  input.addEventListener("input", (event) => {
    let v = input.value, m;
    if (m = /\.js(\?|$)/i.exec(v)) v = v.slice(0, m.index);
    if (m = /^[0-9a-f]{16}$/i.test(v)) v = `d/${v}`;
    if (m = /^https:\/\/(api\.|beta\.|)observablehq\.com\//i.exec(v)) v = v.slice(m[0].length);
    if (v !== input.value) input.value = v;
  });
  input.addEventListener("paste", (event) => {
    Promises.delay(50).then(() => {
      text.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    });
  });
  return text;
};
const _11iau81 = (G, _) => G.input(_);
const _154ux4o = function _orient(Select){return(
Select(new Map([
  ["left-to-right", "LR"],
  ["right-to-left", "RL"],
  ["top-to-bottom", "TB"],
  ["bottom-to-top", "BT"],
]), {label: "Orientation"})
)};
const _2n856l = (G, _) => G.input(_);
const _1vq7r4e = function _includes(Checkbox){return(
Checkbox(new Map([
  ["anonymous cells", "anon"],
  ["builtins", "builtin"]
]), {label: "Show"})
)};
const _1xtkzad = (G, _) => G.input(_);
const _buhbz9 = function _apiKey(localStorageView,Inputs,html)
{
  const l = localStorageView('API_KEY');
  const i = Inputs.text({
    label: 'API key',
    submit: true,
    value: l.value
  });
  Inputs.bind(i, l);

  i.style.cssText += 'margin-top:.5em';
  const w = html`<details ${i.value ? 'open' : ''}>
    <summary style="font:13px var(--sans-serif);cursor:default">Enable access to private or team notebooks (<a href="https://observablehq.com/@observablehq/api-keys">learn more</a>)</summary>
    ${i}
  `;
  return Object.defineProperty(w, 'value', {
    get: () => i.value,
    set: v => (i.value = v)
  });
};
const _7956h7 = (G, _) => G.input(_);
const _185nh9k = function _chart(dot,id,orient,variables,main){return(
dot`digraph "${id}" {
node [fontname="var(--sans-serif)" fontsize=12];
edge [fontname="var(--sans-serif)" fontsize=12];
rankdir = ${orient};
${Array.from(variables, v => `${v._id} [label = "${v._name || `#${v._id}`}"${v._module === main._runtime._builtin ? `, color = "gray", fontcolor = "#555555"` : ""}]; ${v._inputs.map(i => `${i._id} -> ${v._id} ${v._module !== i._module ? `[color = "#20b2aa"]` : ""};`).join(" ")}`).join("\n")}
}`
)};
const _ns3zjr = function _7(md){return(
md`---`
)};
const _1oh9b76 = function _main(id, apiKey, Runtime, includes) {
    return import(`https://api.observablehq.com/${ id }.js?v=3${ apiKey == null ? '' : `&api_key=${ apiKey }` }`).then(async ({default: define}) => {
        const runtime = new Runtime();
        const main = runtime.module(define, name => includes.includes('anon') || name);
        await runtime._compute();
        runtime.dispose();
        return main;
    });
};
const _1xk6i69 = function _variables(main,isimport,includes){return(
Array.from(main._runtime._variables, (v, i) => (v._id = i, v))
  .filter(v => !isimport(v) && v._reachable)
  .filter(v => includes.includes("anon") || v._name !== null)
  .filter(v => includes.includes("builtin") || v._module !== main._runtime._builtin)
  .map(v => ({
    _module: v._module,
    _name: v._name,
    _id: v._id,
    _inputs: v._inputs
      .map(i => isimport(i) ? i._inputs[0] : i)
      .filter(i => includes.includes("builtin") || i._module !== main._runtime._builtin)
  }))
)};
const _x4mdme = function _isimport(){return(
v => v._inputs.length === 1 && v._module !== v._inputs[0]._module
)};
const _1l1xirp = async function _Runtime(require){return(
(await require("@observablehq/runtime@4")).Runtime
)};
const _s996kp = function _dot(require){return(
require("@observablehq/graphviz@0.2")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @observablehq/inputs", async () => runtime.module((await import("/@observablehq/inputs.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  $def("_vo7hij", null, ["md","id"], _vo7hij);  
  $def("_1gf3nzl", "viewof id", ["Text","location","Promises","Event"], _1gf3nzl);  
  $def("_11iau81", "id", ["Generators","viewof id"], _11iau81);  
  $def("_154ux4o", "viewof orient", ["Select"], _154ux4o);  
  $def("_2n856l", "orient", ["Generators","viewof orient"], _2n856l);  
  $def("_1vq7r4e", "viewof includes", ["Checkbox"], _1vq7r4e);  
  $def("_1xtkzad", "includes", ["Generators","viewof includes"], _1xtkzad);  
  $def("_buhbz9", "viewof apiKey", ["localStorageView","Inputs","html"], _buhbz9);  
  $def("_7956h7", "apiKey", ["Generators","viewof apiKey"], _7956h7);  
  $def("_185nh9k", "chart", ["dot","id","orient","variables","main"], _185nh9k);  
  $def("_ns3zjr", null, ["md"], _ns3zjr);  
  $def("_1oh9b76", "main", ["id","apiKey","Runtime","includes"], _1oh9b76);  
  $def("_1xk6i69", "variables", ["main","isimport","includes"], _1xk6i69);  
  $def("_x4mdme", "isimport", [], _x4mdme);  
  $def("_1l1xirp", "Runtime", ["require"], _1l1xirp);  
  main.define("Text", ["module @observablehq/inputs", "@variable"], (_, v) => v.import("Text", _));  
  main.define("Select", ["module @observablehq/inputs", "@variable"], (_, v) => v.import("Select", _));  
  main.define("Checkbox", ["module @observablehq/inputs", "@variable"], (_, v) => v.import("Checkbox", _));  
  $def("_s996kp", "dot", ["require"], _s996kp);  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  return main;
}