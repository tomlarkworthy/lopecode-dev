// What does cell-map-2's new `importInfo` actually contain? Measured, not assumed — assertions get
// written from this output, not from expectation.
//
// Corrected after the first run, which disproved the header I wrote: BOTH dumps show
// `from="/api/import/…"`, so both are notebook-kit-shaped loaders carrying an
// `outputs.get("x")?.import("y", …)` enumeration — the replica compiles everything through
// notebook-kit. Neither corpus contains the COMPILED form (a bare loader, no enumeration, one
// `(_, v) => v.import("remote", _)` variable per symbol), which is what every exported lopecode
// notebook boots as. The third section below is the only place that form is measured.
//
// run: bun tools/newobs-replica/probe-import-info.ts
import { importNotebookModule } from "../notebook-import.ts";

const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
const groupCells = await m.value("groupCells");
const defInfo = await m.value("defInfo");

const dumpAccessors = {
  name: (v: any) => v.name,
  type: (v: any) => v.type,
  def: (v: any) => v.def ?? "",
  module: (v: any) => v.mod,
  inputs: (v: any) =>
    (v.inputs ?? []).map((i: string) => {
      const mm = String(i).match(/^(.*)@(builtin|M\d+|other)$/);
      return mm
        ? { name: mm[1], module: mm[2], builtin: mm[2] === "builtin" }
        : { name: String(i), module: v.mod, builtin: false };
    })
};

const show = async (label: string, path: string, mod: string) => {
  const d = await Bun.file(path).json();
  const map = groupCells(d.vars.filter((v: any) => v.mod !== "builtin"), dumpAccessors);
  const cells = map.get(mod) ?? [];
  const imports = cells.filter((c: any) => c.type === "import");
  console.log(`\n=== ${label}  ${mod}: ${cells.length} cells, ${imports.length} import cells`);
  for (const c of imports.slice(0, 6)) {
    const ii = c.importInfo;
    console.log(
      `  ${String(c.name).padEnd(10)} spec=${JSON.stringify(ii?.specifier)} nb=${JSON.stringify(
        ii?.notebook
      )}`
    );
    console.log(
      `             from=${JSON.stringify(ii?.from)}  specifiers=${JSON.stringify(ii?.specifiers)}`
    );
  }
  // The contract the visualizer enforces: a null/mistyped importInfo renders "invalid importInfo",
  // and a null specifier collapses every header onto one key.
  const bad = imports.filter((c: any) => !c.importInfo || c.importInfo.type !== "import");
  const noSpec = imports.filter((c: any) => c.importInfo && c.importInfo.specifier == null);
  const noSyms = imports.filter((c: any) => (c.importInfo?.specifiers?.length ?? 0) === 0);
  console.log(
    `  RESULT ${label} invalid=${bad.length} nullSpecifier=${noSpec.length} zeroSymbols=${noSyms.length}`
  );
  // Non-import cells must not sprout an importInfo.
  const leaked = cells.filter((c: any) => c.type !== "import" && c.importInfo != null);
  console.log(`  RESULT ${label} importInfoOnNonImport=${leaked.length}`);
};

await show("exporter-3", "tools/newobs-replica/out-e3/eval.json", "M1");
await show("notebook-kit", "tools/newobs-replica/out-nk/eval.json", "M1");

// The specifier normaliser, against every form that reaches it.
console.log("\n=== specifier -> notebook name");
for (const s of [
  "/@tomlarkworthy/tests.js?v=4",
  "https://api.observablehq.com/@tomlarkworthy/dependancy.js?v=4",
  "/api/import/@tomlarkworthy/dependancy",
  "/api/import/@tomlarkworthy/dependancy@20",
  "/d/57d79353bac56631@44.js?v=4",
  "/d/57d79353bac56631.js",
  "npm:d3"
]) {
  console.log(`  ${s.padEnd(58)} -> ${JSON.stringify(defInfo(`import(${JSON.stringify(s)})`).notebook)}`);
}

// The COMPILED form, which neither dump above contains. cell-map-2's own module, loaded by
// notebook-import, boots exactly as an exported lopecode notebook does: a bare loader
// `async () => runtime.module((await import("/@u/x.js?v=4")).default)` with no enumeration, and one
// `(_, v) => v.import("remote", _)` variable per symbol.
{
  const acc = await m.value("runtimeAccessors");
  const vars = [...(m.runtime as any)._variables].filter((v: any) => v._module === m.module);
  const cells = groupCells(vars, acc).get(m.module) ?? [];
  const imports = cells.filter((c: any) => c.type === "import");
  console.log(`\n=== compiled (cell-map-2 itself)  ${cells.length} cells, ${imports.length} imports`);
  for (const c of imports) {
    const ii = c.importInfo;
    console.log(
      `  ${String(c.name).padEnd(36)} nb=${JSON.stringify(ii?.notebook)}`
    );
    console.log(`             specifiers=${JSON.stringify(ii?.specifiers)}`);
  }
  const zero = imports.filter((c: any) => (c.importInfo?.specifiers?.length ?? 0) === 0);
  console.log(`  RESULT compiled imports=${imports.length} zeroSymbols=${zero.length}`);
  // The aliases must STAY their own cells. Merging them into the loader would retype them `import`
  // and move the grouping counts that 104/20/4 pin.
  const aliases = cells.filter((c: any) =>
    ["runtime", "thisModule", "currentModules", "tests"].includes(String(c.name))
  );
  console.log(
    `  RESULT compiled aliasesStillOwnCells=${aliases.length} types=${JSON.stringify(
      aliases.map((c: any) => c.type)
    )}`
  );
}

m.dispose();
