const _cmt00 = function _cmt00(md) {return (md`## Consumer contract tests`);};
const _cmt01 = function _cellMapFixture(createModule,deleteModule,runtime,realize,currentModules,cellMap) {
  let serial = 0;
  return async (fn) => {
    const id = `${Date.now().toString(36)}-${serial++}`;
    const libName = `@cellmap-test/lib-${id}`, appName = `@cellmap-test/app-${id}`;
    // the library is a module block and its loader goes through the page's import hook, as in an export
    const block = Object.assign(document.createElement("script"), {type: "text/plain", id: libName});
    block.setAttribute("data-mime", "application/javascript");
    block.textContent = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("a")).define("a", [], () => 1);
  main.variable(observer("b")).define("b", [], () => 2);
  main.variable(observer("x")).define("x", [], () => 3);
  return main;
}`;
    document.body.appendChild(block);
    const [loader, loaderQuoter] = await realize([
      `async () => runtime.module((await import(${JSON.stringify(`/${libName}.js?v=4`)})).default)`,
      // a named cell whose body builds and imports a module without being an import cell
      `function _loaderQuoter(runtime){return(\n(url) => runtime.module(import(url))\n)}`
    ], runtime);
    const app = createModule(appName, runtime);
    let lib;
    try {
      const def = (name, inputs, fn) => app.variable(true).define(name, inputs, fn);
      const v = {};
      v.module = def(`module ${libName}`, [], loader);
      // an input naming a cell defined later resolves to the browser global (window.toolbar) first, and the
      // runtime leaves that implicit variable behind once the real cell is defined
      v.toolbarUser = def("toolbarUser", ["toolbar"], (t) => t);
      v.toolbar = def("toolbar", [], () => "t");
      v.n = def("n", [], () => 1);
      // runtime is not in a createModule module's scope; the parameter name is what the source shows
      v.quoter = def("loaderQuoter", ["n"], loaderQuoter);
      v.anon = def(null, ["n"], (n) => n + 1);
      v.viewof = def("viewof x", [], () => Object.assign(new EventTarget(), {value: 5}));
      v.x = def("x", ["Generators", "viewof x"], (G, _) => G.input(_));
      v.initial = def("initial m", [], () => 3);
      v.mutable = def("mutable m", ["Mutable", "initial m"], (M, _) => new M(_));
      v.m = def("m", ["mutable m"], (_) => _.generator);
      v.a = def("a", [`module ${libName}`, "@variable"], (_, v) => v.import("a", _));
      v.b = def("b", [`module ${libName}`, "@variable"], (_, v) => v.import("b", _));
      v.c = def("c", [`module ${libName}`, "@variable"], (_, v) => v.import("x", "c", _));
      const values = await Promise.all(["n", "x", "m", "a", "b", "c"].map((name) => app.value(name)));
      await app.value("loaderQuoter");
      if (values.join() !== "1,5,3,1,2,3") throw new Error(`fixture did not compute: ${values}`);
      lib = await app.value(`module ${libName}`);
      const variables = [...runtime._variables].filter((x) => x._module === app && x._type === 1);
      const modules = new Map([...(currentModules ?? new Map())]);
      modules.set(lib, {name: libName, module: lib});
      modules.set(app, {name: appName, module: app});
      const cells = (await cellMap(variables, modules)).get(app) ?? [];
      const cellOf = (variable) => cells.filter((c) => c.variables?.includes(variable));
      return await fn({cells, cellOf, v, variables, app, lib, appName, libName, modules});
    } finally {
      // a left-behind implicit variable does not own its name, so variable.delete() throws on it (runtime variable.js)
      for (const x of [...runtime._variables]) if (x._module === app && x._name != null && app._scope.get(x._name) !== x) runtime._variables.delete(x);
      deleteModule(appName, runtime);
      if (lib) for (const x of [...runtime._variables]) if (x._module === lib) x.delete();
      block.remove();
    }
  };
};
const _cmt10 = function _test_cellmap_contract_every_variable_in_exactly_one_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, variables}) => {
  const counts = variables.map((x) => [x._name ?? "(anonymous)", cellOf(x).length]);
  expect(counts.filter(([, k]) => k !== 1)).toEqual([]);
  return `ok: ${variables.length} variables`;
})
)};
const _cmt11 = function _test_cellmap_contract_cells_follow_runtime_order(cellMapFixture,expect) {return (
cellMapFixture(({cells, variables}) => {
  // where an import cell sorts is a shape question (test_cellmap_shape_import_cell_sorts_by_its_first_import)
  const first = cells.filter((c) => c.type !== "import").map((c) => Math.min(...c.variables.map((x) => variables.indexOf(x)).filter((i) => i >= 0)));
  expect(first).toEqual([...first].sort((p, q) => p - q));
  return `ok: ${first.length} non-import cells`;
})
)};
const _cmt12 = function _test_cellmap_contract_named_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v, appName}) => {
  const [cell] = cellOf(v.n);
  expect({name: cell.name, type: cell.type, module: cell.module, variables: cell.variables}).toEqual({name: "n", type: "simple", module: appName, variables: [v.n]});
  expect(cell.lang).toContain("ojs");
  return "ok";
})
)};
const _cmt13 = function _test_cellmap_contract_anonymous_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.anon);
  expect(cell.type).toBe("simple");
  expect(cell.variables).toEqual([v.anon]);
  // command-palette skips a cell whose name is falsy unless it is an import
  expect(typeof cell.name === "string" && cell.name !== "").toBe(false);
  return `ok: name ${JSON.stringify(cell.name)}`;
})
)};
const _cmt14 = function _test_cellmap_contract_viewof_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.viewof);
  expect({name: cell.name, type: cell.type, variables: cell.variables}).toEqual({name: "viewof x", type: "viewof", variables: [v.viewof, v.x]});
  return "ok";
})
)};
const _cmt15 = function _test_cellmap_contract_mutable_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.mutable);
  // visualizer renders variables[2] of a mutable: the live value, not the seed
  expect({name: cell.name, type: cell.type, variables: cell.variables}).toEqual({name: "mutable m", type: "mutable", variables: [v.initial, v.mutable, v.m]});
  return "ok";
})
)};
const _cmt16 = function _test_cellmap_contract_import_cells(cellMapFixture,expect) {return (
cellMapFixture(({cells, cellOf, v, libName}) => {
  const importCells = [...new Set([v.a, v.b, v.c].flatMap(cellOf))];
  expect(importCells.map((c) => c.type)).toEqual(importCells.map(() => "import"));
  expect(importCells.map((c) => c.module_name)).toEqual(importCells.map(() => libName));
  const specifiers = importCells.flatMap((c) => c.importInfo?.type === "import" ? c.importInfo.specifiers : []);
  const pairs = specifiers.map((s) => `${s.imported} as ${s.local}`).sort();
  expect(pairs).toEqual(["a as a", "b as b", "x as c"]);
  // visualizer renders `from "${importInfo.from}"`; v1 (decompileImport) gives the module name, not the loader URL
  expect(importCells.map((c) => c.importInfo?.from)).toEqual(importCells.map(() => libName));
  expect(cellOf(v.module).length).toBe(1);
  expect(cellOf(v.module)[0].type).toBe("import");
  return `ok: ${importCells.length} import cell(s)`;
})
)};
const _cmt18 = function _test_cellmap_contract_named_cell_calling_a_loader_is_not_an_import(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  // visualizer renders an import cell as a header, so a misread cell disappears from the page
  const [cell] = cellOf(v.quoter);
  expect({name: cell.name, type: cell.type, variables: cell.variables}).toEqual({name: "loaderQuoter", type: "simple", variables: [v.quoter]});
  return "ok";
})
)};
const _cmt19 = function _test_cellmap_contract_a_resolved_global_does_not_hide_a_cell(cellMapFixture,cellMap,runtime,expect) {return (
cellMapFixture(async ({app, v, modules}) => {
  // cellMap() with no arguments maps every runtime variable, implicit ones included
  const all = [...runtime._variables].filter((x) => x._module === app);
  expect(all.some((x) => x._name === "toolbar" && x !== v.toolbar)).toBe(true);
  const cells = (await cellMap(all, modules)).get(app) ?? [];
  expect(cells.filter((c) => c.variables.includes(v.toolbar)).map((c) => c.name)).toEqual(["toolbar"]);
  return "ok";
})
)};
const _cmt1a = function _test_cellmap_contract_import_from_a_module_value(cellMapFixture,createModule,deleteModule,runtime,cellMap,expect) {return (
cellMapFixture(async ({lib, libName, modules}) => {
  // dataflow-templating and the visualizer tests bind `module X` to a value, with no loader body;
  // visualizer still has to render one import header for it (found by T3 during merge B, 2026-09-14)
  const name = `${libName}-value-importer`;
  const m = createModule(name, runtime);
  try {
    const mv = m.variable(true).define(`module ${libName}`, [], () => lib);
    const k = m.variable(true).define("k", [`module ${libName}`, "@variable"], (_, v) => v.import("a", "k", _));
    expect(await m.value("k")).toBe(1);
    const mods = new Map(modules).set(m, {name, module: m});
    const cells = (await cellMap([...runtime._variables].filter((x) => x._module === m && x._type === 1), mods)).get(m) ?? [];
    const holding = cells.filter((c) => c.variables.includes(mv) || c.variables.includes(k));
    expect(holding.map((c) => c.type)).toEqual(["import"]);
    expect(holding[0].variables.includes(mv) && holding[0].variables.includes(k)).toBe(true);
    expect(holding[0].importInfo.specifiers.map((s) => `${s.imported} as ${s.local}`)).toEqual(["a as k"]);
    // visualizer writes module_name into the header's data-module-name
    expect(holding[0].module_name).toBe(libName);
    return "ok";
  } finally {
    deleteModule(name, runtime);
  }
})
)};
const _cmt24 = function _test_cellmap_shape_import_from_a_module_value_names_its_module(cellMapFixture,createModule,deleteModule,runtime,cellMap,expect) {return (
cellMapFixture(async ({lib, libName, modules}) => {
  // what visualizer prints after `from` when `module X` is bound to a value: v1 has no loader to read and says <unknown …>
  const name = `${libName}-value-named`;
  const m = createModule(name, runtime);
  try {
    m.variable(true).define(`module ${libName}`, [], () => lib);
    const k = m.variable(true).define("k", [`module ${libName}`, "@variable"], (_, v) => v.import("a", "k", _));
    await m.value("k");
    const mods = new Map(modules).set(m, {name, module: m});
    const cells = (await cellMap([...runtime._variables].filter((x) => x._module === m && x._type === 1), mods)).get(m) ?? [];
    const from = String(cells.find((c) => c.variables.includes(k))?.importInfo?.from);
    expect(from.startsWith("<unknown")).toBe(true);
    return from;
  } finally {
    deleteModule(name, runtime);
  }
})
)};
const _cmt1b = function _test_cellmap_shape_import_cell_before_its_imports_resolve(cellMapFixture,createModule,deleteModule,runtime,cellMap,expect) {return (
cellMapFixture(async ({lib, libName, modules}) => {
  // until an import variable is computed its inputs are [module X, @variable] in its own module; a live map
  // taken then (visualizer's liveCellMap is not recomputed when the runtime rewrites those inputs) renders it
  // as a cell of its own. v1 maps each such variable to a simple cell, and passes T3 only because its async
  // cellMap lands after the imports resolve (found by T3 during merge B, 2026-09-14)
  const name = `${libName}-unresolved`;
  const m = createModule(name, runtime);
  try {
    const mv = m.variable().define(`module ${libName}`, [], () => lib);
    const k = m.variable().define("k", [`module ${libName}`, "@variable"], (_, v) => v.import("a", "k", _));
    const j = m.variable().define("j", [`module ${libName}`, "@variable"], (_, v) => v.import("b", _));
    expect(k._inputs.map((i) => i._name)).toEqual([`module ${libName}`, "@variable"]);
    const mods = new Map(modules).set(m, {name, module: m});
    const cells = (await cellMap([...runtime._variables].filter((x) => x._module === m), mods)).get(m) ?? [];
    const holding = cells.filter((c) => [mv, k, j].some((x) => c.variables.includes(x)));
    expect(holding.map((c) => c.type)).toEqual(["simple", "simple"]);
    return "ok";
  } finally {
    deleteModule(name, runtime);
  }
})
)};
const _cmt17 = function _test_cellmap_contract_first_variable_has_a_definition(cellMapFixture,expect) {return (
cellMapFixture(({cells}) => {
  // command-palette indexes variables[0]._definition as the cell's source
  expect(cells.filter((c) => typeof c.variables?.[0]?._definition !== "function").map((c) => c.name)).toEqual([]);
  return "ok";
})
)};
const _cmt20 = function _test_cellmap_shape_imports_from_one_module_are_one_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const importCells = new Set([v.module, v.a, v.b, v.c].flatMap(cellOf));
  expect(importCells.size).toBe(1);
  return "ok";
})
)};
const _cmt21 = function _test_cellmap_shape_anonymous_cell_lang(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  expect(cellOf(v.anon)[0].lang).toEqual(["ojs"]);
  return "ok";
})
)};
const _cmt22 = function _test_cellmap_shape_import_cell_variables(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.a);
  expect(cell.variables.map((x) => x._name)).toEqual(["a", "b", "c", v.module._name]);
  return "ok";
})
)};
const _cmt23 = function _test_cellmap_shape_import_cell_sorts_by_its_first_import(cellMapFixture,expect) {return (
cellMapFixture(({cells, cellOf, v}) => {
  // the fixture defines the module variable first and the imports last
  expect(cells.at(-1)).toBe(cellOf(v.a)[0]);
  return "ok";
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_cmt00", null, ["md"], _cmt00);
  $def("_cmt01", "cellMapFixture", ["createModule","deleteModule","runtime","realize","currentModules","cellMap"], _cmt01);
  $def("_cmt10", "test_cellmap_contract_every_variable_in_exactly_one_cell", ["cellMapFixture","expect"], _cmt10);
  $def("_cmt11", "test_cellmap_contract_cells_follow_runtime_order", ["cellMapFixture","expect"], _cmt11);
  $def("_cmt12", "test_cellmap_contract_named_cell", ["cellMapFixture","expect"], _cmt12);
  $def("_cmt13", "test_cellmap_contract_anonymous_cell", ["cellMapFixture","expect"], _cmt13);
  $def("_cmt14", "test_cellmap_contract_viewof_cell", ["cellMapFixture","expect"], _cmt14);
  $def("_cmt15", "test_cellmap_contract_mutable_cell", ["cellMapFixture","expect"], _cmt15);
  $def("_cmt16", "test_cellmap_contract_import_cells", ["cellMapFixture","expect"], _cmt16);
  $def("_cmt18", "test_cellmap_contract_named_cell_calling_a_loader_is_not_an_import", ["cellMapFixture","expect"], _cmt18);
  $def("_cmt19", "test_cellmap_contract_a_resolved_global_does_not_hide_a_cell", ["cellMapFixture","cellMap","runtime","expect"], _cmt19);
  $def("_cmt1a", "test_cellmap_contract_import_from_a_module_value", ["cellMapFixture","createModule","deleteModule","runtime","cellMap","expect"], _cmt1a);
  $def("_cmt1b", "test_cellmap_shape_import_cell_before_its_imports_resolve", ["cellMapFixture","createModule","deleteModule","runtime","cellMap","expect"], _cmt1b);
  $def("_cmt17", "test_cellmap_contract_first_variable_has_a_definition", ["cellMapFixture","expect"], _cmt17);
  $def("_cmt20", "test_cellmap_shape_imports_from_one_module_are_one_cell", ["cellMapFixture","expect"], _cmt20);
  $def("_cmt21", "test_cellmap_shape_anonymous_cell_lang", ["cellMapFixture","expect"], _cmt21);
  $def("_cmt22", "test_cellmap_shape_import_cell_variables", ["cellMapFixture","expect"], _cmt22);
  $def("_cmt23", "test_cellmap_shape_import_cell_sorts_by_its_first_import", ["cellMapFixture","expect"], _cmt23);
  $def("_cmt24", "test_cellmap_shape_import_from_a_module_value_names_its_module", ["cellMapFixture","createModule","deleteModule","runtime","cellMap","expect"], _cmt24);
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}
