// run the notebook's test cells headless
import { importNotebookModule } from "../../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/liquid-timer.js", { overrides: { runTests: true } });
for (const name of ["test_the_liquids_stay_in_the_tube", "test_the_wheels_turn_one_way", "test_the_liquids_swap_ends"]) {
  const t0 = performance.now();
  try { console.log(name, "->", await m.value(name), `(${((performance.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { console.log(name, "FAILED", String(e).slice(0, 200)); }
}
