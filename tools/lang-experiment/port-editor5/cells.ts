// Extract every $def cell of editor-5.fork.js: pid, name, deps, line range, line count.
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../lite/soundscript/editor-5.fork.js", import.meta.url), "utf8");
const lines = src.split("\n");
const defs = [...src.matchAll(/\$def\("([^"]+)", (null|"[^"]*"), (\[[^\]]*\]), /g)].map((m) => ({ pid: m[1], name: m[2] === "null" ? null : JSON.parse(m[2]), deps: JSON.parse(m[3]) }));
const starts = new Map<string, number>();
lines.forEach((l, i) => { const m = /^const (_[a-z0-9]+) = /.exec(l); if (m) starts.set(m[1], i); });
const order = [...starts.entries()].sort((a, b) => a[1] - b[1]);
const defineLine = lines.findIndex((l) => l.startsWith("export default function define"));
const end = new Map<string, number>();
order.forEach(([pid, s], i) => end.set(pid, (order[i + 1]?.[1] ?? defineLine)));
const out = defs.map((d) => { const s = starts.get(d.pid)!; const e = end.get(d.pid)!; return { ...d, start: s + 1, lines: e - s, src: lines.slice(s, e).join("\n") }; });
if (process.argv[2] === "--src") { const d = out.find((x) => x.name === process.argv[3] || x.pid === process.argv[3]); console.log(d?.src); }
else for (const d of out) console.log([d.pid, d.name ?? "(anon)", d.lines, d.start, d.deps.join(",")].join("\t"));
