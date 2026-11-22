// bun verdicts.ts <tree> [--only key-part] [--skip key-part]: every job of out/corpus.json through <tree>/lite/core.ts
// checkSources; writes out/verdicts.<tree-name>.json (per job: module errors and every cell's status, errors with
// rule, line and message, unsupported items, blockedBy) and out/time.<tree-name>.json (ms per job).
// Compare two runs with `bun cmp-verdicts.ts a b`.
import { readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
const tree = process.argv[2] ?? "base";
const at = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? null; };
const only = at("--only"), skip = at("--skip");
const name = basename(tree);
const { checkSources } = await import(join(import.meta.dir, tree, "lite/core.ts"));
const jobs: { key: string; src: any; err?: string; opts: any }[] = JSON.parse(readFileSync(join(import.meta.dir, "out/corpus.json"), "utf8"));
const res: Record<string, unknown> = {}, time: Record<string, number> = {};
const t0 = performance.now();
for (const j of jobs) {
  if (only && !j.key.includes(only)) continue;
  if (skip && j.key.includes(skip)) continue;
  if (!j.src) { res[j.key] = { split: j.err }; continue; }
  const s = performance.now();
  try {
    const r = checkSources(j.src, j.opts);
    res[j.key] = { ok: r.ok, module: r.module, cells: r.cells.map((c: any) => ({ name: c.name, status: c.status, line: c.line, errors: c.errors, unsupported: c.unsupported, blockedBy: c.blockedBy })) };
  } catch (x) { res[j.key] = { crash: String((x as Error).message) }; }
  time[j.key] = performance.now() - s;
}
const total = performance.now() - t0;
writeFileSync(join(import.meta.dir, `out/verdicts.${name}${only ? "." + only.replace(/\W/g, "_") : ""}.json`), JSON.stringify(res, null, 0));
writeFileSync(join(import.meta.dir, `out/time.${name}${only ? "." + only.replace(/\W/g, "_") : ""}.json`), JSON.stringify({ total, time }));
const cells = Object.values(res).flatMap((r: any) => r.cells ?? []);
const n = (s: string) => cells.filter((c: any) => c.status === s).length;
console.log(`${name}: ${Object.keys(res).length} jobs, ${cells.length} cells: ok ${n("ok")} rejected ${n("rejected")} unsupported ${n("unsupported")} blocked ${n("blocked")}; crashes ${Object.values(res).filter((r: any) => r.crash).length}; ${(total / 1000).toFixed(1)} s; ${new Date().toString()}`);
