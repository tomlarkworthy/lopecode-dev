// bun bench.ts [rounds]: the corpus of out/corpus.json through base, proto, refac and base2 (a second copy of base) checkSources in one process,
// interleaved per round (base, proto, refac, then rotated); per tree the median over rounds of the whole corpus and of
// the self:infer job (the checker's 496 cells). Prints power source and load before and after.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const R = Number(process.argv[2] ?? 5);
const sh = (c: string[]) => Bun.spawnSync(c).stdout.toString().trim();
console.log(`${new Date().toString()} | ${sh(["pmset", "-g", "batt"]).split("\n")[0]} | ${sh(["uptime"])}`);
const trees = ["base", "proto", "refac", "base2"]; // base2: an untouched second copy of base, the noise floor
const check = new Map<string, any>();
for (const t of trees) check.set(t, (await import(join(import.meta.dir, t, "lite/core.ts"))).checkSources);
const jobs: any[] = JSON.parse(readFileSync(join(import.meta.dir, "out/corpus.json"), "utf8")).filter((j: any) => j.src);
const all = new Map(trees.map((t) => [t, [] as number[]])), self = new Map(trees.map((t) => [t, [] as number[]]));
for (const t of trees) for (const j of jobs) check.get(t)(j.src, j.opts); // warm
for (let r = 0; r < R; r++) {
  const order = trees.map((_, i) => trees[(i + r) % trees.length]!);
  for (const t of order) {
    let tot = 0, s = 0;
    for (const j of jobs) { const a = performance.now(); check.get(t)(j.src, j.opts); const d = performance.now() - a; tot += d; if (j.key === "self:infer") s = d; }
    all.get(t)!.push(tot); self.get(t)!.push(s);
  }
}
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]!; };
for (const t of trees) console.log(`${t.padEnd(6)} corpus ${jobs.length} jobs: median ${med(all.get(t)!).toFixed(0)} ms (min ${Math.min(...all.get(t)!).toFixed(0)}, max ${Math.max(...all.get(t)!).toFixed(0)}); self:infer median ${med(self.get(t)!).toFixed(0)} ms (min ${Math.min(...self.get(t)!).toFixed(0)}, max ${Math.max(...self.get(t)!).toFixed(0)})`);
console.log(`${new Date().toString()} | ${sh(["pmset", "-g", "batt"]).split("\n")[0]} | ${sh(["uptime"])}`);
