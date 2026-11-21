// AST measurements over the inventoried files (inventory.ts), for the container and typed-AST findings.
//  1. node-type vocabulary: distinct strings compared with `.type` (===, !==, switch case on .type, a regex tested on .type)
//  2. units that read `.type` of something or call kids/isFn (the AST-dependent units)
//  3. callbacks (a function expression passed as an argument) inside class members whose body calls this.<member>
//     or writes this.<field>: each would capture the class state, which [mut-capture] rejects (container.ss.ts q1b)
//  4. === / !== with neither operand a literal, typeof, template, undefined/null, or a `.type/.k/.name/.operator/.kind/
//     .length/.n/.origin/.rule` read: an upper bound on identity comparisons ([strict-eq-object])
//  5. call graph over units (top-level declarations and class members; `this.m` -> Class.m, `this.reg.m` /
//     `reg.m` -> Registry.m, imported names -> their declaration), its strongly connected components
// Run: bun selfhost/checker-survey/analyze.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";
import { inventory, stratum, FILES } from "./inventory.ts";

const ROOT = resolve(import.meta.dir, "../..");
const units = inventory().filter((d) => d.kind !== "import");
const keyOf = (file: string, name: string) => `${file}:${name}`;
const unitAt = new Map<string, (typeof units)[number]>();
for (const u of units) unitAt.set(keyOf(u.file, u.name), u);

const vocab = new Map<string, number>();
const astUnits = new Set<string>();
const cbWriters: string[] = [];
const identity: string[] = [];
const edges = new Map<string, Set<string>>();
const MUT_M = new Set(["push", "pop", "shift", "unshift", "splice", "set", "add", "delete", "clear", "sort", "reverse", "fill"]);
const directWriter = new Set<string>();
const parserUnits = new Set<string>();
const PROPS = new Set(["type", "k", "name", "operator", "kind", "length", "n", "origin", "rule", "value", "status", "computed", "size"]);
const prim = (x: Node): boolean =>
  x.type === "Literal" || x.type === "TemplateLiteral" || (x.type === "UnaryExpression" && (x.operator === "typeof" || x.operator === "-" || x.operator === "!")) ||
  (x.type === "Identifier" && (x.name === "undefined" || x.name === "null")) ||
  (x.type === "MemberExpression" && !x.computed && PROPS.has(x.property.name)) || x.type === "BinaryExpression" || x.type === "CallExpression";

for (const file of FILES) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const P = parse(src);
  // imported names -> file
  const imported = new Map<string, string>();
  for (const s of P.program.body as Node[]) if (s.type === "ImportDeclaration" && String(s.source.value).startsWith(".")) {
    const f = relative(ROOT, resolve(dirname(join(ROOT, file)), s.source.value));
    for (const sp of s.specifiers) if (sp.imported) imported.set(sp.local.name, f === "lite/types.ts" ? "lite/types.ss.ts" : f);
  }
  const mine = units.filter((u) => u.file === file);
  const topNames = new Set(mine.map((u) => u.name));
  for (const u of mine) {
    const uk = keyOf(file, u.name);
    const out = new Set<string>();
    edges.set(uk, out);
    const cls = u.name.includes(".") ? u.name.split(".")[0] : null;
    // find the node for this unit by span
    let node: Node | null = null;
    const find = (x: any) => { if (node || !x || typeof x !== "object") return; if (Array.isArray(x)) { x.forEach(find); return; } if (typeof x.type === "string" && x.start === u.start && x.end === u.end) { node = x; return; } for (const k in x) if (k !== "loc") find(x[k]); };
    find(P.program);
    if (!node) continue;
    const walk = (x: any, parent: any, inCb: Node | null) => {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) { for (const y of x) walk(y, parent, inCb); return; }
      if (typeof x.type !== "string") return;
      if (x.type === "MemberExpression" && !x.computed && x.property.name === "type" && !(parent?.type === "MemberExpression" && parent.object === x && false)) astUnits.add(uk);
      if (x.type === "CallExpression" && x.callee.type === "Identifier" && (x.callee.name === "kids" || x.callee.name === "isFn")) astUnits.add(uk);
      // the parser: a call of parse(…), any acorn.* member, or the TS/TSX parser classes
      if ((x.type === "CallExpression" && x.callee.type === "Identifier" && x.callee.name === "parse") ||
        (x.type === "MemberExpression" && x.object.type === "Identifier" && x.object.name === "acorn") ||
        (x.type === "Identifier" && (x.name === "TS" || x.name === "TSX") && file === "lite/parse.ts")) parserUnits.add(uk);
      const isTypeRead = (e: Node) => e.type === "MemberExpression" && !e.computed && e.property.name === "type";
      if (x.type === "BinaryExpression" && /^[!=]==?$/.test(x.operator)) {
        for (const [a, b] of [[x.left, x.right], [x.right, x.left]]) if (isTypeRead(a) && b.type === "Literal" && typeof b.value === "string") vocab.set(b.value, (vocab.get(b.value) ?? 0) + 1);
        if (!prim(x.left) && !prim(x.right)) identity.push(`${uk} L${P.line(x.start)} ${src.slice(x.start, x.end).slice(0, 70)}`);
      }
      if (x.type === "SwitchStatement" && isTypeRead(x.discriminant)) for (const c of x.cases) if (c.test?.type === "Literal") vocab.set(c.test.value, (vocab.get(c.test.value) ?? 0) + 1);
      if (x.type === "CallExpression" && x.callee.type === "MemberExpression" && x.callee.property.name === "test" && x.callee.object.regex && x.arguments[0] && isTypeRead(x.arguments[0]))
        for (const m of x.callee.object.regex.pattern.replace(/^\^\(?|\)?\$$/g, "").split("|")) if (/^[A-Za-z]+$/.test(m)) vocab.set(m, (vocab.get(m) ?? 0) + 1);
      // edges
      if (x.type === "Identifier" && !(parent?.type === "MemberExpression" && parent.property === x && !parent.computed) && !(parent?.type === "Property" && parent.key === x && !parent.computed)) {
        if (topNames.has(x.name) && x.name !== u.name) out.add(keyOf(file, x.name));
        else if (imported.has(x.name)) { const t = keyOf(imported.get(x.name)!, x.name); if (unitAt.has(t)) out.add(t); }
        else if (x.name === u.name && !cls) out.add(uk);
      }
      if (cls && x.type === "MemberExpression" && !x.computed && x.object.type === "ThisExpression") {
        const t = keyOf(file, `${cls}.${x.property.name}`);
        if (unitAt.has(t)) out.add(t);
        if (inCb) cbWriters.push(`${uk} L${P.line(inCb.start)} callback uses this.${x.property.name}`);
        // a direct write of instance state: this.f = …, this.f.g = …, this.f.push/set/add(…), this.f.g.set(…)
        let top: any = x, up: any = parent;
        const chain: any[] = [x];
        while (up && up.type === "MemberExpression" && up.object === top) { chain.push(up); top = up; up = null; }
        const pe = parent;
        if ((pe?.type === "AssignmentExpression" && pe.left === x) || (pe?.type === "UpdateExpression")) directWriter.add(uk);
        if (pe?.type === "MemberExpression" && pe.object === x && !pe.computed && MUT_M.has(pe.property.name)) directWriter.add(uk);
        if (pe?.type === "MemberExpression" && pe.object === x && !pe.computed && /^(types|bindingOf|calls|memberFlags|fnInfo|vars)$/.test(pe.property.name)) directWriter.add(uk);
      }
      const regM = x.type === "MemberExpression" && !x.computed && ((x.object.type === "MemberExpression" && x.object.object.type === "ThisExpression" && x.object.property.name === "reg") || (x.object.type === "Identifier" && x.object.name === "reg"));
      if (regM) { const t = keyOf("lite/registry.ts", `Registry.${x.property.name}`); if (unitAt.has(t)) out.add(t); }
      const ch = x.type === "MemberExpression" && !x.computed && x.object.type === "Identifier" && (x.object.name === "ch" || x.object.name === "C");
      if (ch) { const t = keyOf("lite/infer/frozen/infer.ts", `Checker.${x.property.name}`); if (unitAt.has(t)) out.add(t); }
      const isCbArg = (y: Node) => parent && (parent.type === "CallExpression" || parent.type === "NewExpression") && parent.arguments.includes(y);
      const nextCb = cls && /^(ArrowFunctionExpression|FunctionExpression)$/.test(x.type) && isCbArg(x) ? x : inCb;
      for (const k in x) if (k !== "loc") walk(x[k], x, nextCb);
    };
    walk(node, null, null);
  }
}
// dedupe callback lines per callback
const cbSet = [...new Set(cbWriters.map((l) => l.replace(/ callback uses .*/, "")))];
// writers: a direct write, or a call of a writer (to a fixpoint over the call graph)
const writer = new Set(directWriter);
for (let changed = true; changed;) { changed = false; for (const [v, ws] of edges) if (!writer.has(v) && [...ws].some((w) => writer.has(w))) { writer.add(v); changed = true; } }
const cbWriting = [...new Set(cbWriters.filter((l) => { const m = /callback uses this\.(\w+)/.exec(l)!; const cls = l.split(":")[1]!.split(".")[0]; const f = l.split(":")[0]; return writer.has(`${f}:${cls}.${m[1]}`); }).map((l) => l.replace(/ callback uses .*/, "")))];

// Tarjan SCC
const idx = new Map<string, number>(), low = new Map<string, number>(), on = new Set<string>(), stack: string[] = [];
const sccs: string[][] = [];
let i = 0;
const strong = (v: string) => {
  idx.set(v, i); low.set(v, i); i++; stack.push(v); on.add(v);
  for (const w of edges.get(v) ?? []) {
    if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
    else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
  }
  if (low.get(v) === idx.get(v)) { const c: string[] = []; let w: string; do { w = stack.pop()!; on.delete(w); c.push(w); } while (w !== v); sccs.push(c); }
};
for (const v of edges.keys()) if (!idx.has(v)) strong(v);
const big = sccs.filter((c) => c.length > 1).sort((a, b) => b.length - a.length);
const code = (k: string) => unitAt.get(k)?.code ?? 0;

const lines: string[] = [];
const vs = [...vocab].sort((a, b) => b[1] - a[1]);
lines.push(`node-type vocabulary: ${vs.length} distinct strings compared with .type`);
lines.push(vs.map(([k, n]) => `${k}=${n}`).join(" "));
const core = units.filter((u) => stratum(u) === "core" || stratum(u) === "borderline");
const astCore = core.filter((u) => astUnits.has(keyOf(u.file, u.name)));
lines.push(`AST-dependent units (read .type or call kids/isFn), core+borderline: ${astCore.length} of ${core.length} units, ${astCore.reduce((s, u) => s + u.code, 0)} of ${core.reduce((s, u) => s + u.code, 0)} code lines`);
// the same with the registry's members taken as pure (its memos dropped, as in container_demo.ss.ts)
const writerNoReg = new Set([...directWriter].filter((k) => !k.startsWith("lite/registry.ts:")));
for (let changed = true; changed;) { changed = false; for (const [v, ws] of edges) if (!v.startsWith("lite/registry.ts:") && !writerNoReg.has(v) && [...ws].some((w) => writerNoReg.has(w))) { writerNoReg.add(v); changed = true; } }
const cbWritingNoReg = [...new Set(cbWriters.filter((l) => { const m = /callback uses this\.(\w+)/.exec(l)!; const cls = l.split(":")[1]!.split(".")[0]; const f = l.split(":")[0]; return writerNoReg.has(`${f}:${cls}.${m[1]}`); }).map((l) => l.replace(/ callback uses .*/, "")))];
const members = units.filter((u) => u.kind === "method" || u.kind === "field" || u.kind === "ctor");
lines.push(`class members that write instance state, directly or through a call: ${members.filter((u) => writer.has(keyOf(u.file, u.name))).length} of ${members.length}`);
lines.push(`callbacks in class members that call a state-writing member (each one [mut-capture] in a closure port): ${cbWriting.length}`);
lines.push(...cbWriting.map((l) => "  " + l));
lines.push(`  of which with the registry pure (memos dropped): ${cbWritingNoReg.length}`);
lines.push(...cbWritingNoReg.map((l) => "    " + l));
lines.push(`callbacks in class members that use this.* at all: ${cbSet.length}`);
const pc = core.filter((u) => parserUnits.has(keyOf(u.file, u.name)));
lines.push(`units that call the parser directly (parse(…), acorn.*, TS/TSX), core+borderline: ${pc.length} units, ${pc.reduce((s, u) => s + u.code, 0)} code lines: ${pc.map((u) => u.name).join(" ")}`);
const mem = core.filter((u) => u.kind === "method" || u.kind === "field" || u.kind === "ctor");
lines.push(`class members (Scope, Checker, Registry): ${mem.length} units, ${mem.reduce((s, u) => s + u.code, 0)} code lines`);
lines.push(...cbSet.map((l) => "  " + l));
lines.push(`=== / !== with no primitive-looking operand (upper bound on identity compares): ${identity.length}`);
lines.push(...identity.map((l) => "  " + l));
lines.push(`call-graph SCCs of more than one unit (self-recursion is local in a cell and not counted): ${big.length}`);
for (const c of big) lines.push(`  size ${c.length}, ${c.reduce((s, k) => s + code(k), 0)} code lines: ${c.length > 12 ? c.slice(0, 12).join(" ") + " …" : c.join(" ")}`);
writeFileSync(join(import.meta.dir, "out/analyze.txt"), lines.join("\n") + "\n");
writeFileSync(join(import.meta.dir, "out/sccs.json"), JSON.stringify(big, null, 1));
console.log(lines.filter((l) => !l.startsWith("  ") || l.startsWith("  size")).join("\n"));
