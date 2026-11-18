// Pick one copy per module id across both content repos (canonical.json first, else first notebook
// found) and write its source to survey/src/<id>.js via lope-reader --get-module. Writes picks.json.
import { readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const ROOT = join(import.meta.dir, "../../..");
const OUT = join(import.meta.dir, "src");
mkdirSync(OUT, { recursive: true });
const canonical = JSON.parse(await Bun.file(join(ROOT, "modules/canonical.json")).text());
const books = ["lopecode/notebooks", "lopebooks/notebooks"].flatMap((d) =>
  readdirSync(join(ROOT, d)).filter((f) => f.endsWith(".html")).map((f) => `${d}/${f}`));
const run = async (args: string[]) => {
  const p = Bun.spawn(["bun", "tools/lope-reader.ts", ...args], { cwd: ROOT, stdout: "pipe", stderr: "ignore" });
  const t = await new Response(p.stdout).text(); await p.exited; return t;
};
const where = new Map<string, string[]>();
const pool = async <T,>(xs: T[], n: number, f: (x: T) => Promise<void>) => {
  let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) await f(xs[i++]); }));
};
await pool(books, 8, async (b) => {
  try {
    const spec = JSON.parse(await run([b]));
    for (const id of Object.keys(spec.modules ?? {})) { const l = where.get(id) ?? []; l.push(b); where.set(id, l); }
  } catch { console.error("spec failed", b); }
});
const picks: Record<string, { notebook: string; source: "canonical" | "any"; copies: number }> = {};
for (const [id, nbs] of where) {
  const c = canonical[id];
  const cand = c ? [c.lopecode, c.lopebooks].filter((x: string | undefined) => x && existsSync(join(ROOT, x))) : [];
  // lopecode is the published copy; prefer it when both are declared
  picks[id] = cand.length ? { notebook: cand[0], source: "canonical", copies: nbs.length } : { notebook: nbs.sort()[0], source: "any", copies: nbs.length };
}
await pool(Object.entries(picks), 8, async ([id, p]) => {
  const src = await run([p.notebook, "--get-module", id]);
  writeFileSync(join(OUT, encodeURIComponent(id) + ".js"), src);
});
writeFileSync(join(import.meta.dir, "picks.json"), JSON.stringify(picks, null, 1));
console.log(`${books.length} notebooks, ${Object.keys(picks).length} distinct module ids, ${Object.values(picks).filter((p) => p.source === "canonical").length} from canonical.json`);
