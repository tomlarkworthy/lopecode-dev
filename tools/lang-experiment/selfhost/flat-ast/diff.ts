// Differential: each ported visitor (visit-a.ss.ts, visit-b.ss.ts, linked for bun as lite/events.test.ts links its
// cells) against the original on the corpus, as ordered lists before any dedupe.
//   module shape  port moduleShape vs checkSources' result.module (the rules the cell loop emits) and its cells (name, line)
//   syntax pass   port A and B syntaxPass vs core.ts syntaxPass, sliced out of core.ts by its AST span and evaluated
//   captures      port captures vs capture.ts captures, every identifier parameter of the cell tainted
//   line/leading  port lineOf/leading vs parse.ts line/leading, at every node
// Controls: the same comparison with one mutated port cell must report differences.
// Run: bun selfhost/flat-ast/diff.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../lite/parse.ts";
import { checkSources } from "../../lite/core.ts";
import { captures as capturesOrig } from "../../lite/capture.ts";
import { builtinTypeNames } from "../../lite/registry.ts";
import { reservedName, viewofInputName, RESERVED_MSG } from "../../lite/types.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as messageCells from "../../lite/messages.ss.ts";
import { link } from "../../lite/link.ts";
import * as A from "./visit-a.ss.ts";
import * as B from "./visit-b.ss.ts";
import * as C from "./visit-c.ss.ts";
import { flatDistinct, flattenB } from "./adapter.ts";
import { corpus, type Input } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";

const ROOT = join(import.meta.dir, "../..");
const prelude = { mut: rtCells.mut(), freeze: rtCells.freeze() };
export const linkA = (over: Record<string, any> = {}) => link({ ...messageCells, ...A, ...over } as any, prelude) as any;
const LA = linkA(), LB = link({ ...messageCells, ...B } as any, prelude) as any;
// layout C takes the table as a cell: linked once per input, with flatParse a cell whose text reads the value from a global
const linkC = (v: unknown) => { (globalThis as any).__flatParse = v; return link({ ...messageCells, ...C, flatParse: () => (globalThis as any).__flatParse } as any, prelude) as any; };

// core.ts syntaxPass with SYNTAX and TYPE_POSITIONS, sliced by AST span and run as JavaScript
function originalSyntaxPass(): (n: any, report: Function, unsup: Function) => void {
  const src = readFileSync(join(ROOT, "lite/core.ts"), "utf8");
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

export function run(L: any, label: string, quiet = false, inputs: Input[] = corpus()) {
  const builtin = new Set(builtinTypeNames());
  const tally = { inputs: 0, skipped: 0, shape: [0, 0], shapeWithErr: 0, syn: [0, 0], synB: [0, 0], synC: [0, 0], synWith: 0, cap: [0, 0], capWith: 0, lines: [0, 0], lead: [0, 0], leadWith: 0, cells: 0, diags: 0, caps: 0 };
  const shown: string[] = [];
  const note = (s: string) => { if (shown.length < 6) shown.push(s); };
  for (const c of inputs) {
    tally.inputs++;
    const dist = flatDistinct(c.src, c.tsx);
    if (!dist.parse.ok) { tally.skipped++; continue; }
    const P = parse(dist.text, { jsx: c.tsx });
    const nodes = dist.parse.ast.nodes, nodesB = flattenB(P.program);
    const byStart = new Map<string, any>();
    (function w(n: any) { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach(w); if (typeof n.type !== "string") return; byStart.set(`${n.type}@${n.start}@${n.end}`, n); for (const k in n) if (k !== "loc") w(n[k]); })(P.program);
    const acornOf = (i: number) => { const r = nodes[i]; return byStart.get(`${r.type === "Other" ? r.kind : r.type}@${r.start}@${r.end}`); };

    // module shape
    let res;
    try { res = checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null }); } catch { tally.skipped++; continue; }
    const shape = L.moduleShape(nodes, builtin, shellNamesOf(c.shell));
    const want = res.module.filter((e) => SHAPE_RULES.has(e.rule)).map((e) => `${e.rule} L${e.line} ${e.msg}`);
    const got = shape.errors.map((e: any) => `${e.rule} L${nodes[e.at].line} ${e.msg}`);
    const unPh = (n: string) => { for (const [ph, d] of dist.dups) n = n.split(ph).join(d.name); return n; };
    const wantCells = res.cells.map((x) => `${x.name.replace(/ \(\d+\)$/, "")} L${x.line}`);
    const gotCells = shape.cells.map((x: any) => `${unPh(x.name)} L${nodes[x.stmt].line}`);
    const okShape = sameList(want, got) && sameList(wantCells, gotCells);
    tally.shape[okShape ? 0 : 1]++;
    if (want.length) tally.shapeWithErr++;
    if (!okShape) note(`${label} shape ${c.id}: want ${JSON.stringify([want, wantCells])} got ${JSON.stringify([got, gotCells])}`);

    // syntax pass, captures, per cell
    const LC = linkC(dist.parse);
    for (const cell of shape.cells) {
      tally.cells++;
      const fn = acornOf(cell.fn);
      const orig: string[] = [];
      syntaxPassOrig(fn, (n: any, rule: string, msg: string) => orig.push(`${rule} L${P.line(n.start)} ${msg}`), (n: any, w: string) => orig.push(`unsupported L${P.line(n.start)} ${w} (unsup)`));
      const fmt = (ns: any[]) => (d: any) => `${d.rule} L${ns[d.at].line} ${d.msg}${d.unsup ? " (unsup)" : ""}`;
      const portA = L.syntaxPass(nodes, cell.fn).map(fmt(nodes));
      const portB = LB.syntaxPass(nodesB, cell.fn).map(fmt(nodesB));
      const portC = LC.syntaxPass(cell.fn).map(fmt(nodes));
      tally.synC[sameList(orig, portC) ? 0 : 1]++;
      if (!sameList(orig, portC)) note(`${label} syntaxPass C ${c.id} ${cell.name}: want ${JSON.stringify(orig)} got ${JSON.stringify(portC)}`);
      tally.diags += orig.length;
      if (orig.length) tally.synWith++;
      tally.syn[sameList(orig, portA) ? 0 : 1]++;
      tally.synB[sameList(orig, portB) ? 0 : 1]++;
      if (!sameList(orig, portA)) note(`${label} syntaxPass A ${c.id} ${cell.name}: want ${JSON.stringify(orig)} got ${JSON.stringify(portA)}`);
      if (!sameList(orig, portB)) note(`${label} syntaxPass B ${c.id} ${cell.name}: want ${JSON.stringify(orig)} got ${JSON.stringify(portB)}`);
      const tainted = new Map<string, string>(fn.params.filter((p: any) => p.type === "Identifier").map((p: any) => [p.name, `param ${p.name}`]));
      const capO = capturesOrig(fn, tainted).map((x) => `${x.name} L${P.line(x.node.start)} ${x.why}`);
      const capP = L.captures(nodes, cell.fn, tainted).map((x: any) => `${x.name} L${nodes[x.at].line} ${x.why}`);
      tally.caps += capO.length;
      if (capO.length) tally.capWith++;
      tally.cap[sameList(capO, capP) ? 0 : 1]++;
      if (!sameList(capO, capP)) note(`${label} captures ${c.id} ${cell.name}: want ${JSON.stringify(capO)} got ${JSON.stringify(capP)}`);
    }
    // line and leading at every node
    for (let i = 0; i < nodes.length; i++) {
      tally.lines[L.lineOf(dist.parse.ast.lineStarts, nodes[i].start) === P.line(nodes[i].start) ? 0 : 1]++;
      const lo = P.leading(acornOf(i)).map((x) => `${x.start}-${x.end}`), lp = L.leading(dist.parse.ast, nodes[i].start).map((x: any) => `${x.start}-${x.end}`);
      if (lo.length) tally.leadWith++;
      tally.lead[sameList(lo, lp) ? 0 : 1]++;
    }
  }
  if (!quiet) {
    console.log(`${label}: ${tally.inputs} inputs, ${tally.skipped} skipped (do not parse, or checkSources throws); ${tally.cells} cells`);
    console.log(`  module shape: ${tally.shape[0]} same, ${tally.shape[1]} differ; inputs with a module-shape error: ${tally.shapeWithErr}`);
    console.log(`  syntaxPass A: ${tally.syn[0]} same, ${tally.syn[1]} differ; B: ${tally.synB[0]} same, ${tally.synB[1]} differ; C: ${tally.synC[0]} same, ${tally.synC[1]} differ; cells with a diagnostic: ${tally.synWith} (${tally.diags} diagnostics)`);
    console.log(`  captures: ${tally.cap[0]} same, ${tally.cap[1]} differ; cells with a capture: ${tally.capWith} (${tally.caps} captures)`);
    console.log(`  lineOf: ${tally.lines[0]} same, ${tally.lines[1]} differ; leading: ${tally.lead[0]} same, ${tally.lead[1]} differ (${tally.leadWith} nodes with a leading comment)`);
    for (const s of shown) console.log(`  ${s.slice(0, 400)}`);
  }
  return tally;
}

if (import.meta.main) {
  run(LA, "ports, corpus");
  run(LA, "ports, synthetic", false, SYNTHETIC);
  const all = [...corpus(), ...SYNTHETIC];
  // controls: one logic change in a port cell each; the comparison must see it
  const controls: [string, Record<string, any>][] = [
    // namedByParent without the computed test
    ["namedByParent ignores computed", { namedByParent: () => (nodes: any[], i: number, root: number) => { const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent]; if (p && p.type === "MemberExpression") return p.property === i; return !!p && p.type === "Property" && p.key === i && p.value !== i; } }],
    // readsBinding without the label test
    ["readsBinding counts labels", { readsBinding: () => (nodes: any[], i: number, root: number) => { const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent]; if (!x || !p) return true; if (p.type === "MemberExpression" && x.field === "property" && !p.computed) return false; return !((p.type === "Property" || p.type === "MethodDefinition" || p.type === "PropertyDefinition") && x.field === "key" && !p.computed); } }],
    // moduleLevelRule without no-var
    ["moduleLevelRule drops no-var", { moduleLevelRule: () => (d: any, st: any) => { if (st.type === "ImportDeclaration" && st.importKind === "type") return null; if (d.type === "TSEnumDeclaration") return "no-enum"; if (d.type === "TSModuleDeclaration") return "no-namespace"; if (d.type === "ClassDeclaration") return "no-class"; return "module-level"; } }],
  ];
  for (const [name, over] of controls) {
    const t = run(linkA(over), `control: ${name}`, true, all);
    console.log(`control (${name}): shape differ ${t.shape[1]}, syntaxPass A differ ${t.syn[1]}, captures differ ${t.cap[1]}`);
  }
}
