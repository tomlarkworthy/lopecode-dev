// The fields acorn + acorn-typescript, configured as ../parse.ts configures them, give each node type, and the kinds of
// value each holds, over the checker's corpus (every cells.ts(x) of ports/, fixtures/, port-editor5/, horde/; every
// .ts/.tsx of lite/ outside node_modules and dot folders; selfhost/*.ss.ts and selfhost/rt/*.ss.ts; the spec's reject
// cases) and synthetic.ts. Then, for each type nodeTypes() names, the fields acorn.d.ts declares that the census never
// saw. Writes census.json, the input gen.ts reads, so regenerating does not depend on the corpus as it is that day.
// Run: bun lite/acorn/census.ts
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as acorn from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";
import { parse } from "../parse.ts";
import { specRejects } from "../soundscript/spec-cases.ts";
import { SYNTHETIC, MORE } from "./synthetic.ts";
import { nodeTypes } from "./node-types.ts";

const LITE = join(import.meta.dir, ".."), ROOT = join(LITE, "..");
export type Input = { id: string; src: string; tsx: boolean };
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
// the census corpus; acorn.test.ts holds out the .ts files at the top of tools/, which are not in it
export function inputs(): Input[] {
  const out: Input[] = [];
  const walk = (d: string, keep: (f: string) => boolean) => {
    for (const f of readdirSync(d).sort()) {
      if (f === "node_modules" || f.startsWith(".")) continue;
      const p = join(d, f);
      // the frozen fixtures are copies of lite files, not corpus (lite/infer/frozen)
      if (p === join(LITE, "infer/frozen")) continue;
      if (statSync(p).isDirectory()) walk(p, keep);
      else if (keep(f)) out.push({ id: p.slice(ROOT.length + 1), src: readFileSync(p, "utf8"), tsx: f.endsWith("x") });
    }
  };
  for (const d of ["ports", "fixtures", "port-editor5", "horde"]) if (existsSync(join(ROOT, d))) walk(join(ROOT, d), (f) => f === "cells.ts" || f === "cells.tsx");
  walk(LITE, (f) => /\.tsx?$/.test(f));
  for (const d of ["selfhost", "selfhost/rt"]) for (const f of readdirSync(join(ROOT, d)).filter((f) => f.endsWith(".ss.ts")).sort()) out.push({ id: `${d}/${f}`, src: readFileSync(join(ROOT, d, f), "utf8"), tsx: false });
  specRejects().forEach((c, i) => out.push({ id: `spec#${i}`, src: c.source, tsx: true }));
  return [...out, ...SYNTHETIC, ...MORE];
}
export type Census = { types: Record<string, { count: number; fields: Record<string, string[]> }>; orders: Record<string, Record<string, number>> };
export function census(ins = inputs()) {
  const types: Census["types"] = {};
  const present: Record<string, Record<string, number>> = {};
  // per type, each key order seen (Object.keys of the node, the order for...in walks)
  const orders: Census["orders"] = {};
  let parsed = 0, failed = 0, nodes = 0;
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.type !== "string") return;
    nodes++;
    const e = (types[n.type] ??= { count: 0, fields: {} });
    e.count++;
    const c = (present[n.type] ??= {});
    const seq = Object.keys(n).join(","), o = (orders[n.type] ??= {});
    o[seq] = (o[seq] ?? 0) + 1;
    for (const k of Object.keys(n)) { c[k] = (c[k] ?? 0) + 1; const kv = kindOfValue(n[k]); (e.fields[k] ??= []).includes(kv) || e.fields[k]!.push(kv); }
    for (const k in n) if (k !== "loc") walk(n[k]);
  };
  for (const c of ins) { try { walk(parse(c.src, { jsx: c.tsx }).program); parsed++; } catch { failed++; } }
  for (const [t, e] of Object.entries(types)) for (const k of Object.keys(e.fields)) if ((present[t]![k] ?? 0) < e.count) e.fields[k]!.push("absent");
  return { census: { types, orders } as Census, parsed, failed, nodes };
}
// acorn.d.ts: per interface with a literal `type`, its other properties as census kinds
export function declared(): Record<string, Record<string, string[]>> {
  const src = readFileSync(join(LITE, "node_modules/acorn/dist/acorn.d.ts"), "utf8");
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
    const lit = props.find((m: any) => m.key.name === "type")?.typeAnnotation?.typeAnnotation;
    if (lit?.type !== "TSLiteralType") continue;
    const fs: Record<string, string[]> = {};
    for (const m of props) if (m.key.name !== "type") fs[m.key.name] = [...new Set([...kinds(m.typeAnnotation.typeAnnotation), ...(m.optional ? ["absent"] : [])])];
    out[lit.literal.value] = fs;
  }
  return out;
}
if (import.meta.main) {
  const { census: c, parsed, failed, nodes } = census();
  const d = declared();
  const types = nodeTypes();
  const added: string[] = [];
  for (const t of types) {
    const e = (c.types[t] ??= { count: 0, fields: {} });
    for (const [k, ks] of Object.entries(d[t] ?? {})) if (!e.fields[k]) { e.fields[k] = [...ks.filter((x) => x !== "absent"), "absent"]; added.push(`${t}.${k} (${ks.join(" ")})`); }
  }
  const sorted = (o: Record<string, any>) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  writeFileSync(join(import.meta.dir, "census.json"), JSON.stringify({ types: sorted(c.types), orders: sorted(c.orders) }, null, 1) + "\n");
  console.log(`census: ${parsed} inputs parsed, ${failed} did not; ${nodes} nodes; ${Object.values(c.types).filter((e) => e.count).length} node types seen of ${types.length} in the source`);
  console.log(`seen but not in nodeTypes(): ${Object.keys(c.types).filter((t) => !types.includes(t)).join(", ") || "none"}`);
  console.log(`never seen: ${types.filter((t) => !c.types[t]!.count).join(", ")}`);
  console.log(`fields added from acorn.d.ts (${added.length}): ${added.join("; ")}`);
}
