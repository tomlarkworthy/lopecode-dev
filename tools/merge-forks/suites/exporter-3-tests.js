const _e3t00 = function _e3t00(md) {return (md`## Round-trip tests

Written 2026-09-13, before exporter-4 is merged into this module (T1 in \`plan/merging-the-notebook-kit-forks.md\`). They pin what \`exportModuleJS\` has to preserve: a module exported and loaded into a fresh runtime has the same variables in the same order, with the same names, pids, inputs and definitions, and exporting the loaded copy reproduces the source byte for byte.

\`test_exportModuleJS_round_trip\` builds its fixture in a throwaway \`Runtime\`: a plain cell with a fixed pid, an anonymous cell, a \`viewof\`, a \`mutable\` and an import from a second module. \`test_exportModuleJS_every_page_module_loads\` exports every named module on this page, parses it with acorn, and loads it into a fresh runtime without computing anything.`);};
const _e3t01 = function _exporterRoundTrip(acorn,isModuleVar,isDynamicVar) {
  // the define function's text can also appear inside a cell (this module's own template does), so locate the real export
  const load = (source) => {
    const node = acorn.parse(source, {ecmaVersion: "latest", sourceType: "module"}).body.find(n => n.type === "ExportDefaultDeclaration");
    return new Function(source.slice(0, node.start) + "return " + source.slice(node.declaration.start))();
  };
  const moduleVariables = (runtime, module) => [...runtime._variables].filter(v => v._module === module && (v._type === 1 || isModuleVar(v)) && !isDynamicVar(v));
  // a module variable's definition is its loader, which a test replaces, so only its name is compared
  const fingerprint = (variables) => variables.map(v => ({
    name: v._name ?? null,
    pid: v.pid ?? null,
    inputs: v._inputs.map(i => i._name),
    definition: isModuleVar(v) ? null : String(v._definition)
  }));
  const namesOf = (entries) => () => new Map(entries.map(([module, name]) => [module, {name, module}]));
  return {load, moduleVariables, fingerprint, namesOf};
};
const _e3t02 = function _test_exportModuleJS_round_trip(exporterRoundTrip,Runtime,Generators,Mutable,exportModuleJS,expect) {return (
(async () => {
  const {load, moduleVariables, fingerprint, namesOf} = exporterRoundTrip;
  // Runtime builtins are definitions, not values
  const builtins = {Generators: () => Generators, Mutable: () => Mutable};
  const rt = new Runtime(builtins);
  try {
    const lib = rt.module();
    lib.variable(true).define("x", [], () => 1);
    const app = rt.module();
    app.variable(true).define("module @u/lib", [], () => lib);
    app.variable(true).define("y", ["module @u/lib", "@variable"], (_, v) => v.import("x", "y", _));
    app.variable(true).define("n", [], () => 41).pid = "_e3keep";
    app.variable(true).define(null, ["n"], (n) => n + 1);
    app.variable(true).define("viewof v", [], () => Object.assign(new EventTarget(), {value: 5}));
    app.variable(true).define("v", ["Generators", "viewof v"], (G, _) => G.input(_));
    app.variable(true).define("initial m", [], () => 3);
    app.variable(true).define("mutable m", ["Mutable", "initial m"], (M, _) => new M(_));
    app.variable(true).define("m", ["mutable m"], _ => _.generator);
    expect([await app.value("y"), await app.value("v"), await app.value("m")]).toEqual([1, 5, 3]);

    const {source} = await exportModuleJS("@u/app", {runtime: rt, moduleNamesFn: namesOf([[app, "@u/app"], [lib, "@u/lib"]])});
    expect(source).toContain(`$def("_e3keep", "n", [], _e3keep);`);
    expect(source).toContain(`main.define("y", ["module @u/lib", "@variable"], (_, v) => v.import("x", "y", _));`);

    const rt2 = new Runtime(builtins);
    try {
      const lib2 = rt2.module();
      lib2.variable(true).define("x", [], () => 1);
      const app2 = rt2.module(load(source), () => true);
      app2.redefine("module @u/lib", [], () => lib2);
      expect([await app2.value("y"), await app2.value("v"), await app2.value("m")]).toEqual([1, 5, 3]);
      expect(fingerprint(moduleVariables(rt2, app2))).toEqual(fingerprint(moduleVariables(rt, app)));
      const again = await exportModuleJS("@u/app", {runtime: rt2, moduleNamesFn: namesOf([[app2, "@u/app"], [lib2, "@u/lib"]])});
      expect(again.source).toBe(source);
      return `ok: ${moduleVariables(rt, app).length} variables, ${source.length} bytes, re-export identical`;
    } finally {
      rt2.dispose();
    }
  } finally {
    rt.dispose();
  }
})()
)};
const _e3t03 = function _test_exportModuleJS_lists_file_attachments(Runtime,exportModuleJS,expect) {return (
(async () => {
  const rt = new Runtime();
  try {
    const app = rt.module();
    const files = new Map([["data.csv", {url: "blob:null/none", mimeType: "text/csv"}]]);
    // getFileAttachments reads the map through the builtin alone; a cell calling it with a literal name would read to lope-preflight as a missing attachment of this module
    app.builtin("FileAttachment", (name) => files.get(name));
    const {source, fileAttachments} = await exportModuleJS("@u/files", {runtime: rt, moduleNamesFn: () => new Map([[app, {name: "@u/files", module: app}]])});
    expect([...fileAttachments.keys()]).toEqual(["data.csv"]);
    // spelled without the literal loader-map text, which lope-preflight's attachmentsOf would read as this module's own attachment list
    expect(source).toContain(`const fileAttachments = new Map(${JSON.stringify(["data.csv"])}.map(`);
    expect(source).toContain(`main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));`);
    return "ok";
  } finally {
    rt.dispose();
  }
})()
)};
const _e3t04 = function _test_exportModuleJS_every_page_module_loads(exporterRoundTrip,_runtime,buildModuleNames,exportModuleJS,acorn,isModuleVar,isImportBridged,isLiveImport,restoreCanonicalImports,expect) {return (
(async () => {
  const {load, moduleVariables} = exporterRoundTrip;
  const names = buildModuleNames(_runtime);
  const cells = (runtime, module, restore) => moduleVariables(runtime, module)
    .filter(v => !isModuleVar(v) && !isImportBridged(v) && !isLiveImport(v))
    .map(v => ({name: v._name ?? null, pid: v.pid ?? null, inputs: v._inputs.map(i => i._name), definition: restore(String(v._definition))}));
  const imports = (runtime, module) => moduleVariables(runtime, module).filter(v => isImportBridged(v)).map(v => v._name).sort();
  const seen = new Set(), failures = [];
  let variables = 0;
  for (const [module, {name}] of names) {
    if (["builtin", "main", "unknown"].includes(name) || seen.has(name)) continue;
    seen.add(name);
    const rt2 = new _runtime.constructor();
    // the bootloader adds fileAttachments to the page's runtime instance, not to the class
    if (!rt2.fileAttachments) rt2.fileAttachments = _runtime.fileAttachments;
    try {
      const {source} = await exportModuleJS(name, {runtime: _runtime, moduleNamesFn: () => names});
      acorn.parse(source, {ecmaVersion: "latest", sourceType: "module"});
      const loaded = rt2.module(load(source));
      expect(cells(rt2, loaded, s => s)).toEqual(cells(_runtime, module, restoreCanonicalImports));
      expect(imports(rt2, loaded)).toEqual(imports(_runtime, module));
      variables += moduleVariables(_runtime, module).length;
    } catch (e) {
      failures.push(`${name}: ${String(e?.message ?? e).slice(0, 400)}`);
    } finally {
      rt2.dispose();
    }
  }
  expect(failures).toEqual([]);
  return `ok: ${seen.size} modules, ${variables} variables`;
})()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_e3t00", null, ["md"], _e3t00);
  $def("_e3t01", "exporterRoundTrip", ["acorn","isModuleVar","isDynamicVar"], _e3t01);
  $def("_e3t02", "test_exportModuleJS_round_trip", ["exporterRoundTrip","Runtime","Generators","Mutable","exportModuleJS","expect"], _e3t02);
  $def("_e3t03", "test_exportModuleJS_lists_file_attachments", ["Runtime","exportModuleJS","expect"], _e3t03);
  $def("_e3t04", "test_exportModuleJS_every_page_module_loads", ["exporterRoundTrip","_runtime","buildModuleNames","exportModuleJS","acorn","isModuleVar","isImportBridged","isLiveImport","restoreCanonicalImports","expect"], _e3t04);
  return main;
}
