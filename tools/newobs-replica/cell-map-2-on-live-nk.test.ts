// cell-map-2 inverting REAL Notebook Kit variables — the two modules pointed at each other.
//
// Every previous test of the grouping used a recorded dump: a JSON capture of a runtime that had
// already run. This one builds the fixture with notebook-kit 2.5.6's own `define` and then runs
// cell-map-2's `groupCells` over the resulting live variables through `runtimeAccessors`. Nothing is
// replayed, and it is the headless form of the multi-home notebook: both modules, one runtime.
//
// The thesis under test: 14 authored document nodes become 34 runtime variables, and the grouping
// inverts that back to 14 cells with no dialect branching.
//
// run: bun test tools/newobs-replica/cell-map-2-on-live-nk.test.ts
import { expect, test, beforeAll, afterAll } from "bun:test";
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { importNotebookModule } from "../notebook-import.ts";
import { transpileJavaScript } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../vendor/notebook-kit/src/javascript/observable.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";

const kit = { transpileJavaScript, transpileObservable, define };

const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"]) {
  (globalThis as any)[k] = (window as any)[k];
}
(globalThis as any).document = window.document;

// Expected and unrelated to grouping: no importmap headlessly, and no builtins in the fixture runtime.
process.on("unhandledRejection", () => {});

let cells: any[];
let nkDoc: any[];
let nk: any;
let cm: any;

beforeAll(async () => {
  // Stand-in for realize's FALLBACK branch only — runtime-sdk cannot load without an importmap, and
  // this is not evidence that the module-shim path works; that is proven differentially in a real
  // page by tools/newobs-replica/realize-shim-page.mjs.
  const realizeFallback = async (sources: string[]) =>
    sources.map((src) => {
      let f: any;
      eval("f = " + src);
      return f;
    });
  nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
    overrides: { kit, Runtime, realize: realizeFallback, runtime: { _global: () => undefined } }
  });
  cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");

  const groupCells = await cm.value("groupCells");
  const runtimeAccessors = await cm.value("runtimeAccessors");
  const fixture = await nk.value("nkFixture");
  nkDoc = await nk.value("nkFixtureDoc");

  const vars = [...fixture.module._runtime._variables].filter(
    (v: any) => v._module === fixture.module
  );
  cells = groupCells(vars, runtimeAccessors).get(fixture.module);
});

afterAll(() => {
  nk?.dispose();
  cm?.dispose();
});

test("34 live Notebook Kit variables invert to the 14 authored cells", () => {
  expect(nkDoc.length).toBe(14);
  expect(cells.length).toBe(14);
  expect((cells as any).unresolved).toBeUndefined();
});

test("multi-output cells group their holder with every projection", () => {
  const cellOf = (n: string) =>
    cells.find((c) => c.variables.some((v: any) => String(v._name) === n));
  // `const a = 1, b = 2` -> one cell, not three
  expect(cellOf("a")).toBe(cellOf("b"));
  expect(cellOf("a")).toBe(cellOf("cell 11"));
  expect(cellOf("a").type).toBe("multi");
  expect(cellOf("a").lang).toEqual(["js"]);
  // `const one = 1, two = 2, three = 3` -> one cell with all three
  expect(cellOf("one")).toBe(cellOf("three"));
  // an ojs cell must not be mislabelled 2.0
  expect(cellOf("qplus").lang).toEqual(["ojs"]);
  expect(cellOf("usesProjections")).not.toBe(cellOf("a"));
});

test("viewof and mutable collapse to one cell each, whichever spelling", () => {
  const cellOf = (n: string) =>
    cells.find((c) => c.variables.some((v: any) => String(v._name) === n));
  // viewof$view + view -> one viewof cell
  expect(cellOf("view")).toBe(cellOf("viewof$view"));
  expect(cellOf("view").type).toBe("viewof");
  // the automutable's four variables -> one mutable cell, with both spellings inside it
  const mut = cellOf("mutable$q");
  expect(cellOf("q")).toBe(mut);
  expect(cellOf("mutable q")).toBe(mut);
  expect(cellOf("cell 23")).toBe(mut);
  expect(mut.type).toBe("mutable");
});

test("three imports of one module stay three distinct cells, sharing no variable", () => {
  const imports = cells.filter((c) => c.type === "import");
  expect(imports.length).toBe(3);
  const seen = new Set();
  for (const c of imports) {
    for (const v of c.variables) {
      expect(seen.has(v)).toBe(false);
      seen.add(v);
    }
  }
  // each import cell keeps its own symbols
  const symbolsOf = (holder: string) => {
    const c = imports.find((x) => x.variables.some((v: any) => String(v._name) === holder));
    return new Set(c.variables.map((v: any) => String(v._name)));
  };
  expect(symbolsOf("cell 41").has("dep")).toBe(true);
  expect(symbolsOf("cell 41").has("dep2")).toBe(false);
  expect(symbolsOf("cell 42").has("dep2")).toBe(true);
  expect(symbolsOf("cell 42").has("viewof$viewdep")).toBe(true);
  expect(symbolsOf("cell 43").has("mutabledep")).toBe(true);
});

test("what identifies a 2.0 import cell: enumeration and loaderForm, never legacyImport", async () => {
  // Measured against the bodies transpileObservable actually emits, which no recorded corpus
  // contains. `outputs.get("dep")?.import(...)` defeats /\w\.import\(/ because the character before
  // `.import(` is `?`, so the legacy marker is false on every 2.0 import; the enumeration and
  // loaderForm markers each fire on all three. Pinned so a future narrowing of either is caught.
  const defInfo = await cm.value("defInfo");
  const fixture = await nk.value("nkFixture");
  const holders = [...fixture.module._runtime._variables].filter(
    (v: any) => v._module === fixture.module && /^cell 4\d$/.test(String(v._name))
  );
  expect(holders.length).toBe(3);
  for (const h of holders) {
    const src = String((h as any)._definition).replace(/\s+/g, " ");
    expect(/outputs\.get\(.*?\)\s*\?\.import\(/.test(src)).toBe(true); // enumeration
    expect(/_?runtime\.module\(/.test(src) && /\bimport(Shim)?\(/.test(src)).toBe(true); // loaderForm
    expect(/\w\.import\(/.test(src)).toBe(false); // legacyImport does NOT fire
    expect(defInfo((h as any)._definition).importCell).toBe(true);
  }
});

test("the specifier is resolved at transpile time, and lopecode's normalize() maps it back", async () => {
  // transpileObservable bakes an absolute Observable API URL into the body, so lopecode's
  // interception must recognise THAT shape. normalize() from knowledge/lopecode-internal-networking.md
  // reduces it to the embedded <script id> key, which is what makes an offline notebook possible.
  const fixture = await nk.value("nkFixture");
  const holder: any = [...fixture.module._runtime._variables].find(
    (v: any) => v._module === fixture.module && String(v._name) === "cell 41"
  );
  const src = String(holder._definition);
  expect(src).toContain("https://api.observablehq.com/@tomlarkworthy/dependancy.js?v=4");
  const normalize = (url: string) =>
    url
      .replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, "$1")
      .replace(/^(d\/[a-f0-9]{16})@\d+$/, "$1");
  expect(normalize("https://api.observablehq.com/@tomlarkworthy/dependancy.js?v=4")).toBe(
    "@tomlarkworthy/dependancy"
  );
});

test("live import cells carry importInfo, resolved from the loader body alone", () => {
  // cell-map v1 builds importInfo by DECOMPILING through observablejs-toolchain. Every field the
  // visualizer reads is already in the loader body, so this derives it from runtime data only.
  //
  // An earlier version of this comment claimed the symbols here can only come from the loader's
  // enumeration, because headlessly the imports fail. False, and measured false by
  // probe-live-import-branch.ts: what fails is each import's VALUE (ENOENT), not its variables —
  // define.ts creates all six output variables regardless, and they resolve as group members.
  // So this test exercises the MEMBERSHIP path; the enumeration fallback is pinned separately below.
  const imports = cells.filter((c) => c.type === "import");
  expect(imports.length).toBe(3);
  for (const c of imports) {
    expect(c.importInfo.type).toBe("import");
    // transpileObservable bakes the absolute API URL in; the normaliser reduces it to the slug
    expect(c.importInfo.notebook).toBe("@tomlarkworthy/dependancy");
    expect(c.importInfo.specifiers.length).toBeGreaterThan(0);
  }
  const cellOf = (holder: string) =>
    imports.find((c) => c.variables.some((v: any) => String(v._name) === holder));
  // an aliased import keeps BOTH ends: `import {dep as dep2}`
  expect(cellOf("cell 42").importInfo.specifiers).toContainEqual({
    imported: "dep",
    local: "dep2"
  });
  // and the spaced-remote / $-local asymmetry define.ts creates survives into the statement
  expect(cellOf("cell 42").importInfo.specifiers).toContainEqual({
    imported: "viewof viewdep",
    local: "viewof$viewdep"
  });
  expect(cellOf("cell 43").importInfo.specifiers).toContainEqual({
    imported: "mutable mutabledep",
    local: "mutable$mutabledep"
  });
  // a non-import cell must not sprout one
  for (const c of cells) if (c.type !== "import") expect(c.importInfo).toBeNull();

  // Say which path produced the symbols, so a future change that silently swaps them is visible.
  // Every imported symbol variable exists here, so membership carries them.
  for (const holder of ["cell 42", "cell 43"]) {
    const c = cellOf(holder)!;
    const beyondHolder = c.variables.filter((v: any) => String(v._name) !== holder);
    expect(beyondHolder.length).toBeGreaterThan(0);
  }
});

test("the enumeration fallback reconstructs the same symbols with no member variables", async () => {
  // The branch the fixture does NOT exercise: an import whose outputs never materialised. Rather
  // than assume the fixture covers it (it does not — see the test above), read the mapping straight
  // out of the loader body, which is the only source that branch has. Equality with what the
  // membership path produced is the point: the two must not disagree.
  const defInfo = await cm.value("defInfo");
  const imports = cells.filter((c) => c.type === "import");
  for (const c of imports) {
    const ic = c.variables.find((v: any) => defInfo(v._definition).importCell);
    expect(ic).toBeDefined();
    const pairs = defInfo((ic as any)._definition).pairs;
    expect(pairs.length).toBe(c.importInfo.specifiers.length);
    for (const p of pairs) {
      expect(c.importInfo.specifiers).toContainEqual({ imported: p.imported, local: p.local });
    }
  }
});

test("the anonymous expression cell survives as a cell", () => {
  // id 15 (`1 + 1`) has neither output nor outputs, so its variable is unnamed; cell-map numbers it.
  const anon = cells.filter((c) => typeof c.name === "number");
  expect(anon.length).toBe(1);
});

test("type comes from member roles, lang lists every language that emits the shape", () => {
  const cellOf = (n: string) =>
    cells.find((c) => c.variables.some((v: any) => String(v._name) === n));
  // id 15, js `1 + 1`: an unnamed body is what either compiler emits. Read ["ojs"] before 2026-09-13.
  const anon = cells.find((c) => typeof c.name === "number");
  expect([anon.type, anon.lang]).toEqual(["simple", ["ojs", "js"]]);
  // id 21, ojs `x = ""`: a js declaration would emit `cell N` plus a projection, so ojs only
  expect([cellOf("x").type, cellOf("x").lang]).toEqual(["simple", ["ojs"]]);
  // id 23, ojs `mutable q = 6`: its `cell 23` holder read ["js"] before 2026-09-13
  expect([cellOf("q").type, cellOf("q").lang]).toEqual(["mutable", ["ojs"]]);
  // id 13, js `let m = 0`: one projection is still the declaration shape
  expect([cellOf("m").type, cellOf("m").lang]).toEqual(["multi", ["js"]]);
  expect([cellOf("view").type, cellOf("view").lang]).toEqual(["viewof", ["ojs"]]);
});
