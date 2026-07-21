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
    detachNodes: true
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
const _1dop2vt = function _allVariables(variables,runtime){return(
variables(runtime)
)};
const _1b82ds4 = (G, _) => G.input(_);
const _osnrne = function _mainVariables(allVariables,main){return(
[...allVariables].filter((v) => v._module == main)
)};
const _9i8usd = function _visualizer(main,Inspector,backgroundJobs,html,$0,Event,$1){return(
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
  console.log("creating visualizer");
  backgroundJobs;
  const root = html`<div class="observablehq-root lope-viz ${classList}" style="min-height: 2rem; min-width: 2rem;"></div>`;
  const visualizer = html`<div class="lopecode-visualizer">${root}</div>`;
  root.filter = filter;
  root.module = module;
  root.inspector = inspector;
  root.detachNodes = detachNodes;
  root.visualizer = visualizer;

  $0.value.add(root);
  $0.dispatchEvent(new Event("input"));
  invalidation.then(() => {
    console.log("removing visualizer", root);
    root.remove();
    root.visualizer.remove();
    root.dispatchEvent(new Event("input"));
    // We need to keep roots around so we know not to sync with them
    // But this is also a cause of a memory leak.
    // Probably we need a new set to record the disposed sync div nodes.
    $1.value.add(root);
    $1.dispatchEvent(new Event("input"));
  });
  return visualizer;
}
)};
const _mit3pw = function _visualizers(Inputs){return(
Inputs.input(new Set())
)};
const _hut17f = (G, _) => G.input(_);
const _1vthejs = function _visualizersToDelete(Inputs){return(
Inputs.input(new Set())
)};
const _1vj8v1t = (G, _) => G.input(_);
const _1nz4pe4 = function _inspectors(visualizers)
{
  const inspectors = this || new Map(); // preserve state across invalidations
  visualizers.forEach((root) => {
    if (inspectors.has(root)) return;
    const factory = root.inspector(root);
    const inspector = (variable, ...args) => {
      const inspector = factory(variable, ...args);
      inspector._node.variable = variable;
      if (variable._name) inspector._node.setAttribute("cell", variable._name);
      return inspector;
    };
    inspectors.set(root, inspector);
  });
  inspectors.forEach((fn, root) => {
    if (!visualizers.has(root)) {
      console.log("tidy up inspector for ", root);
      inspectors.delete(root);
    }
  });
  return inspectors;
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
const _526jo = function _variablesForCell()
{
    return cell => {
        if (!cell)
            return [];
        if (cell.type === 'import')
            return [];
        // mutable: variables = [initial X, mutable X, X]; render X (live), not initial (seed). #159
        const i = cell.type === 'mutable' ? 2 : 0;
        return [cell.variables?.[i]].filter(Boolean);
    };
};
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

  const rawSpecs = Array.isArray(ii.specifiers) ? ii.specifiers : [];
  const specs = rawSpecs
    .map((s) => ({ imported: s?.imported ?? null, local: s?.local ?? null }))
    .filter((d) => d.imported != null || d.local != null)
    .map((d) => ({
      imported: d.imported == null ? "" : String(d.imported),
      local: d.local == null ? "" : String(d.local)
    }))
    .filter((d) => d.imported || d.local);

  span.appendChild(document.createTextNode("import {"));

  if (specs.length) {
    let first = true;
    for (const s of specs) {
      if (!first) span.appendChild(document.createTextNode(", "));
      first = false;

      const imported = s.imported || s.local;
      const local = s.local || s.imported || "";

      const a = document.createElement("a");
      a.textContent = imported;

      if (imported && isKnown(imported) && moduleId) {
        a.href = navHref({ open: moduleId, cell: imported });
      } else {
        a.className = "observablehq--unknown";
      }

      span.appendChild(a);

      if (imported && local && imported !== local) {
        span.appendChild(document.createTextNode(` as ${local}`));
      }
    }
  }

  span.appendChild(document.createTextNode("}"));
  span.appendChild(document.createTextNode(" from "));

  if (!moduleId) {
    span.appendChild(
      document.createTextNode(`"${String(ii.from ?? ii.specifier ?? "")}"`)
    );
    return span;
  }

  const from = String(ii.from ?? ii.specifier ?? moduleId);
  const fromLink = span.appendChild(document.createElement("a"));
  fromLink.href = navHref({ open: moduleId });
  fromLink.textContent = `"${from}"`;

  return span;
}
)};
const _bbb3dg = function _syncers(observe,inspectors,$0,liveCellMap,createImportCellHeader,renderImportCell,variablesForCell,visualizers,$1)
{
  const syncers = this || new Map();

  const isManagedCellNode = (node) =>
    !!node?.classList?.contains("observablehq");
  const nextManaged = (node) => {
    while (node && !isManagedCellNode(node)) node = node.nextSibling;
    return node;
  };

  const disposeRoot = (root, entry) => {
    const { observers, headers } = entry || {};
    headers?.forEach((node) => node?.remove?.());
    headers?.clear?.();
    observers?.forEach((obsEntry, v) => {
      obsEntry.remove();
      if (v?._observer?.fulfilled && v._value)
        v._observer.fulfilled(v._value, v._name);
    });
    observers?.clear?.();
  };

  const ensureObserver = (root, inspector, observers, v) => {
    const existing = observers.get(v);
    if (existing?.root === root) return existing;
    if (existing) existing.remove();

    const observer = inspector(v);
    const unobserve = observe(v, observer, { detachNodes: root.detachNodes });

    const entry = {
      observer,
      root,
      remove: () => {
        observers.delete(v);
        const node = observer?._node;
        if (node) {
          // Detach the variable's live element value
          const val = v?._value;
          if (val && val.nodeType && val.parentNode === node)
            node.removeChild(val);
          node.remove();
        }
        unobserve?.();
      }
    };
    observers.set(v, entry);
    return entry;
  };

  for (const [root, entry] of [...syncers.entries()]) {
    if (!inspectors.has(root)) {
      disposeRoot(root, entry);
      syncers.delete(root);
    }
  }

  inspectors.forEach((inspector, root) => {
    if ($0.value.has(root)) return;

    if (!syncers.has(root))
      syncers.set(root, { observers: new Map(), headers: new Map() });
    const { observers, headers } = syncers.get(root);

    const cells = liveCellMap.get(root.module) || [];
    const seenVars = new Set();
    const seenHeaderKeys = new Set();
    const desired = [];
    let i = 0;
    const filterState = {};

    for (const cell of cells) {
      const cell_name = cell?.name;
      if (!root.filter(cell_name, cell.variables, i++, filterState)) continue;

      if (cell?.type === "import") {
        const ii = cell?.importInfo ?? null;
        if (!ii || ii.type !== "import") continue;
        if (ii.specifier === "builtin") continue;

        const headerKey = `${String(ii.specifier ?? "")}#${String(
          cell?.name ?? i - 1
        )}`;
        seenHeaderKeys.add(headerKey);

        let header = headers.get(headerKey);
        if (!header) {
          header = createImportCellHeader(cell);
          headers.set(headerKey, header);
        } else if (header.__viz) {
          header.__viz.cell = cell;
        }
        header.variable = cell.variables[0];

        const isKnown = (imported) => {
          try {
            return !!root?.module?._scope?.has?.(imported);
          } catch {
            return true;
          }
        };

        const node = renderImportCell(cell, { isKnown });
        const statement = header.__viz.statement;
        while (statement.firstChild)
          statement.removeChild(statement.firstChild);
        statement.appendChild(node);

        desired.push(header);
        continue;
      }

      const renderedVars = variablesForCell(cell);
      for (const v of renderedVars) {
        if (!v) continue;
        if (visualizers.has(v._value) && v._value?.detachNodes) continue;

        seenVars.add(v);
        const entry = ensureObserver(root, inspector, observers, v);
        if (entry?.observer?._node) desired.push(entry.observer._node);
      }
    }

    for (const [k, node] of [...headers.entries()]) {
      if (!seenHeaderKeys.has(k)) {
        node.remove();
        headers.delete(k);
      }
    }

    for (const [v, entry] of [...observers.entries()]) {
      if (!seenVars.has(v)) entry.remove();
    }

    const desiredSet = new Set(desired);

    for (const child of [...root.childNodes]) {
      if (isManagedCellNode(child) && !desiredSet.has(child)) child.remove();
    }

    let cursor = nextManaged(root.firstChild);
    for (const node of desired) {
      cursor = nextManaged(cursor);
      if (node === cursor) {
        cursor = cursor.nextSibling;
        continue;
      }
      root.insertBefore(node, cursor || null);
    }

    for (let n = nextManaged(cursor); n; ) {
      const next = n.nextSibling;
      if (isManagedCellNode(n) && !desiredSet.has(n)) n.remove();
      n = nextManaged(next);
    }
  });

  for (const root of [...$0.value]) {
    const entry = syncers.get(root);
    if (entry) disposeRoot(root, entry);
    syncers.delete(root);
    inspectors.delete(root);
    $0.value.delete(root);
    $1.value.delete(root);
  }

  return syncers;
};
const _een5pq = function _25(md){return(
md`### background jobs and keep alive`
)};
const _1wiz55o = function _backgroundJobs(keepalive,visualizerModule)
{
  console.log("background job");
  keepalive(visualizerModule, "syncers");
};
const _1oonsyz = function _visualizerModule(thisModule){return(
thisModule()
)};
const _690yio = (G, _) => G.input(_);
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
  $def("_1dop2vt", "viewof allVariables", ["variables","runtime"], _1dop2vt);  
  $def("_1b82ds4", "allVariables", ["Generators","viewof allVariables"], _1b82ds4);  
  $def("_osnrne", "mainVariables", ["allVariables","main"], _osnrne);  
  $def("_9i8usd", "visualizer", ["main","Inspector","backgroundJobs","html","viewof visualizers","Event","viewof visualizersToDelete"], _9i8usd);  
  $def("_mit3pw", "viewof visualizers", ["Inputs"], _mit3pw);  
  $def("_hut17f", "visualizers", ["Generators","viewof visualizers"], _hut17f);  
  $def("_1vthejs", "viewof visualizersToDelete", ["Inputs"], _1vthejs);  
  $def("_1vj8v1t", "visualizersToDelete", ["Generators","viewof visualizersToDelete"], _1vj8v1t);  
  $def("_1nz4pe4", "inspectors", ["visualizers"], _1nz4pe4);  
  $def("_1e4b50w", "TRACE_CELL", ["trace_variable"], _1e4b50w);  
  $def("_11ugoev", null, ["htl"], _11ugoev);  
  $def("_zodkh8", "createImportCellHeader", [], _zodkh8);  
  $def("_526jo", "variablesForCell", [], _526jo);  
  $def("_1xdl683", "renderImportCell", ["navHref"], _1xdl683);  
  $def("_bbb3dg", "syncers", ["observe","inspectors","viewof visualizersToDelete","liveCellMap","createImportCellHeader","renderImportCell","variablesForCell","visualizers","viewof visualizers"], _bbb3dg);  
  $def("_een5pq", null, ["md"], _een5pq);  
  $def("_1wiz55o", "backgroundJobs", ["keepalive","visualizerModule"], _1wiz55o);  
  $def("_1oonsyz", "viewof visualizerModule", ["thisModule"], _1oonsyz);  
  $def("_690yio", "visualizerModule", ["Generators","viewof visualizerModule"], _690yio);  
  $def("_xqi0zo", null, ["md"], _xqi0zo);  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("isnode", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("isnode", _));  
  main.define("runtimSdkModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("myModule", "runtimSdkModule", _));  
  main.define("unorderedSync", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("unorderedSync", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("variables", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("trace_variable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("trace_variable", _));  
  main.define("liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("liveCellMap", _));  
  main.define("navHref", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navHref", _));
  return main;
}
