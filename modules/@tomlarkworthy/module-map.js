const _1w9yf3l = function _1(md){return(
md`# Module map`
)};
const _b6n8js = function _2(visualizeModules){return(
visualizeModules()
)};
const _1sznqfl = function _3(md){return(
md`Figures out the import structure of a runtime, just pass a runtime to the function \`moduleMap\` to get a summary of the modules. Returns a map indexed by a Module object to a record.

\`\`\`
module -> {
  type: "notebook import" | "module variable",
  name: <module name>,
  module: <module object ref>
  dependsOn: [<module name>*],
  dependedBy: [<module name>*],
}
\`\`\``
)};
const _1798myt = function _moduleMap(runtime,keepalive,myModule,$0){return(
async (
  _runtime = runtime,
  {
    cache = new Map() // module -> {name}
  } = {}
) => {
  if (!_runtime || !_runtime._variables)
    throw "Invalid runtime passed to moduleMap";
  keepalive(myModule, "submit_summary");
  keepalive(myModule, "sync_modules");
  keepalive(myModule, "currentModules");
  return await $0.send({
    runtime: _runtime,
    cache: cache
  });
}
)};
const _1yso65r = function _5(md){return(
md`### \`currentModules\``
)};
const _1fcoh6x = async function _sync_modules(runtime_variables,moduleMap,_,$0,Event)
{
  runtime_variables;
  const latest = await moduleMap();
  let dirty = !this || !_.isEqual(new Set(latest.keys()), new Set(this.keys()));
  if (dirty) {
    $0.value = latest;
    $0.dispatchEvent(new Event("input"));
  }
  return $0.value;
};
const _wi39n0 = async function _currentModules(Inputs,moduleMap){return(
Inputs.input(await moduleMap())
)};
const _1gxgyd6 = (G, _) => G.input(_);
const _1qag34d = function _8(Inputs,currentModules){return(
Inputs.table([...currentModules.values()], {
  format: {
    dom: (d) => d.innerHTML,
    specifiers: JSON.stringify,
    variable: (v) => v._name
  }
})
)};
const _1xamz8j = function _9(md){return(
md`### Visualization`
)};
const _1n4p4hn = function _tipTitle(){return(
([k, c]) => 
`${k}\ndependsOn: [\n  ${(c[3].dependsOn || []).join(
  "\n  "
)}\n]\ndependedBy: [\n  ${(c[3].dependedBy || []).join("\n  ")}\n]`
)};
const _1kdcb71 = function _visualizeModules(currentModules,htl,d3,spectralCircleOrder,improveOrderSifting,bestOfRandomOrders,Plot,tipTitle,linkTo,isOnObservableCom)
{
  return ({ useSpectral = true } = {}) => {
    const modules = [...currentModules.values()].filter((m) => m && m.name);
    const n = modules.length;
    if (n === 0) return htl.svg`<svg width="1" height="1"></svg>`;

    const indexOf = new Map(modules.map((m, i) => [m.name, i]));

    const undirectedEdges = [];
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      const from = modules[i];
      for (const toName of from.dependsOn || []) {
        const j = indexOf.get(toName);
        if (j == null || j === i) continue;
        const a = Math.min(i, j),
          b = Math.max(i, j);
        const k = `${a},${b}`;
        if (seen.has(k)) continue;
        seen.add(k);
        undirectedEdges.push([a, b]);
      }
    }

    const buildCSRLocal = (n, edges) => {
      const adj = Array.from({ length: n }, () => []);
      for (const [a0, b0] of edges) {
        const a = a0 | 0,
          b = b0 | 0;
        if (a === b) continue;
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        adj[a].push(b);
        adj[b].push(a);
      }
      const deg = new Float64Array(n);
      let nnz = 0;
      for (let i = 0; i < n; i++) {
        const row = adj[i];
        row.sort((x, y) => x - y);
        let w = 0;
        for (let j = 0; j < row.length; j++)
          if (w === 0 || row[j] !== row[w - 1]) row[w++] = row[j];
        row.length = w;
        deg[i] = w;
        nnz += w;
      }
      const rowPtr = new Int32Array(n + 1);
      const colIdx = new Int32Array(nnz);
      const val = new Float64Array(nnz);
      let p = 0;
      for (let i = 0; i < n; i++) {
        rowPtr[i] = p;
        const row = adj[i];
        for (let j = 0; j < row.length; j++) {
          colIdx[p] = row[j];
          val[p] = 1;
          p++;
        }
      }
      rowPtr[n] = p;
      return { n, rowPtr, colIdx, val, deg };
    };

    const crossingsCountLocal = (n, edges, order) => {
      const pos = new Int32Array(n);
      for (let i = 0; i < n; i++) pos[order[i]] = i;

      const intervals = [];
      for (const [a0, b0] of edges) {
        const a = a0 | 0,
          b = b0 | 0;
        if (a === b) continue;
        const i = pos[a],
          j = pos[b];
        const s = Math.min(i, j),
          t = Math.max(i, j);
        if (s === t) continue;
        intervals.push([s, t]);
      }

      intervals.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const bit = new Int32Array(n + 1);
      const add = (i) => {
        for (let x = i + 1; x <= n; x += x & -x) bit[x]++;
      };
      const sum = (i) => {
        let s = 0;
        for (let x = i + 1; x > 0; x -= x & -x) s += bit[x];
        return s;
      };
      const range = (l, r) => (r < l ? 0 : sum(r) - (l > 0 ? sum(l - 1) : 0));

      let crossings = 0;
      let k = 0;
      while (k < intervals.length) {
        const s = intervals[k][0];
        let k2 = k;
        while (k2 < intervals.length && intervals[k2][0] === s) k2++;
        for (let t = k; t < k2; t++)
          crossings += range(s + 1, intervals[t][1] - 1);
        for (let t = k; t < k2; t++) add(intervals[t][1]);
        k = k2;
      }
      return crossings;
    };

    let orderIdx;
    if (n <= 2 || undirectedEdges.length === 0 || !useSpectral) {
      orderIdx = Int32Array.from(d3.range(n));
    } else {
      const csr = buildCSRLocal(n, undirectedEdges);

      const spectral = spectralCircleOrder(csr, {
        alpha: 0.92,
        maxIters: 80,
        tol: 1e-4,
        seed: 1,
        passesOrtho: 1
      });

      const sifted = improveOrderSifting(n, undirectedEdges, spectral.order, {
        passes: 1,
        vertexSequence: "order"
      });

      const baseline = bestOfRandomOrders(n, undirectedEdges, {
        R: Math.min(n, 12),
        seed: 1,
        postSiftPasses: 0
      });

      const cSift = crossingsCountLocal(n, undirectedEdges, sifted.order);
      orderIdx =
        baseline?.order && baseline.crossings < cSift
          ? baseline.order
          : sifted.order;
    }

    const R = 100;
    const nodes = new Map();
    for (let p = 0; p < n; p++) {
      const vid = orderIdx[p] | 0;
      const a = (p * 2 * Math.PI) / n;
      const [x, y] = d3.pointRadial(a, R);
      const deg = (p * 360) / n;
      nodes.set(modules[vid].name, [x, y, deg, modules[vid]]);
    }

    const edges = modules.flatMap((from) =>
      (from.dependsOn || [])
        .filter((to) => nodes.has(to))
        .map((to) => [
          [from.name, nodes.get(from.name)],
          [to, nodes.get(to)]
        ])
    );

    const plot = Plot.plot({
      inset: 180,
      aspectRatio: 1,
      axis: null,
      marks: [
        () => htl.svg`<defs>
          <linearGradient id="gradient">
            <stop offset="15%" stop-color="red" />
            <stop offset="100%" stop-color="gold" />
          </linearGradient>
        </defs>`,
        Plot.arrow(edges, {
          x1: ([[, [x1]]]) => x1,
          y1: ([[, [, y1]]]) => y1,
          x2: ([, [, [x2]]]) => x2,
          y2: ([, [, [, y2]]]) => y2,
          bend: true,
          stroke: "url(#gradient)",
          strokeOpacity: 0.5,
          strokeLinejoin: "miter",
          headLength: 3,
          inset: 5
        }),
        Plot.text(
          [...nodes.entries()].filter(([, c]) => c[2] > 180),
          {
            textAnchor: "end",
            x: ([, c]) => c[0],
            y: ([, c]) => c[1],
            rotate: ([, c]) => -c[2] - (c[2] > 180 ? 90 : -90),
            text: ([k]) => k
          }
        ),
        Plot.text(
          [...nodes.entries()].filter(([, c]) => c[2] <= 180),
          {
            fontSize: 12,
            textAnchor: "start",
            x: ([, c]) => c[0],
            y: ([, c]) => c[1],
            rotate: ([, c]) => -c[2] - (c[2] > 180 ? 90 : -90),
            text: ([k]) => k
          }
        ),
        Plot.tip(
          nodes.entries(),
          Plot.pointer({
            x: ([, c]) => c[0],
            y: ([, c]) => c[1],
            title: tipTitle,
            maxRadius: Infinity
          })
        )
      ]
    });

    const xmlns = "http://www.w3.org/2000/svg";
    const xlink = "http://www.w3.org/1999/xlink";
    for (const text of plot.querySelectorAll("text")) {
      const moduleName = text.textContent;
      let url;
      try {
        url = linkTo(moduleName);
      } catch {
        continue;
      }
      const a = document.createElementNS(xmlns, "a");
      a.setAttributeNS(null, "href", url);
      a.setAttributeNS(xlink, "href", url);
      text.parentNode.insertBefore(a, text);
      if (isOnObservableCom()) {
        a.setAttribute("target", "_blank");
      }
      a.appendChild(text);
    }

    return plot;
  };
};
const _hgwvol = function _12(md){return(
md`### Random helpers`
)};
const _14bivfb = function _myModule(thisModule){return(
thisModule()
)};
const _1cir47e = (G, _) => G.input(_);
const _1nfaybn = function _tag(){return(
Symbol()
)};
const _17qqkoj = function _forcePeek()
{
  //console.log("force peek");
  return (variable, { forever = false } = {}) => {
    if (variable._value) return variable._value;
    let peeker;
    const promise = new Promise((fulfilled, rejected) => {
      peeker = variable._module
        .variable({
          fulfilled,
          rejected
        })
        .define([variable._name], (m) => m);
    });
    if (!forever) promise.finally((v) => peeker.delete());
    return Promise.race([promise, new Promise((_, r) => setTimeout(r, 1000))]);
  };
};
const _v9hg2i = function _observe(){return(
(module, variable_name, observer) => {
  const variable = module
    .variable(observer)
    .define(`dynamic observe ${variable_name}`, [variable_name], (m) => m);
  return () => variable.delete();
}
)};
const _1bm642i = function _17(md){return(
md`### Implementation`
)};
const _oothhq = function _queue(flowQueue){return(
flowQueue({ timeout_ms: 15000, dedupe: true })
)};
const _648shl = (G, _) => G.input(_);
const _1acbzli = function _19(md){return(
md`We resolve what we can using variables named with prefix \`module\` that hold module values. We \`forcePeek\` the variables to make them resolve, which forces loading of the modules.`
)};
const _10dhunq = async function _module_definition_variables(notebookImports,queue)
{
  console.log("module_definition_variables");
  notebookImports;
  queue;
  let last_module_count = -1;
  let module_definition_variables = [];
  while (last_module_count < module_definition_variables.length) {
    last_module_count = module_definition_variables.length;
    module_definition_variables = (
      await Promise.all(
        [...queue.runtime._variables]
          .filter((v) => v._name && v._name.startsWith("module "))
          .filter((v) => !v._name.startsWith("module <unknown"))
          .map(async (v) => {
            try {
              v._value = await Promise.race([
                v._definition(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("timeout")), 1000)
                )
              ]);
              return [v];
            } catch (err) {
              console.error("error loading module", v._name, err);
              return [];
            }
          })
      )
    ).flat();
  }
  return module_definition_variables;
};
const _dcxoxy = function _modules(module_definition_variables,queue)
{
  console.log("modules");
  module_definition_variables;
  return [...new Set([...queue.runtime._variables].map((v) => v._module))];
};
const _1dqpbvy = function _builtin(queue){return(
queue.runtime._builtin
)};
const _ir3ob0 = function _main_modules(queue,modules,builtin)
{
  const imports = new Set(queue.runtime._modules.values());
  return modules.filter((m) => !imports.has(m) && m !== builtin);
};
const _yflsv5 = function _bootloaded_mains(queue){return(
queue.runtime.mains || new Map()
)};
const _ox2g3b = function _bootloader(queue){return(
queue.runtime.bootloader
)};
const _1turw8j = function _resolve_modules(modules,module_definition_variables,findModuleName)
{
  console.log("resolve_modules");
  const module_definitions = new Map();
  const unresolved = [];
  modules.forEach((m) => {
    const md = module_definition_variables.find((md) => md._value == m);
    if (md) {
      module_definitions.set(m, {
        type: "module variable",
        name: findModuleName(md._module._scope, m),
        variable: md
      });
    } else {
      unresolved.push(m);
    }
  });
  return { module_definitions, unresolved };
};
const _9fbvam = function _27(md){return(
md`modules imported via notebook imports do not have module variables, so they are trickier to figure out. We can sniff the page DOM to find the import expressions, and try to map them to the modules we could to resolve earlier`
)};
const _1h0lryb = function _notebookImports(main,parser)
{
  console.log("notebookImports");
  main;
  return new Map(
    [...document.querySelectorAll(".observablehq--import")]
      .map((dom) => [dom, parser.parseCell(dom.textContent)])
      .map(([dom, node]) => [
        dom.parentElement,
        node.body.specifiers.map((s) => ({
          name: node.body.source.value,
          dom: dom.parentElement,
          ast: s,
          local: s.local.name,
          imported: s.imported.name
        }))
      ])
  );
};
const _7t198q = function _notebookImportVariables(runtime,notebookImports)
{
  console.log("notebookImportVariables");
  return [
    ...[...runtime._variables] // Observable DOM nodes are referenced in runtime variables
      .filter(
        (v) =>
          v._observer &&
          v._observer._node &&
          notebookImports.get(v._observer._node)
      )
      .map((v) => ({
        variable: v,
        notebookImports: notebookImports.get(v._observer._node)
      })),
    ...[
      ...[...notebookImports.entries()] // visualizer DOM nodes have the variable attached
        .filter(([pi, vars]) => pi.variable)
        .map(([pi, vars]) => ({
          variable: pi.variable,
          notebookImports: vars
        }))
    ]
  ].sort((a, b) => b.notebookImports.length - a.notebookImports.length); // sort by complexity
};
const _1lyens8 = function _pageImportMatch(){return(
async (notebookImportVariables, modules) => {
  console.log("pageImportMatch");
  const backupHas = Map.prototype.has; // Save the original `has` method on Map.prototype

  let currentImport = undefined;
  const matches = new Map();
  // Override `Map.prototype.has` to intercept calls to `has` on any Map instance
  Map.prototype.has = function (...args) {
    const module = modules.find((m) => m._scope == this);
    if (currentImport && module) {
      matches.set(module, {
        name: currentImport.notebookImports[0].name,
        type: "notebook import",
        module: module,
        dependsOn: [],
        dependedBy: [],
        dom: currentImport.notebookImports[0].dom,
        specifiers: currentImport.notebookImports.map((pi) => ({
          local: pi.local,
          imported: pi.imported,
          variable: pi.variable
        }))
      });
    }
    return backupHas.call(this, ...args); // Call the original `has` method
  };

  // Iterate through the notebook imports and define them while capturing `has` calls

  await notebookImportVariables.reduce((chain, pageImportVariable) => {
    // Call the definition chain
    return chain.then(async () => {
      currentImport = pageImportVariable;
      try {
        await pageImportVariable.variable._definition();
      } catch (err) {
        console.warn(err);
      }
      currentImport = undefined;
    });
  }, Promise.resolve());

  // Restore the original `has` method after the operations are done
  Map.prototype.has = backupHas;

  return matches;
}
)};
const _1akt4kz = function _notebookImportMatches(pageImportMatch,notebookImportVariables,modules)
{
  console.log("notebookImportMatches");
  return pageImportMatch(notebookImportVariables, modules);
};
const _1ang0sg = function _moduleTitle(invokeVariable){return(
async function moduleTitle(module) {
  const runtime = module._runtime;
  const vars = [...runtime._variables].filter(
    (v) => v && v._module === module && v._definition
  );
  const candidates = vars.filter((v) => {
    const n = v._name;
    if (v._type != 1) return false;
    if (n == null) return true;
    if (typeof n !== "string") return true;
    if (n.startsWith("dynamic observe ")) return false;
    if (n.startsWith("module ")) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const first = candidates.find(
    (v) => typeof v._id === "number" && Number.isFinite(v._id)
  )
    ? candidates.reduce((a, b) =>
        (a._id ?? Infinity) <= (b._id ?? Infinity) ? a : b
      )
    : candidates[0];

  const extract = (v) => {
    // instanceof cannot be used hear for cross realm
    if (v == null) return null;
    if (typeof v === "string") return v.trim() || null;
    if (v.tagName) {
      if (v.tagName == "H1") return v.textContent;
      const h1 = v.querySelector?.("h1");
      if (h1) return (h1.textContent ?? "").trim() || null;
      return null;
    }
    if (v.textContent) return (v.textContent ?? "").trim() || null;
    const maybeNode = v?.nodeType ? v : null;
    if (maybeNode?.tagName) return extract(maybeNode);
    return null;
  };

  // Read the title by invoking the candidate's definition directly (inputs resolved from scope)
  // rather than observeVariable, which makes the variable observed/reactive and — for a variable
  // that never resolves — churns the runtime variable set on retry. We already hold `first`, so
  // pass it straight to invokeVariable (no lookup).
  try {
    return extract(await invokeVariable(first, module));
  } catch (err) {
    return "Err";
  }
}
)};
const _197sgjt = async function _titles(modules,moduleTitle)
{
  const map = new Map(
    await Promise.all(
      [...modules].map(async (m) => [
        m,
        await Promise.race([
          moduleTitle(m),
          new Promise((resolve) =>
            setTimeout(() => resolve("<TIMEOUT LOADING TITLE>"), 250)
          )
        ]).catch((e) => `err: ${e}`)
      ])
    )
  );
  return map;
};
const _11z3pt0 = function _summary(main_modules,titles,bootloader,builtin,queue,notebookImportMatches,bootloaded_mains,resolve_modules,module_definition_variables)
{
  console.log("generate summary");
  const modules = new Map([
    ...main_modules.map((main_module) => [
      main_module,
      {
        name: "main",
        module: main_module,
        title: titles.get(main_module),
        dependsOn: [],
        dependedBy: []
      }
    ]),
    ...(bootloader
      ? [
          [
            bootloader,
            {
              name: "bootloader",
              title: "Bootloader",
              module: bootloader,
              dependsOn: [],
              dependedBy: []
            }
          ]
        ]
      : []),
    [
      builtin,
      {
        name: "builtin",
        title: "Standard library",
        module: builtin,
        dependsOn: [],
        dependedBy: []
      }
    ],
    ...queue.cache,
    ...notebookImportMatches.entries(),
    ...[...bootloaded_mains.entries()].map(([name, module]) => [
      module,
      {
        name: name,
        module: module,
        title: titles.get(module),
        dependsOn: [],
        dependedBy: []
      }
    ]),
    ...[...resolve_modules.module_definitions.entries()].map(([m, spec]) => [
      m,
      {
        ...spec,
        name: spec.name,
        module: m,
        title: titles.get(m),
        dependsOn: [],
        dependedBy: []
      }
    ])
  ]);
  // add cross links
  // notebookImportVariables[0].variable._module == main
  [...notebookImportMatches.keys()].forEach((m) => {
    const hostModule = modules.get(main_modules[0]);
    const importedModule = modules.get(m);
    if (!hostModule?.dependsOn || !importedModule?.dependedBy) {
      console.error(
        "error building module dependancy map",
        hostModule,
        importedModule
      );
      return;
    }
    hostModule.dependsOn.push(importedModule.name);
    importedModule.dependedBy.push(main_modules[0].name);
  });

  module_definition_variables.forEach((v) => {
    const hostModule = modules.get(v._module);
    const importedModule = modules.get(v._value);
    if (!hostModule?.dependsOn || !importedModule?.dependedBy) {
      console.error(
        "error building module dependancy map",
        hostModule,
        importedModule
      );
      return;
    }
    hostModule.dependsOn.push(importedModule.name);
    importedModule.dependedBy.push(hostModule.name);
  });
  return modules;
};
const _1pou2g6 = function _submit_summary(resolve_modules,queue,notebookImports,$0,summary)
{
  resolve_modules;
  queue;
  console.log("submit_summary");
  notebookImports;
  $0.resolve(summary);
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("module @tomlarkworthy/invoke-variable", async () => runtime.module((await import("/@tomlarkworthy/invoke-variable.js?v=4")).default));
  main.define("module @tomlarkworthy/spectral-layout", async () => runtime.module((await import("/@tomlarkworthy/spectral-layout.js?v=4")).default));
  $def("_1w9yf3l", null, ["md"], _1w9yf3l);  
  $def("_b6n8js", null, ["visualizeModules"], _b6n8js);  
  $def("_1sznqfl", null, ["md"], _1sznqfl);  
  $def("_1798myt", "moduleMap", ["runtime","keepalive","myModule","viewof queue"], _1798myt);  
  $def("_1yso65r", null, ["md"], _1yso65r);  
  $def("_1fcoh6x", "sync_modules", ["runtime_variables","moduleMap","_","viewof currentModules","Event"], _1fcoh6x);  
  $def("_wi39n0", "viewof currentModules", ["Inputs","moduleMap"], _wi39n0);  
  $def("_1gxgyd6", "currentModules", ["Generators","viewof currentModules"], _1gxgyd6);  
  $def("_1qag34d", null, ["Inputs","currentModules"], _1qag34d);  
  $def("_1xamz8j", null, ["md"], _1xamz8j);  
  $def("_1n4p4hn", "tipTitle", [], _1n4p4hn);  
  $def("_1kdcb71", "visualizeModules", ["currentModules","htl","d3","spectralCircleOrder","improveOrderSifting","bestOfRandomOrders","Plot","tipTitle","linkTo","isOnObservableCom"], _1kdcb71);  
  $def("_hgwvol", null, ["md"], _hgwvol);  
  $def("_14bivfb", "viewof myModule", ["thisModule"], _14bivfb);  
  $def("_1cir47e", "myModule", ["Generators","viewof myModule"], _1cir47e);  
  $def("_1nfaybn", "tag", [], _1nfaybn);  
  $def("_17qqkoj", "forcePeek", [], _17qqkoj);  
  $def("_v9hg2i", "observe", [], _v9hg2i);  
  $def("_1bm642i", null, ["md"], _1bm642i);  
  $def("_oothhq", "viewof queue", ["flowQueue"], _oothhq);  
  $def("_648shl", "queue", ["Generators","viewof queue"], _648shl);  
  $def("_1acbzli", null, ["md"], _1acbzli);  
  $def("_10dhunq", "module_definition_variables", ["notebookImports","queue"], _10dhunq);  
  $def("_dcxoxy", "modules", ["module_definition_variables","queue"], _dcxoxy);  
  $def("_1dqpbvy", "builtin", ["queue"], _1dqpbvy);  
  $def("_ir3ob0", "main_modules", ["queue","modules","builtin"], _ir3ob0);  
  $def("_yflsv5", "bootloaded_mains", ["queue"], _yflsv5);  
  $def("_ox2g3b", "bootloader", ["queue"], _ox2g3b);  
  $def("_1turw8j", "resolve_modules", ["modules","module_definition_variables","findModuleName"], _1turw8j);  
  $def("_9fbvam", null, ["md"], _9fbvam);  
  $def("_1h0lryb", "notebookImports", ["main","parser"], _1h0lryb);  
  $def("_7t198q", "notebookImportVariables", ["runtime","notebookImports"], _7t198q);  
  $def("_1lyens8", "pageImportMatch", [], _1lyens8);  
  $def("_1akt4kz", "notebookImportMatches", ["pageImportMatch","notebookImportVariables","modules"], _1akt4kz);  
  $def("_1ang0sg", "moduleTitle", ["invokeVariable"], _1ang0sg);
  $def("_197sgjt", "titles", ["modules","moduleTitle"], _197sgjt);  
  $def("_11z3pt0", "summary", ["main_modules","titles","bootloader","builtin","queue","notebookImportMatches","bootloaded_mains","resolve_modules","module_definition_variables"], _11z3pt0);  
  $def("_1pou2g6", "submit_summary", ["resolve_modules","queue","notebookImports","viewof queue","summary"], _1pou2g6);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  main.define("sourceModule", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("sourceModule", _));  
  main.define("findModuleName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findModuleName", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("unorderedSync", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("unorderedSync", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("viewof runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("viewof runtime_variables", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("observeVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", "observeVariable", _));
  main.define("invokeVariable", ["module @tomlarkworthy/invoke-variable", "@variable"], (_, v) => v.import("invokeVariable", _));
  main.define("spectralCircleOrder", ["module @tomlarkworthy/spectral-layout", "@variable"], (_, v) => v.import("spectralCircleOrder", _));  
  main.define("improveOrderSifting", ["module @tomlarkworthy/spectral-layout", "@variable"], (_, v) => v.import("improveOrderSifting", _));  
  main.define("bestOfRandomOrders", ["module @tomlarkworthy/spectral-layout", "@variable"], (_, v) => v.import("bestOfRandomOrders", _));
  return main;
}