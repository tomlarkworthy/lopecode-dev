// Smoke test of a checker copy: checkSources over the corpus; prints how many inputs are ok / not ok / throw, and
// for orig/lite/*.ss.ts (which ship as checked) which are not ok. Run: bun smoke.ts [orig|rec|...]
import { corpus } from "./corpus.ts";
const which = process.argv[2] ?? "orig";
const { checkSources } = await import(`./${which}/lite/core.ts`);
let ok = 0, bad = 0, threw = 0; const ssBad: string[] = [];
const t0 = performance.now();
for (const c of corpus()) {
  try {
    const r = checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null });
    if (r.ok) ok++; else { bad++; if (c.id.startsWith("lite/")) ssBad.push(c.id); }
  } catch { threw++; }
}
console.log(`${which}: ${ok} ok, ${bad} not ok, ${threw} throw; ${(performance.now() - t0).toFixed(0)} ms; lite/*.ss.ts not ok: ${ssBad.join(", ") || "none"}`);
