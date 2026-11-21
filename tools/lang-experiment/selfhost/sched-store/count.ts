// Line counts (non-blank, not starting with //): cells of step.ss.ts, shell.ts, and prelude.runtime.ts lines 6-178.
// Run: bun selfhost/sched-store/count.ts
import { readFileSync } from "node:fs";
import { splitCells, declaredName } from "../../lite/toolchain/ss-toolchain.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url).pathname, "utf8");
const code = (t: string) => t.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//"));
const cells = splitCells(read("./step.ss.ts"), false).map((t) => ({ name: declaredName(t), n: code(t.trim()).length }));
const named = cells.filter((c) => c.name !== null), ns = named.map((c) => c.n).toSorted((a, b) => a - b);
console.log(`step.ss.ts ${code(read("./step.ss.ts")).length} lines: ${cells.filter((c) => c.name === null).reduce((a, c) => a + c.n, 0)} type lines, ${named.length} cells (${named.reduce((a, c) => a + c.n, 0)} lines), max ${ns.at(-1)} median ${ns[Math.floor(ns.length / 2)]}, >20: ${named.filter((c) => c.n > 20).map((c) => `${c.name} ${c.n}`).join(", ") || "none"}`);
console.log("  " + named.map((c) => `${c.name} ${c.n}`).join(", "));
const shell = code(read("./shell.ts"));
const imports = shell.filter((l) => /^(import|export \{)/.test(l.trim())).length;
const hooks = shell.filter((l) => /^(let steps|steps\+\+|export const (stepsRun|storesHeld))/.test(l.trim())).length;
console.log(`shell.ts ${shell.length} lines: ${imports} import/re-export, ${hooks} test/bench counters, ${shell.length - imports - hooks} the rest`);
console.log(`prelude.runtime.ts 6-178 ${code(read("../../prelude.runtime.ts").split("\n").slice(5, 178).join("\n")).length} lines`);
