// bun lite/check.ts <port-dir> [--json] [--unchecked-index]
// Reads a port directory (cells.ts or cells.tsx, foreign.d.ts, shell.ts) and checks it with core.ts.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkSources, type LiteResult } from "./core.ts";
export { checkSources, type LiteResult, type LiteCell, type LiteError, type Sources } from "./core.ts";

export function checkPort(dir0: string, opts: { strictIndex?: boolean } = {}): LiteResult {
  const dir = resolve(dir0);
  const read = (f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
  const tsx = !existsSync(join(dir, "cells.ts")) && existsSync(join(dir, "cells.tsx"));
  return checkSources({ cells: read(tsx ? "cells.tsx" : "cells.ts") ?? "", tsx, foreign: read("foreign.d.ts"), shell: read("shell.ts"), name: dir }, opts);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: bun lite/check.ts <port-dir> [--json] [--unchecked-index]"); process.exit(2); }
  const r = checkPort(dir, { strictIndex: !args.includes("--unchecked-index") });
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.module) console.log(`${r.file}:${e.line} [${e.rule}] ${e.msg}`);
    for (const c of r.cells) {
      for (const e of c.errors) console.log(`${r.file}:${e.line} ${c.name} [${e.rule}] ${e.msg}`);
      for (const e of c.unsupported) console.log(`${r.file}:${e.line} ${c.name} [unsupported] ${e.msg}`);
      if (c.status === "blocked") console.log(`${r.file}:${c.line} ${c.name} [blocked] by ${c.blockedBy.join(", ")}`);
    }
    const n = (s: string) => r.cells.filter((c) => c.status === s).length;
    console.log(`${r.cells.length} cells: ok ${n("ok")}, rejected ${n("rejected")}, unsupported ${n("unsupported")}, blocked ${n("blocked")}; ${r.module.length} module error(s); ${r.ms.toFixed(0)} ms`);
  }
  process.exit(r.ok ? 0 : 1);
}
