// bun horde/strictify.ts : one-shot code mod. Rewrites every computed member read in cells.ts (other
// than in the test cell) to at(a, i), a compound assignment a[i] op= v to a[i] = at(a, i) op (v),
// and adds `at: At` to the outer parameters of each cell that now uses it. Prints what it changed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, kids, type Node } from "../lite/parse.ts";
const file = join(import.meta.dir, "cells.ts");
const src = readFileSync(file, "utf8");
const P = parse(src);
let reads = 0, compound = 0;
// arrays a cell made with mut(new T(...)) are Mut and need the Mut<T> helper of their type
const MUT_HELPER: Record<string, string> = { Float32Array: "atMF", Int32Array: "atMI", Uint8Array: "atMU8" };
let muts = new Map<string, string>();
const used = new Set<string>();
const helperFor = (obj: Node) => (obj.type === "Identifier" && muts.has(obj.name) ? muts.get(obj.name)! : "at");
const emitKids = (n: Node, from = n.start, to = n.end): string => {
  let out = "", pos = from;
  let last = -1; // a shorthand {w}: key and value are the same node, emit it once
  for (const k of kids(n)) { if (k.start < from || k.end > to || k.start < last) continue; last = k.end; out += src.slice(pos, k.start) + emit(k); pos = k.end; }
  return out + src.slice(pos, to);
};
function emit(n: Node): string {
  if (n.type === "AssignmentExpression" && n.left.type === "MemberExpression" && n.left.computed) {
    const o = emit(n.left.object), i = emit(n.left.property);
    if (n.operator === "=") return `${o}[${i}] = ${emit(n.right)}`;
    compound++;
    const h = helperFor(n.left.object); used.add(h);
    return `${o}[${i}] = ${h}(${o}, ${i}) ${n.operator.slice(0, -1)} (${emit(n.right)})`;
  }
  if (n.type === "MemberExpression" && n.computed) { reads++; const h = helperFor(n.object); used.add(h); return `${h}(${emit(n.object)}, ${emit(n.property)})`; }
  return emitKids(n);
}
let out = "", pos = 0;
const touched: string[] = [];
for (const st of P.program.body) {
  const decl = st.type === "ExportNamedDeclaration" ? st.declaration : null;
  const d = decl?.type === "VariableDeclaration" ? decl.declarations[0] : null;
  if (!d || d.id.name.startsWith("test_") || /^at(M|$)/.test(d.id.name)) continue;
  const fn = d.init;
  const before = reads + compound;
  muts = new Map([...src.slice(fn.start, fn.end).matchAll(/const (\w+) = mut\(new (Float32Array|Int32Array|Uint8Array)\b/g)].map((m) => [m[1], MUT_HELPER[m[2]]]));
  used.clear();
  let text = emit(fn);
  if (reads + compound === before) continue;
  touched.push(`${d.id.name} (${reads + compound - before})`);
  // add at: At as the first outer parameter
  const open = text.indexOf("(");
  const TYPES: Record<string, string> = { at: "At", atMF: "AtM<Float32Array>", atMI: "AtM<Int32Array>", atMU8: "AtM<Uint8Array>" };
  const ps = [...used].sort().map((h) => `${h}: ${TYPES[h]}`).join(", ");
  text = text.slice(0, open + 1) + ps + (fn.params.length ? ", " : "") + text.slice(open + 1);
  out += src.slice(pos, fn.start) + text;
  pos = fn.end;
}
out += src.slice(pos);
writeFileSync(file, out);
console.log(`${reads} reads and ${compound} compound assignments rewritten in: ${touched.join(", ")}`);
