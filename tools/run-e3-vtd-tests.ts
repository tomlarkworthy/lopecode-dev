// Run the two new variableToDefine tests headlessly, with the cross-module deps overridden.
//   bun tools/run-e3-vtd-tests.ts
import { importNotebookModule } from "./notebook-import.ts";
import * as acorn from "acorn";

const expect = (actual: any) => ({
  toBe(exp: any) { if (actual !== exp) throw new Error(`expected ${JSON.stringify(exp)}, got ${JSON.stringify(actual)}`); },
  toEqual(exp: any) {
    if (JSON.stringify(actual) !== JSON.stringify(exp))
      throw new Error(`expected ${JSON.stringify(exp)}, got ${JSON.stringify(actual)}`);
  },
});

const m = await importNotebookModule("modules/@tomlarkworthy/exporter-3.js", {
  overrides: {
    expect,
    acorn,   // nkShape parses definitions; the notebook gets it from observablejs-toolchain
    displayStateOf: () => null,
    // imported from runtime-sdk / observablejs-toolchain, and unreachable from the closure branch --
    // stubbed so the headless runtime needs no importmap. A call would be a bug, so make it loud.
    pid: () => { throw new Error("pid must not be reached by the closure-import branch"); },
  },
});

for (const name of [
  "test_variableToDefine_never_imports_a_name_from_its_own_module",
  "test_variableToDefine_emits_nothing_rather_than_a_self_import",
  "test_variableToDefine_never_names_an_unnameable_module",
  "test_variableToDefine_takes_an_unnamed_source_over_none",
  "test_additionalMainUrl_carries_the_hosts_pin",
  "test_additionalMainUrl_expands_a_slug",
  "test_additionalMainUrl_passes_a_url_through",
  "test_resolutionsPin_reads_the_pages_own_loaders",
  "test_moduleSlugOf",   // guards the loaderSpecifier refactor
]) {
  try {
    console.log(`  ${await m.value(name) === "ok" ? "PASS" : "??  "}  ${name}`);
  } catch (e: any) {
    console.log(`  FAIL  ${name}\n        ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
m.dispose();
