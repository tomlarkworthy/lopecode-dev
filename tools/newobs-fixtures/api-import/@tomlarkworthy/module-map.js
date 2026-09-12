const _1308 = function(md){return(
md`# Module map`
)};

const _1309 = function(visualizeModules){return(
visualizeModules()
)};

const _1310 = function(md){return(
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

const _1311 = function moduleMap(runtime,keepalive,myModule,viewof$queue){return(
async (
  _runtime = runtime,
  {
    cache = new Map() // module -> {name}
  } = {}
) => {
  if (!_runtime || !_runtime._variables)
    throw "Invalid runtime passed to moduleMap";
  // A summary computed mid-parse would silently miss modules whose blocks have not
  // streamed in yet — wait for the document before starting the pipeline (and its deadline).
  if (typeof document !== "undefined" && document.readyState === "loading")
    await new Promise((r) =>
      document.addEventListener("DOMContentLoaded", r, { once: true })
    );
  keepalive(myModule, "submit_summary");
  keepalive(myModule, "sync_modules");
  keepalive(myModule, "currentModules");
  return await viewof$queue.send({
    runtime: _runtime,
    cache: cache
  });
}
)};

const _1312 = function(md){return(
md`### \`currentModules\``
)};

const _1313 = async function sync_modules(runtime_variables,moduleMap,_,viewof$currentModules,Event)
{
  runtime_variables;
  const latest = await moduleMap();
  let dirty = !this || !_.isEqual(new Set(latest.keys()), new Set(this.keys()));
  if (dirty) {
    viewof$currentModules.value = latest;
    viewof$currentModules.dispatchEvent(new Event('input'));
  }
  return viewof$currentModules.value;
}
;

const _1314 = async function viewof$currentModules(Inputs,moduleMap){return(
Inputs.input(await moduleMap())
)};

const _1315 = function(Inputs,currentModules){return(
Inputs.table([...currentModules.values()], {
  format: {
    dom: d => d.innerHTML,
    specifiers: JSON.stringify,
    variable: v => v._name
  }
})
)};

const _1316 = function(md){return(
md`### Visualization`
)};

const _1317 = function tipTitle(){return(
([k, c]) => `${ k }\ndependsOn: [\n  ${ (c[3].dependsOn || []).join('\n  ') }\n]\ndependedBy: [\n  ${ (c[3].dependedBy || []).join('\n  ') }\n]`
)};

const _1318 = function visualizeModules(currentModules,htl,d3,spectralCircleOrder,improveOrderSifting,bestOfRandomOrders,Plot,tipTitle,linkTo,isOnObservableCom){return(
({
  useSpectral = true
} = {}) => {
  const modules = [...currentModules.values()].filter(m => m && m.name);
  const n = modules.length;
  if (n === 0)
    return htl.svg`<svg width="1" height="1"></svg>`;
  const indexOf = new Map(modules.map((m, i) => [
    m.name,
    i
  ]));
  const undirectedEdges = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const from = modules[i];
    for (const toName of from.dependsOn || []) {
      const j = indexOf.get(toName);
      if (j == null || j === i)
        continue;
      const a = Math.min(i, j), b = Math.max(i, j);
      const k = `${ a },${ b }`;
      if (seen.has(k))
        continue;
      seen.add(k);
      undirectedEdges.push([
        a,
        b
      ]);
    }
  }
  const buildCSRLocal = (n, edges) => {
    const adj = Array.from({ length: n }, () => []);
    for (const [a0, b0] of edges) {
      const a = a0 | 0, b = b0 | 0;
      if (a === b)
        continue;
      if (a < 0 || b < 0 || a >= n || b >= n)
        continue;
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
        if (w === 0 || row[j] !== row[w - 1])
          row[w++] = row[j];
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
    return {
      n,
      rowPtr,
      colIdx,
      val,
      deg
    };
  };
  const crossingsCountLocal = (n, edges, order) => {
    const pos = new Int32Array(n);
    for (let i = 0; i < n; i++)
      pos[order[i]] = i;
    const intervals = [];
    for (const [a0, b0] of edges) {
      const a = a0 | 0, b = b0 | 0;
      if (a === b)
        continue;
      const i = pos[a], j = pos[b];
      const s = Math.min(i, j), t = Math.max(i, j);
      if (s === t)
        continue;
      intervals.push([
        s,
        t
      ]);
    }
    intervals.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const bit = new Int32Array(n + 1);
    const add = i => {
      for (let x = i + 1; x <= n; x += x & -x)
        bit[x]++;
    };
    const sum = i => {
      let s = 0;
      for (let x = i + 1; x > 0; x -= x & -x)
        s += bit[x];
      return s;
    };
    const range = (l, r) => r < l ? 0 : sum(r) - (l > 0 ? sum(l - 1) : 0);
    let crossings = 0;
    let k = 0;
    while (k < intervals.length) {
      const s = intervals[k][0];
      let k2 = k;
      while (k2 < intervals.length && intervals[k2][0] === s)
        k2++;
      for (let t = k; t < k2; t++)
        crossings += range(s + 1, intervals[t][1] - 1);
      for (let t = k; t < k2; t++)
        add(intervals[t][1]);
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
      tol: 0.0001,
      seed: 1,
      passesOrtho: 1
    });
    const sifted = improveOrderSifting(n, undirectedEdges, spectral.order, {
      passes: 1,
      vertexSequence: 'order'
    });
    const baseline = bestOfRandomOrders(n, undirectedEdges, {
      R: Math.min(n, 12),
      seed: 1,
      postSiftPasses: 0
    });
    const cSift = crossingsCountLocal(n, undirectedEdges, sifted.order);
    orderIdx = baseline?.order && baseline.crossings < cSift ? baseline.order : sifted.order;
  }
  const R = 100;
  const nodes = new Map();
  for (let p = 0; p < n; p++) {
    const vid = orderIdx[p] | 0;
    const a = p * 2 * Math.PI / n;
    const [x, y] = d3.pointRadial(a, R);
    const deg = p * 360 / n;
    nodes.set(modules[vid].name, [
      x,
      y,
      deg,
      modules[vid]
    ]);
  }
  const edges = modules.flatMap(from => (from.dependsOn || []).filter(to => nodes.has(to)).map(to => [
    [
      from.name,
      nodes.get(from.name)
    ],
    [
      to,
      nodes.get(to)
    ]
  ]));
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
        stroke: 'url(#gradient)',
        strokeOpacity: 0.5,
        strokeLinejoin: 'miter',
        headLength: 3,
        inset: 5
      }),
      Plot.text([...nodes.entries()].filter(([, c]) => c[2] > 180), {
        textAnchor: 'end',
        x: ([, c]) => c[0],
        y: ([, c]) => c[1],
        rotate: ([, c]) => -c[2] - (c[2] > 180 ? 90 : -90),
        text: ([k]) => k
      }),
      Plot.text([...nodes.entries()].filter(([, c]) => c[2] <= 180), {
        fontSize: 12,
        textAnchor: 'start',
        x: ([, c]) => c[0],
        y: ([, c]) => c[1],
        rotate: ([, c]) => -c[2] - (c[2] > 180 ? 90 : -90),
        text: ([k]) => k
      }),
      Plot.tip(nodes.entries(), Plot.pointer({
        x: ([, c]) => c[0],
        y: ([, c]) => c[1],
        title: tipTitle,
        maxRadius: Infinity
      }))
    ]
  });
  const xmlns = 'http://www.w3.org/2000/svg';
  const xlink = 'http://www.w3.org/1999/xlink';
  for (const text of plot.querySelectorAll('text')) {
    const moduleName = text.textContent;
    let url;
    try {
      url = linkTo(moduleName);
    } catch {
      continue;
    }
    const a = document.createElementNS(xmlns, 'a');
    a.setAttributeNS(null, 'href', url);
    a.setAttributeNS(xlink, 'href', url);
    text.parentNode.insertBefore(a, text);
    if (isOnObservableCom()) {
      a.setAttribute('target', '_blank');
    }
    a.appendChild(text);
  }
  return plot;
}
)};

const _1319 = function(md){return(
md`### Random helpers`
)};

const _1320 = function viewof$myModule(thisModule){return(
thisModule()
)};

const _1321 = function tag(){return(
Symbol()
)};

const _1322 = function forcePeek()
{
  //console.log("force peek");
  return (variable, {
    forever = false
  } = {}) => {
    if (variable._value)
      return variable._value;
    let peeker;
    const promise = new Promise((fulfilled, rejected) => {
      peeker = variable._module.variable({
        fulfilled,
        rejected
      }).define([variable._name], m => m);
    });
    if (!forever)
      promise.finally(v => peeker.delete());
    return Promise.race([
      promise,
      new Promise((_, r) => setTimeout(r, 1000))
    ]);
  };
}
;

const _1323 = function observe(){return(
(module, variable_name, observer) => {
  const variable = module.variable(observer).define(`dynamic observe ${ variable_name }`, [variable_name], m => m);
  return () => variable.delete();
}
)};

const _1324 = function(md){return(
md`### Implementation`
)};

const _1325 = function viewof$queue(flowQueue){return(
flowQueue({ timeout_ms: 60000, dedupe: true })
)};

const _1326 = function(md){return(
md`We resolve what we can using variables named with prefix \`module\` that hold module values. We \`forcePeek\` the variables to make them resolve, which forces loading of the modules.`
)};

const _1327 = async function module_definition_variables(notebookImports,queue)
{
  console.log("module_definition_variables");
  notebookImports;
  queue;
  const pageLoaded = () =>
    typeof document === "undefined" || document.readyState === "complete";
  let last_module_count = -1;
  let module_definition_variables = [];
  let failures = [];
  let timeout_ms = 1000;
  let grace = true;
  while (true) {
    last_module_count = module_definition_variables.length;
    failures = [];
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
                  setTimeout(() => reject(new Error("timeout")), timeout_ms)
                )
              ]);
              return [v];
            } catch (err) {
              failures.push([v, err]);
              return [];
            }
          })
      )
    ).flat();
    if (module_definition_variables.length > last_module_count) continue;
    if (failures.length) {
      // Mid-load a failure usually means the module's block has not streamed in yet —
      // retry rather than dropping it from the map.
      if (!pageLoaded()) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      // One post-load grace round with a longer budget for slow network imports.
      if (grace) {
        grace = false;
        timeout_ms = 5000;
        continue;
      }
    }
    break;
  }
  failures.forEach(([v, err]) =>
    console.error("error loading module", v._name, err)
  );
  return module_definition_variables;
}
;

const _1328 = function modules(module_definition_variables,queue)
{
  console.log('modules');
  module_definition_variables;
  return [...new Set([...queue.runtime._variables].map(v => v._module))];
}
;

const _1329 = function builtin(queue){return(
queue.runtime._builtin
)};

const _1330 = function main_modules(queue,modules,builtin)
{
  const imports = new Set(queue.runtime._modules.values());
  return modules.filter(m => !imports.has(m) && m !== builtin);
}
;

const _1331 = function bootloaded_mains(queue){return(
queue.runtime.mains || new Map()
)};

const _1332 = function bootloader(queue){return(
queue.runtime.bootloader
)};

const _1333 = function resolve_modules(modules,module_definition_variables,findModuleName)
{
  console.log('resolve_modules');
  const module_definitions = new Map();
  const unresolved = [];
  modules.forEach(m => {
    const md = module_definition_variables.find(md => md._value == m);
    if (md) {
      module_definitions.set(m, {
        type: 'module variable',
        name: findModuleName(md._module._scope, m),
        variable: md
      });
    } else {
      unresolved.push(m);
    }
  });
  return {
    module_definitions,
    unresolved
  };
}
;

const _1334 = function(md){return(
md`modules imported via notebook imports do not have module variables, so they are trickier to figure out. We can sniff the page DOM to find the import expressions, and try to map them to the modules we could to resolve earlier`
)};

const _1335 = function notebookImports(main,queue,parser)
{
  console.log("notebookImports");
  main;
  queue; // re-scan per request: a scan taken mid-parse misses import cells
  return new Map(
    [...document.querySelectorAll(".observablehq--import")]
      .map((dom) => {
        try {
          return [dom, parser.parseCell(dom.textContent)];
        } catch (err) {
          console.warn("notebookImports: skipping unparsable import cell", err);
          return null;
        }
      })
      .filter(Boolean)
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
}
;

const _1336 = function notebookImportVariables(runtime,notebookImports)
{
  console.log('notebookImportVariables');
  return [
    ...[...runtime._variables]  // Observable DOM nodes are referenced in runtime variables
.filter(v => v._observer && v._observer._node && notebookImports.get(v._observer._node)).map(v => ({
      variable: v,
      notebookImports: notebookImports.get(v._observer._node)
    })),
    ...[...[...notebookImports.entries()]  // visualizer DOM nodes have the variable attached
.filter(([pi, vars]) => pi.variable).map(([pi, vars]) => ({
        variable: pi.variable,
        notebookImports: vars
      }))]
  ].sort((a, b) => b.notebookImports.length - a.notebookImports.length);  // sort by complexity
}
;

const _1337 = function pageImportMatch()
{
  return async (notebookImportVariables, modules) => {
    console.log('pageImportMatch');
    const backupHas = Map.prototype.has;
    // Save the original `has` method on Map.prototype
    let currentImport = undefined;
    const matches = new Map();
    // Override `Map.prototype.has` to intercept calls to `has` on any Map instance
    Map.prototype.has = function (...args) {
      const module = modules.find(m => m._scope == this);
      if (currentImport && module) {
        matches.set(module, {
          name: currentImport.notebookImports[0].name,
          type: 'notebook import',
          module: module,
          dependsOn: [],
          dependedBy: [],
          dom: currentImport.notebookImports[0].dom,
          specifiers: currentImport.notebookImports.map(pi => ({
            local: pi.local,
            imported: pi.imported,
            variable: pi.variable
          }))
        });
      }
      return backupHas.call(this, ...args);  // Call the original `has` method
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
  };
}
;

const _1338 = function notebookImportMatches(pageImportMatch,notebookImportVariables,modules)
{
  console.log('notebookImportMatches');
  return pageImportMatch(notebookImportVariables, modules);
}
;

const _1339 = function moduleTitle(observeVariable)
{
  return async function moduleTitle(module) {
    const runtime = module._runtime;
    const vars = [...runtime._variables].filter(v => v && v._module === module && v._definition);
    const candidates = vars.filter(v => {
      const n = v._name;
      if (v._type != 1)
        return false;
      if (n == null)
        return true;
      if (typeof n !== 'string')
        return true;
      if (n.startsWith('dynamic observe '))
        return false;
      if (n.startsWith('module '))
        return false;
      return true;
    });
    if (candidates.length === 0)
      return null;
    const first = candidates.find(v => typeof v._id === 'number' && Number.isFinite(v._id)) ? candidates.reduce((a, b) => (a._id ?? Infinity) <= (b._id ?? Infinity) ? a : b) : candidates[0];
    const extract = v => {
      // instanceof cannot be used hear for cross realm
      if (v == null)
        return null;
      if (typeof v === 'string')
        return v.trim() || null;
      if (v.tagName) {
        if (v.tagName == 'H1')
          return v.textContent;
        const h1 = v.querySelector?.('h1');
        if (h1)
          return (h1.textContent ?? '').trim() || null;
        return null;
      }
      if (v.textContent)
        return (v.textContent ?? '').trim() || null;
      const maybeNode = v?.nodeType ? v : null;
      if (maybeNode?.tagName)
        return extract(maybeNode);
      return null;
    };
    // Read the title WITHOUT re-executing the cell. invokeVariable calls the cell's _definition
    // directly, bypassing the runtime — for element cells (`htl.html`…${sharedNode}…``) that builds
    // a *duplicate*, unmanaged DOM subtree and moves shared singleton nodes (e.g. golden-layout's
    // base_css <style>) out of the live page, breaking the frame. Instead:
    //  1. If already computed, read the settled _value (fast path, most modules — zero side-effects).
    //  2. Else force the RUNTIME to compute the *single managed* variable via observe(): it marks the
    //     existing variable reachable and replays its value, adding no intermediate variable (no
    //     variable-set churn) and building only the one runtime-owned instance (no duplicate). We
    //     attach a one-shot observer and fire its invalidation on first settle so it detaches again.
    if (first._value !== undefined)
      return extract(first._value);
    const peekValue = v => new Promise((resolve, reject) => {
      let settled = false;
      let fireInvalidation;
      const invalidation = new Promise(r => fireInvalidation = r);
      const finish = (fn, arg) => {
        if (settled)
          return;
        settled = true;
        fireInvalidation();
        fn(arg);
      };
      observeVariable(v, {
        fulfilled: value => finish(resolve, value),
        rejected: err => finish(reject, err),
        pending: () => {
        }
      }, { invalidation });
    });
    try {
      return extract(await peekValue(first));
    } catch (err) {
      return 'Err';
    }
  };
}
;

const _1340 = async function titles(modules,moduleTitle)
{
  const map = new Map(await Promise.all([...modules].map(async m => [
    m,
    await Promise.race([
      moduleTitle(m),
      new Promise(resolve => setTimeout(() => resolve('<TIMEOUT LOADING TITLE>'), 250))
    ]).catch(e => `err: ${ e }`)
  ])));
  return map;
}
;

const _1341 = function summary(main_modules,titles,bootloader,builtin,queue,notebookImportMatches,bootloaded_mains,resolve_modules,module_definition_variables)
{
  console.log('generate summary');
  const modules = new Map([
    ...main_modules.map(main_module => [
      main_module,
      {
        name: 'main',
        module: main_module,
        title: titles.get(main_module),
        dependsOn: [],
        dependedBy: []
      }
    ]),
    ...bootloader ? [[
        bootloader,
        {
          name: 'bootloader',
          title: 'Bootloader',
          module: bootloader,
          dependsOn: [],
          dependedBy: []
        }
      ]] : [],
    [
      builtin,
      {
        name: 'builtin',
        title: 'Standard library',
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
  [...notebookImportMatches.keys()].forEach(m => {
    const hostModule = modules.get(main_modules[0]);
    const importedModule = modules.get(m);
    if (!hostModule?.dependsOn || !importedModule?.dependedBy) {
      console.error('error building module dependancy map', hostModule, importedModule);
      return;
    }
    hostModule.dependsOn.push(importedModule.name);
    importedModule.dependedBy.push(main_modules[0].name);
  });
  module_definition_variables.forEach(v => {
    const hostModule = modules.get(v._module);
    const importedModule = modules.get(v._value);
    if (!hostModule?.dependsOn || !importedModule?.dependedBy) {
      console.error('error building module dependancy map', hostModule, importedModule);
      return;
    }
    hostModule.dependsOn.push(importedModule.name);
    importedModule.dependedBy.push(hostModule.name);
  });
  return modules;
}
;

const _1342 = function submit_summary(resolve_modules,queue,notebookImports,viewof$queue,summary)
{
  resolve_modules;
  queue;
  console.log('submit_summary');
  notebookImports;
  viewof$queue.resolve(summary);
}
;

const _1343 = async (__variable) => {
const {linkTo} = await (import("./lopepage-urls").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("linkTo")?.import("linkTo", module);
  return {};
}));

return {linkTo};
};

const _1344 = async (__variable) => {
const {flowQueue} = await (import("./flow-queue").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("flowQueue")?.import("flowQueue", module);
  return {};
}));

return {flowQueue};
};

const _1345 = async (__variable) => {
const {parser, findModuleName} = await (import("./observablejs-toolchain").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("parser")?.import("parser", module);
  outputs.get("findModuleName")?.import("findModuleName", module);
  return {};
}));

return {parser,findModuleName};
};

const _1346 = async (__variable) => {
const {runtime, main, keepalive, thisModule, unorderedSync, isOnObservableCom, runtime_variables, viewof$runtime_variables, observe: observeVariable} = await (import("./runtime-sdk").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("runtime")?.import("runtime", module);
  outputs.get("main")?.import("main", module);
  outputs.get("keepalive")?.import("keepalive", module);
  outputs.get("thisModule")?.import("thisModule", module);
  outputs.get("unorderedSync")?.import("unorderedSync", module);
  outputs.get("isOnObservableCom")?.import("isOnObservableCom", module);
  outputs.get("runtime_variables")?.import("runtime_variables", module);
  outputs.get("viewof$runtime_variables")?.import("viewof runtime_variables", "viewof$runtime_variables", module);
  outputs.get("observeVariable")?.import("observe", "observeVariable", module);
  return {};
}));

return {runtime,main,keepalive,thisModule,unorderedSync,isOnObservableCom,runtime_variables,viewof$runtime_variables,observeVariable};
};

const _1347 = async (__variable) => {
const {invokeVariable} = await (import("./invoke-variable").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("invokeVariable")?.import("invokeVariable", module);
  return {};
}));

return {invokeVariable};
};

const _1348 = async (__variable) => {
const {spectralCircleOrder, improveOrderSifting, bestOfRandomOrders} = await (import("./spectral-layout").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("spectralCircleOrder")?.import("spectralCircleOrder", module);
  outputs.get("improveOrderSifting")?.import("improveOrderSifting", module);
  outputs.get("bestOfRandomOrders")?.import("bestOfRandomOrders", module);
  return {};
}));

return {spectralCircleOrder,improveOrderSifting,bestOfRandomOrders};
};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 1308", ["md"], _1308);
  main.define("cell 1309", ["visualizeModules"], _1309);
  main.define("cell 1310", ["md"], _1310);
  main.define("moduleMap", ["runtime","keepalive","myModule","viewof queue"], _1311);
  main.define("cell 1312", ["md"], _1312);
  main.define("sync_modules", ["runtime_variables","moduleMap","_","viewof currentModules","Event"], _1313);
  main.define("viewof currentModules", ["Inputs","moduleMap"], _1314);
  main.define("currentModules", ["Generators", "viewof currentModules"], (G, _) => G.input(_));
  main.define("cell 1315", ["Inputs","currentModules"], _1315);
  main.define("cell 1316", ["md"], _1316);
  main.define("tipTitle", [], _1317);
  main.define("visualizeModules", ["currentModules","htl","d3","spectralCircleOrder","improveOrderSifting","bestOfRandomOrders","Plot","tipTitle","linkTo","isOnObservableCom"], _1318);
  main.define("cell 1319", ["md"], _1319);
  main.define("viewof myModule", ["thisModule"], _1320);
  main.define("myModule", ["Generators", "viewof myModule"], (G, _) => G.input(_));
  main.define("tag", [], _1321);
  main.define("forcePeek", [], _1322);
  main.define("observe", [], _1323);
  main.define("cell 1324", ["md"], _1324);
  main.define("viewof queue", ["flowQueue"], _1325);
  main.define("queue", ["Generators", "viewof queue"], (G, _) => G.input(_));
  main.define("cell 1326", ["md"], _1326);
  main.define("module_definition_variables", ["notebookImports","queue"], _1327);
  main.define("modules", ["module_definition_variables","queue"], _1328);
  main.define("builtin", ["queue"], _1329);
  main.define("main_modules", ["queue","modules","builtin"], _1330);
  main.define("bootloaded_mains", ["queue"], _1331);
  main.define("bootloader", ["queue"], _1332);
  main.define("resolve_modules", ["modules","module_definition_variables","findModuleName"], _1333);
  main.define("cell 1334", ["md"], _1334);
  main.define("notebookImports", ["main","queue","parser"], _1335);
  main.define("notebookImportVariables", ["runtime","notebookImports"], _1336);
  main.define("pageImportMatch", [], _1337);
  main.define("notebookImportMatches", ["pageImportMatch","notebookImportVariables","modules"], _1338);
  main.define("moduleTitle", ["observeVariable"], _1339);
  main.define("titles", ["modules","moduleTitle"], _1340);
  main.define("summary", ["main_modules","titles","bootloader","builtin","queue","notebookImportMatches","bootloaded_mains","resolve_modules","module_definition_variables"], _1341);
  main.define("submit_summary", ["resolve_modules","queue","notebookImports","viewof queue","summary"], _1342);
  main.define("cell 1343", ["@variable"], _1343);
  main.define("linkTo", ["cell 1343"], (_) => _.linkTo);
  main.define("cell 1344", ["@variable"], _1344);
  main.define("flowQueue", ["cell 1344"], (_) => _.flowQueue);
  main.define("cell 1345", ["@variable"], _1345);
  main.define("parser", ["cell 1345"], (_) => _.parser);
  main.define("findModuleName", ["cell 1345"], (_) => _.findModuleName);
  main.define("cell 1346", ["@variable"], _1346);
  main.define("runtime", ["cell 1346"], (_) => _.runtime);
  main.define("main", ["cell 1346"], (_) => _.main);
  main.define("keepalive", ["cell 1346"], (_) => _.keepalive);
  main.define("thisModule", ["cell 1346"], (_) => _.thisModule);
  main.define("unorderedSync", ["cell 1346"], (_) => _.unorderedSync);
  main.define("isOnObservableCom", ["cell 1346"], (_) => _.isOnObservableCom);
  main.define("runtime_variables", ["cell 1346"], (_) => _.runtime_variables);
  main.define("viewof$runtime_variables", ["cell 1346"], (_) => _.viewof$runtime_variables);
  main.define("observeVariable", ["cell 1346"], (_) => _.observeVariable);
  main.define("cell 1347", ["@variable"], _1347);
  main.define("invokeVariable", ["cell 1347"], (_) => _.invokeVariable);
  main.define("cell 1348", ["@variable"], _1348);
  main.define("spectralCircleOrder", ["cell 1348"], (_) => _.spectralCircleOrder);
  main.define("improveOrderSifting", ["cell 1348"], (_) => _.improveOrderSifting);
  main.define("bestOfRandomOrders", ["cell 1348"], (_) => _.bestOfRandomOrders);
  return main;
}
