// bun lite/browser/selftest.ts
// The browser runner (erase.ts + run.ts) against the TypeScript harness (../../run.ts runPort):
// every cell whose dependencies are all in cells.ts must settle to the same status and value.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runPort, serialize } from "../../run.ts";
import { runCells } from "./run.ts";
import { makeClock, makeRandom } from "../../prelude.runtime.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dirs = [
  ...readdirSync(join(ROOT, "ports")).map((d) => join(ROOT, "ports", d)),
  ...readdirSync(join(ROOT, "fixtures")).filter((d) => d.startsWith("accept-")).map((d) => join(ROOT, "fixtures", d)),
].filter((d) => existsSync(join(d, "cells.ts")));

let compared = 0, skipped = 0, failures = 0;
for (const dir of dirs) {
  const src = readFileSync(join(dir, "cells.ts"), "utf8");
  const ref = await runPort(dir, "forward", 3000);
  const caps = { now: () => makeClock(), random: (c: string) => makeRandom(c) };
  let p;
  try { p = runCells(src, { caps }); } catch (e) { console.log(`FAIL ${dir}: ${(e as Error).message}`); failures++; continue; }
  await p.settle();
  const local = new Set(p.cells.map((c) => c.name));
  const pure = new Map<string, boolean>();
  const isLocal = (n: string, seen = new Set<string>()): boolean => {
    if (pure.has(n)) return pure.get(n)!;
    const c = p.cells.find((x) => x.name === n);
    const ok = !!c && c.params.every((q) => !seen.has(q.name) && (local.has(q.name) ? isLocal(q.name, new Set([...seen, n])) : ["invalidation", "log", "now", "random"].includes(q.name)));
    pure.set(n, ok);
    return ok;
  };
  let bad = 0, n = 0;
  for (const c of ref.cells) {
    if (c.file !== "cells.ts") continue;
    if (!isLocal(c.name)) { skipped++; continue; }
    n++;
    const st = p.status(c.name);
    const same = st === c.status && (st !== "fulfilled" || JSON.stringify(serialize(p.value(c.name))) === JSON.stringify(c.value));
    if (!same) { bad++; console.log(`  ${dir.split("/").slice(-1)[0]}:${c.name} harness ${c.status} ${JSON.stringify(c.value ?? c.error)?.slice(0, 80)} / browser ${st} ${String(p.error(c.name) ?? JSON.stringify(serialize(p.value(c.name)))).slice(0, 80)}`); }
  }
  p.dispose();
  compared += n;
  failures += bad;
  console.log(`${bad ? "FAIL" : "ok  "} ${dir.split("/").slice(-2).join("/")}: ${n} cells compared`);
}
console.log(`${compared} cells compared, ${skipped} skipped (shell or foreign dependency), ${failures} difference(s)`);
process.exit(failures ? 1 : 0);
