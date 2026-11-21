// What the checker takes from lite/parse.ts, on the AST of base/lite/*.ts (and toolchain/, stdlib/): the names each
// file imports from "./parse.ts", where each imported function is called, and which members of a Parsed value are read
// (a binding initialised from a parse(...) call, or a parameter or variable annotated Parsed). Run: bun gen/survey.ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../base/lite/parse.ts";

const LITE = join(import.meta.dir, "../base/lite");
const files = [...readdirSync(LITE).filter((f) => f.endsWith(".ts")).map((f) => f), ...["toolchain", "stdlib", "jsx", "browser"].flatMap((d) => readdirSync(join(LITE, d)).filter((f) => f.endsWith(".ts")).map((f) => `${d}/${f}`))];
const walk = (n: any, f: (n: any) => void) => { if (!n || typeof n.type !== "string") return; f(n); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((x) => walk(x, f)); else if (v && typeof v === "object" && typeof v.type === "string") walk(v, f); } };
const imports: Record<string, string[]> = {};
const calls: Record<string, Record<string, number>> = {};
const members: Record<string, Record<string, number>> = {};
for (const f of files) {
  const src = readFileSync(join(LITE, f), "utf8");
  let P; try { P = parse(src, { jsx: f.endsWith("x") }); } catch (e: any) { console.log(`${f}: does not parse: ${e.message}`); continue; }
  const names = new Map<string, string>();
  for (const st of P.program.body) if (st.type === "ImportDeclaration" && /\/parse\.ts$/.test(st.source.value)) for (const s of st.specifiers) { names.set(s.local.name, s.imported?.name ?? s.local.name); (imports[f] ??= []).push(`${s.importKind === "type" || st.importKind === "type" ? "type " : ""}${s.imported?.name ?? s.local.name}`); }
  if (!names.size) continue;
  const parsedVars = new Set<string>();
  walk(P.program, (n) => {
    if (n.type === "VariableDeclarator" && n.id.type === "Identifier" && n.init?.type === "CallExpression" && n.init.callee.type === "Identifier" && names.get(n.init.callee.name) === "parse") parsedVars.add(n.id.name);
    const ann = n.type === "Identifier" ? n.typeAnnotation?.typeAnnotation : null;
    if (ann?.type === "TSTypeReference" && ann.typeName.type === "Identifier" && names.get(ann.typeName.name) === "Parsed") parsedVars.add(n.name);
  });
  walk(P.program, (n) => {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && names.has(n.callee.name)) { const c = (calls[names.get(n.callee.name)!] ??= {}); c[f] = (c[f] ?? 0) + 1; }
    if (n.type === "MemberExpression" && !n.computed && n.object.type === "Identifier" && parsedVars.has(n.object.name)) { const m = (members[n.property.name] ??= {}); m[f] = (m[f] ?? 0) + 1; }
  });
}
console.log("imports from parse.ts:"); for (const [f, ns] of Object.entries(imports)) console.log(`  ${f}: ${ns.join(", ")}`);
console.log("calls of each imported function:"); for (const [n, fs] of Object.entries(calls)) console.log(`  ${n}: ${Object.entries(fs).map(([f, c]) => `${f} ${c}`).join(", ")}`);
console.log("members read on a Parsed value:"); for (const [n, fs] of Object.entries(members)) console.log(`  .${n}: ${Object.entries(fs).map(([f, c]) => `${f} ${c}`).join(", ")}`);
