const _cmt00 = function _cmt00(md) {return (md`## Consumer contract tests

Written 2026-09-14, before cell-map-2 is merged into this module (T6 in \`plan/merging-the-notebook-kit-forks.md\`). Each test builds a throwaway module with runtime-sdk's \`createModule\`, in the compiled form an export writes: a named cell, an anonymous cell, a \`viewof\`, a \`mutable\`, and three imports from one library module, one of them aliased. The library is a module block added to the page for the test, and its loader is realized through the page's import hook, so the import variables have the shape a booted notebook gives them. It maps the cells with \`cellMap(variables, modules)\`, then deletes the module, the library's variables and the block.

\`test_cellmap_contract_*\` pin what the importers read: visualizer (\`type\`, \`name\`, \`variables[0]\`, \`variables[2]\` of a mutable, \`module_name\` and \`importInfo\` of an import), editor-5 (\`variables\`, its head and its last variable), command-palette (\`name\`, \`type\`, \`variables[0]._definition\`). A merge has to keep them.

\`test_cellmap_shape_*\` pin what this version does where cell-map-2 is known to differ. Their expected values are this version's; a merge that changes one changes the test with it, as a recorded decision.`);};
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
    const [loader] = await realize([`async () => runtime.module((await import(${JSON.stringify(`/${libName}.js?v=4`)})).default)`], runtime);
    const app = createModule(appName, runtime);
    let lib;
    try {
      const def = (name, inputs, fn) => app.variable(true).define(name, inputs, fn);
      const v = {};
      v.module = def(`module ${libName}`, [], loader);
      v.n = def("n", [], () => 1);
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
      if (values.join() !== "1,5,3,1,2,3") throw new Error(`fixture did not compute: ${values}`);
      lib = await app.value(`module ${libName}`);
      const variables = [...runtime._variables].filter((x) => x._module === app && x._type === 1);
      const modules = new Map([...(currentModules ?? new Map())]);
      modules.set(lib, {name: libName, module: lib});
      modules.set(app, {name: appName, module: app});
      const cells = (await cellMap(variables, modules)).get(app) ?? [];
      const cellOf = (variable) => cells.filter((c) => c.variables?.includes(variable));
      return await fn({cells, cellOf, v, variables, app, lib, appName, libName});
    } finally {
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
  expect(cellOf(v.module).length).toBe(1);
  expect(cellOf(v.module)[0].type).toBe("import");
  return `ok: ${importCells.length} import cell(s)`;
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
  $def("_cmt17", "test_cellmap_contract_first_variable_has_a_definition", ["cellMapFixture","expect"], _cmt17);
  $def("_cmt20", "test_cellmap_shape_imports_from_one_module_are_one_cell", ["cellMapFixture","expect"], _cmt20);
  $def("_cmt21", "test_cellmap_shape_anonymous_cell_lang", ["cellMapFixture","expect"], _cmt21);
  $def("_cmt22", "test_cellmap_shape_import_cell_variables", ["cellMapFixture","expect"], _cmt22);
  $def("_cmt23", "test_cellmap_shape_import_cell_sorts_by_its_first_import", ["cellMapFixture","expect"], _cmt23);
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}
