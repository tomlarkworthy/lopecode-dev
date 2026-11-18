// Score classify.ts against port-editor5's hand labels (port-editor5/classify.ts --all).
import { execSync } from "node:child_process";
const hand = execSync("bun classify.ts --all", { cwd: "../port-editor5", encoding: "utf8" }).trim().split("\n").filter((l) => l.split("\t").length === 5)
  .map((l) => l.split("\t")).map(([pid, name, cat, v, lines]) => ({ key: name === "(anon)" ? pid : name, v, lines: +lines }));
const mine = execSync("bun classify.ts --file ../lite/soundscript/editor-5.fork.js @tomlarkworthy/editor-5", { encoding: "utf8" }).trim().split("\n").filter((l) => /^[YHNPI]\t/.test(l))
  .map((l) => l.split("\t"));
// anonymous cells cannot be keyed by name: match them by order of appearance among anon cells
const handAnon = hand.filter((h) => h.key.startsWith("_")); let ai = 0;
const m = new Map<string, { a: string; b: string; lines: number; name: string }>();
for (const [v, lines, name, , blockers] of mine) {
  const h = name === "(anon)" ? handAnon[ai++] : hand.find((x) => x.key === name);
  if (!h) { console.log("no hand label", name); continue; }
  const k = h.v + ">" + v; const e = m.get(k) ?? { a: h.v, b: v, lines: 0, name: "" }; e.lines += +lines; (e as any).n = ((e as any).n ?? 0) + 1; (e as any).names = [...((e as any).names ?? []), `${name}(${blockers})`]; m.set(k, e);
}
console.log("hand>classifier\tcells\tlines\texamples");
for (const [k, e] of [...m].sort()) console.log(`${k}\t${(e as any).n}\t${e.lines}\t${(e as any).names.slice(0, 8).join(" ")}`);
