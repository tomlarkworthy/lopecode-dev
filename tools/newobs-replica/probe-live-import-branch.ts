// Which branch populated `specifiers` on the LIVE notebook-kit fixture?
//
// cell-map-2-on-live-nk.test.ts asserts 3 import cells with non-empty specifiers. That assertion is
// also satisfiable by the RESOLVED path (output variables present, attributed by membership), so a
// green there does not by itself prove the unresolved/enumeration branch ran. This prints the group
// membership so the two are distinguishable: headlessly the imports fail (no importmap), so each
// import cell should hold its holder ALONE and every symbol must come from the loader's own
// `outputs.get(…)?.import(…)` enumeration.
//
// run: bun tools/newobs-replica/probe-live-import-branch.ts
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
process.on("unhandledRejection", () => {});

const realizeFallback = async (sources: string[]) =>
  sources.map((src) => {
    let f: any;
    eval("f = " + src);
    return f;
  });

const nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
  overrides: { kit, Runtime, realize: realizeFallback, runtime: { _global: () => undefined } }
});
const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");

const groupCells = await cm.value("groupCells");
const runtimeAccessors = await cm.value("runtimeAccessors");
const defInfo = await cm.value("defInfo");
const fixture = await nk.value("nkFixture");

const vars = [...fixture.module._runtime._variables].filter(
  (v: any) => v._module === fixture.module
);
const cells = groupCells(vars, runtimeAccessors).get(fixture.module);
const imports = cells.filter((c: any) => c.type === "import");

console.log(`live fixture: ${vars.length} variables -> ${cells.length} cells, ${imports.length} imports`);
for (const c of imports) {
  const members = c.variables.map((v: any) => String(v._name));
  const ic = c.variables.find((v: any) => defInfo(v._definition).importCell);
  const pairs = ic ? defInfo(ic._definition).pairs : [];
  console.log(`\n  ${String(c.name)}`);
  console.log(`    members(${members.length}) = ${JSON.stringify(members)}`);
  console.log(`    enumeration pairs        = ${JSON.stringify(pairs)}`);
  console.log(`    importInfo.specifiers    = ${JSON.stringify(c.importInfo.specifiers)}`);
  // The discriminator: if members is the holder alone, membership contributed nothing and every
  // symbol came from the enumeration — the unresolved branch.
  const fromMembership = members.filter((n: string) => n !== String(c.name));
  console.log(
    `    RESULT branch=${fromMembership.length === 0 ? "ENUMERATION-ONLY (unresolved)" : "MEMBERSHIP (resolved)"}` +
      ` membersBeyondHolder=${fromMembership.length}`
  );
}

// Do the imported symbols exist as variables in this module at all?
const symbolNames = ["dep", "dep2", "viewdep", "viewof$viewdep", "mutabledep", "mutable$mutabledep"];
const present = symbolNames.filter((n) => vars.some((v: any) => String(v._name) === n));
console.log(`\nRESULT importedSymbolVariablesPresent=${JSON.stringify(present)}`);

nk.dispose();
cm.dispose();
