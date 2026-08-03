// Verify test_tagged_literal_span headlessly by injecting the real acorn (the notebook's
// @tomlarkworthy/acorn-8-11-3 import bridge can't resolve in the bare harness).
import * as acorn from "./node_modules/acorn/dist/acorn.mjs";
import { importNotebookModule } from "./notebook-import.ts";

const m = await importNotebookModule("/Users/tom.larkworthy/dev/lopecode-dev/modules/@tomlarkworthy/svg-lens.js", {
  overrides: { acorn },
});
const laws = ["test_tagged_literal_span", "test_interpolation_slots",
  "test_cellSourceLens_laws", "test_literalLens_laws", "test_source_residue_preserved"];
let bad = 0;
for (const law of laws) {
  try {
    const v = await m.value(law);
    const ok = typeof v === "string" && !v.startsWith("❌");
    if (!ok) bad++;
    console.log(`${ok ? "✅" : "❌"} ${law}: ${v}`);
  } catch (e) {
    bad++;
    console.log(`❌ ${law}: ${(e as Error).message}`);
  }
}
process.exit(bad ? 1 : 0);
