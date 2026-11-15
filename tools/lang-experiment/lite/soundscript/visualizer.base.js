const _1x409on = function _title(md){return(
md`# Visualizer: Own Cell Renderer

Instead of cells being rendered into a \`div\` that is setup before the runtime is started, we invert, by rendering cells into a div hosted _inside_ the notebook. Through this inversion, it is possible to change radically change how notebook renders within userspace. For example, creating a minimap, grid or both at the same time. 

\`\`\`js
import {visualizer, lopeviz_handle_css} from '@tomlarkworthy/visualizer'
\`\`\`

On its own this notebook is not very useful. It lays a foundation for total transformation of how notebooks can be rendered, but those new formats need to be developed.
`
)};
const _1bc6kre = function _lopeviz_handle_css(md){return(
md`<style>
  .lope-viz .observablehq {
    position: relative;
    min-height: 17px;
  }

  .lope-viz .observablehq:not(.observablehq--running):empty:after {
    content: "<detached>";
    font-style: oblique;
    font-family: var(--code)
  }

</style>`
)};
const _7kk8ke = function _3(md){return(
md`### Example - Rendering _this notebook_'s runtime-sdk-dependancy`
)};
const _kxu8mo = function _4(visualizer,runtime,invalidation,runtimSdkModule)
{
  return visualizer(runtime, {
    invalidation,
    module: runtimSdkModule,
    classList: "runtimeSdk",
    detachNodes: false
  });
};
const _kdg829 = function _5(htl){return(
htl.html`<style>
.runtimeSdk {
  background-color: yellow;
}
</style>`
)};
const _1njb9me = function _6(md){return(
md`---`
)};
const _121nbk1 = function _instructions(md){return(
md`## Instructions
The ordering of the cells is synced to the insertion of the runtime variable set, so there is a **single global ordering of cells** that all visualizers share. While it might make more sense for each visualizer to have its own ordering, the advantage of using the runtime ordering is that this is preserved when [single file exporting](https://observablehq.com/@tomlarkworthy/exporter). Thus, the global ordering changes are be preserved after export. 

Usage
\`\`\`js
visualizer(runtime, { // get a runtime reference from @mootari/access-runtime
  invalidation, // the visualizer need a reference to the invalidation promise  to tear down DOM state if being used dynamically
  module, // default main,
  filter: (cell_name, variables, cellIndex, status) => true, // filter what variables are displayed 
  inspector: /* default */ Inspector.into, // factory for creating cells
  detachNodes: false, // detach DOM nodes from their current parent when evaluating, so new visualizer can steal them
  classList: "" // additional class string to add
})
\`\`\``
)};
const _bym618 = function _8(md){return(
md`## Customizing the visual representation

The \`inspector\` variable defines a factory of variable observers, matching the signature of Observable's [\`Inspector.into\`](https://github.com/observablehq/inspector#Inspector_into) method. The visualizer uses this factory to build listeners to the runtime's variables. By default it is the default observable inspector, which renders cells in the way you are familiar, however, you can change this to anything. For example, the [minicell](https://observablehq.com/@tomlarkworthy/minicell) inspector renders just each variable's name, giving a minimap feel — but the possibilities are endless.`
)};
const _1quu22m = function _9(md){return(
md`---

---`
)};
const _j23c = function _10(md){return(
md`## Runtime Tooling Compatible

Visualizer uses the underlying runtime as the authoritative state, so it composes with the [single file exporter](https://observablehq.com/@tomlarkworthy/exporter) and [editor](https://observablehq.com/@tomlarkworthy/editor) (not shown), enabling editable, reordering and offline-first notebooks that (re)serialise to single files. Try clicking "tab".`
)};
const _1jhi1ns = function _11(md){return(
md`### Differences to other works

- The Observable's [export cell renderer](https://observablehq.com/documentation/embeds/advanced#rendering-cells) describes a pattern tofirst create a \`div\`, a CSS style tag, and then use Inspector.into when starting the runtime,
- [@asg017/v0-6-0-of-the-unofficial-observablehq-compiler](https://observablehq.com/@asg017/v0-6-0-of-the-unofficial-observablehq-compiler#cell-214) follows a similar pattern of setting up the framing and rendering of the runtime before starting a notebook using Inspector.into

This approach here is very different. The problem with the above approaches is only one Inspector can be used, _**and**_ it has to be decided before running the notebook in a privileged context, and you have to select a CSS stylesheet all in advance. In contrast, the [visualizer](https://observablehq.com/@tomlarkworthy/visualizer) allows multiple Inspectors to be attached dynamically after the runtime is started, and the can be added from inside the notebook environment like any other notebook logic. The workhorse of the methodology is being able to attached Observers to variables dynamically, which is implemented [here](https://observablehq.com/@tomlarkworthy/runtime-sdk#cell-159).

So this means you no longer need to choose a stylesheet upfront, or add a div, or even instantiate an Inspector before starting a runtime, as these decisions can be done inside the loaded notebook, allowing you to start the runtime _headless_, then add multiple views of the notebook as needed.

\`\`\`html
<!DOCTYPE html>
<script type="module">
import {Runtime} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";
import define from "https://api.observablehq.com/@jashkenas/my-neat-notebook.js?v=3";
new Runtime().module(define, {}); // empty inspector
</scr\ipt>
\`\`\`

`
)};
const _1nnmael = function _12(md){return(
md`---

## Implementation`
)};
const _v2why = function _why(md){return(
md`## How panes are built

A pane is an \`instantiateDataflow\` instance of \`vizPaneTemplate\`, parameterised by its root, module, filter and inspector. Each drawn cell is an instance of \`vizCellTemplate\`, parameterised by its variable. A cell's observer is released through its instance's \`invalidation\`, so deleting a cell or disposing a pane is \`instance.dispose()\`. Instances live in [dataflow templating](https://observablehq.com/@tomlarkworthy/dataflow-templating)'s sandbox Runtime, so the page runtime gains no variables per pane or per cell.

\`vizPaneCells\` reads [cell-map](https://observablehq.com/@tomlarkworthy/cell-map)'s \`liveCellMap\`, which groups Notebook Kit variables (\`cell N\`, \`viewof$x\`, projections) as well as classic ones.

A cell defined by [js-toolchain](https://observablehq.com/@tomlarkworthy/js-toolchain)'s \`defineCell\` renders its Notebook Kit display root, attached once through js-toolchain's \`attachDisplay\`, so \`display()\` called twice shows two nodes. Other cells render through the inspector.

\`syncers\` is \`vizSynced\`, the count of pane syncs; editor-5 reads it as a trigger.

A template edit reaches panes and cells created after it, not nodes already mounted.`
)};
const _1dop2vt = function _allVariables(variables,runtime){return(
variables(runtime)
)};
const _1b82ds4 = (G, _) => G.input(_);
const _9i8usd = function _visualizer(main,Inspector,instantiateDataflow,vizPaneTemplate,onCodeChange){return(
(
  runtime,
  {
    invalidation,
    module = main,
    filter = () => true,
    inspector = Inspector.into,
    detachNodes = false,
    classList = ""
  } = {}
) => {
  const root = document.createElement("div");
  root.className = `observablehq-root lope-viz ${classList}`.trim();
  root.style.cssText = "min-height: 2rem; min-width: 2rem;";
  const visualizer = document.createElement("div");
  visualizer.className = "lopecode-visualizer";
  visualizer.appendChild(root);
  visualizer.detachNodes = detachNodes;
  Object.assign(root, { filter, module, inspector, detachNodes, visualizer });

  const factory = inspector(root);
  const vizInspector = (variable, ...args) => {
    const observer = factory(variable, ...args);
    observer._node.variable = variable;
    if (variable._name) observer._node.setAttribute("cell", variable._name);
    return observer;
  };
  const pane = instantiateDataflow(vizPaneTemplate, {
    params: { vizRoot: root, vizModule: module, vizFilter: filter, vizInspector, vizDetachNodes: detachNodes },
    observers: (name) => (name === "vizPaneSync" ? {} : undefined),
    watch: onCodeChange
  });
  root.pane = pane;
  invalidation?.then(() => {
    pane.dispose();
    root.remove();
    visualizer.remove();
  });
  return visualizer;
}
)};
const _v2tdoc = function _templates_doc(md){return(
md`### Templates

\`vizVariable\`, \`vizInspector\`, \`vizDetachNodes\`, \`vizRoot\`, \`vizModule\` and \`vizFilter\` are the templates' parameters, supplied by each instance. In this module they hold defaults (\`null\`, \`false\`, \`() => true\`), and \`vizCellNode\` returns \`null\` without a variable and an inspector.`
)};
const _v2pvar = function _vizVariable(){return(
null
)};
const _v2pins = function _vizInspector(){return(
null
)};
const _v2pdet = function _vizDetachNodes(){return(
false
)};
const _v2proot = function _vizRoot(){return(
null
)};
const _v2pmod = function _vizModule(){return(
null
)};
const _v2pflt = function _vizFilter(){return(
() => true
)};
const _v2draw = function _drawnVariable(displayStateOf){return(
(cell) => {
  if (!cell || cell.type === "import") return null;
  const vars = cell.variables || [];
  const displayed = vars.find((v) => displayStateOf(v));
  if (displayed) return displayed;
  // classic mutable is [initial x, mutable x, x]: draw x, not the seed (#159)
  return (cell.type === "mutable" ? vars[2] : vars[0]) ?? null;
}
)};
const _v2cnode = function _vizCellNode(vizVariable,vizInspector,vizDetachNodes,displayStateOf,attachDisplay,observe,invalidation)
{
  if (!vizVariable || !vizInspector) return null;
  const state = displayStateOf(vizVariable);
  let node, release;
  if (state) {
    // The display root is the cell node, so a second pane takes it rather than copying it.
    node = state.root;
    node.classList.add("observablehq", "lope-viz-nk");
    release = attachDisplay(vizVariable, observe);
  } else {
    const observer = vizInspector(vizVariable);
    node = observer._node;
    const unobserve = observe(vizVariable, observer, { detachNodes: vizDetachNodes });
    release = () => {
      const value = vizVariable._value;
      if (value && value.nodeType && value.parentNode === node) node.removeChild(value);
      unobserve?.();
    };
  }
  node.variable = vizVariable;
  if (vizVariable._name) node.setAttribute("cell", vizVariable._name);
  invalidation.then(release);
  return node;
};
const _v2ctpl = function _vizCellTemplate(lookupVariable,visualizerModule,vizVariable,vizInspector,vizDetachNodes,vizCellNode)
{
  // read so the lookup refreshes when a template cell is redefined
  [vizVariable, vizInspector, vizDetachNodes, vizCellNode];
  return lookupVariable(["vizVariable", "vizInspector", "vizDetachNodes", "vizCellNode"], visualizerModule);
};
const _v2pcel = function _vizPaneCells(liveCellMap,vizModule,vizFilter)
{
  const cells = (vizModule && liveCellMap.get(vizModule)) || [];
  const filterState = {};
  return cells.filter((cell, i) => vizFilter(cell?.name, cell?.variables, i, filterState));
};
const _v2pst = function _vizPaneState(invalidation)
{
  const state = { cells: new Map(), headers: new Map() };
  invalidation.then(() => {
    for (const entry of state.cells.values()) entry.instance.dispose();
    state.cells.clear();
    state.headers.clear();
  });
  return state;
};
const _v2psyn = async function _vizPaneSync(vizPaneCells,vizPaneState,vizRoot,vizModule,vizInspector,vizDetachNodes,drawnVariable,instantiateDataflow,vizCellTemplate,createImportCellHeader,renderImportCell,vizSyncEvents,displayStateOf)
{
  if (!vizRoot) return 0;
  const { cells, headers } = vizPaneState;
  const desired = [];
  const seenVars = new Set();
  const seenHeaders = new Set();
  const isKnown = (imported) => {
    try {
      return !!vizModule._scope.has(imported);
    } catch {
      return true;
    }
  };

  vizPaneCells.forEach((cell, i) => {
    if (cell?.type === "import") {
      const ii = cell.importInfo;
      if (!ii || ii.type !== "import" || ii.specifier === "builtin") return;
      const key = `${String(ii.specifier ?? "")}#${String(cell.name ?? i)}`;
      seenHeaders.add(key);
      let header = headers.get(key);
      if (!header) headers.set(key, (header = createImportCellHeader(cell)));
      header.__viz.cell = cell;
      header.variable = cell.variables[0];
      header.__viz.statement.replaceChildren(renderImportCell(cell, { isKnown }));
      desired.push(header);
      return;
    }
    const v = drawnVariable(cell);
    if (!v) return;
    // a nested visualizer that detaches its nodes is not drawn again here
    if (v._value?.classList?.contains?.("lopecode-visualizer") && v._value.detachNodes) return;
    seenVars.add(v);
    let entry = cells.get(v);
    // an exported Notebook Kit head registers its display state on first compute, after its node was made
    if (entry && entry.nk !== !!displayStateOf(v)) {
      cells.delete(v);
      entry.instance.dispose();
      entry = undefined;
    }
    if (!entry) {
      const instance = instantiateDataflow(vizCellTemplate, {
        params: { vizVariable: v, vizInspector, vizDetachNodes },
        observers: (name) => (name === "vizCellNode" ? {} : undefined)
      });
      entry = { instance, node: instance.value("vizCellNode"), nk: !!displayStateOf(v) };
      cells.set(v, entry);
    }
    desired.push(entry);
  });

  for (const [v, entry] of [...cells]) {
    if (seenVars.has(v)) continue;
    cells.delete(v);
    entry.instance.dispose();
    const node = await entry.node.catch(() => null);
    if (node?.parentNode === vizRoot) node.remove();
  }
  for (const [key, header] of [...headers]) {
    if (seenHeaders.has(key)) continue;
    headers.delete(key);
    header.remove();
  }

  const nodes = (await Promise.all(desired.map((d) => (d.instance ? d.node.catch(() => null) : d)))).filter(Boolean);
  const managed = (n) => !!n?.classList?.contains("observablehq");
  const keep = new Set(nodes);
  for (const child of [...vizRoot.childNodes]) if (managed(child) && !keep.has(child)) child.remove();
  let cursor = vizRoot.firstChild;
  for (const node of nodes) {
    while (cursor && !managed(cursor)) cursor = cursor.nextSibling;
    if (node === cursor) {
      cursor = cursor.nextSibling;
      continue;
    }
    vizRoot.insertBefore(node, cursor);
  }
  vizSyncEvents.notify();
  return nodes.length;
};
const _v2sevt = function _vizSyncEvents(EventTarget,Event)
{
  // Fired after a pane reorders its cell nodes. Siblings the pane does not manage (editor hosts) are
  // left where they were, so their owners rerun placement on vizSynced.
  const target = new EventTarget();
  return Object.assign(target, { notify: () => target.dispatchEvent(new Event("sync")) });
};
const _v2synd = function _vizSynced(Generators,vizSyncEvents){return(
Generators.observe((notify) => {
  let syncs = 0;
  const onSync = () => notify(++syncs);
  vizSyncEvents.addEventListener("sync", onSync);
  notify(syncs);
  return () => vizSyncEvents.removeEventListener("sync", onSync);
})
)};
const _v2ptpl = function _vizPaneTemplate(lookupVariable,visualizerModule)
{
  // no value deps: instantiateDataflow copies each definition when a pane is made and watch re-syncs edits,
  // while a dep on vizPaneCells re-ran visualizer, and every cell depending on it, on each cell-map change
  return lookupVariable(
    ["vizRoot", "vizModule", "vizFilter", "vizInspector", "vizDetachNodes", "vizPaneCells", "vizPaneState", "vizPaneSync"],
    visualizerModule
  );
};
const _1e4b50w = function _TRACE_CELL(trace_variable){return(
trace_variable
)};
const _11ugoev = function _20(htl){return(
htl.html`<style>
  .cell-menu {
    height: 17px;
  }
</style>`
)};
const _zodkh8 = function _createImportCellHeader(){return(
(cell) => {
  const header = document.createElement("div");
  header.className = "observablehq lope-viz-import";
  header.setAttribute("data-cell-type", "import");
  header.setAttribute("data-cell-name", String(cell?.name ?? ""));
  if (cell?.module_name)
    header.setAttribute("data-module-name", String(cell.module_name));
  header.setAttribute("cell", String(cell?.name ?? "import"));
  const line = document.createElement("div");
  line.className = "lope-viz-import-line";
  const statement = document.createElement("div");
  statement.className = "lope-viz-import-statement";
  line.appendChild(statement);
  header.appendChild(line);
  header.__viz = { statement, cell };
  return header;
}
)};
const _1xdl683 = function _renderImportCell(navHref){return(
(cell, { isKnown = () => true } = {}) => {
  const ii = cell?.importInfo ?? null;
  const span = document.createElement("span");
  span.className = "observablehq--inspect observablehq--import";

  if (!ii || ii.type !== "import") {
    span.appendChild(document.createTextNode("invalid importInfo"));
    return span;
  }

  if (typeof ii.source === "string" && ii.source.trim().startsWith("import")) {
    span.appendChild(document.createTextNode(ii.source.trim()));
    return span;
  }

  const moduleId = String(ii.notebook ?? ii.specifier ?? ii.from ?? "").trim();
  const specs = (Array.isArray(ii.specifiers) ? ii.specifiers : [])
    .map((s) => ({ imported: s?.imported == null ? "" : String(s.imported), local: s?.local == null ? "" : String(s.local) }))
    .filter((d) => d.imported || d.local);

  span.appendChild(document.createTextNode("import {"));
  specs.forEach((s, i) => {
    if (i) span.appendChild(document.createTextNode(", "));
    const imported = s.imported || s.local;
    const local = s.local || s.imported;
    const a = document.createElement("a");
    a.textContent = imported;
    if (isKnown(imported) && moduleId) a.href = navHref({ open: moduleId, cell: imported });
    else a.className = "observablehq--unknown";
    span.appendChild(a);
    if (imported !== local) span.appendChild(document.createTextNode(` as ${local}`));
  });
  span.appendChild(document.createTextNode("} from "));

  if (!moduleId) {
    span.appendChild(document.createTextNode(`"${String(ii.from ?? ii.specifier ?? "")}"`));
    return span;
  }
  const fromLink = span.appendChild(document.createElement("a"));
  fromLink.href = navHref({ open: moduleId });
  fromLink.textContent = `"${String(ii.from ?? ii.specifier ?? moduleId)}"`;
  return span;
}
)};
const _bbb3dg = function _syncers(vizSynced){return(
vizSynced
)};
const _een5pq = function _25(md){return(
md`### module handle`
)};
const _1oonsyz = function _visualizerModule(thisModule){return(
thisModule()
)};
const _690yio = (G, _) => G.input(_);
const _vzt00 = function _29(md) {return (md`## Tests

Each \`test_viz_*\` cell makes a throwaway module with runtime-sdk's \`createModule\`, mounts \`visualizer(runtime, options)\` on it in an off-screen host, changes the module's variables, and waits for the DOM to follow. Everything a test creates is deleted in \`finally\`.

A fixture's first cell is a \`title\` string. \`@tomlarkworthy/modules\` computes a module's first cell to find its title, so without it the first cell under test would run before any visualizer observed it. Title cells, builtin variables (\`Generators\`, \`@variable\`) and the builtin import header are left out of the names the tests compare.

The tests create and delete modules, so each resolves to a \`skipped:\` string until *Run visualizer tests* is on. Add \`&viz_tests\` to the hash to start with it on.`);};
const _vzt01 = function _viz_tests_enabled(Inputs,location) {return (Inputs.toggle({
  label: "Run visualizer tests",
  value: /(^#|&)viz_tests(=|&|$)/.test(location.hash)
}));};
const _vzt02 = (G, _) => G.input(_);
const _vzt03 = function _vt(ui,runtime,createModule,deleteModule,visualizer,viz_tests_enabled) {
  const skipped = "skipped: turn on 'Run visualizer tests' (or add &viz_tests to the hash) to run this scenario";
  const host = () => {
    let h = document.getElementById("viz-tests-host");
    if (!h) {
      h = Object.assign(document.createElement("div"), {id: "viz-tests-host"});
      h.style.cssText = "position:absolute;left:-10000px;top:0;width:640px";
      document.body.appendChild(h);
    }
    return h;
  };
  const until = async (fn, what = "condition", timeout = 8000) => {
    const t0 = Date.now();
    for (;;) {
      let ok = false;
      try { ok = fn(); } catch {}
      if (ok) return ok;
      if (Date.now() - t0 > timeout) throw new Error(`vt.until: ${what} not reached within ${timeout}ms`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  // for asserting that nothing happens: long enough for runtime_variables -> cellMap -> syncers to run more than once
  const quiet = (ms = 2500) => new Promise((r) => setTimeout(r, ms));
  const titles = new WeakSet();
  const shown = (n) => n.classList.contains("observablehq") && !titles.has(n.variable) && n.variable?._type !== 2 && n.getAttribute("data-module-name") !== "builtin";
  const nodes = (root) => [...root.children].filter(shown);
  const label = (n) => n.classList.contains("lope-viz-import") ? `import ${n.getAttribute("data-module-name")}` : n.getAttribute("cell") ?? "<anon>";
  const names = (root) => nodes(root).map(label);
  const node = (root, name) => nodes(root).find((n) => n.getAttribute("cell") === name);
  const text = (root, name) => node(root, name)?.textContent ?? null;
  const own = (module) => [...runtime._variables].filter((v) => v._module === module && v._type === 1 && !titles.has(v));
  let counter = 0;
  const scenario = (fn, opts = {}) => !viz_tests_enabled ? Promise.resolve(skipped) : ui.scenario(async (t) => {
    const made = [], mounted = [];
    const fixture = () => {
      const name = `@viz-tests/fixture-${Date.now().toString(36)}-${counter++}`;
      made.push(name);
      const module = createModule(name, runtime);
      titles.add(module.variable().define("title", [], () => name));
      return module;
    };
    const mount = (module, options = {}) => {
      let invalidate;
      const invalidation = new Promise((r) => (invalidate = r));
      const el = visualizer(runtime, {invalidation, module, ...options});
      host().appendChild(el);
      const m = {el, root: el.firstElementChild, unmount: () => { invalidate(); el.remove(); }};
      mounted.push(m);
      return m;
    };
    try {
      return await fn({...t, fixture, mount, until, quiet, nodes, names, node, text, own});
    } finally {
      for (const m of mounted) m.unmount();
      for (const name of made) { try { deleteModule(name, runtime); } catch {} }
      await ui.settle();
    }
  }, {timeout: 30000, ...opts});
  return {scenario, skipped, host, until, quiet, nodes, names, node, text, own};
};
const _vzt10 = function _test_viz_renders_cells_in_runtime_order(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  module.variable().define("b", ["a"], (a) => a + 1);
  module.variable().define(null, ["b"], (b) => b * 10);
  const {root} = t.mount(module);
  await t.until(() => t.nodes(root).length === 3 && t.nodes(root)[2].textContent.includes("20"), "3 rendered cells");
  expect(t.names(root)).toEqual(["a", "b", "<anon>"]);
  const vars = t.own(module);
  expect(t.nodes(root).map((n, i) => n.variable === vars[i])).toEqual([true, true, true]);
  expect(t.text(root, "a")).toContain("1");
  expect(t.text(root, "b")).toContain("2");
  return `rendered ${t.names(root).join(", ")} in runtime order`;
}));};
const _vzt11 = function _test_viz_an_unobserved_cell_computes_once_rendered(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  let runs = 0;
  module.variable().define("lazy", [], () => ++runs);
  await t.quiet(1500);
  expect(runs).toBe(0);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "lazy")?.includes("1"), "lazy rendered");
  await t.quiet(1000);
  expect(runs).toBe(1);
  return "a lazy cell ran once, when the visualizer observed it";
}));};
const _vzt12 = function _test_viz_redefinition_updates_the_same_node(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("b", ["a"], (a) => a + 1);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "b")?.includes("2"), "b = 2");
  const [na, nb] = [t.node(root, "a"), t.node(root, "b")];
  a.define("a", [], () => 41);
  await t.until(() => t.text(root, "b")?.includes("42"), "b = 42 after redefining a");
  expect(t.node(root, "a") === na).toBe(true);
  expect(t.node(root, "b") === nb).toBe(true);
  expect(t.names(root)).toEqual(["a", "b"]);
  return "redefining a updated a and b in their existing nodes";
}));};
const _vzt13 = function _test_viz_renamed_variable_keeps_its_node(vt,expect) {return (vt.scenario(async (t) => {
  // The node's cell= attribute is set when its inspector is made and is not updated on a rename
  // (measured 2026-09-13: still "a" after renaming to z). Not asserted either way.
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b", "a and b");
  const na = t.nodes(root)[0];
  a.define("z", [], () => 26);
  await t.until(() => t.nodes(root)[0]?.textContent.includes("26"), "renamed cell shows 26");
  expect(t.nodes(root)[0] === na).toBe(true);
  expect(t.nodes(root).length).toBe(2);
  return "renaming a to z kept its node and position";
}));};
const _vzt14 = function _test_viz_delete_removes_only_that_node(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  const b = module.variable().define("b", [], () => 2);
  module.variable().define("c", [], () => 3);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b,c" && t.text(root, "c")?.includes("3"), "a, b, c");
  const [na, nc] = [t.node(root, "a"), t.node(root, "c")];
  b.delete();
  await t.until(() => t.names(root).join() === "a,c", "b removed");
  expect(t.node(root, "a") === na).toBe(true);
  expect(t.node(root, "c") === nc).toBe(true);
  return "deleting b removed its node and kept a and c";
}));};
const _vzt1g = function _test_viz_a_cell_leaving_the_map_releases_its_observer(vt,expect) {return (vt.scenario(async (t) => {
  // cell-map drops "dynamic …" variables, so renaming one takes it out of the map while it still exists
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  const b = module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b" && t.text(root, "b")?.includes("2"), "a, b");
  expect(!!b._observer?.__observe_listeners__).toBe(true);
  b.define("dynamic b", [], () => 3);
  await t.until(() => t.names(root).join() === "a", "b's node removed");
  await t.until(() => !b._observer?.__observe_listeners__, "b's observer released");
  return "a variable that left the cell map lost both its node and its observer";
}));};
const _vzt15 = function _test_viz_new_and_moved_cells_follow_runtime_order(vt,runtime,repositionSetElement,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  const b = module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b", "a, b");
  const d = module.variable().define("d", [], () => 4);
  await t.until(() => t.names(root).join() === "a,b,d" && t.text(root, "d")?.includes("4"), "d appended");
  const nd = t.node(root, "d");
  repositionSetElement(runtime._variables, d, [...runtime._variables].indexOf(b));
  await t.until(() => t.names(root).join() === "a,d,b", "d moved before b");
  expect(t.node(root, "d") === nd).toBe(true);
  return "a new cell rendered last, and moving it in runtime._variables moved its node";
}));};
const _vzt16 = function _test_viz_viewof_renders_one_node_holding_the_view(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const input = Object.assign(document.createElement("input"), {type: "range", min: 0, max: 10, step: 1});
  input.value = "3";
  module.variable().define("viewof x", [], () => input);
  module.variable().define("x", ["Generators", "viewof x"], (G, _) => G.input(_));
  module.variable().define("y", ["x"], (x) => x * 2);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "y")?.includes("6"), "y = 6");
  expect(t.names(root)).toEqual(["viewof x", "y"]);
  expect(t.node(root, "viewof x").contains(input)).toBe(true);
  await t.set(input, 7);
  await t.until(() => t.text(root, "y")?.includes("14"), "y = 14 after moving the range");
  expect(t.node(root, "viewof x").contains(input)).toBe(true);
  return "viewof x rendered once, holding its input; moving it updated y";
}));};
const _vzt17 = function _test_viz_mutable_renders_its_live_value(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("initial m", [], () => 1);
  module.variable().define("mutable m", ["Mutable", "initial m"], (M, v) => new M(v));
  module.variable().define("m", ["mutable m"], (_) => _.generator);
  module.variable().define("twice", ["m"], (m) => m * 2);
  const {root} = t.mount(module);
  await t.until(() => t.text(root, "twice")?.includes("2"), "twice = 2");
  expect(t.names(root)).toEqual(["m", "twice"]);
  (await module.value("mutable m")).value = 5;
  await t.until(() => t.text(root, "m")?.includes("5") && t.text(root, "twice")?.includes("10"), "m = 5, twice = 10");
  return "mutable m rendered as one node showing m, and followed an assignment";
}));};
const _vzt18 = function _test_viz_imports_render_one_header_per_module(vt,runtime,expect) {return (vt.scenario(async (t) => {
  const urls = [...runtime._variables].find((v) => v._name === "module @tomlarkworthy/lopepage-urls" && v._value)?._value;
  expect(!!urls).toBe(true);
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("module @tomlarkworthy/lopepage-urls", [], () => urls);
  module.variable().define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  module.variable().define("nh", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navHref", "nh", _));
  const {root} = t.mount(module);
  await t.until(() => root.querySelector(".lope-viz-import[data-module-name='@tomlarkworthy/lopepage-urls'] a"), "import header with links");
  const headers = root.querySelectorAll(".lope-viz-import[data-module-name='@tomlarkworthy/lopepage-urls']");
  expect(headers.length).toBe(1);
  const header = headers[0];
  expect(header.getAttribute("data-cell-type")).toBe("import");
  expect(t.names(root)).toEqual(["a", "import @tomlarkworthy/lopepage-urls"]);
  const statement = header.querySelector(".lope-viz-import-statement").textContent;
  expect(statement).toContain("linkTo");
  expect(statement).toContain("as nh");
  expect(statement).toContain('"@tomlarkworthy/lopepage-urls"');
  const link = [...header.querySelectorAll("a")].find((el) => el.textContent === "linkTo");
  expect(link.getAttribute("href")).toContain("open=");
  a.define("a", [], () => 2);
  await t.until(() => t.text(root, "a")?.includes("2"), "a = 2");
  expect(root.querySelector(".lope-viz-import[data-module-name='@tomlarkworthy/lopepage-urls']") === header).toBe(true);
  return `one import header: ${statement}`;
}));};
const _vzt19 = function _test_viz_filter_sees_every_cell_with_its_index(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  module.variable().define("b", [], () => 2);
  module.variable().define("c", [], () => 3);
  const calls = [];
  const filter = (name, variables, i, state) => {
    calls.push({name, i, state, variables});
    return name !== "b";
  };
  const {root} = t.mount(module, {filter});
  await t.until(() => t.names(root).join() === "a,c" && t.text(root, "c")?.includes("3"), "a and c rendered, b filtered out");
  const passes = [];
  for (const c of calls) {
    if (c.i === 0) passes.push([]);
    passes.at(-1).push(c);
  }
  for (const p of passes) {
    expect(p.map((c) => c.i)).toEqual(p.map((_, k) => k));
    expect(new Set(p.map((c) => c.state)).size).toBe(1);
  }
  expect(new Set(passes.map((p) => p[0].state)).size).toBe(passes.length);
  const last = passes.at(-1);
  expect(last.map((c) => c.name)).toEqual(["title", "a", "b", "c"]);
  expect(last.every((c) => Array.isArray(c.variables) && c.variables[0]?._name === c.name)).toBe(true);
  return `${passes.length} sync passes, each calling filter for every cell with i = 0.. and one fresh state object`;
}));};
const _vzt1a = function _test_viz_custom_inspector_nodes_carry_their_variable(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  module.variable().define("a", [], () => 1);
  module.variable().define("b", ["a"], (a) => a + 1);
  const roots = [];
  const inspector = (root) => {
    roots.push(root);
    return (variable) => {
      const node = document.createElement("div");
      node.className = "observablehq viz-custom-probe";
      return {
        _node: node,
        pending() { node.dataset.state = "pending"; },
        fulfilled(value) { node.dataset.state = "fulfilled"; node.textContent = `${variable._name}=${value}`; },
        rejected(error) { node.dataset.state = "rejected"; node.textContent = String(error); }
      };
    };
  };
  const {root} = t.mount(module, {inspector});
  await t.until(() => t.nodes(root).map((n) => n.textContent).join() === "a=1,b=2", "custom nodes a=1, b=2");
  expect(roots.length).toBe(1);
  expect(roots[0] === root).toBe(true);
  for (const n of t.nodes(root)) {
    expect(n.classList.contains("viz-custom-probe")).toBe(true);
    expect(n.variable._name).toBe(n.getAttribute("cell"));
    expect(n.dataset.state).toBe("fulfilled");
  }
  return "the factory was called once with the root; its nodes carry .variable and cell=";
}));};
const _vzt1b = function _test_viz_error_and_pending_states(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  let release;
  module.variable().define("boom", [], () => { throw new Error("boom"); });
  module.variable().define("slow", [], () => new Promise((r) => (release = r)));
  const {root} = t.mount(module);
  await t.until(() => t.node(root, "boom")?.classList.contains("observablehq--error"), "boom shows an error");
  expect(t.text(root, "boom")).toContain("boom");
  await t.until(() => release && t.node(root, "slow")?.classList.contains("observablehq--running"), "slow shows running");
  release(7);
  await t.until(() => t.text(root, "slow")?.includes("7") && !t.node(root, "slow").classList.contains("observablehq--running"), "slow resolves to 7");
  return "a throwing cell renders observablehq--error; a pending one observablehq--running until it resolves";
}));};
const _vzt1c = function _test_viz_two_visualizers_of_one_module_are_independent(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  const A = t.mount(module), B = t.mount(module);
  await t.until(() => t.text(A.root, "a")?.includes("1") && t.text(B.root, "a")?.includes("1"), "a in both");
  expect(t.node(A.root, "a") === t.node(B.root, "a")).toBe(false);
  a.define("a", [], () => 2);
  await t.until(() => t.text(A.root, "a")?.includes("2") && t.text(B.root, "a")?.includes("2"), "a = 2 in both");
  A.unmount();
  a.define("a", [], () => 3);
  await t.until(() => t.text(B.root, "a")?.includes("3"), "a = 3 in B after A unmounted");
  expect(A.root.isConnected).toBe(false);
  return "two visualizers of one module each rendered a; unmounting one left the other live";
}));};
const _vzt1d = function _test_viz_unmount_hands_variables_back(vt,expect) {return (vt.scenario(async (t) => {
  // a disposed pane leaves its nodes in the detached root
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  const m = t.mount(module);
  await t.until(() => t.text(m.root, "a")?.includes("1"), "a rendered");
  expect(!!a._observer?.__observe_listeners__).toBe(true);
  const before = t.nodes(m.root).length;
  m.unmount();
  module.variable().define("later", [], () => 0);
  await t.until(() => !a._observer?.__observe_listeners__, "observer handed back");
  a.define("a", [], () => 2);
  await t.quiet(1500);
  expect(m.root.isConnected).toBe(false);
  expect(t.nodes(m.root).length).toBeLessThanOrEqual(before);
  expect(t.text(m.root, "a") ?? "").not.toContain("2");
  return "after invalidation: observer restored; later changes neither add nodes to the root nor update them";
}));};
const _vzt1e = function _test_viz_foreign_children_survive_a_sync(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const a = module.variable().define("a", [], () => 1);
  module.variable().define("b", [], () => 2);
  const {root} = t.mount(module);
  await t.until(() => t.names(root).join() === "a,b", "a, b");
  const note = Object.assign(document.createElement("p"), {textContent: "not a cell"});
  root.insertBefore(note, t.node(root, "b"));
  a.define("a", [], () => 5);
  module.variable().define("c", [], () => 3);
  await t.until(() => t.names(root).join() === "a,b,c" && t.text(root, "a")?.includes("5"), "a = 5 and c added");
  expect(note.parentNode === root).toBe(true);
  return "a child without the observablehq class stayed in the root across syncs";
}));};
const _vzt1f = function _test_viz_detachNodes_takes_an_element_value(vt,expect) {return (vt.scenario(async (t) => {
  const module = t.fixture();
  const probe = (text) => Object.assign(document.createElement("span"), {className: "viz-probe", textContent: text});
  const el = module.variable().define("el", [], () => probe("one"));
  const A = t.mount(module);
  await t.until(() => A.root.querySelector(".viz-probe"), "element rendered in A");
  const B = t.mount(module, {detachNodes: true});
  await t.until(() => B.root.querySelector(".viz-probe"), "element taken by B");
  expect(A.root.querySelector(".viz-probe")).toBe(null);
  el.define("el", [], () => probe("two"));
  await t.until(() => B.root.querySelector(".viz-probe")?.textContent === "two", "B holds the redefined element");
  expect(A.root.querySelector(".viz-probe")).toBe(null);
  return "a detachNodes visualizer took the element from the first, and kept the redefined one";
}));};
const _xqi0zo = function _28(md){return(
md`### imports`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));
  main.define("module @tomlarkworthy/ui-testing", async () => runtime.module((await import("/@tomlarkworthy/ui-testing.js?v=4")).default));
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/dataflow-templating", async () => runtime.module((await import("/@tomlarkworthy/dataflow-templating.js?v=4")).default));  
  main.define("module @tomlarkworthy/js-toolchain", async () => runtime.module((await import("/@tomlarkworthy/js-toolchain.js?v=4")).default));  
  $def("_1x409on", "title", ["md"], _1x409on);  
  $def("_1bc6kre", "lopeviz_handle_css", ["md"], _1bc6kre);  
  $def("_7kk8ke", null, ["md"], _7kk8ke);  
  $def("_kxu8mo", null, ["visualizer","runtime","invalidation","runtimSdkModule"], _kxu8mo);  
  $def("_kdg829", null, ["htl"], _kdg829);  
  $def("_1njb9me", null, ["md"], _1njb9me);  
  $def("_121nbk1", "instructions", ["md"], _121nbk1);  
  $def("_bym618", null, ["md"], _bym618);  
  $def("_1quu22m", null, ["md"], _1quu22m);  
  $def("_j23c", null, ["md"], _j23c);  
  $def("_1jhi1ns", null, ["md"], _1jhi1ns);  
  $def("_1nnmael", null, ["md"], _1nnmael);  
  $def("_v2why", "why", ["md"], _v2why);  
  $def("_1dop2vt", "viewof allVariables", ["variables","runtime"], _1dop2vt);  
  $def("_1b82ds4", "allVariables", ["Generators","viewof allVariables"], _1b82ds4);  
  $def("_9i8usd", "visualizer", ["main","Inspector","instantiateDataflow","vizPaneTemplate","onCodeChange"], _9i8usd);  
  $def("_v2tdoc", "templates_doc", ["md"], _v2tdoc);  
  $def("_v2pvar", "vizVariable", [], _v2pvar);  
  $def("_v2pins", "vizInspector", [], _v2pins);  
  $def("_v2pdet", "vizDetachNodes", [], _v2pdet);  
  $def("_v2proot", "vizRoot", [], _v2proot);  
  $def("_v2pmod", "vizModule", [], _v2pmod);  
  $def("_v2pflt", "vizFilter", [], _v2pflt);  
  $def("_v2draw", "drawnVariable", ["displayStateOf"], _v2draw);  
  $def("_v2cnode", "vizCellNode", ["vizVariable","vizInspector","vizDetachNodes","displayStateOf","attachDisplay","observe","invalidation"], _v2cnode);  
  $def("_v2ctpl", "vizCellTemplate", ["lookupVariable","visualizerModule","vizVariable","vizInspector","vizDetachNodes","vizCellNode"], _v2ctpl);  
  $def("_v2pcel", "vizPaneCells", ["liveCellMap","vizModule","vizFilter"], _v2pcel);  
  $def("_v2pst", "vizPaneState", ["invalidation"], _v2pst);  
  $def("_v2psyn", "vizPaneSync", ["vizPaneCells","vizPaneState","vizRoot","vizModule","vizInspector","vizDetachNodes","drawnVariable","instantiateDataflow","vizCellTemplate","createImportCellHeader","renderImportCell","vizSyncEvents","displayStateOf"], _v2psyn);  
  $def("_v2sevt", "vizSyncEvents", ["EventTarget","Event"], _v2sevt);  
  $def("_v2synd", "vizSynced", ["Generators","vizSyncEvents"], _v2synd);  
  $def("_v2ptpl", "vizPaneTemplate", ["lookupVariable","visualizerModule"], _v2ptpl);  
  $def("_1e4b50w", "TRACE_CELL", ["trace_variable"], _1e4b50w);  
  $def("_11ugoev", null, ["htl"], _11ugoev);  
  $def("_zodkh8", "createImportCellHeader", [], _zodkh8);  
  $def("_1xdl683", "renderImportCell", ["navHref"], _1xdl683);  
  $def("_bbb3dg", "syncers", ["vizSynced"], _bbb3dg);  
  $def("_een5pq", null, ["md"], _een5pq);  
  $def("_1oonsyz", "viewof visualizerModule", ["thisModule"], _1oonsyz);  
  $def("_690yio", "visualizerModule", ["Generators","viewof visualizerModule"], _690yio);  
  $def("_vzt00", null, ["md"], _vzt00);
  $def("_vzt01", "viewof viz_tests_enabled", ["Inputs","location"], _vzt01);
  $def("_vzt02", "viz_tests_enabled", ["Generators","viewof viz_tests_enabled"], _vzt02);
  $def("_vzt03", "vt", ["ui","runtime","createModule","deleteModule","visualizer","viz_tests_enabled"], _vzt03);
  $def("_vzt10", "test_viz_renders_cells_in_runtime_order", ["vt","expect"], _vzt10);
  $def("_vzt11", "test_viz_an_unobserved_cell_computes_once_rendered", ["vt","expect"], _vzt11);
  $def("_vzt12", "test_viz_redefinition_updates_the_same_node", ["vt","expect"], _vzt12);
  $def("_vzt13", "test_viz_renamed_variable_keeps_its_node", ["vt","expect"], _vzt13);
  $def("_vzt14", "test_viz_delete_removes_only_that_node", ["vt","expect"], _vzt14);
  $def("_vzt1g", "test_viz_a_cell_leaving_the_map_releases_its_observer", ["vt","expect"], _vzt1g);
  $def("_vzt15", "test_viz_new_and_moved_cells_follow_runtime_order", ["vt","runtime","repositionSetElement","expect"], _vzt15);
  $def("_vzt16", "test_viz_viewof_renders_one_node_holding_the_view", ["vt","expect"], _vzt16);
  $def("_vzt17", "test_viz_mutable_renders_its_live_value", ["vt","expect"], _vzt17);
  $def("_vzt18", "test_viz_imports_render_one_header_per_module", ["vt","runtime","expect"], _vzt18);
  $def("_vzt19", "test_viz_filter_sees_every_cell_with_its_index", ["vt","expect"], _vzt19);
  $def("_vzt1a", "test_viz_custom_inspector_nodes_carry_their_variable", ["vt","expect"], _vzt1a);
  $def("_vzt1b", "test_viz_error_and_pending_states", ["vt","expect"], _vzt1b);
  $def("_vzt1c", "test_viz_two_visualizers_of_one_module_are_independent", ["vt","expect"], _vzt1c);
  $def("_vzt1d", "test_viz_unmount_hands_variables_back", ["vt","expect"], _vzt1d);
  $def("_vzt1e", "test_viz_foreign_children_survive_a_sync", ["vt","expect"], _vzt1e);
  $def("_vzt1f", "test_viz_detachNodes_takes_an_element_value", ["vt","expect"], _vzt1f);
  $def("_xqi0zo", null, ["md"], _xqi0zo);  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("runtimSdkModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("myModule", "runtimSdkModule", _));  
  main.define("unorderedSync", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("unorderedSync", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("variables", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("trace_variable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("trace_variable", _));  
  main.define("liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("liveCellMap", _));  
  main.define("navHref", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navHref", _));
  main.define("ui", ["module @tomlarkworthy/ui-testing", "@variable"], (_, v) => v.import("ui", _));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));  
  main.define("instantiateDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("instantiateDataflow", _));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));  
  main.define("displayStateOf", ["module @tomlarkworthy/js-toolchain", "@variable"], (_, v) => v.import("displayStateOf", _));  
  main.define("attachDisplay", ["module @tomlarkworthy/js-toolchain", "@variable"], (_, v) => v.import("attachDisplay", _));
  return main;
}
