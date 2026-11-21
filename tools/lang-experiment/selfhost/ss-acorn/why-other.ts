// Why the shell made a node an Other: per node, the keys its row lacks, the required fields it lacks, and the value
// fields holding a node. Run: bun why-other.ts   (on the texts the first completionsAt call parses, and on tools/*.ts)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseCounted } from "./cnt/lite/parse.ts";
import { parse } from "./base/lite/parse.ts";
import { completionsAt } from "./cnt/lite/complete.ts";
import TABLE from "./out/table.json";

const DROP = new Set(["type", "start", "end", "loc", "extra"]);
const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
export function reasons(program: any): Map<string, number> {
  const out = new Map<string, number>();
  const w = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(w); return; }
    if (typeof n.type !== "string") return;
    const row = (TABLE as any)[n.type] as [string, number, number][] | undefined;
    const why: string[] = [];
    if (!row) why.push("no row");
    else {
      for (const k of Object.keys(n)) if (!DROP.has(k) && !row.some((f) => f[0] === k)) why.push(`key ${k}`);
      for (const [k, how, nullable] of row) { const v = n[k]; if (v == null) { if (!nullable) why.push(`lacks ${k}`); } else if (how === 0 && (isNode(v) || (Array.isArray(v) && v.some(isNode)))) why.push(`node in value ${k}`); }
    }
    if (why.length) { const key = `${n.type}: ${why.join(", ")}`; out.set(key, (out.get(key) ?? 0) + 1); }
    for (const k in n) if (k !== "loc") w(n[k]);
  };
  w(program);
  return out;
}
const src = readFileSync(join(import.meta.dir, "base/lite/events.ss.ts"), "utf8");
const P = parseCounted(src);
const cells = P.program.body.map((s: any) => src.slice(s.start, s.end));
(globalThis as any).__parsed = [];
completionsAt(cells, cells.length - 1, cells[cells.length - 1]!.length - 3, true);
const all = new Map<string, number>();
for (const [t, j] of [...(globalThis as any).__parsed]) { try { for (const [k, n] of reasons(parse(t, { jsx: j }).program)) all.set(k, (all.get(k) ?? 0) + n); } catch {} }
console.log(`first completionsAt call: ${[...all].map(([k, n]) => `${k} (${n})`).join("; ") || "none"}`);
const TOOLS = join(import.meta.dir, "../../..");
const held = new Map<string, number>();
for (const f of readdirSync(TOOLS).filter((f) => f.endsWith(".ts"))) { try { for (const [k, n] of reasons(parse(readFileSync(join(TOOLS, f), "utf8")).program)) held.set(k, (held.get(k) ?? 0) + n); } catch {} }
console.log(`tools/*.ts: ${[...held].map(([k, n]) => `${k} (${n})`).join("; ") || "none"}`);
