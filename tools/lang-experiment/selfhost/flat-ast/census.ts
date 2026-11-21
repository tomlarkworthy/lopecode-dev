// Per node type, the fields acorn + acorn-typescript give it on the corpus and the synthetic sources, and the kinds of
// value each field holds (node, node list, null, undefined, absent, string, number, boolean, bigint, regexp, record).
// Run: bun selfhost/flat-ast/census.ts   (writes out/census.json; prints mixed fields)
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../lite/parse.ts";
import { corpus } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";

export type Census = Record<string, { count: number; fields: Record<string, string[]> }>;
const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
export const kindOfValue = (v: any): string => {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return v.every((x) => x === null || isNode(x)) ? (v.some((x) => x === null) ? "node?[]" : "node[]") : "other[]";
  if (isNode(v)) return "node";
  if (v instanceof RegExp) return "regexp";
  if (typeof v === "object") return "record";
  return typeof v;
};

export function census(): Census {
  const out: Census = {};
  const seen = (n: any) => {
    const e = (out[n.type] ??= { count: 0, fields: {} });
    e.count++;
    for (const k of Object.keys(n)) (e.fields[k] ??= []).includes(kindOfValue(n[k])) || e.fields[k].push(kindOfValue(n[k]));
  };
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.type !== "string") return;
    seen(n);
    for (const k in n) if (k !== "loc") walk(n[k]);
  };
  for (const c of [...corpus(), ...SYNTHETIC]) { try { walk(parse(c.src, { jsx: c.tsx }).program); } catch {} }
  // a field some nodes of the type lack is "absent" for those
  const counts: Record<string, Record<string, number>> = {};
  const walk2 = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk2); return; }
    if (typeof n.type !== "string") return;
    const c = (counts[n.type] ??= {});
    for (const k of Object.keys(n)) c[k] = (c[k] ?? 0) + 1;
    for (const k in n) if (k !== "loc") walk2(n[k]);
  };
  for (const c of [...corpus(), ...SYNTHETIC]) { try { walk2(parse(c.src, { jsx: c.tsx }).program); } catch {} }
  for (const [t, e] of Object.entries(out)) for (const k of Object.keys(e.fields)) if ((counts[t]![k] ?? 0) < e.count) e.fields[k]!.push("absent");
  return out;
}

if (import.meta.main) {
  const c = census();
  mkdirSync(join(import.meta.dir, "out"), { recursive: true });
  writeFileSync(join(import.meta.dir, "out/census.json"), JSON.stringify(c, null, 1));
  console.log(`${Object.keys(c).length} node types`);
  for (const [t, e] of Object.entries(c).sort()) for (const [k, ks] of Object.entries(e.fields)) {
    const nonNull = ks.filter((x) => x !== "null" && x !== "undefined" && x !== "absent");
    if (nonNull.length > 1 || ks.includes("record") || ks.includes("other[]") || ks.includes("regexp") || ks.includes("bigint") || ks.includes("undefined")) console.log(`${t}.${k}: ${ks.join(" ")}`);
  }
}
