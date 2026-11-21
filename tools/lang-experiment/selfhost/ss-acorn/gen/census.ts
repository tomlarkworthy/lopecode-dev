// Per node type, the fields acorn + acorn-typescript (configured as base/lite/parse.ts) give it, and the kinds of value
// each holds, on: the nested prototype's corpus (361 inputs), ../flat-ast/synthetic.ts, gen/synthetic.ts, and every
// .ts/.tsx file of base/lite (the checker's own TypeScript). Then, for each node type of out/node-types.json, the fields
// acorn.d.ts declares for it that the census never saw.
// Writes out/census.json. Run: bun gen/census.ts
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as acorn from "../base/lite/node_modules/acorn/dist/acorn.mjs";
import { tsPlugin } from "../base/lite/node_modules/@sveltejs/acorn-typescript/index.js";
import { parse } from "../base/lite/parse.ts";
import { corpus } from "../../nested-ast/corpus.ts";
import { SYNTHETIC } from "../../flat-ast/synthetic.ts";
import { MORE } from "./synthetic.ts";

const HERE = join(import.meta.dir, "..");
export type Census = Record<string, { count: number; fields: Record<string, string[]> }>;
const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
const kindOfValue = (v: any): string => {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return v.every((x) => x === null || isNode(x)) ? (v.some((x) => x === null) ? "node?[]" : "node[]") : "other[]";
  if (isNode(v)) return "node";
  if (v instanceof RegExp) return "regexp";
  if (typeof v === "object") return "record";
  return typeof v;
};
export function inputs(): { id: string; src: string; tsx: boolean }[] {
  const files: { id: string; src: string; tsx: boolean }[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      if (f === "node_modules") continue;
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push({ id: p.slice(HERE.length + 1), src: readFileSync(p, "utf8"), tsx: f.endsWith("x") });
    }
  };
  walk(join(HERE, "base/lite"));
  return [...corpus(), ...SYNTHETIC, ...MORE, ...files];
}
export function census(ins = inputs()) {
  const out: Census = {};
  const present: Record<string, Record<string, number>> = {};
  // per type, each key order seen (Object.keys of the node, which is the order for...in walks)
  const orders: Record<string, Record<string, number>> = {};
  let parsed = 0, failed = 0, nodes = 0;
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.type !== "string") return;
    nodes++;
    const e = (out[n.type] ??= { count: 0, fields: {} });
    e.count++;
    const c = (present[n.type] ??= {});
    const seq = Object.keys(n).join(","), o = (orders[n.type] ??= {});
    o[seq] = (o[seq] ?? 0) + 1;
    for (const k of Object.keys(n)) { c[k] = (c[k] ?? 0) + 1; const kv = kindOfValue(n[k]); (e.fields[k] ??= []).includes(kv) || e.fields[k]!.push(kv); }
    for (const k in n) if (k !== "loc") walk(n[k]);
  };
  for (const c of ins) { try { walk(parse(c.src, { jsx: c.tsx }).program); parsed++; } catch { failed++; } }
  for (const [t, e] of Object.entries(out)) for (const k of Object.keys(e.fields)) if ((present[t]![k] ?? 0) < e.count) e.fields[k]!.push("absent");
  return { census: out, orders, parsed, failed, nodes };
}
// acorn.d.ts: per interface with a literal `type`, its other properties as census kinds
export function declared(): Record<string, Record<string, string[]>> {
  const src = readFileSync(join(HERE, "../../lite/node_modules/acorn/dist/acorn.d.ts"), "utf8");
  const P = acorn.Parser.extend(tsPlugin({ dts: true }) as any);
  const ast: any = P.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const decls = new Map<string, any>();
  for (const st of ast.body) { const d = st.type === "ExportNamedDeclaration" ? st.declaration : st; if (d && (d.type === "TSInterfaceDeclaration" || d.type === "TSTypeAliasDeclaration")) decls.set(d.id.name, d); }
  const kinds = (t: any): string[] => {
    switch (t.type) {
      case "TSUnionType": return t.types.flatMap(kinds);
      case "TSNullKeyword": return ["null"];
      case "TSUndefinedKeyword": return ["undefined"];
      case "TSStringKeyword": case "TSLiteralType": return [t.type === "TSLiteralType" ? typeof t.literal.value : "string"];
      case "TSNumberKeyword": return ["number"];
      case "TSBooleanKeyword": return ["boolean"];
      case "TSTypeLiteral": return ["record"];
      case "TSArrayType": return kinds(t.elementType).includes("null") ? ["node?[]"] : ["node[]"];
      case "TSTypeReference": {
        const n = t.typeName.name;
        if (n === "Array") return kinds(t.typeArguments?.params?.[0] ?? t.typeParameters.params[0]).includes("null") ? ["node?[]"] : ["node[]"];
        if (n === "RegExp") return ["regexp"];
        if (n === "SourceLocation" || n === "Position") return ["record"];
        return decls.has(n) ? ["node"] : ["record"];
      }
      default: return [`?${t.type}`];
    }
  };
  const out: Record<string, Record<string, string[]>> = {};
  for (const d of decls.values()) {
    if (d.type !== "TSInterfaceDeclaration") continue;
    const props = d.body.body.filter((m: any) => m.type === "TSPropertySignature");
    const tp = props.find((m: any) => m.key.name === "type");
    const lit = tp?.typeAnnotation?.typeAnnotation;
    if (lit?.type !== "TSLiteralType") continue;
    const fs: Record<string, string[]> = {};
    for (const m of props) if (m.key.name !== "type") fs[m.key.name] = [...new Set([...kinds(m.typeAnnotation.typeAnnotation), ...(m.optional ? ["absent"] : [])])];
    out[lit.literal.value] = fs;
  }
  return out;
}
if (import.meta.main) {
  const { census: c, orders, parsed, failed, nodes } = census();
  const d = declared();
  const types = Object.keys(JSON.parse(readFileSync(join(HERE, "out/node-types.json"), "utf8")).types);
  const added: string[] = [];
  for (const t of types) {
    const e = (c[t] ??= { count: 0, fields: {} });
    for (const [k, ks] of Object.entries(d[t] ?? {})) if (!e.fields[k]) { e.fields[k] = [...ks.filter((x) => x !== "absent"), "absent"]; added.push(`${t}.${k} (${ks.join(" ")})`); }
  }
  writeFileSync(join(HERE, "out/census.json"), JSON.stringify(c, null, 1));
  writeFileSync(join(HERE, "out/keyorder.json"), JSON.stringify(orders));
  const unseen = types.filter((t) => !c[t]!.count);
  console.log(`census: ${parsed} inputs parsed, ${failed} did not; ${nodes} nodes; ${Object.values(c).filter((e) => e.count).length} node types seen of ${types.length} in the source`);
  console.log(`seen but not in out/node-types.json: ${Object.keys(c).filter((t) => !types.includes(t)).join(", ") || "none"}`);
  console.log(`never seen: ${unseen.join(", ")}`);
  console.log(`fields added from acorn.d.ts (${added.length}): ${added.join("; ")}`);
}
