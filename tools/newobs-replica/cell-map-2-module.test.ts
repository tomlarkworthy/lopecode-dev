// Regression suite for the REAL module, modules/@tomlarkworthy/cell-map-2.js.
//
// cell-map-2-core.test.ts pins the scratch prototype; this one loads the notebook module's own cells
// into a headless runtime (CLAUDE.md rule 17 — import the canonical code, never copy it) and asserts
// the same measured numbers, so the shipped module is what is measured.
//
// run: bun test tools/newobs-replica/cell-map-2-module.test.ts
import { expect, test, beforeAll } from "bun:test";
import { importNotebookModule } from "../notebook-import.ts";

let groupCells: any;
let defInfo: any;

beforeAll(async () => {
  const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  groupCells = await m.value("groupCells");
  defInfo = await m.value("defInfo");
});

// Adapter from the recorded dumps to the module's accessor contract. `builtin` is a flag here
// because a live variable knows its runtime's builtin module by identity, which a dump cannot.
const dumpAccessors = {
  name: (v: any) => v.name,
  type: (v: any) => v.type,
  def: (v: any) => v.def ?? "",
  module: (v: any) => v.mod,
  inputs: (v: any) =>
    (v.inputs ?? []).map((i: string) => {
      // Anchored to the ids the capture script emits. Splitting on the last `@` instead misreads the
      // import loader `module @tomlarkworthy/dependancy` as living in a foreign module.
      const m = String(i).match(/^(.*)@(builtin|M\d+|other)$/);
      return m
        ? { name: m[1], module: m[2], builtin: m[2] === "builtin" }
        : { name: String(i), module: v.mod, builtin: false };
    })
};

const load = async (p: string) => {
  const d = await Bun.file(p).json();
  if (d.error || d.evalError) throw new Error(`dump unusable: ${d.error ?? d.evalError}`);
  return groupCells(d.vars.filter((v: any) => v.mod !== "builtin"), dumpAccessors);
};

test("liveCellMap depends on runtime_variables, so it recomputes on cell add/redefine/delete", async () => {
  // currentModules re-yields only when a MODULE appears or goes. Without runtime_variables the map
  // silently went stale on every cell edit (browser probe 2026-09-12: 0 recomputes on add, redefine,
  // delete). This pins the dependency; the recompute itself needs a browser, see
  // tools/scratch/probe-live-cell-map.mjs.
  const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const live = [...(m.runtime as any)._variables].find(
    (v: any) => v._module === m.module && v._name === "liveCellMap"
  );
  expect(live).toBeDefined();
  const inputs = live._inputs.map((i: any) => i._name);
  expect(inputs).toContain("currentModules");
  expect(inputs).toContain("runtime_variables");
  m.dispose();
});

const namedOf = (cells: any[]) =>
  new Set(
    cells
      .filter((c) => typeof c.name === "string" && !/^cell \d+$/.test(c.name))
      .map((c) => c.name.replace(/\$/g, " "))
  );

const docNames = async (p: string) => {
  const doc = await Bun.file(p).json();
  const names = new Set<string>();
  for (const n of doc.nodes) {
    if (n.mode === "md" || n.mode === "html") continue;
    const m = String(n.value).match(/^\s*(viewof\s+[\w$]+|mutable\s+[\w$]+|[A-Za-z_$][\w$]*)\s*=/);
    if (m && !/^import\b/.test(String(n.value).trim())) names.add(m[1].replace(/\$/g, " "));
  }
  return { names, nodes: doc.nodes.length };
};

test("exporter-3: the shipped module recovers 104 cells, names matching exactly", async () => {
  const map = await load("tools/newobs-replica/out-e3/eval.json");
  const cells = map.get("M1");
  const doc = await docNames("tools/newobs-fixtures/documents/@tomlarkworthy/exporter-3.json");

  expect(cells.length).toBe(104);
  expect(cells.length).toBe(doc.nodes);
  expect([...namedOf(cells)].sort()).toEqual([...doc.names].sort());
  // `unresolved` rides on the returned array, not a `<module>:unresolved` key: on a live runtime the
  // key would be a Module object and every module would stringify onto one colliding key.
  for (const [, c] of map) expect((c as any).unresolved).toBeUndefined();

  const holders = cells.filter((c: any) => typeof c.name === "string" && /^cell \d+$/.test(c.name));
  expect(holders.length).toBe(13);
  expect(holders.every((c: any) => c.type === "import")).toBe(true);
});

test("notebook-kit-semantics: 20 cells viewed, 4 imported", async () => {
  const map = await load("tools/newobs-replica/out-nk/eval.json");
  const doc = await docNames("tools/newobs-fixtures/documents/@tomlarkworthy/notebook-kit-semantics.json");
  expect(map.get("M1").length).toBe(20);
  expect(map.get("M1").length).toBe(doc.nodes);
  expect([...namedOf(map.get("M1"))].sort()).toEqual([...doc.names].sort());
  expect(map.get("M2").length).toBe(4);
});

test("the cell-map defect is fixed: three imports of one module stay three cells", async () => {
  const map = await load("tools/newobs-replica/out-nk/eval.json");
  const imports = map.get("M1").filter((c: any) => c.type === "import");
  expect(imports.length).toBe(3);

  const members = imports.map((c: any) => new Set(c.variables.map((v: any) => v.name)));
  expect(members.some((s: Set<string>) => s.has("dep") && !s.has("dep2"))).toBe(true);
  expect(members.some((s: Set<string>) => s.has("dep2") && s.has("viewdep"))).toBe(true);
  expect(members.some((s: Set<string>) => s.has("mutabledep"))).toBe(true);
  const all = members.flatMap((s: Set<string>) => [...s]);
  expect(all.length).toBe(new Set(all).size);
});

test("multi-output holders group with their projections, and are marked js", async () => {
  const map = await load("tools/newobs-replica/out-nk/eval.json");
  const cellOf = (n: string) => map.get("M1").find((c: any) => c.variables.some((v: any) => v.name === n));

  expect(cellOf("a")).toBe(cellOf("b"));
  expect(cellOf("a").type).toBe("multi");
  expect(cellOf("a").lang).toEqual(["js"]);
  expect(cellOf("one")).toBe(cellOf("three"));
  expect(cellOf("usesProjections")).not.toBe(cellOf("a"));
  // an ojs cell must not be mislabelled as 2.0
  expect(cellOf("qplus").lang).toEqual(["ojs"]);
});

test("a lone `cell N` body is an anonymous cell, so either language emits it", async () => {
  // out-e3 names 158 anonymous cells `cell N` (155 are `function(md){return(md\`…\`)}`). They read
  // ["js"] before 2026-09-13, from the holder name alone.
  const map = await load("tools/newobs-replica/out-e3/eval.json");
  const lone = [...map.values()]
    .flat()
    .filter((c: any) => c.variables.length === 1 && /^cell \d+$/.test(String(c.variables[0].name)));
  const simple = lone.filter((c: any) => c.type === "simple");
  expect(simple.length).toBe(158);
  for (const c of simple) expect(c.lang).toEqual(["ojs", "js"]);
});

test("mutable groups expose the mutable variable as head, not the initial", async () => {
  const map = await load("tools/newobs-replica/out-nk/eval.json");
  const mut = map.get("M1").find((c: any) => c.type === "mutable");
  expect(mut).toBeDefined();
  expect(String(mut.head.name)).toMatch(/^mutable[$ ]/);
});

test("defInfo classifies text definitions, not just functions", () => {
  // The dump path feeds strings. Returning an empty classification for them would make every
  // definition look like a cell body and silently invent cells.
  expect(
    defInfo('async () => runtime.module((await importShim("/@tomlarkworthy/tests.js?v=4")).default)').importCell
  ).toBe(true);
  expect(defInfo("function(md){return md`hi`}").importCell).toBe(false);
  expect(defInfo(undefined).importCell).toBe(false);

  const fn = (exports: any) => exports["a"];
  expect(defInfo(fn)).toBe(defInfo(fn)); // memoised per function object
});

test("a compiled module's alias variables are not import cells", async () => {
  // Neither recorded corpus can catch this: both are live post-run captures, where an import alias
  // has already been rewired to an identity function. Every EXPORTED module boots in the compiled
  // form instead, where an alias reads `(_, v) => v.import("runtime", _)` — text that contains
  // `.import(` just as a real import cell does. Counting those produced 4 spurious single-variable
  // import cells in this very module before the arity exclusion was added.
  const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const gc = await m.value("groupCells");
  const acc = await m.value("runtimeAccessors");
  const di = await m.value("defInfo");
  const vars = [...(m.runtime as any)._variables].filter((v: any) => v._module === m.module);
  const cells = gc(vars, acc).get(m.module) ?? [];

  for (const name of ["runtime", "thisModule", "currentModules", "tests"]) {
    const v = vars.find((x: any) => x._name === name);
    expect(v).toBeDefined();
    expect(di(v._definition).importCell).toBe(false);
    const cell = cells.find((c: any) => c.variables.includes(v));
    expect(cell?.type).not.toBe("import");
  }
  m.dispose();
});

test("roles come from name, type and inputs, so no definition spelling can move a variable", async () => {
  // Replaced GLUE, six regexes over definition text. Every text rule tracked one compiler's spelling
  // and missed another's: the quoted projection subscript (compile.js:35), `(_) => _.linkTo` off an
  // unrun import holder (33 variables in out-e3 grouped as their own cells), minified classic
  // `function Na(e,t){return new e(t)}` (splitting `mutable q` in runtime-dump-classic), and
  // `() => 42` read as glue. Roles are asserted here with the definition deliberately absent.
  const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const roleOf = await m.value("roleOf");
  m.dispose();
  const vars: Record<string, any> = {};
  const def = (name: string | null, type: number, inputs: [string, string?][]) =>
    (vars[name ?? `anon${Object.keys(vars).length}`] = {
      name,
      type,
      inputs: inputs.map(([n, mod]) => ({ name: n, module: mod ?? "M", builtin: mod === "builtin" }))
    });
  const a = {
    name: (v: any) => v.name,
    type: (v: any) => v.type,
    module: () => "M",
    inputs: (v: any) => v.inputs
  };
  const role = (n: string) => roleOf(vars[n], a, (x: string) => vars[x]);

  // notebook-kit, define.ts
  def("cell 3", 1, [["Inputs"]]);
  def("a", 1, [["cell 3"]]);
  def("viewof$v", 1, [["Inputs"]]);
  def("v", 1, [["viewof$v"]]);
  def("mutable m", 1, [["Mutable", "builtin"]]);
  def("cell 4", 1, [["mutable m"]]);
  def("m", 1, [["cell 4"]]);
  def("mutable$m", 1, [["cell 4"]]);
  def(null, 2, [["counter"]]);
  // classic compiled
  def("viewof w", 1, [["Inputs"]]);
  def("w", 1, [["Generators", "builtin"], ["viewof w"]]);
  def("initial q", 1, []);
  def("mutable q", 1, [["Mutable", "builtin"], ["initial q"]]);
  def("q", 1, [["mutable q"]]);
  // runtime
  def("md", 2, [["md", "builtin"]]);
  def("FileAttachment", 2, []);
  def("dep", 1, [["dep", "M2"]]);
  // bodies
  def("k", 1, []);
  def("y", 1, [["a"], ["v"], ["m"]]);

  expect(role("cell 3")).toBe("body");
  expect(role("a")).toBe("projection");
  expect(role("viewof$v")).toBe("body");
  expect(role("v")).toBe("view-input");
  expect(role("mutable m")).toBe("body");
  expect(role("cell 4")).toBe("mutator");
  expect(role("m")).toBe("mutable-getter");
  expect(role("mutable$m")).toBe("mutable-accessor");
  expect(role("anon8")).toBe("shadow");
  expect(role("w")).toBe("view-getter");
  expect(role("initial q")).toBe("body");
  expect(role("mutable q")).toBe("mutator");
  expect(role("q")).toBe("mutable-getter");
  expect(role("md")).toBe("builtin");
  expect(role("FileAttachment")).toBe("constant");
  expect(role("dep")).toBe("import-alias");
  expect(role("k")).toBe("body");
  expect(role("y")).toBe("body");
  // without a lookup the holder cannot be read, so a live getter degrades to projection, not body
  expect(roleOf(vars["m"], a)).toBe("projection");
});

test("a real compiled loader is an import cell; a bare module construction is not", () => {
  // Verbatim from a loader in the paired page. The earlier sample here was invented and contained
  // no `import(` at all, so requiring both markers correctly rejected it — the sample was the bug.
  const real =
    'async () => runtime.module((await importShim("/@tomlarkworthy/tests.js?v=4", \'file:///x.html\')).default)';
  expect(defInfo(real).importCell).toBe(true);
  expect(defInfo("function _main(runtime){return(runtime.module())}").importCell).toBe(false);
  expect(defInfo('(_, v) => v.import("runtime", _)').importCell).toBe(false);
});

test("a cell that merely QUOTES import source is not an import cell", () => {
  // Found by probe-import-info.ts, not by any suite. This module's own test cells embed sample import
  // bodies as string literals, and text-matched markers classified 2 of them as import cells — 5
  // imports in a module with 3 loaders. Neither recorded corpus contains a cell that quotes import
  // source, so neither could fail. Markers now run against source with string literals blanked.
  const quoting =
    'function test_x(defInfo){ const real = \'async () => runtime.module((await importShim("/@tomlarkworthy/tests.js?v=4")).default)\'; return defInfo(real); }';
  expect(defInfo(quoting).importCell).toBe(false);
  const enumQuoting =
    'function test_y(defInfo){ const body = \'async (m) => { outputs.get("dep2")?.import("dep", "dep2", m); }\'; return defInfo(body); }';
  expect(defInfo(enumQuoting).importCell).toBe(false);
  // the same text AS the definition still classifies — blanking must not cost a true positive
  expect(
    defInfo(
      'async () => runtime.module((await importShim("/@tomlarkworthy/tests.js?v=4", \'file:///x.html\')).default)'
    ).importCell
  ).toBe(true);
});

test("importInfo carries the specifier and the alias mapping, both corpora", async () => {
  const e3 = await load("tools/newobs-replica/out-e3/eval.json");
  const e3imports = e3.get("M1").filter((c: any) => c.type === "import");
  expect(e3imports.length).toBe(13);
  for (const c of e3imports) {
    expect(c.importInfo.type).toBe("import");
    expect(c.importInfo.specifier).not.toBeNull();
    expect(c.importInfo.specifiers.length).toBeGreaterThan(0);
  }
  // a genuine alias: the remote cell is `source_gz`, bound locally as `runtime_gz`
  const v6 = e3imports.find(
    (c: any) => c.importInfo.notebook === "@tomlarkworthy/observable-runtime-v6"
  );
  expect(v6.importInfo.specifiers).toContainEqual({ imported: "source_gz", local: "runtime_gz" });

  const nk = await load("tools/newobs-replica/out-nk/eval.json");
  const nkImports = nk.get("M1").filter((c: any) => c.type === "import");
  expect(nkImports.length).toBe(3);
  for (const c of nkImports) expect(c.importInfo.notebook).toBe("@tomlarkworthy/dependancy");
  const aliased = nkImports.find((c: any) =>
    c.importInfo.specifiers.some((s: any) => s.local === "dep2")
  );
  expect(aliased.importInfo.specifiers).toContainEqual({ imported: "dep", local: "dep2" });
  // the spaced-remote / $-local asymmetry define.ts creates, carried end to end
  expect(aliased.importInfo.specifiers).toContainEqual({
    imported: "viewof viewdep",
    local: "viewof$viewdep"
  });
});

test("importInfo appears only on import cells", async () => {
  for (const p of ["tools/newobs-replica/out-e3/eval.json", "tools/newobs-replica/out-nk/eval.json"]) {
    const map = await load(p);
    for (const [, cells] of map)
      for (const c of cells as any[]) if (c.type !== "import") expect(c.importInfo).toBeNull();
  }
});

test("a COMPILED module's imports take their symbols from the alias variables", async () => {
  // The shape neither dump contains. A compiled loader carries no `outputs.get(…)?.import(…)`
  // enumeration, and each symbol is its own `(_, v) => v.import("remote", _)` variable which is not
  // glue and has no foreign input — so it never joins the loader's group and the enumeration path
  // finds nothing. The mapping is read WITHOUT merging: merging would retype those cells `import`
  // and move the grouping counts that 104/20/4 pin.
  const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const gc = await m.value("groupCells");
  const acc = await m.value("runtimeAccessors");
  const vars = [...(m.runtime as any)._variables].filter((v: any) => v._module === m.module);
  const cells = gc(vars, acc).get(m.module) ?? [];
  const imports = cells.filter((c: any) => c.type === "import");
  // three loaders — and no test cell misclassified by quoted source
  expect(imports.length).toBe(3);
  const sdk = imports.find((c: any) => c.importInfo.notebook === "@tomlarkworthy/runtime-sdk");
  expect(sdk).toBeDefined();
  expect(sdk.importInfo.specifiers).toContainEqual({ imported: "runtime", local: "runtime" });
  expect(sdk.importInfo.specifiers).toContainEqual({ imported: "thisModule", local: "thisModule" });
  for (const n of ["runtime", "thisModule", "currentModules", "tests"]) {
    expect(cells.find((c: any) => String(c.name) === n)?.type).toBe("simple");
  }
  m.dispose();
});

test("the specifier normaliser covers the 2.0 form v1 returns null for", () => {
  const nb = (s: string) => defInfo(`import(${JSON.stringify(s)})`).notebook;
  expect(nb("/@tomlarkworthy/tests.js?v=4")).toBe("@tomlarkworthy/tests");
  expect(nb("https://api.observablehq.com/@tomlarkworthy/dependancy.js?v=4")).toBe(
    "@tomlarkworthy/dependancy"
  );
  // cell-map v1's extractObservableNotebookNameFromSpecifier requires a `.js` suffix, so these — the
  // live notebook-kit shape — resolve to null there and leave every 2.0 import unnamed.
  expect(nb("/api/import/@tomlarkworthy/dependancy")).toBe("@tomlarkworthy/dependancy");
  expect(nb("/api/import/@tomlarkworthy/dependancy@20")).toBe("@tomlarkworthy/dependancy@20");
  expect(nb("/d/57d79353bac56631@44.js?v=4")).toBe("d/57d79353bac56631@44");
  // a bare npm specifier names no notebook; null is correct, not a miss
  expect(nb("npm:d3")).toBeNull();
});

test("importLocals via defInfo prefers the specifier enumeration over destructuring", () => {
  // The enumeration alone must identify an import cell: `locals` is read from it, so a body carrying
  // it is an import cell even without the `_runtime.module(` marker a particular compiler adds.
  const body = `async (module) => { const {dep2} = x; outputs.get("dep2")?.import("dep", "dep2", module);
    outputs.get("viewof$viewdep")?.import("viewof$viewdep", "viewof$viewdep", module); }`;
  expect(defInfo(body).locals).toEqual(["dep2", "viewof$viewdep"]);
  expect(defInfo(body).importCell).toBe(true);
});
