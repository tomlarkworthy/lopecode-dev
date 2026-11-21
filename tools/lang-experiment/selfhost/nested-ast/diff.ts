// Differential: each ported visitor (visit-n.ss.ts, linked for bun as lite/events.test.ts links its cells) against the
// original (orig/ snapshot) on the corpus, as ordered lists before any dedupe. The ports run on the value checked
// code would get: the adapter's tree after cross() (recdisp copy: checked against NParse, frozen copy).
//   module shape  port moduleShape vs checkSources' result.module (the rules the cell loop emits) and its cells (name, line)
//   syntax pass   port syntaxPass vs core.ts syntaxPass, sliced out of orig/lite/core.ts by its AST span and evaluated
//   captures      port captures vs capture.ts captures, every identifier parameter of the cell tainted
//   line/leading  port lineOf/leading vs parse.ts line/leading, at every node
// Controls: the same comparison with one mutated port cell must report differences.
// Run: bun diff.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./orig/lite/parse.ts";
import { checkSources } from "./orig/lite/core.ts";
import { captures as capturesOrig } from "./orig/lite/capture.ts";
import { builtinTypeNames } from "./orig/lite/registry.ts";
import { reservedName, viewofInputName, RESERVED_MSG } from "./orig/lite/types.ts";
import * as rtCells from "./orig/lite/runtime.ss.ts";
import * as messageCells from "./orig/lite/messages.ss.ts";
import { link } from "./orig/lite/link.ts";
import * as kidsCells from "./kids-n.ss.ts";
import * as N from "./visit-n.ss.ts";
import { nestDistinct, acornOrder } from "./adapter.ts";
import { corpus, type Input } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";

const HERE = import.meta.dir;
const { cross } = await import("./recdisp/lite/boundary.ts");
const { checkSources: checkRec } = await import("./recfix/lite/core.ts");
export const SHAPE = checkRec({ cells: readFileSync(join(HERE, "ast-n.ss.ts"), "utf8") + `\nexport const f = (x: NParse): number => 1;`, tsx: false, outside: [{ name: "x" }] }).facts!.get("f")!.params[0]!.boundary!.shape;
const prelude = { mut: rtCells.mut(), freeze: rtCells.freeze() };
const { parsed: _outside, ...portCells } = N as any;
export const linkN = (over: Record<string, any> = {}) => link({ ...messageCells, ...kidsCells, ...portCells, ...over } as any, prelude) as any;

function originalSyntaxPass(): (n: any, report: Function, unsup: Function) => void {
  const src = readFileSync(join(HERE, "orig/lite/core.ts"), "utf8");
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
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
// every node of the crossed tree, by nid
export const byNid = (prog: any): any[] => {
  const out: any[] = [];
  const w = (n: any) => { out[n.nid] = n; for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((x) => x && typeof x === "object" && typeof x.type === "string" && w(x)); else if (v && typeof v === "object" && typeof v.type === "string") w(v); } if (n.type === "Other") for (const f of n.fields) for (const x of f.nodes) if (x) w(x); };
  w(prog);
  return out;
};

export function run(L: any, label: string, quiet = false, inputs: Input[] = corpus()) {
  const builtin = new Set(builtinTypeNames());
  const tally = { inputs: 0, skipped: 0, nidMismatch: 0, shape: [0, 0], shapeWithErr: 0, syn: [0, 0], synWith: 0, cap: [0, 0], capWith: 0, lines: [0, 0], lead: [0, 0], leadWith: 0, cells: 0, diags: 0, caps: 0 };
  const shown: string[] = [];
  const note = (s: string) => { if (shown.length < 6) shown.push(s); };
  for (const c of inputs) {
    tally.inputs++;
    const dist = nestDistinct(c.src, c.tsx);
    if (!dist.parse.ok) { tally.skipped++; continue; }
    const value: any = cross(dist.parse, SHAPE, `diff${tally.inputs}.nestedParse`);
    const ast = value.ast, nodes = byNid(ast.program);
    const P = parse(dist.text, { jsx: c.tsx });
    const acorn = acornOrder(P.program);
    if (acorn.length !== nodes.length || acorn.some((a, i) => a.start !== nodes[i].start || a.end !== nodes[i].end)) { tally.nidMismatch++; continue; }

    let res;
    try { res = checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null }); } catch { tally.skipped++; continue; }
    const shape = L.moduleShape(ast.program, builtin, shellNamesOf(c.shell));
    const want = res.module.filter((e) => SHAPE_RULES.has(e.rule)).map((e) => `${e.rule} L${e.line} ${e.msg}`);
    const got = shape.errors.map((e: any) => `${e.rule} L${e.at.line} ${e.msg}`);
    const unPh = (n: string) => { for (const [ph, d] of dist.dups) n = n.split(ph).join(d.name); return n; };
    const wantCells = res.cells.map((x) => `${x.name.replace(/ \(\d+\)$/, "")} L${x.line}`);
    const gotCells = shape.cells.map((x: any) => `${unPh(x.name)} L${x.stmt.line}`);
    const okShape = sameList(want, got) && sameList(wantCells, gotCells);
    tally.shape[okShape ? 0 : 1]++;
    if (want.length) tally.shapeWithErr++;
    if (!okShape) note(`${label} shape ${c.id}: want ${JSON.stringify([want, wantCells])} got ${JSON.stringify([got, gotCells])}`);

    for (const cell of shape.cells) {
      tally.cells++;
      const fn = acorn[cell.fn.nid];
      const orig: string[] = [];
      syntaxPassOrig(fn, (n: any, rule: string, msg: string) => orig.push(`${rule} L${P.line(n.start)} ${msg}`), (n: any, w: string) => orig.push(`unsupported L${P.line(n.start)} ${w} (unsup)`));
      const port = L.syntaxPass(cell.fn).map((d: any) => `${d.rule} L${d.at.line} ${d.msg}${d.unsup ? " (unsup)" : ""}`);
      tally.diags += orig.length;
      if (orig.length) tally.synWith++;
      tally.syn[sameList(orig, port) ? 0 : 1]++;
      if (!sameList(orig, port)) note(`${label} syntaxPass ${c.id} ${cell.name}: want ${JSON.stringify(orig)} got ${JSON.stringify(port)}`);
      const tainted = new Map<string, string>(fn.params.filter((p: any) => p.type === "Identifier").map((p: any) => [p.name, `param ${p.name}`]));
      const capO = capturesOrig(fn, tainted).map((x) => `${x.name} L${P.line(x.node.start)} ${x.why}`);
      const capP = L.captures(cell.fn, tainted).map((x: any) => `${x.name} L${x.node.line} ${x.why}`);
      tally.caps += capO.length;
      if (capO.length) tally.capWith++;
      tally.cap[sameList(capO, capP) ? 0 : 1]++;
      if (!sameList(capO, capP)) note(`${label} captures ${c.id} ${cell.name}: want ${JSON.stringify(capO)} got ${JSON.stringify(capP)}`);
    }
    for (let i = 0; i < nodes.length; i++) {
      tally.lines[L.lineOf(ast.lineStarts, nodes[i].start) === P.line(nodes[i].start) ? 0 : 1]++;
      const lo = P.leading(acorn[i]).map((x) => `${x.start}-${x.end}`), lp = L.leading(ast, nodes[i].start).map((x: any) => `${x.start}-${x.end}`);
      if (lo.length) tally.leadWith++;
      tally.lead[sameList(lo, lp) ? 0 : 1]++;
    }
  }
  if (!quiet) {
    console.log(`${label}: ${tally.inputs} inputs, ${tally.skipped} skipped (do not parse, or checkSources throws), ${tally.nidMismatch} with nid order unlike acorn's; ${tally.cells} cells`);
    console.log(`  module shape: ${tally.shape[0]} same, ${tally.shape[1]} differ; inputs with a module-shape error: ${tally.shapeWithErr}`);
    console.log(`  syntaxPass: ${tally.syn[0]} same, ${tally.syn[1]} differ; cells with a diagnostic: ${tally.synWith} (${tally.diags} diagnostics)`);
    console.log(`  captures: ${tally.cap[0]} same, ${tally.cap[1]} differ; cells with a capture: ${tally.capWith} (${tally.caps} captures)`);
    console.log(`  lineOf: ${tally.lines[0]} same, ${tally.lines[1]} differ; leading: ${tally.lead[0]} same, ${tally.lead[1]} differ (${tally.leadWith} nodes with a leading comment)`);
    for (const s of shown) console.log(`  ${s.slice(0, 400)}`);
  }
  return tally;
}

if (import.meta.main) {
  run(linkN(), "ports, corpus");
  run(linkN(), "ports, synthetic", false, SYNTHETIC);
  // a reserved name as a member's object and as its property: only identity tells them apart (namedByParent)
  const SYNTHETIC_N = [{ id: "synthetic-n.ts", tsx: false, src: "export const g = (o) => viewof.x + o.viewof + ({ mutable: 1 }).mutable;" }];
  run(linkN(), "ports, synthetic-n", false, SYNTHETIC_N);
  const all = [...corpus(), ...SYNTHETIC, ...SYNTHETIC_N];
  const controls: [string, Record<string, any>][] = [
    ["namedByParent ignores computed", { namedByParent: () => (x: any, p: any) => { if (p !== null && p.type === "MemberExpression") return p.property.nid === x.nid; return p !== null && p.type === "Property" && p.key.nid === x.nid && p.value.nid !== x.nid; } }],
    ["readsBinding counts labels", { readsBinding: () => (p: any, key: string) => { if (p === null) return true; if (p.type === "MemberExpression" && key === "property" && !p.computed) return false; return !((p.type === "Property" || p.type === "MethodDefinition" || p.type === "PropertyDefinition") && key === "key" && !p.computed); } }],
    ["moduleLevelRule drops no-var", { moduleLevelRule: () => (d: any, st: any) => { if (st.type === "ImportDeclaration" && st.importKind === "type") return null; if (d.type === "TSEnumDeclaration") return "no-enum"; if (d.type === "TSModuleDeclaration") return "no-namespace"; if (d.type === "ClassDeclaration") return "no-class"; return "module-level"; } }],
    // where the original compares nodes by identity, compare their types instead of their nids
    ["namedByParent compares type, not nid", { namedByParent: () => (x: any, p: any) => { if (p !== null && p.type === "MemberExpression") return !p.computed && p.property.type === x.type; return p !== null && p.type === "Property" && !p.computed && p.key.type === x.type && p.value.type !== x.type; } }],
  ];
  for (const [name, over] of controls) {
    const t = run(linkN(over), `control: ${name}`, true, all);
    console.log(`control (${name}): shape differ ${t.shape[1]}, syntaxPass differ ${t.syn[1]}, captures differ ${t.cap[1]}`);
  }
}
