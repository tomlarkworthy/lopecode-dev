// Run exporter-3's title / filename / export-hash tests headlessly.
//   bun tools/run-e3-title-hash-tests.ts
import { importNotebookModule } from "./notebook-import.ts";

const expect = (actual: any) => ({
  toBe(exp: any) { if (actual !== exp) throw new Error(`expected ${JSON.stringify(exp)}, got ${JSON.stringify(actual)}`); },
});

const m = await importNotebookModule("modules/@tomlarkworthy/exporter-3.js", { overrides: { expect } });
let failed = 0;
for (const name of [
  "test_resolveExportHash_inherits_the_notebooks_own_hash",
  "test_resolveExportHash_prefers_the_live_location",
  "test_resolveExportHash_defaults_only_without_config",
  "test_resolveExportHash_drops_the_pairing_token",
  "test_exportTitle_prefers_the_pages_title",
  "test_fileStem",
]) {
  try {
    console.log(`  ${await m.value(name) === "ok" ? "PASS" : "??  "}  ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
m.dispose();
process.exit(failed ? 1 : 0);
