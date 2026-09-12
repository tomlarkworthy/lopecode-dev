const _382 = function viewof$showBuiltins(Inputs){return(
Inputs.toggle({ label: "builtins?", value: false })
)};

const _504 = function viewof$showAnon(Inputs){return(
Inputs.toggle({ label: "anonymous?", value: false })
)};

const _314 = function viewof$cellMapViz(hash,Plot,width,d3,filteredMap,edges,linkTo,isOnObservableCom)
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
}
;

const _680 = function viewof$detailViz(Plot,width,nodes,variableToCell,modules,linkTo,isOnObservableCom){return(
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

const _283 = function(Inputs,filteredMap){return(
Inputs.table(filteredMap, {
  layout: "auto",
  format: {
    variables: (d) => d.length
  }
})
)};

const _1358 = async function viewof$liveCellMap(keepalive,cellMapModule,Inputs,cellMap,currentModules)
{
  keepalive(cellMapModule, "maintain_live_cell_map");
  return Inputs.input(await cellMap(undefined, currentModules));
}
;

const _1371 = async function maintain_live_cell_map(runtime_variables,viewof$liveCellMap,cellMap,currentModules,Event)
{
  runtime_variables;
  viewof$liveCellMap.value = await cellMap(undefined, currentModules);
  viewof$liveCellMap.dispatchEvent(new Event("input"));
}
;

const _8 = function cellMap(runtime,moduleMap,moduleVarInfo,importedModule,findModuleName,decompileImport){return(
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

const _1481 = async function test_cellmap_importInfo_on_real_import(cellMap,expect)
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
}
;

const _1323 = function cellMapCompat(cellMap){return(
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

const _980 = function nodeToSymbol(variableToCell){return(
(node) =>
  ({
    viewof: "triangle",
    mutable: "cross",
    import: "square",
    simple: "circle"
  }[variableToCell.get(node.data)?.type] || "diamond")
)};

const _620 = function focus_variables(cellMapViz,descendants,ascendants){return(
cellMapViz
  ? [
      ...descendants(cellMapViz.variables[0]),
      ...ascendants(cellMapViz.variables[0])
    ]
  : []
)};

const _652 = function focus_cells(focus_variables,variableToCell){return(
new Set(focus_variables.map((v) => variableToCell.get(v)))
)};

const _659 = function descendents(d3,cellMapViz){return(
d3.hierarchy(
  cellMapViz ? cellMapViz.variables[0] : [],
  (variable) => {
    return variable._inputs;
  }
)
)};

const _754 = function dedupeHierarchy(){return(
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

const _883 = function layout(d3,descendents){return(
d3.tree()(descendents)
)};

const _657 = function clustered(dedupeHierarchy,layout){return(
dedupeHierarchy(layout)
)};

const _673 = function nodes(clustered){return(
clustered.descendants().map((n) => ({ name: n.data._name, ...n }))
)};

const _213 = function runtimeMap(runtime_variables,liveCellMap)
{
  runtime_variables;
  return [...liveCellMap.values()].flat();
}
;

const _326 = function variableToCell(runtimeMap){return(
new Map(
  runtimeMap.flatMap((cell) => cell.variables.map((v) => [v, cell]))
)
)};

const _375 = function filteredMap(runtimeMap,filter){return(
runtimeMap.filter(filter)
)};

const _393 = function filter(showBuiltins,showAnon){return(
(v) =>
  (showBuiltins || (v.module !== "builtin" && v.name !== "module builtin")) &&
  (showAnon || typeof v.name == "string")
)};

const _321 = function edges(filteredMap,variableToCell,filter){return(
filteredMap.flatMap((cell) =>
  cell.variables.flatMap((variable) =>
    variable._inputs
      .map((input) => [variableToCell.get(variable), variableToCell.get(input)])
      .filter(([source, imported]) => imported && filter(imported))
  )
)
)};

const _533 = async (__variable) => {
const {linkTo, isOnObservableCom} = await (import("./lopepage-urls").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("linkTo")?.import("linkTo", module);
  outputs.get("isOnObservableCom")?.import("isOnObservableCom", module);
  return {};
}));

return {linkTo,isOnObservableCom};
};

const _14 = async (__variable) => {
const {moduleMap, runtime} = await (import("./module-map").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("moduleMap")?.import("moduleMap", module);
  outputs.get("runtime")?.import("runtime", module);
  return {};
}));

return {moduleMap,runtime};
};

const _1548 = async (__variable) => {
const {currentModules} = await (import("./modules").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("currentModules")?.import("currentModules", module);
  return {};
}));

return {currentModules};
};

const _48 = async (__variable) => {
const {keepalive, runtime_variables, lookupVariable, thisModule, toObject, repositionSetElement, ascendants, descendants} = await (import("./runtime-sdk").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("keepalive")?.import("keepalive", module);
  outputs.get("runtime_variables")?.import("runtime_variables", module);
  outputs.get("lookupVariable")?.import("lookupVariable", module);
  outputs.get("thisModule")?.import("thisModule", module);
  outputs.get("toObject")?.import("toObject", module);
  outputs.get("repositionSetElement")?.import("repositionSetElement", module);
  outputs.get("ascendants")?.import("ascendants", module);
  outputs.get("descendants")?.import("descendants", module);
  return {};
}));

return {keepalive,runtime_variables,lookupVariable,thisModule,toObject,repositionSetElement,ascendants,descendants};
};

const _147 = async (__variable) => {
const {expect} = await (import("./jest-expect-standalone").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("expect")?.import("expect", module);
  return {};
}));

return {expect};
};

const _55 = function viewof$cellMapModule(thisModule){return(
thisModule()
)};

const _232 = async (__variable) => {
const {tests} = await (import("./tests").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("tests")?.import("tests", module);
  return {};
}));

return {tests};
};

const _234 = function(tests){return(
tests({
  filter: (t) =>
    t.name.includes("@tomlarkworthy/cell-map") || t.name.includes("main")
})
)};

const _114 = function modules(moduleMap,runtime){return(
moduleMap(runtime)
)};

const _117 = function moduleLookup(modules){return(
new Map([...modules.values()].map((info) => [info.name, info]))
)};

const _60 = function(Inputs,runtime_variables,cellMapModule,toObject,modules){return(
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

const _96 = function unreached_main_import(toObject,lookupVariable,cellMapModule){return(
toObject &&
  lookupVariable("repositionSetElement", cellMapModule)
)};

const _52 = function reached_main_import(runtime,lookupVariable,cellMapModule){return(
runtime && lookupVariable("runtime", cellMapModule)
)};

const _1013 = function mutable$main_mutable(){return(
"OK"
)};

const _131 = async function test_importedModule(expect,modules,importedModule,reached_main_import,unreached_main_import)
{
  expect(modules.get(await importedModule(reached_main_import)).name).toBe(
    "@tomlarkworthy/module-map"
  );

  expect(modules.get(await importedModule(unreached_main_import)).name).toBe(
    "@tomlarkworthy/runtime-sdk"
  );

  return "ok";
}
;

const _1019 = async function test_findModuleName(expect,findModuleName,importedModule,reached_main_import,modules,unreached_main_import)
{
  expect(
    findModuleName(await importedModule(reached_main_import), modules)
  ).toBe("@tomlarkworthy/module-map");

  expect(
    findModuleName(await importedModule(unreached_main_import), modules)
  ).toBe("@tomlarkworthy/runtime-sdk");

  return "ok";
}
;

const _1023 = async function test_cellmap_mutable(main_mutable,lookupVariable,cellMapModule,cellMap,modules,expect)
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
}
;

const _1389 = function cellMapVizView(viewof$cellMapViz){return(
viewof$cellMapViz
)};

const _1454 = function coverage_failures(runtime_variables,liveCellMap,modules)
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
}
;

const _1404 = function test_cell_map_covers_all_runtime_variables(coverage_failures)
{
  if (coverage_failures.length) {
    throw JSON.stringify(coverage_failures);
  }
  return "pass";
}
;

const _1430 = function test_cell_map_no_variable_in_more_than_one_cell(runtime_variables,liveCellMap,modules)
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
}
;

const _22 = function importedModule(){return(
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
    debugger;
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

  // The inline case for live notebook. Two compiler shapes, one probe object:
  //   legacy    "async t => t.import(e.name, e.alias, await i)"
  //   notebook-kit (new.observablehq.com)
  //             "async (__variable) => { ... __variable._module._runtime.module(_.default) ... }"
  if (
    v._inputs.length == 1 &&
    v._inputs[0]._name == "@variable" &&
    v._definition.toString().includes("import(")
  ) {
    const rt = v._module?._runtime;
    let captured = null;
    const probe = {
      import: (...args) => {
        captured ??= args[2];
      },
      _outputs: [],
      _module: {
        _runtime: {
          module: (...args) => {
            const m = rt.module(...args);
            captured ??= m;
            return m;
          }
        }
      }
    };
    try {
      await v._definition(probe);
      return captured;
    } catch (err) {
      if (v._definition.toString().includes("derive")) {
        console.error("Subbing derrived module for original", v);
        const derrived = await v._definition(v);
        return derrived._source;
      }
      // never leave the caller hanging — cellMap degrades to "no source module"
      console.error("Cannot sourceModule for ", v, err);
      return captured;
    }
  }

  return null;
}
)};

const _28 = function findModuleName(){return(
(module, moduleMap, { unknown_id = Math.random() } = {}) => {
  try {
    const lookup = moduleMap.get(module);
    if (lookup) return lookup.name;
    return `<unknown ${unknown_id}>`;
  } catch (e) {
    debugger;
    return "error";
  }
}
)};

const _1419 = function extractObservableNotebookNameFromSpecifier(){return(
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

const _1422 = function moduleVarInfo(extractObservableNotebookNameFromSpecifier){return(
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

const _1297 = async (__variable) => {
const {hash} = await (import("../@jashkenas/url-querystrings-and-hash-parameters").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("hash")?.import("hash", module);
  return {};
}));

return {hash};
};

const _1468 = async (__variable) => {
const {decompileImport} = await (import("./observablejs-toolchain").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("decompileImport")?.import("decompileImport", module);
  return {};
}));

return {decompileImport};
};

export default function define(runtime) {
  const main = runtime.module();
  main.define("viewof showBuiltins", ["Inputs"], _382);
  main.define("showBuiltins", ["Generators", "viewof showBuiltins"], (G, _) => G.input(_));
  main.define("viewof showAnon", ["Inputs"], _504);
  main.define("showAnon", ["Generators", "viewof showAnon"], (G, _) => G.input(_));
  main.define("viewof cellMapViz", ["hash","Plot","width","d3","filteredMap","edges","linkTo","isOnObservableCom"], _314);
  main.define("cellMapViz", ["Generators", "viewof cellMapViz"], (G, _) => G.input(_));
  main.define("viewof detailViz", ["Plot","width","nodes","variableToCell","modules","linkTo","isOnObservableCom"], _680);
  main.define("detailViz", ["Generators", "viewof detailViz"], (G, _) => G.input(_));
  main.define("cell 283", ["Inputs","filteredMap"], _283);
  main.define("viewof liveCellMap", ["keepalive","cellMapModule","Inputs","cellMap","currentModules"], _1358);
  main.define("liveCellMap", ["Generators", "viewof liveCellMap"], (G, _) => G.input(_));
  main.define("maintain_live_cell_map", ["runtime_variables","viewof liveCellMap","cellMap","currentModules","Event"], _1371);
  main.define("cellMap", ["runtime","moduleMap","moduleVarInfo","importedModule","findModuleName","decompileImport"], _8);
  main.define("test_cellmap_importInfo_on_real_import", ["cellMap","expect"], _1481);
  main.define("cellMapCompat", ["cellMap"], _1323);
  main.define("nodeToSymbol", ["variableToCell"], _980);
  main.define("focus_variables", ["cellMapViz","descendants","ascendants"], _620);
  main.define("focus_cells", ["focus_variables","variableToCell"], _652);
  main.define("descendents", ["d3","cellMapViz"], _659);
  main.define("dedupeHierarchy", [], _754);
  main.define("layout", ["d3","descendents"], _883);
  main.define("clustered", ["dedupeHierarchy","layout"], _657);
  main.define("nodes", ["clustered"], _673);
  main.define("runtimeMap", ["runtime_variables","liveCellMap"], _213);
  main.define("variableToCell", ["runtimeMap"], _326);
  main.define("filteredMap", ["runtimeMap","filter"], _375);
  main.define("filter", ["showBuiltins","showAnon"], _393);
  main.define("edges", ["filteredMap","variableToCell","filter"], _321);
  main.define("cell 533", ["@variable"], _533);
  main.define("linkTo", ["cell 533"], (_) => _.linkTo);
  main.define("isOnObservableCom", ["cell 533"], (_) => _.isOnObservableCom);
  main.define("cell 14", ["@variable"], _14);
  main.define("moduleMap", ["cell 14"], (_) => _.moduleMap);
  main.define("runtime", ["cell 14"], (_) => _.runtime);
  main.define("cell 1548", ["@variable"], _1548);
  main.define("currentModules", ["cell 1548"], (_) => _.currentModules);
  main.define("cell 48", ["@variable"], _48);
  main.define("keepalive", ["cell 48"], (_) => _.keepalive);
  main.define("runtime_variables", ["cell 48"], (_) => _.runtime_variables);
  main.define("lookupVariable", ["cell 48"], (_) => _.lookupVariable);
  main.define("thisModule", ["cell 48"], (_) => _.thisModule);
  main.define("toObject", ["cell 48"], (_) => _.toObject);
  main.define("repositionSetElement", ["cell 48"], (_) => _.repositionSetElement);
  main.define("ascendants", ["cell 48"], (_) => _.ascendants);
  main.define("descendants", ["cell 48"], (_) => _.descendants);
  main.define("cell 147", ["@variable"], _147);
  main.define("expect", ["cell 147"], (_) => _.expect);
  main.define("viewof cellMapModule", ["thisModule"], _55);
  main.define("cellMapModule", ["Generators", "viewof cellMapModule"], (G, _) => G.input(_));
  main.define("cell 232", ["@variable"], _232);
  main.define("tests", ["cell 232"], (_) => _.tests);
  main.define("cell 234", ["tests"], _234);
  main.define("modules", ["moduleMap","runtime"], _114);
  main.define("moduleLookup", ["modules"], _117);
  main.define("cell 60", ["Inputs","runtime_variables","cellMapModule","toObject","modules"], _60);
  main.define("unreached_main_import", ["toObject","lookupVariable","cellMapModule"], _96);
  main.define("reached_main_import", ["runtime","lookupVariable","cellMapModule"], _52);
  main.define("initial main_mutable", [], _1013);
  main.define("mutator main_mutable", ["Mutable", "initial main_mutable"], (M, _) => ((m) => [m, {get value() { return m.value; }, set value(v) { m.value = v; }}])(M(_)));
  main.define("mutable main_mutable", ["mutator main_mutable"], ([, m]) => m);
  main.define("main_mutable", ["mutator main_mutable"], ([m]) => m);
  main.define("test_importedModule", ["expect","modules","importedModule","reached_main_import","unreached_main_import"], _131);
  main.define("test_findModuleName", ["expect","findModuleName","importedModule","reached_main_import","modules","unreached_main_import"], _1019);
  main.define("test_cellmap_mutable", ["main_mutable","lookupVariable","cellMapModule","cellMap","modules","expect"], _1023);
  main.define("cellMapVizView", ["viewof cellMapViz"], _1389);
  main.define("coverage_failures", ["runtime_variables","liveCellMap","modules"], _1454);
  main.define("test_cell_map_covers_all_runtime_variables", ["coverage_failures"], _1404);
  main.define("test_cell_map_no_variable_in_more_than_one_cell", ["runtime_variables","liveCellMap","modules"], _1430);
  main.define("importedModule", [], _22);
  main.define("findModuleName", [], _28);
  main.define("extractObservableNotebookNameFromSpecifier", [], _1419);
  main.define("moduleVarInfo", ["extractObservableNotebookNameFromSpecifier"], _1422);
  main.define("cell 1297", ["@variable"], _1297);
  main.define("hash", ["cell 1297"], (_) => _.hash);
  main.define("cell 1468", ["@variable"], _1468);
  main.define("decompileImport", ["cell 1468"], (_) => _.decompileImport);
  return main;
}
