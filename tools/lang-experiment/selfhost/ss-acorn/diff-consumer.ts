// The consumer (ss/consumer.ss.ts syntaxCheck: distinct names, module shape, syntax pass), which reaches the tree only
// through the module's parse under FN CROSSING, against the original on the nested prototype's corpus (361 inputs,
// ../nested-ast/corpus.ts) and synthetic inputs: module shape against orig checkSources(...).module filtered to the shape
// rules plus its cells (name, line); syntax pass per cell against core.ts syntaxPass sliced out of orig/lite/core.ts by
// its AST span. Compared as ordered lists of `rule Lline message`. Controls: one consumer cell mutated must differ.
// Run: bun diff-consumer.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../nested-ast/orig/lite/parse.ts";
import { checkSources } from "../nested-ast/orig/lite/core.ts";
import { builtinTypeNames } from "../nested-ast/orig/lite/registry.ts";
import { reservedName, viewofInputName, RESERVED_MSG } from "../nested-ast/orig/lite/types.ts";
import { corpus, type Input } from "../nested-ast/corpus.ts";
import { SYNTHETIC } from "../nested-ast/synthetic.ts";
import { linkM } from "./mod.ts";
import { nestDistinct } from "../nested-ast/adapter.ts";
const { fnCalls } = await import(`./${process.env.SSA_COPY ?? "rule"}/lite/boundary.ts`);

const HERE = import.meta.dir;
function originalSyntaxPass(): (n: any, report: Function, unsup: Function) => void {
  const src = readFileSync(join(HERE, "../nested-ast/orig/lite/core.ts"), "utf8");
  const P = parse(src);
  const parts: string[] = [];
  for (const st of P.program.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    if (d?.type === "FunctionDeclaration" && d.id.name === "syntaxPass") parts.push(src.slice(d.start, d.end));
    if (d?.type === "VariableDeclaration" && d.declarations.some((x: any) => x.id.name === "SYNTAX" || x.id.name === "TYPE_POSITIONS")) parts.push(src.slice(d.start, d.end));
  }
  if (parts.length !== 3) throw new Error(`expected syntaxPass, SYNTAX, TYPE_POSITIONS in core.ts; found ${parts.length}`);
  const js = new Bun.Transpiler({ loader: "ts" }).transformSync(parts.join("\n"));
  return new Function("reservedName", "viewofInputName", "RESERVED_MSG", `${js}\nreturn syntaxPass;`)(reservedName, viewofInputName, RESERVED_MSG);
}
const syntaxPassOrig = originalSyntaxPass();
const SHAPE_RULES = new Set(["builtin-type-name", "cell-not-function", "module-level", "no-enum", "no-namespace", "no-class", "no-var", "duplicate-cell"]);
const shellNamesOf = (shell?: string) => {
  const out = new Set<string>();
  for (const st of shell ? parse(shell).program.body : []) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : null;
    if (d?.type === "VariableDeclaration") for (const x of d.declarations) if (x.id.type === "Identifier") out.add(x.id.name);
    if (d?.type === "FunctionDeclaration") out.add(d.id.name);
  }
  return out;
};
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
// acorn's node for the port's cell: the function node with the same span
const fnAt = (prog: any, start: number, end: number): any => {
  let hit: any = null;
  const w = (n: any) => { if (hit || !n || typeof n !== "object") return; if (Array.isArray(n)) { n.forEach(w); return; } if (typeof n.type !== "string") return; if (/Function/.test(n.type) && n.start === start && n.end === end) { hit = n; return; } for (const k in n) if (k !== "loc") w(n[k]); };
  w(prog);
  return hit;
};
export function run(L: any, label: string, quiet = false, inputs: Input[] = corpus()) {
  const builtin = new Set(builtinTypeNames());
  const t = { inputs: 0, skipped: 0, shape: [0, 0], shapeWithErr: 0, syn: [0, 0], synWith: 0, cells: 0, diags: 0, reparsed: 0 };
  const shown: string[] = [];
  for (const c of inputs) {
    t.inputs++;
    let res;
    try { res = checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null }); } catch { t.skipped++; continue; }
    const got = L.syntaxCheck(c.src, c.tsx, builtin, shellNamesOf(c.shell));
    if (!got.ok) { t.skipped++; continue; }
    if (got.parses > 1) t.reparsed++;
    const want = res.module.filter((e: any) => SHAPE_RULES.has(e.rule)).map((e: any) => `${e.rule} L${e.line} ${e.msg}`);
    const gotE = got.shape.errors.map((e: any) => `${e.rule} L${e.at.line} ${e.msg}`);
    const wantCells = res.cells.map((x: any) => `${x.name.replace(/ \(\d+\)$/, "")} L${x.line}`);
    const gotCells = got.shape.cells.map((x: any, i: number) => `${got.names[i]} L${x.stmt.line}`);
    const ok = same(want, gotE) && same(wantCells, gotCells);
    t.shape[ok ? 0 : 1]++;
    if (want.length) t.shapeWithErr++;
    if (!ok && shown.length < 6) shown.push(`shape ${c.id}: want ${JSON.stringify([want, wantCells])} got ${JSON.stringify([gotE, gotCells])}`);
    // the original walks acorn's tree of the text checkSources parsed: with stand-ins for a duplicate name, made by
    // ../nested-ast/adapter.ts nestDistinct (core.ts distinctNames in TypeScript), not by the port
    const P = (() => { try { return parse(nestDistinct(c.src, c.tsx).text, { jsx: c.tsx }); } catch { return null; } })();
    got.shape.cells.forEach((cell: any, i: number) => {
      t.cells++;
      const fn = P ? fnAt(P.program, cell.fn.start, cell.fn.end) : null;
      const orig: string[] = [];
      if (fn) syntaxPassOrig(fn, (n: any, rule: string, msg: string) => orig.push(`${rule} L${n.loc.start.line} ${msg}`), (n: any, w: string) => orig.push(`unsupported L${n.loc.start.line} ${w} (unsup)`));
      else orig.push("(no acorn node at the port's span)");
      const port = got.diags[i].map((d: any) => `${d.rule} L${d.at.line} ${d.msg}${d.unsup ? " (unsup)" : ""}`);
      t.diags += orig.length;
      if (orig.length) t.synWith++;
      const okS = same(orig, port);
      t.syn[okS ? 0 : 1]++;
      if (!okS && shown.length < 6) shown.push(`syntaxPass ${c.id} ${cell.name}: want ${JSON.stringify(orig)} got ${JSON.stringify(port)}`);
    });
  }
  if (!quiet) {
    console.log(`${label}: ${t.inputs} inputs, ${t.skipped} skipped (checkSources throws, or no parse), ${t.reparsed} parsed more than once (distinct names); ${t.cells} cells`);
    console.log(`  module shape: ${t.shape[0]} same, ${t.shape[1]} differ; inputs with a module-shape error: ${t.shapeWithErr}`);
    console.log(`  syntaxPass: ${t.syn[0]} same, ${t.syn[1]} differ; cells with a diagnostic: ${t.synWith} (${t.diags} diagnostics)`);
    for (const s of shown) console.log(`  ${s.slice(0, 400)}`);
  }
  return t;
}
if (import.meta.main) {
  const c0 = fnCalls.calls;
  run(linkM(), "consumer, corpus");
  console.log(`  parse calls through the wrapper: ${fnCalls.calls - c0}`);
  run(linkM(), "consumer, synthetic", false, SYNTHETIC);
  const SYNTHETIC_N = [{ id: "synthetic-n.ts", tsx: false, src: "export const g = (o) => viewof.x + o.viewof + ({ mutable: 1 }).mutable;" },
    // a reserved name in a parameter's type, which the walk does not report (a type position)
    { id: "synthetic-t.ts", tsx: false, src: "export const h = (x: viewof) => x;" }];
  run(linkM(), "consumer, synthetic-n and -t", false, SYNTHETIC_N);
  const all = [...corpus(), ...SYNTHETIC, ...SYNTHETIC_N];
  const controls: [string, Record<string, any>][] = [
    ["namedByParent ignores computed", { namedByParent: () => (x: any, p: any) => { if (p !== null && p.type === "MemberExpression") return p.property.nid === x.nid; return p !== null && p.type === "Property" && p.key.nid === x.nid && p.value.nid !== x.nid; } }],
    ["moduleLevelRule drops no-var", { moduleLevelRule: () => (d: any, st: any) => { if (st.type === "ImportDeclaration" && st.importKind === "type") return null; if (d.type === "TSEnumDeclaration") return "no-enum"; if (d.type === "TSModuleDeclaration") return "no-namespace"; if (d.type === "ClassDeclaration") return "no-class"; return "module-level"; } }],
    ["namedByParent compares type, not nid", { namedByParent: () => (x: any, p: any) => { if (p !== null && p.type === "MemberExpression") return !p.computed && p.property.type === x.type; return p !== null && p.type === "Property" && !p.computed && p.key.type === x.type && p.value.type !== x.type; } }],
    // (TYPE_KEYS without returnType is an equivalent mutant: a returnType holds a TSTypeAnnotation, whose typeAnnotation key is a type position; out/diff-consumer-returnType-control.txt)
    ["TYPE_KEYS without typeAnnotation", { TYPE_KEYS: () => new Set(["returnType", "typeParameters", "typeArguments"]) }],
    ["distinctParse gives up at once", { distinctParse: (parse: any) => (src: string, jsx: boolean) => ({ parse: parse(src, jsx), text: src, dups: [], parses: 1 }) }],
  ];
  for (const [name, over] of controls) {
    const r = run(linkM(over), `control: ${name}`, true, all);
    console.log(`control (${name}): shape differ ${r.shape[1]}, syntaxPass differ ${r.syn[1]}, skipped ${r.skipped}`);
  }
}
