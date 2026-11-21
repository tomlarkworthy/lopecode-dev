// The checker's own SoundScript files of a copy, each checked by that copy's checker with the files it is checked
// with in lite/soundscript/ts-cells.ts (SS_CHECKED_WITH; tsx: true, as there). A change to a .ss.ts file must keep it ok.
// Run: bun checkss.ts <copy> [file.ss.ts ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
const copy = process.argv[2] ?? "fix";
const files = process.argv.slice(3).length ? process.argv.slice(3) : ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "runtime.ss.ts"];
const WITH: Record<string, string[]> = { "store.ss.ts": ["events.ss.ts"], "render.ss.ts": ["runtime.ss.ts"], "subtype.ss.ts": ["types.ss.ts"], "walks.ss.ts": ["types.ss.ts", "subtype.ss.ts"] };
const L = join(import.meta.dir, copy, "lite");
const { checkSources } = await import(`${L}/core.ts`);
let bad = 0;
for (const f of files) {
  const src = [...(WITH[f] ?? []), f].map((x) => readFileSync(join(L, x), "utf8")).join("\n\n");
  const t0 = performance.now();
  const r = checkSources({ cells: src, tsx: true });
  const notOk = r.cells.filter((c: any) => c.status !== "ok");
  bad += notOk.length + r.module.length;
  console.log(`${copy}/${f}: ${r.cells.length} cells (with prefix), ${notOk.length} not ok, ${r.module.length} module errors, ${(performance.now() - t0).toFixed(0)} ms`);
  for (const c of notOk.slice(0, 5)) console.log(`  ${c.name}: ${c.status} ${JSON.stringify([...c.errors, ...c.unsupported].slice(0, 3))}`);
}
process.exit(bad ? 1 : 0);
