const _1t29kxm = function _1(md){return(
md`# \`cellMap\`
## computes the mapping of reactive variables to higher level notebook cells, grouped by module`
)};
const _199r1h0 = function _showBuiltins(Inputs){return(
Inputs.toggle({ label: "builtins?", value: false })
)};
const _v3idap = (G, _) => G.input(_);
const _jqf42f = function _showAnon(Inputs){return(
Inputs.toggle({ label: "anonymous?", value: false })
)};
const _10za42b = (G, _) => G.input(_);
const _125g1nt = function _cellMapViz(hash,Plot,width,d3,filteredMap,edges,linkTo,isOnObservableCom)
{
  hash; // update links on hash change
  return Plot.plot({
    width,
    axis: null,
    y: {
      reverse: true
    },
    marks: [
      Plot.dot(
        [
          [-1, d3.min(filteredMap, (d) => d.module)],
          [1, d3.max(filteredMap, (d) => d.module) + "_"]
        ],
        {
          stroke: "none"
        }
      ),
      Plot.arrow(
        edges.filter((edge) => edge[1]),
        {
          x1: 0,
          y1: (edge) => `${edge[0].module}#${edge[0].name}`,
          x2: 0,
          y2: (edge) => `${edge[1].module}#${edge[1].name}`,
          stroke: (edge) => edge[0].module,
          headLength: 0,
          bend: 90
        }
      ),
      Plot.ruleY(new Set(filteredMap.map((cell) => cell.module + "-")), {
        y: (d) => d,
        stroke: (d) => d,
        strokeOpacity: 0.5,
        strokeDasharray: [5, 10]
      }),
      Plot.text(new Set(filteredMap.map((cell) => cell.module)), {
        x: -1,
        y: (d) => d + "_",
        fill: (d) => d,
        fontSize: 14,
        frameAnchor: "top-left",
        dy: 8,
        href: (cell) => linkTo(`${cell}`),
        ...(isOnObservableCom() && { target: "_blank" })
      }),
      Plot.text(
        filteredMap,
        Plot.pointerY({
          x: 1,
          text: (d) => `${d.module}#${d.name}`,
          y: (d) => `${d.module}#${d.name}`,
          fill: (d) => d.module,
          fontSize: 14,
          frameAnchor: "right",
          href: (cell) => {
            if (!cell) return undefined;
            return linkTo(`${cell.module}#${cell.name}`);
          },
          ...(isOnObservableCom() && { target: "_blank" })
        })
      )
    ]
  });
};
const _cjxin = (G, _) => G.input(_);
const _1nt2irf = function _detailVizTitle(cellMapViz,linkTo,md){return(
md`${cellMapViz ? `### [\`${cellMapViz?.module}#${cellMapViz?.name}\`](${linkTo(`${cellMapViz?.module}#${cellMapViz?.name}`)})` : `\`<click the above viz to pin a cell and open its dependancy graph below>\``}`
)};
const _1lxiffy = function _detailViz(Plot,width,nodes,variableToCell,modules,linkTo,isOnObservableCom){return(
Plot.plot({
  symbol: {
    domain: ["simple", "mutable", undefined, "import", " ", "viewof"],
    legend: true
  },
  margin: 50,
  axis: null,
  width,
  height: 1000,
  marks: [
    Plot.link(
      nodes
        .filter((d) => d.parent)
        .map((n) => {
          if (variableToCell.get(n.parent.data) == variableToCell.get(n.data)) {
            n.type = variableToCell.get(n.data).type;
          } else {
            n.type = "connector";
          }
          return n;
        }),
      {
        x1: "y",
        y1: "x",
        x2: (d) => d.parent.y,
        y2: (d) => d.parent.x,
        stroke: "type",
        strokeLinecap: "round",
        strokeWidth: (d) => (d.type == "connector" ? 2 : 20),
        opacity: (d) => (d.type == "connector" ? 0.5 : 0.1),
        inset: 0
      }
    ),
    Plot.dot(nodes, {
      x: "y",
      y: "x",
      r: 10,
      fill: "white",
      symbol: (node) => variableToCell.get(node.data)?.type,
      stroke: (d) => modules.get(d.data._module)?.name,
      strokeWidth: 4,
      href: (d) => {
        const cell = variableToCell.get(d.data);
        if (!cell) return undefined;
        return linkTo(`${cell.module}#${cell.name}`);
      },
      ...(isOnObservableCom() && { target: "_blank" })
    }),
    Plot.arrow(
      nodes
        .filter((d) => d.parent)
        .flatMap((d) => d.reused.map((reused) => ({ ...d, parent: reused }))),
      {
        x1: "y",
        y1: "x",
        x2: (d) => d.parent.y,
        y2: (d) => d.parent.x,
        bend: -10,
        strokeDasharray: [1, 5],
        stroke: "red",
        opacity: 0.5,
        inset: 14
      }
    ),
    Plot.text(nodes, {
      x: "y",
      y: "x",
      text: (d) => d.data._name,
      dy: 16
    })
  ]
})
)};
const _j5pb2k = (G, _) => G.input(_);
const _glmq4i = function _7(md){return(
md`## cellMap`
)};
const _izhsfx = function _8(Inputs,filteredMap){return(
Inputs.table(filteredMap, {
  layout: "auto",
  format: {
    variables: (d) => d.length
  }
})
)};
const _7t7pwf = function _9(md){return(
md`## \`liveCellMap\`

Prefer using this variable for an always live view of the runtime state`
)};
const _1xnzq7y = async function _liveCellMap(keepalive,cellMapModule,Inputs,cellMap)
{
  keepalive(cellMapModule, "maintain_live_cell_map");
  return Inputs.input(await cellMap());
};
const _14vvdt2 = (G, _) => G.input(_);
const _193osz9 = async function _maintain_live_cell_map(runtime_variables,$0,cellMap,Event)
{
  runtime_variables;
  $0.value = await cellMap();
  $0.dispatchEvent(new Event("input"));
};
const _1vhxngh = function _usage(md){return(
md`## cellMap function

You can call it with zero args to default to the current runtime, or pass in a subset of variables to extract the cell structure from just those.

\`\`\`js
import {cellMap, liveCellMap} from "@tomlarkworthy/cell-map"
\`\`\`

If you wanted to use the visualizations in your own notebooks. You would import the views e.g.

\`\`\`js
import {viewof cellMapViz, viewof detailViz, detailVizTitle} from "@tomlarkworthy/cell-map"
\`\`\`

and then call them in your notebooks`
)};
const _17c6bac = function _cellMap(runtime,moduleMap,moduleVarInfo,importedModule,findModuleName,decompileImport){return(
async (variables, _moduleMap) => {
  const map = new Map();
  if (!variables) variables = runtime._variables;
  variables = [...variables];
  if (variables.length === 0) return map;

  if (!_moduleMap) _moduleMap = await moduleMap(variables[0]._module._runtime);

  const byNotebookModule = new Map();
  for (const v of variables) {
    const info = _moduleMap.get(v._module);
    if (!info) continue;
    if (!byNotebookModule.has(info.module))
      byNotebookModule.set(info.module, []);
    byNotebookModule.get(info.module).push(v);
  }

  const isModuleVar = (v) =>
    typeof v?._name === "string" && v._name.startsWith("module ");

  await Promise.all(
    [...byNotebookModule.keys()].map(async (m) => {
      const variables = byNotebookModule.get(m);
      const order = new Map(variables.map((v, i) => [v, i]));

      const cells = new Map();
      const moduleVars = variables.filter(isModuleVar);
      const moduleVarInfos = new Map(
        await Promise.all(
          moduleVars.map(async (v) => [v, await moduleVarInfo(v, _moduleMap)])
        )
      );

      const moduleVarsByKey = new Map();
      for (const v of moduleVars) {
        const info = moduleVarInfos.get(v);
        const key = info?.module ?? info?.name ?? null;
        if (!key) continue;
        if (!moduleVarsByKey.has(key)) moduleVarsByKey.set(key, []);
        moduleVarsByKey.get(key).push(v);
      }

      const viewofs = new Set();
      const mutables = new Set();
      const namedNonModuleVars = variables.filter(
        (v) => v?._name && !isModuleVar(v)
      );

      const sources = new Map(
        await Promise.all(
          namedNonModuleVars.map(async (v) => [
            v._name,
            await importedModule(v)
          ])
        )
      );

      const imports = new Map();
      const moduleNamesPromises = new Map();
      const groups = new Map();
      let anonCounter = 0;

      for (const v of variables) {
        if (v?._name) {
          if (isModuleVar(v)) {
            continue;
          }

          const source = sources.get(v._name);
          if (source) {
            const key = source;
            if (!imports.has(key)) {
              imports.set(key, []);
              moduleNamesPromises.set(
                key,
                Promise.resolve(
                  findModuleName(key, _moduleMap, { unknown_id: v._name })
                )
              );
            }
            imports.get(key).push(v);
          } else if (v._name.startsWith("viewof ")) {
            cells.set(v, { type: "viewof", lang: ["ojs"] });
            viewofs.add(v);
            groups.set(v._name, []);
          } else if (v._name.startsWith("mutable ")) {
            cells.set(v, { type: "mutable", lang: ["ojs"] });
            mutables.add(v);
            groups.set(v._name, []);
          } else if (v._name.startsWith("dynamic ")) {
            continue;
          } else {
            cells.set(v, { type: "simple", lang: ["ojs"] });
            groups.set(v._name, [v]);
          }
        } else {
          cells.set(v, { type: "simple", lang: ["ojs"] });
          groups.set(anonCounter++, [v]);
        }
      }

      for (const [key] of moduleVarsByKey.entries()) {
        if (imports.has(key)) continue;
        if (!moduleNamesPromises.has(key)) {
          if (typeof key === "string")
            moduleNamesPromises.set(key, Promise.resolve(key));
          else
            moduleNamesPromises.set(
              key,
              Promise.resolve(
                findModuleName(key, _moduleMap, { unknown_id: Math.random() })
              )
            );
        }
      }

      const moduleNames = new Map(
        await Promise.all(
          [...moduleNamesPromises.entries()].map(async ([k, p]) => [k, await p])
        )
      );

      for (const v of viewofs) {
        const name = v._name.substring(7);
        if (groups.has(name)) {
          groups.get(v._name).push(v, groups.get(name)[0]);
          groups.delete(name);
        } else {
          groups.delete(v._name);
        }
      }

      for (const v of mutables) {
        const name = v._name.substring(8);
        const initial = "initial " + name;
        if (groups.has(name) && groups.has(initial)) {
          groups
            .get(v._name)
            .push(groups.get(initial)?.[0], v, groups.get(name)[0]);
          cells.delete(groups.get(initial)[0]);
          cells.delete(groups.get(name)[0]);
          groups.delete(initial);
          groups.delete(name);
        } else {
          const vars = groups.get(v._name);
          if (vars?.[0]) cells.delete(vars[0]);
          groups.delete(v._name);
          groups.delete(initial);
          groups.delete(name);
        }
      }

      for (const [key, importVars] of imports.entries()) {
        const module_name =
          moduleNames.get(key) ?? `<unknown ${Math.random()}>`;
        let importInfo = null;
        try {
          importInfo = (await decompileImport(importVars)) ?? null;
        } catch {
          importInfo = null;
        }
        cells.set(importVars[0], {
          type: "import",
          lang: ["ojs"],
          module_name,
          importInfo
        });

        const groupName = `module ${module_name}`;
        const moduleVarsForKey = moduleVarsByKey.get(key) ?? [];
        groups.set(groupName, [...importVars, ...moduleVarsForKey]);
        moduleVarsByKey.delete(key);
      }

      for (const [key, moduleVarsOnly] of moduleVarsByKey.entries()) {
        if (!moduleVarsOnly.length) continue;
        const module_name =
          moduleNames.get(key) ??
          (typeof key === "string" ? key : `<unknown ${Math.random()}>`);
        let importInfo = null;
        try {
          importInfo = (await decompileImport(moduleVarsOnly)) ?? null;
        } catch {
          importInfo = null;
        }
        cells.set(moduleVarsOnly[0], {
          type: "import",
          lang: ["ojs"],
          module_name,
          importInfo
        });

        const groupName = `module ${module_name}`;
        groups.set(groupName, [...moduleVarsOnly]);
      }

      const orderKey = (name, vars) => {
        if (!vars?.length) return Infinity;
        if (typeof name === "string" && name.startsWith("mutable ")) {
          return order.get(vars[1] ?? vars[0]) ?? Infinity;
        }
        return order.get(vars[0]) ?? Infinity;
      };

      const sortedGroups = [...groups.entries()].sort((a, b) => {
        const oa = orderKey(a[0], a[1]);
        const ob = orderKey(b[0], b[1]);
        if (oa !== ob) return oa - ob;
        return String(a[0]).localeCompare(String(b[0]));
      });

      const moduleName =
        _moduleMap.get(variables[0]._module)?.name ?? "<unknown module>";
      map.set(
        m,
        sortedGroups.map(([name, variables]) => {
          const head =
            typeof name === "string" && name.startsWith("mutable")
              ? variables[1]
              : variables[0];
          return {
            name,
            module: moduleName,
            ...(cells.get(head) ?? { type: "simple", lang: ["ojs"] }),
            variables
          };
        })
      );
    })
  );

  return map;
}
)};
const _1clgb7s = async function _test_cellmap_importInfo_on_real_import(cellMap,expect)
{
  const mapped = await cellMap();
  const allCells = [...mapped.values()].flat();
  const cell = allCells.find(
    (c) => c?.type === "import" && typeof c?.module_name === "string"
  );
  expect(Boolean(cell)).toBe(true);

  expect(cell.type).toBe("import");
  expect(cell.importInfo != null).toBe(true);
  expect(cell.importInfo.type).toBe("import");
  expect((cell.importInfo.specifiers?.length ?? 0) >= 1).toBe(true);

  const vars = cell.importInfo?.meta?.variables ?? [];
  expect(Array.isArray(vars)).toBe(true);
  expect(vars.length >= 1).toBe(true);

  return cell.importInfo;
};
const _yubgz5 = function _15(md){return(
md`### \`cellMapCompat\`

Migration helper from old cellMap`
)};
const _71n0hz = function _cellMapCompat(cellMap){return(
async (module, { excludeInbuilt = true } = {}) => {
  const map = await cellMap(
    [...module._runtime._variables].filter(
      (v) => v._module == module && (!excludeInbuilt || v._type == 1)
    )
  );
  const cells = map.get(module) || [];
  return new Map(cells.map((c) => [c.name, c.variables]));
}
)};
const _x7j8bo = function _17(md){return(
md`## Visualizations`
)};
const _1l7cvxn = function _nodeToSymbol(variableToCell){return(
(node) =>
  ({
    viewof: "triangle",
    mutable: "cross",
    import: "square",
    simple: "circle"
  }[variableToCell.get(node.data)?.type] || "diamond")
)};
const _y7kfs7 = function _focus_variables(cellMapViz,descendants,ascendants){return(
cellMapViz
  ? [
      ...descendants(cellMapViz.variables[0]),
      ...ascendants(cellMapViz.variables[0])
    ]
  : []
)};
const _14ty3wh = function _focus_cells(focus_variables,variableToCell){return(
new Set(focus_variables.map((v) => variableToCell.get(v)))
)};
const _12jpxa2 = function _descendents(d3,cellMapViz){return(
d3.hierarchy(
  cellMapViz ? cellMapViz.variables[0] : [],
  (variable) => {
    return variable._inputs;
  }
)
)};
const _16z9f8f = function _dedupeHierarchy(){return(
function dedupeHierarchy(root) {
  const key = (n) => n.data;
  const deepest = new Map(); // datum → deepest node

  // pass-1: pick deepest representative
  root.each((n) => {
    const k = key(n);
    if (!deepest.has(k) || n.depth > deepest.get(k).depth) deepest.set(k, n);
  });
  deepest.forEach((n) => {
    n.reused = [];
  });

  // pass-2: alias shallower nodes → deepest
  root.each((n) => {
    const rep = deepest.get(key(n));
    n.name = n.data._name;
    const p = n.parent;
    if (n !== rep) {
      if (p) {
        p.children = p.children.map((c) => (c === n ? rep : c));
        if (!rep.reused.includes(p) && p == deepest.get(key(p)))
          rep.reused.push(p);
      }
    }
  });
  return root;
}
)};
const _1j8atwc = function _layout(d3,descendents){return(
d3.tree()(descendents)
)};
const _eb858t = function _clustered(dedupeHierarchy,layout){return(
dedupeHierarchy(layout)
)};
const _17lllwm = function _nodes(clustered){return(
clustered.descendants().map((n) => ({ name: n.data._name, ...n }))
)};
const _ng770d = function _26(md){return(
md`### visualize the cell ordering`
)};
const _xpas1q = function _runtimeMap(runtime_variables,liveCellMap)
{
  runtime_variables;
  return [...liveCellMap.values()].flat();
};
const _hishw1 = function _variableToCell(runtimeMap){return(
new Map(
  runtimeMap.flatMap((cell) => cell.variables.map((v) => [v, cell]))
)
)};
const _szpnyp = function _filteredMap(runtimeMap,filter){return(
runtimeMap.filter(filter)
)};
const _1jdpo9p = function _filter(showBuiltins,showAnon){return(
(v) =>
  (showBuiltins || (v.module !== "builtin" && v.name !== "module builtin")) &&
  (showAnon || typeof v.name == "string")
)};
const _10gdqhm = function _edges(filteredMap,variableToCell,filter){return(
filteredMap.flatMap((cell) =>
  cell.variables.flatMap((variable) =>
    variable._inputs
      .map((input) => [variableToCell.get(variable), variableToCell.get(input)])
      .filter(([source, imported]) => imported && filter(imported))
  )
)
)};
const _qb7351 = function _cellMapModule(thisModule){return(
thisModule()
)};
const _120483s = (G, _) => G.input(_);
const _2ufyg8 = function _38(md){return(
md`## testing`
)};
const _18tubss = function _39(tests){return(
tests({
  filter: (t) =>
    t.name.includes("@tomlarkworthy/cell-map") || t.name.includes("main")
})
)};
const _kdc1xp = function _modules(moduleMap,runtime){return(
moduleMap(runtime)
)};
const _jrvq7q = function _moduleLookup(modules){return(
new Map([...modules.values()].map((info) => [info.name, info]))
)};
const _rlmpw8 = function _42(md){return(
md`low-level variables in this module`
)};
const _519lii = function _43(Inputs,runtime_variables,cellMapModule,toObject,modules){return(
Inputs.table(
  [...runtime_variables]
    .filter((v) => v._module == cellMapModule)
    .map(toObject),
  {
    columns: [
      "_name",
      "_inputs",
      "_definition",
      "_type",
      "_reachable",
      "_observer",
      "_module"
    ],
    format: {
      _inputs: (i) => i.map((i) => i._name).join(", "),
      _observer: (i) => i.toString(),
      _module: (m) => modules.get(m).name
    }
  }
)
)};
const _pyrytd = function _unreached_main_import(toObject,lookupVariable,cellMapModule){return(
toObject &&
  lookupVariable("repositionSetElement", cellMapModule)
)};
const _12euivr = function _reached_main_import(runtime,lookupVariable,cellMapModule){return(
runtime && lookupVariable("runtime", cellMapModule)
)};
const _1x88m7u = function _main_mutable(){return(
"OK"
)};
const _1c3nv1y = (M, _) => new M(_);
const _kbdqj3 = _ => _.generator;
const _1q0qa04 = async function _test_importedModule(expect,modules,importedModule,reached_main_import,unreached_main_import)
{
  expect(modules.get(await importedModule(reached_main_import)).name).toBe(
    "@tomlarkworthy/module-map"
  );

  expect(modules.get(await importedModule(unreached_main_import)).name).toBe(
    "@tomlarkworthy/runtime-sdk"
  );

  return "ok";
};
const _1tqu9mu = async function _test_findModuleName(expect,findModuleName,importedModule,reached_main_import,modules,unreached_main_import)
{
  expect(
    findModuleName(await importedModule(reached_main_import), modules)
  ).toBe("@tomlarkworthy/module-map");

  expect(
    findModuleName(await importedModule(unreached_main_import), modules)
  ).toBe("@tomlarkworthy/runtime-sdk");

  return "ok";
};
const _1mk5ruc = async function _test_cellmap_mutable(main_mutable,lookupVariable,cellMapModule,cellMap,modules,expect)
{
  const initialMutable =
    main_mutable &&
    (await lookupVariable("initial main_mutable", cellMapModule));
  const mutableMutable =
    main_mutable &&
    (await lookupVariable("mutable main_mutable", cellMapModule));
  const mainMutable =
    main_mutable && (await lookupVariable("main_mutable", cellMapModule));
  const mapped = await cellMap(
    [initialMutable, mutableMutable, mainMutable],
    modules
  );
  const module = mapped.get(cellMapModule);
  expect(module).toHaveLength(1);
  const mutableCell = module[0];

  expect(mutableCell.type).toBe("mutable");
  expect(mutableCell.variables).toHaveLength(3);
  return mutableCell;
};
const _rpm6xw = function _50(md){return(
md`### Notebook 2.0 Compatability`
)};
const _1rtpyzk = function _cellMapVizView($0){return(
$0
)};
const _1srzrzc = function _52(md){return(
md`detailVizView = viewof detailViz`
)};
const _1hybsm8 = function _coverage_failures(runtime_variables,liveCellMap,modules)
{
  const byModule = new Map();
  for (const v of runtime_variables) {
    const m = v._module;
    let arr = byModule.get(m);
    if (!arr) byModule.set(m, (arr = []));
    arr.push(v);
  }

  const isDynamic = (v) =>
    typeof v?._name === "string" && v._name.startsWith("dynamic");

  const failures = [];
  for (const [m, vars] of byModule.entries()) {
    const cells = liveCellMap.get(m) || [];
    const covered = new Set(cells.flatMap((c) => c.variables || []));
    const missing = vars.filter(
      (v) => v._type == 1 && !isDynamic(v) && !covered.has(v)
    );
    if (missing.length) {
      const moduleName = modules?.get(m)?.name ?? "<unknown module>";
      failures.push({
        module: moduleName,
        missing: missing.map((v, i) => v._name ?? `<anonymous ${i}>`)
      });
    }
  }
  return failures;
};
const _4tg5tm = function _test_cell_map_covers_all_runtime_variables(coverage_failures)
{
  if (coverage_failures.length) {
    void 0;
    throw JSON.stringify(coverage_failures);
  }
  return "pass";
};
const _1a18z7a = function _test_cell_map_no_variable_in_more_than_one_cell(runtime_variables,liveCellMap,modules)
{
  runtime_variables;

  const where = new Map(); // variable -> Set(cellId)
  const add = (v, cellId) => {
    let s = where.get(v);
    if (!s) where.set(v, (s = new Set()));
    s.add(cellId);
  };

  for (const [m, cells] of liveCellMap.entries()) {
    const moduleName = modules?.get(m)?.name ?? "<unknown module>";
    for (const c of cells ?? []) {
      const cellId = `${moduleName}#${String(c?.name ?? "<unknown cell>")}`;
      const vars = c?.variables ?? [];
      const uniq = new Set(vars);
      for (const v of uniq) add(v, cellId);
    }
  }

  const failures = [];
  for (const [v, cellIds] of where.entries()) {
    if (cellIds.size > 1) {
      const vModuleName = modules?.get(v?._module)?.name ?? "<unknown module>";
      failures.push({
        variable_module: vModuleName,
        variable_name: v?._name ?? "<anonymous>",
        cells: [...cellIds]
      });
    }
  }

  if (failures.length) throw JSON.stringify(failures);
  return "pass";
};
const _8nkqnx = function _56(md){return(
md`### Utilities`
)};
const _2h3a9s = function _importedModule(){return(
async (v) => {
  if (
    // imported variable is observed
    v._inputs.length == 1 && // always a single dependancy
    v._inputs[0]._module !== v._module // bridging across modules
  )
    return v._inputs[0]._module;

  // Import from API
  // 'async () => runtime.module((await import("/@tomlarkworthy/exporter.js?v=4&resolutions=ab5a63c64de95b0d@298")).default)'
  /*
  if (
    v._inputs.length == 0 &&
    v._definition.toString().includes("runtime.module((await import")
  ) {
    void 0;
    v._value = await v._definition();
    return v._value;
  }*/
  if (
    // imported variable unobserved and loaded by API
    v._inputs.length == 2 && // always a single dependancy
    v._inputs[1]._name == "@variable" // bridging across modules
  ) {
    if (v._inputs[0]._value) return v._inputs[0]._value;
    else {
      return;
      //const module = await v._inputs[0]._definition();
      //debugger;
      //return module;
    }
  }

  // The inline case for live notebook
  // _definition: "async t=>t.import(e.name,e.alias,await i)"
  if (
    v._inputs.length == 1 &&
    v._inputs[0]._name == "@variable" &&
    v._definition.toString().includes("import(")
  ) {
    return await new Promise(async (resolve, reject) => {
      try {
        await v._definition({
          import: (...args) => resolve(args[2])
        });
      } catch (err) {
        if (v._definition.toString().includes("derive")) {
          console.error("Subbing derrived module for original", v);
          const derrived = await v._definition(v);
          resolve(derrived._source);
        } else {
          console.error("Cannot sourceModule for ", v);
          void 0;
          throw err;
        }
      }
    });
  }

  return null;
}
)};
const _n7jdgk = function _findModuleName(){return(
(module, moduleMap, { unknown_id = Math.random() } = {}) => {
  try {
    const lookup = moduleMap.get(module);
    if (lookup) return lookup.name;
    return `<unknown ${unknown_id}>`;
  } catch (e) {
    void 0;
    return "error";
  }
}
)};
const _1ii3nc0 = function _extractObservableNotebookNameFromSpecifier(){return(
(specifier) => {
  if (specifier == null) return null;
  const s = String(specifier);
  try {
    const u = new URL(s, "https://api.observablehq.com/");
    const p = u.pathname;
    let m = p.match(/\/(@[^/]+\/[^/]+)\.js$/);
    if (m) return m[1];
    m = p.match(/\/(d\/[0-9a-f]+@\d+)\.js$/);
    if (m) return m[1];
    m = p.match(/\/(d\/[0-9a-f]+)\.js$/);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}
)};
const _ejsyo1 = function _moduleVarInfo(extractObservableNotebookNameFromSpecifier){return(
async (v, moduleMapLike) => {
  const mod = v?._value ?? null;
  const nameFromMap =
    mod && moduleMapLike?.get?.(mod)?.name ? moduleMapLike.get(mod).name : null;

  const def = v?._definition;
  const defSrc = typeof def?.toString === "function" ? def.toString() : "";
  const m = defSrc.match(/\bimport\(\s*(['"])(.*?)\1\s*\)/);
  const specifier = m?.[2] ?? null;
  const nameFromSpecifier =
    extractObservableNotebookNameFromSpecifier(specifier);

  return {
    module: mod,
    name: nameFromMap ?? nameFromSpecifier ?? null,
    specifier
  };
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  $def("_1t29kxm", null, ["md"], _1t29kxm);  
  $def("_199r1h0", "viewof showBuiltins", ["Inputs"], _199r1h0);  
  $def("_v3idap", "showBuiltins", ["Generators","viewof showBuiltins"], _v3idap);  
  $def("_jqf42f", "viewof showAnon", ["Inputs"], _jqf42f);  
  $def("_10za42b", "showAnon", ["Generators","viewof showAnon"], _10za42b);  
  $def("_125g1nt", "viewof cellMapViz", ["hash","Plot","width","d3","filteredMap","edges","linkTo","isOnObservableCom"], _125g1nt);  
  $def("_cjxin", "cellMapViz", ["Generators","viewof cellMapViz"], _cjxin);  
  $def("_1nt2irf", "detailVizTitle", ["cellMapViz","linkTo","md"], _1nt2irf);  
  $def("_1lxiffy", "viewof detailViz", ["Plot","width","nodes","variableToCell","modules","linkTo","isOnObservableCom"], _1lxiffy);  
  $def("_j5pb2k", "detailViz", ["Generators","viewof detailViz"], _j5pb2k);  
  $def("_glmq4i", null, ["md"], _glmq4i);  
  $def("_izhsfx", null, ["Inputs","filteredMap"], _izhsfx);  
  $def("_7t7pwf", null, ["md"], _7t7pwf);  
  $def("_1xnzq7y", "viewof liveCellMap", ["keepalive","cellMapModule","Inputs","cellMap"], _1xnzq7y);  
  $def("_14vvdt2", "liveCellMap", ["Generators","viewof liveCellMap"], _14vvdt2);  
  $def("_193osz9", "maintain_live_cell_map", ["runtime_variables","viewof liveCellMap","cellMap","Event"], _193osz9);  
  $def("_1vhxngh", "usage", ["md"], _1vhxngh);  
  $def("_17c6bac", "cellMap", ["runtime","moduleMap","moduleVarInfo","importedModule","findModuleName","decompileImport"], _17c6bac);  
  $def("_1clgb7s", "test_cellmap_importInfo_on_real_import", ["cellMap","expect"], _1clgb7s);  
  $def("_yubgz5", null, ["md"], _yubgz5);  
  $def("_71n0hz", "cellMapCompat", ["cellMap"], _71n0hz);  
  $def("_x7j8bo", null, ["md"], _x7j8bo);  
  $def("_1l7cvxn", "nodeToSymbol", ["variableToCell"], _1l7cvxn);  
  $def("_y7kfs7", "focus_variables", ["cellMapViz","descendants","ascendants"], _y7kfs7);  
  $def("_14ty3wh", "focus_cells", ["focus_variables","variableToCell"], _14ty3wh);  
  $def("_12jpxa2", "descendents", ["d3","cellMapViz"], _12jpxa2);  
  $def("_16z9f8f", "dedupeHierarchy", [], _16z9f8f);  
  $def("_1j8atwc", "layout", ["d3","descendents"], _1j8atwc);  
  $def("_eb858t", "clustered", ["dedupeHierarchy","layout"], _eb858t);  
  $def("_17lllwm", "nodes", ["clustered"], _17lllwm);  
  $def("_ng770d", null, ["md"], _ng770d);  
  $def("_xpas1q", "runtimeMap", ["runtime_variables","liveCellMap"], _xpas1q);  
  $def("_hishw1", "variableToCell", ["runtimeMap"], _hishw1);  
  $def("_szpnyp", "filteredMap", ["runtimeMap","filter"], _szpnyp);  
  $def("_1jdpo9p", "filter", ["showBuiltins","showAnon"], _1jdpo9p);  
  $def("_10gdqhm", "edges", ["filteredMap","variableToCell","filter"], _10gdqhm);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("runtime", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("ascendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("ascendants", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  $def("_qb7351", "viewof cellMapModule", ["thisModule"], _qb7351);  
  $def("_120483s", "cellMapModule", ["Generators","viewof cellMapModule"], _120483s);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  $def("_2ufyg8", null, ["md"], _2ufyg8);  
  $def("_18tubss", null, ["tests"], _18tubss);  
  $def("_kdc1xp", "modules", ["moduleMap","runtime"], _kdc1xp);  
  $def("_jrvq7q", "moduleLookup", ["modules"], _jrvq7q);  
  $def("_rlmpw8", null, ["md"], _rlmpw8);  
  $def("_519lii", null, ["Inputs","runtime_variables","cellMapModule","toObject","modules"], _519lii);  
  $def("_pyrytd", "unreached_main_import", ["toObject","lookupVariable","cellMapModule"], _pyrytd);  
  $def("_12euivr", "reached_main_import", ["runtime","lookupVariable","cellMapModule"], _12euivr);  
  $def("_1x88m7u", "initial main_mutable", [], _1x88m7u);  
  $def("_1c3nv1y", "mutable main_mutable", ["Mutable","initial main_mutable"], _1c3nv1y);  
  $def("_kbdqj3", "main_mutable", ["mutable main_mutable"], _kbdqj3);  
  $def("_1q0qa04", "test_importedModule", ["expect","modules","importedModule","reached_main_import","unreached_main_import"], _1q0qa04);  
  $def("_1tqu9mu", "test_findModuleName", ["expect","findModuleName","importedModule","reached_main_import","modules","unreached_main_import"], _1tqu9mu);  
  $def("_1mk5ruc", "test_cellmap_mutable", ["main_mutable","lookupVariable","cellMapModule","cellMap","modules","expect"], _1mk5ruc);  
  $def("_rpm6xw", null, ["md"], _rpm6xw);  
  $def("_1rtpyzk", "cellMapVizView", ["viewof cellMapViz"], _1rtpyzk);  
  $def("_1srzrzc", null, ["md"], _1srzrzc);  
  $def("_1hybsm8", "coverage_failures", ["runtime_variables","liveCellMap","modules"], _1hybsm8);  
  $def("_4tg5tm", "test_cell_map_covers_all_runtime_variables", ["coverage_failures"], _4tg5tm);  
  $def("_1a18z7a", "test_cell_map_no_variable_in_more_than_one_cell", ["runtime_variables","liveCellMap","modules"], _1a18z7a);  
  $def("_8nkqnx", null, ["md"], _8nkqnx);  
  $def("_2h3a9s", "importedModule", [], _2h3a9s);  
  $def("_n7jdgk", "findModuleName", [], _n7jdgk);  
  $def("_1ii3nc0", "extractObservableNotebookNameFromSpecifier", [], _1ii3nc0);  
  $def("_ejsyo1", "moduleVarInfo", ["extractObservableNotebookNameFromSpecifier"], _ejsyo1);  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));  
  main.define("decompileImport", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompileImport", _));
  return main;
}