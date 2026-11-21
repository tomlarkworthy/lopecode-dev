// Whether acorn's own key order (the order `for (const k in n)` walks) is the same on every node of a type, on the
// corpus and the synthetic sources. A generated children function can only reproduce the walk order if it is.
// Run: bun keyorder.ts   (writes out/keyorder.json: per type, the child-field order seen, with counts)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./orig/lite/parse.ts";
import { corpus } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";

const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
const orders: Record<string, Record<string, number>> = {};
const childOrders: Record<string, Record<string, number>> = {};
let nodes = 0;
const walk = (n: any) => {
  if (!isNode(n)) return;
  nodes++;
  const keys = Object.keys(n).filter((k) => k !== "loc");
  const kids = keys.filter((k) => isNode(n[k]) || (Array.isArray(n[k]) && n[k].every((x: any) => x === null || isNode(x)) && n[k].length > 0) || n[k] === null || n[k] === undefined || Array.isArray(n[k]));
  (orders[n.type] ??= {})[keys.join(",")] = (orders[n.type]![keys.join(",")] ?? 0) + 1;
  (childOrders[n.type] ??= {})[kids.join(",")] = (childOrders[n.type]![kids.join(",")] ?? 0) + 1;
  for (const k in n) if (k !== "loc") { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else walk(v); }
};
let inputs = 0;
for (const c of [...corpus(), ...SYNTHETIC]) { try { walk(parse(c.src, { jsx: c.tsx }).program); inputs++; } catch {} }
const multi = Object.entries(orders).filter(([, o]) => Object.keys(o).length > 1);
console.log(`${inputs} inputs parsed, ${nodes} nodes, ${Object.keys(orders).length} types; types with more than one key order: ${multi.length}`);
for (const [t, o] of multi) console.log(`  ${t}: ${Object.entries(o).map(([k, n]) => `${n}× [${k}]`).join("  |  ")}`);
writeFileSync(join(import.meta.dir, "out/keyorder.json"), JSON.stringify(orders, null, 1));
