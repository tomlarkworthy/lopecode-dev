const _qwj24h = function _intro(md){return(
md`# Browser build for [Notebook Kit](https://github.com/observablehq/notebook-kit)

These are my recent notes on bringing some of Notebook Kit's functionality to the browser.

A big component of NotebookKit is the Vite plugin. However, it uses everything which bloats the bundle quite a lot (10Mb), with functionality that is impossible to do in the browse (Database connectors, serverside execution) so I have opted to export the lower level utilities instead resulting in a bundle size of only 170kb, where 110kb is the acorn parser. (I would like to make the acorn parser a peer dependancy but it was a little complicated)`
)};
const _15qoa78 = function _3(md){return(
md`### From jsDelivr

There is a are 1st party browser bundles. 


The transpiler brings in typescript at 1.3Mb (and acorn) so this is quite heavy`
)};
const _10rqctq = function _transpilerKit() {
    return import('https://cdn.jsdelivr.net/npm/@observablehq/notebook-kit/+esm');
};
const _ihbqz5 = function _5(md){return(
md`The runtime is quite light (<20kb)`
)};
const _cy4brx = function _runtimeKit() {
    return import('https://cdn.jsdelivr.net/npm/@observablehq/notebook-kit/runtime/+esm');
};
const _yvwjqx = function _7(md){return(
md`## Serde`
)};
const _hszmk6 = function _source(Inputs){return(
Inputs.textarea({
  rows: 10,
  value: `<notebook>
    <title>Demo</title>
    <script type="module">
    const a = 1;
    </scr\ipt>
    <script type="module">
    // A simple cell that displays a value
    display(a);
    </scr\ipt>
</notebook>
    `
})
)};
const _12f4ijd = (G, _) => G.input(_);
const _xy1py2 = function _notebook(kit,source){return(
kit.deserialize(source)
)};
const _1sz6ykd = function _rendered(kit,notebook){return(
kit.serialize(notebook)
)};
const _wfoq18 = function _11(md){return(
md`## Transpilers`
)};
const _8qvgxy = function _js_cell(kit){return(
kit.transpileJavaScript(`{
  let a = 3
}`)
)};
const _1rmtnck = function _ojs_cell(kit){return(
kit.transpileObservable(`a = 4`)
)};
const _1dqtekz = function _14(md){return(
md`plus more (e.g. templates)`
)};
const _5a770 = function _15(md){return(
md`## define

\`\`\`js
export function define(main: Module, state: DefineState, definition: Definition, observer = observe)
\`\`\`

Transpiration uses strings for the body. Before calling \`define\` they need to be converted to live functions. In the Vite plugin this is done by synthecising a \`<script>\` tag, but here we do it with an \`eval\`. `
)};
const _1q72r5g = function _runtime(Runtime){return(
new Runtime(() => ({}))
)};
const _1ka1duo = function _18(runtime){return(
runtime._variables
)};
const _15c042v = function _main(runtime){return(
runtime.module()
)};
const _1udqc5f = function _state(){return(
{
  variables: []
}
)};
const _1y07463 = function _definition(){return(
(source) => {
  let fn;
  eval("fn = " + source);
  return fn;
}
)};
const _2qd1xo = function _load(kit,main,state,ojs_cell,definition){return(
kit.define(main, state, {
  ...ojs_cell,
  body: definition(ojs_cell.body)
})
)};
const _1w35goe = async function _loaded_variable(load,state)
{
  load;
  await new Promise((r) => setTimeout(r, 100));
  return state.variables[0];
};
const _1rwddox = function _24(loaded_variable){return(
loaded_variable._promise
)};
const _s04p9k = function _25(md){return(
md`## Display

\`\`\`js
export type DisplayState = {
  /** the HTML element in which to render this cell’s display */
  root: HTMLDivElement;
  /** whether to clear on fulfilled */
  autoclear?: boolean;
  /** for inspected values, any expanded paths; see getExpanded */
  expanded: (number[][] | undefined)[];
};

export function display(state: DisplayState, value: unknown): void {
  const {root, expanded} = state;
  const node = isDisplayable(value, root) ? value : inspect(value, expanded[root.childNodes.length]); // prettier-ignore
  displayNode(state, node);
}
\`\`\``
)};
const _1fc33ua = function _element(htl){return(
htl.html`<div>`
)};
const _1umbiri = function _27(kit,element){return(
kit.display(
  {
    root: element,
    expanded: []
  },
  [1, 2, 3]
)
)};
const _w0nd9y = function _28(md){return(
md`## Observe

Observe creates a variable listener to display's to a DOM node
`
)};
const _1fxm65 = function _module2(runtime){return(
runtime.module()
)};
const _1wcrcmv = function _ticker_cell(kit){return(
kit.transpileObservable(`b = {let i = 0; while(true) yield i++}`)
)};
const _108l02b = function _observer(kit,node,ticker_cell){return(
kit.observe(
  // sets up an observer but it is unbound to a variable, you need define to do that
  {
    root: node,
    expanded: []
  },
  {
    ...ticker_cell
  }
)
)};
const _1a2alrx = function _32(md){return(
md`## Define uses Observe under the hood

So notebook kit's \`define\` also sets up DOM syncronization.`
)};
const _1i4dmw0 = function _node(htl){return(
htl.html`<div>`
)};
const _1ub434e = function _34(kit,module2,node,ticker_cell,definition){return(
kit.define(
  module2,
  {
    root: node,
    expanded: [],
    variables: []
  },
  {
    ...ticker_cell,
    body: definition(ticker_cell.body)
  },
  kit.observe
)
)};
const _11tq0ch = function _35(md){return(
md`## module resolution`
)};
const _oqpmcr = function _36(kit){return(
kit.resolveImport("npm:htl")
)};
const _16miv8o = function _37(md){return(
md`## Converting Notebook 1.0 to Notebook 2.0 files

Notebook kit has a converter for 2.0 to 1.0 but it won't run in the browser (CORS)`
)};
const _13ksbi7 = function _38(md){return(
md`it can be done from command line`
)};
const _wy2ife = function _39(md){return(
md`\`\`\`shell
npx @observablehq/notebook-kit download @tomlarkworthy/notebook-kit-examples
\`\`\``
)};
const _1mxcrwc = function _40(md){return(
md`or we can work around with \`fetchp\`, the CORS proxy`
)};
const _k4in0f = function _url(Inputs){return(
Inputs.text({
  label: "url",
  width: "600px",
  submit: true,
  minlength: 1,
  placeholder: "@tomlarkworthy/notebook-kit-examples"
})
)};
const _1a2n2ff = (G, _) => G.input(_);
const _1tadww0 = async function _notebook1(fetchp,url){return(
(
  await fetchp(`https://api.observablehq.com/document/${url}`)
).json()
)};
const _1rx6sz3 = function _44(Inputs,convert,notebook1){return(
Inputs.textarea({
  rows: 20,
  disabled: true,
  value: convert(notebook1)
})
)};
const _1cpnn57 = function _convert(kit){return(
({ title, nodes }) => {
  for (const node of nodes) if (node.mode === "js") node.mode = "ojs";
  return kit.serialize(kit.toNotebook({ title, cells: nodes }), {
    document: window.document
  });
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/notebook-kit", async () => runtime.module((await import("/@tomlarkworthy/notebook-kit.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-runtime", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime.js?v=4")).default));  
  main.define("module @tomlarkworthy/fetchp", async () => runtime.module((await import("/@tomlarkworthy/fetchp.js?v=4")).default));  
  $def("_qwj24h", "intro", ["md"], _qwj24h);  
  main.define("kit", ["module @tomlarkworthy/notebook-kit", "@variable"], (_, v) => v.import("kit", _));  
  $def("_15qoa78", null, ["md"], _15qoa78);  
  $def("_10rqctq", "transpilerKit", [], _10rqctq);  
  $def("_ihbqz5", null, ["md"], _ihbqz5);  
  $def("_cy4brx", "runtimeKit", [], _cy4brx);  
  $def("_yvwjqx", null, ["md"], _yvwjqx);  
  $def("_hszmk6", "viewof source", ["Inputs"], _hszmk6);  
  $def("_12f4ijd", "source", ["Generators","viewof source"], _12f4ijd);  
  $def("_xy1py2", "notebook", ["kit","source"], _xy1py2);  
  $def("_1sz6ykd", "rendered", ["kit","notebook"], _1sz6ykd);  
  $def("_wfoq18", null, ["md"], _wfoq18);  
  $def("_8qvgxy", "js_cell", ["kit"], _8qvgxy);  
  $def("_1rmtnck", "ojs_cell", ["kit"], _1rmtnck);  
  $def("_1dqtekz", null, ["md"], _1dqtekz);  
  $def("_5a770", null, ["md"], _5a770);  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Runtime", _));  
  main.define("Inspector", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("Library", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Library", _));  
  main.define("RuntimeError", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("RuntimeError", _));  
  $def("_1q72r5g", "runtime", ["Runtime"], _1q72r5g);  
  $def("_1ka1duo", null, ["runtime"], _1ka1duo);  
  $def("_15c042v", "main", ["runtime"], _15c042v);  
  $def("_1udqc5f", "state", [], _1udqc5f);  
  $def("_1y07463", "definition", [], _1y07463);  
  $def("_2qd1xo", "load", ["kit","main","state","ojs_cell","definition"], _2qd1xo);  
  $def("_1w35goe", "loaded_variable", ["load","state"], _1w35goe);  
  $def("_1rwddox", null, ["loaded_variable"], _1rwddox);  
  $def("_s04p9k", null, ["md"], _s04p9k);  
  $def("_1fc33ua", "element", ["htl"], _1fc33ua);  
  $def("_1umbiri", null, ["kit","element"], _1umbiri);  
  $def("_w0nd9y", null, ["md"], _w0nd9y);  
  $def("_1fxm65", "module2", ["runtime"], _1fxm65);  
  $def("_1wcrcmv", "ticker_cell", ["kit"], _1wcrcmv);  
  $def("_108l02b", "observer", ["kit","node","ticker_cell"], _108l02b);  
  $def("_1a2alrx", null, ["md"], _1a2alrx);  
  $def("_1i4dmw0", "node", ["htl"], _1i4dmw0);  
  $def("_1ub434e", null, ["kit","module2","node","ticker_cell","definition"], _1ub434e);  
  $def("_11tq0ch", null, ["md"], _11tq0ch);  
  $def("_oqpmcr", null, ["kit"], _oqpmcr);  
  $def("_16miv8o", null, ["md"], _16miv8o);  
  $def("_13ksbi7", null, ["md"], _13ksbi7);  
  $def("_wy2ife", null, ["md"], _wy2ife);  
  $def("_1mxcrwc", null, ["md"], _1mxcrwc);  
  main.define("fetchp", ["module @tomlarkworthy/fetchp", "@variable"], (_, v) => v.import("fetchp", _));  
  $def("_k4in0f", "viewof url", ["Inputs"], _k4in0f);  
  $def("_1a2n2ff", "url", ["Generators","viewof url"], _1a2n2ff);  
  $def("_1tadww0", "notebook1", ["fetchp","url"], _1tadww0);  
  $def("_1rx6sz3", null, ["Inputs","convert","notebook1"], _1rx6sz3);  
  $def("_1cpnn57", "convert", ["kit"], _1cpnn57);
  return main;
}