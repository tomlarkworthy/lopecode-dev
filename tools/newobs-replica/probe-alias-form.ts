// Does the broadened import-cell detector misclassify COMPILED-form alias variables?
//
// The two recorded dumps are live post-run captures, where an import alias has already been rewired
// to an identity function. The compiled lopecode form is different and is what every exported module
// boots as:
//
//   main.define("module @u/n", async () => runtime.module((await import("/@u/n.js?v=4")).default));
//   main.define("runtime", ["module @u/n", "@variable"], (_, v) => v.import("runtime", _));
//
// The alias body contains `v.import(`. Widening the detector from `t\.import\(` (a literal `t`) to
// `\w\.import\(` makes it match, which would turn every alias into its own spurious import cell.
// Neither corpus can see this, so measure it directly on a module that has the form.
//
// run: bun tools/newobs-replica/probe-alias-form.ts
import { importNotebookModule } from "../notebook-import.ts";

const m = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
const groupCells = await m.value("groupCells");
const runtimeAccessors = await m.value("runtimeAccessors");
const defInfo = await m.value("defInfo");

const vars = [...(m.runtime as any)._variables].filter((v: any) => v._module === m.module);
const cells = groupCells(vars, runtimeAccessors).get(m.module) ?? [];

const ALIASES = ["runtime", "thisModule", "currentModules", "tests"];
console.log(`module has ${vars.length} variables -> ${cells.length} cells\n`);

console.log("alias variables, as classified:");
let misclassified = 0;
for (const name of ALIASES) {
  const v = vars.find((x: any) => x._name === name);
  if (!v) { console.log(`  ${name.padEnd(16)} ABSENT`); continue; }
  const info = defInfo(v._definition);
  const cell = cells.find((c: any) => c.variables.includes(v));
  const bad = cell?.type === "import" && cell.variables.length === 1;
  if (bad) misclassified++;
  console.log(
    `  ${name.padEnd(16)} importCell=${String(info.importCell).padEnd(5)} ` +
    `cell.name=${String(cell?.name).padEnd(22)} type=${cell?.type}${bad ? "   <-- SPURIOUS" : ""}`
  );
  console.log(`  ${" ".repeat(16)} def: ${info.src.slice(0, 80)}`);
}

console.log(`\nimport-typed cells: ${cells.filter((c: any) => c.type === "import").length}`);
console.log(`spurious single-variable import cells among the aliases: ${misclassified}`);
console.log(
  misclassified > 0
    ? "\nVERDICT: the widened detector DOES misclassify the compiled alias form."
    : "\nVERDICT: compiled alias form not misclassified."
);
m.dispose();
