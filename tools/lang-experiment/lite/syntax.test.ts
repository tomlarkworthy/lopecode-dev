// bun lite/syntax.test.ts: acorn/syntax.ss.ts (syntaxCheck: distinct names, module shape, syntax pass over typed trees,
// reaching the tree only through parseTree) against the TypeScript it replaced in core.ts, kept frozen in
// syntax.frozen.ts, on the census inputs (acorn/census.ts), the spec's reject cases with their shell and outside cells,
// and two synthetic inputs. Module shape: the frozen loop on the tree of the text core.ts checks (core.ts distinctNames,
// taken out of core.ts by its AST span), and checkSources(...).module filtered to the loop's rules, and the cells'
// names and lines. Syntax pass: per cell, the frozen syntaxPass on the function with the cell's span in that tree.
// Compared as ordered lists of `rule Lline message`. Controls: each cell of the two passes mutated must differ somewhere.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Node } from "./parse.ts";
import { checkSources } from "./core.ts";
import { builtinTypeNames } from "./core.ts";
import { syntaxPass, moduleShape } from "./syntax.frozen.ts";
import { specRejects } from "./soundscript/spec-cases.ts";
import { inputs, type Input } from "./acorn/census.ts";
import { linkAcorn } from "./acorn/index.ts";

const HERE = import.meta.dir;
let pass = 0, fail = 0;
const ok = (c: boolean, what: string) => { console.log(`${c ? "pass" : "FAIL"} ${what}`); c ? pass++ : fail++; };
// the TypeScript checker's distinctNames (infer/frozen/core.ts), with the declaration it reads, by their AST spans
function fromCore(): { distinctNames: (src: string, jsx: boolean) => { P: any; dups: Map<string, { name: string }> } } {
  const src = readFileSync(join(HERE, "infer/frozen/core.ts"), "utf8");
  const want = new Set(["distinctNames", "STAND"]);
  const parts: string[] = [];
  for (const st of parse(src).program.body as Node[]) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    const names = d?.type === "FunctionDeclaration" ? [d.id.name] : d?.type === "VariableDeclaration" ? d.declarations.map((x: Node) => x.id.name) : [];
    if (names.some((n: string) => want.has(n))) { parts.push(src.slice(d.start, d.end)); names.forEach((n: string) => want.delete(n)); }
  }
  if (want.size) throw new Error(`not found in infer/frozen/core.ts: ${[...want].join(", ")}`);
  const js = new Bun.Transpiler({ loader: "ts" }).transformSync(parts.join("\n"));
  return new Function("parse", `${js}\nreturn { distinctNames };`)(parse);
}
const core = fromCore();
const SHAPE_RULES = new Set(["builtin-type-name", "type-cycle", "cell-not-function", "module-level", "no-enum", "no-namespace", "no-class", "no-var", "duplicate-cell"]);
const shellNamesOf = (shell?: string | null) => {
  const out = new Set<string>();
  for (const st of shell ? (parse(shell).program.body as Node[]) : []) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : null;
    if (d?.type === "VariableDeclaration") for (const x of d.declarations) if (x.id.type === "Identifier") out.add(x.id.name);
    if (d?.type === "FunctionDeclaration") out.add(d.id.name);
  }
  return out;
};
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const fnAt = (prog: Node, start: number, end: number): Node | null => {
  let hit: Node | null = null;
  const w = (n: any) => { if (hit || !n || typeof n !== "object") return; if (Array.isArray(n)) { n.forEach(w); return; } if (typeof n.type !== "string") return; if ((n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration") && n.start === start && n.end === end) { hit = n; return; } for (const k in n) if (k !== "loc") w(n[k]); };
  w(prog);
  return hit;
};
type Case = Input & { shell?: string | null; outside?: { name: string; view?: boolean }[] | null };
function run(L: any, label: string, cases: Case[], quiet = false) {
  const builtin = new Set(builtinTypeNames());
  const t = { skipped: 0, shape: [0, 0], shapeErrs: 0, syn: [0, 0], cells: 0, diags: 0, reparsed: 0 };
  const shown: string[] = [];
  for (const c of cases) {
    let res;
    try { res = checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null }); } catch { t.skipped++; continue; }
    const got = L.syntaxCheck(c.src, c.tsx, builtin, shellNamesOf(c.shell));
    if (!got.ok) { t.skipped++; continue; }
    if (got.parses > 1) t.reparsed++;
    const line = L.lineAt(c.src);
    let D: { P: any; dups: Map<string, { name: string }> } | null = null;
    try { D = core.distinctNames(c.src, c.tsx); } catch {}
    const P = D?.P ?? null;
    const frozen = D ? moduleShape(D.P, shellNamesOf(c.shell)) : { cells: [], errors: [{ rule: "(no parse)", line: 0, msg: "" }] };
    const want = frozen.errors.filter((e) => SHAPE_RULES.has(e.rule)).map((e) => `${e.rule} L${e.line} ${e.msg}`);
    const live = res.module.filter((e) => SHAPE_RULES.has(e.rule) && !(e.rule === "duplicate-cell" && !e.msg.startsWith("cell "))).map((e) => `${e.rule} L${e.line} ${e.msg}`);
    const gotE = [...got.shape.clashes, ...got.shape.errors].map((e: any) => `${e.rule} L${line(e.at.start)} ${e.msg}`);
    const wantCells = frozen.cells.map((x) => `${D!.dups.get(x.name)?.name ?? x.name} L${P.line(x.stmt.start)}`);
    const liveCells = res.cells.map((x) => `${x.name.replace(/ \(\d+\)$/, "")} L${x.line}`);
    const gotCells = got.shape.cells.map((x: any, i: number) => `${got.names[i]} L${line(x.stmt.start)}`);
    const okShape = same(want, gotE) && same(wantCells, gotCells) && same(live, gotE) && same(liveCells, gotCells);
    t.shape[okShape ? 0 : 1]++;
    if (want.length) t.shapeErrs++;
    if (!okShape && shown.length < 6) shown.push(`shape ${c.id}: want ${JSON.stringify([want, wantCells])} live ${JSON.stringify([live, liveCells])} got ${JSON.stringify([gotE, gotCells])}`);
    got.shape.cells.forEach((cell: any, i: number) => {
      t.cells++;
      const fn = P ? fnAt(P.program, cell.fn.start, cell.fn.end) : null;
      const orig: string[] = [];
      if (fn) syntaxPass(fn, (n: Node, rule: string, msg: string) => orig.push(`${rule} L${P.line(n.start)} ${msg}`), (n: Node, w: string) => orig.push(`unsupported L${P.line(n.start)} ${w} (unsup)`));
      else orig.push("(no node at the cell's span)");
      const port = got.diags[i].map((d: any) => `${d.rule} L${line(d.at.start)} ${d.msg}${d.unsup ? " (unsup)" : ""}`);
      t.diags += orig.length;
      const okS = same(orig, port);
      t.syn[okS ? 0 : 1]++;
      if (!okS && shown.length < 6) shown.push(`syntaxPass ${c.id} ${cell.name}: want ${JSON.stringify(orig)} got ${JSON.stringify(port)}`);
    });
  }
  if (!quiet) {
    console.log(`  ${label}: ${cases.length} inputs, ${t.skipped} skipped (no parse), ${t.reparsed} parsed more than once; module shape ${t.shape[0]} same, ${t.shape[1]} differ (${t.shapeErrs} with a module-level error); syntax pass ${t.syn[0]} cells same, ${t.syn[1]} differ (${t.diags} diagnostics)`);
    for (const s of shown) console.log(`    ${s.slice(0, 400)}`);
  }
  return t;
}
const SYNTHETIC_N: Case[] = [
  { id: "synthetic-n.ts", tsx: false, src: "export const g = (o) => viewof.x + o.viewof + ({ mutable: 1 }).mutable + o[viewof] + ({ [mutable]: 1 }).x + arguments.length + o.arguments;" },
  // a reserved name in a parameter's type is in a type position, which the walk does not report
  { id: "synthetic-t.ts", tsx: false, src: "export const h = (x: viewof) => x;\nconst k = (y = { a: 1 } as const, z = y as number, w = <number>y, s = y satisfies object) => { var q; return [y, z, w, s, q]; };" },
];
const cases: Case[] = [
  ...inputs(),
  ...specRejects().map((c, i) => ({ id: `spec#${i}`, src: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null })),
  ...SYNTHETIC_N,
];
const L = linkAcorn();
const r = run(L, "corpus", cases);
ok(r.shape[1] === 0 && r.syn[1] === 0 && r.shape[0] > 0 && r.shapeErrs > 0 && r.diags > 0 && r.reparsed > 0, `syntaxCheck against syntax.frozen.ts and checkSources: module shape ${r.shape[0]} same, syntax pass ${r.syn[0]} cells same, 0 differ`);
// controls: one mutation per cell of the two passes
const controls: [string, Record<string, any>][] = [
  ["typeClash reports nothing", { typeClash: () => () => [] }],
  ["declaratorCell takes no function expression", { declaratorCell: () => (x: any, st: any) => x.type !== "VariableDeclarator" ? { cells: [], errors: [] } : x.id.type === "Identifier" && x.init !== null && x.init.type === "ArrowFunctionExpression" ? { cells: [{ name: x.id.name, fn: x.init, stmt: st }], errors: [] } : { cells: [], errors: [{ at: x, rule: "cell-not-function", msg: `${x.id.type === "Identifier" ? x.id.name : "?"} is not a function` }] } }],
  ["moduleLevelRule drops no-var", { moduleLevelRule: () => (d: any, st: any) => st.type === "ImportDeclaration" && st.importKind === "type" ? null : d.type === "TSEnumDeclaration" ? "no-enum" : d.type === "TSModuleDeclaration" ? "no-namespace" : d.type === "ClassDeclaration" ? "no-class" : "module-level" }],
  ["statementCells names the statement, not its declaration", { statementCells: (declOf: any, declaratorCell: any, moduleLevelRule: any, nodeKind: any) => (st: any) => { const d = declOf(st); if (d.type === "FunctionDeclaration") return { cells: [{ name: d.id.name, fn: d, stmt: st }], errors: [] }; if (d.type === "VariableDeclaration" && d.kind !== "var" && d.declare !== true) { const f = d.declarations.map((x: any) => declaratorCell(x, st)); return { cells: f.flatMap((y: any) => y.cells), errors: f.flatMap((y: any) => y.errors) }; } const rule = moduleLevelRule(d, st); return { cells: [], errors: rule === null ? [] : [{ at: st, rule, msg: `${nodeKind(st)} at module level` }] }; } }],
  ["isTypeStatement misses an exported type", { isTypeStatement: () => (st: any) => st.type === "TSTypeAliasDeclaration" || st.type === "TSInterfaceDeclaration" }],
  ["namedByParent ignores computed", { namedByParent: () => (x: any, p: any) => p !== null && p.type === "MemberExpression" ? p.property.nid === x.nid : p !== null && p.type === "Property" && p.key.nid === x.nid && p.value.nid !== x.nid }],
  ["argumentsAsName drops the key case", { argumentsAsName: () => (x: any, p: any) => p !== null && p.type === "MemberExpression" && p.property.nid === x.nid && !p.computed }],
  ["isAsConst is never true", { isAsConst: () => () => false }],
  ["bansAt drops no-arguments", { bansAt: (SYNTAX_BANS: any, reservedName: any, RESERVED_MSG: any, viewofInputName: any, namedByParent: any, argumentsAsName: any, isAsConst: any, nodeKind: any) => (x: any, p: any, inType: boolean) => { const r = SYNTAX_BANS.get(nodeKind(x)); const reserved = x.type === "Identifier" && !inType && reservedName(x.name) && !(namedByParent(x, p) && !viewofInputName(x.name)); return [...(reserved ? [{ at: x, rule: "reserved-name", msg: RESERVED_MSG(x.name), unsup: false }] : []), ...(r !== undefined ? [{ at: x, rule: r, msg: nodeKind(x), unsup: false }] : []), ...(x.type === "TSAsExpression" && !isAsConst(x) ? [{ at: x, rule: "no-cast", msg: "as cast", unsup: false }] : []), ...(x.type === "TSSatisfiesExpression" ? [{ at: x, rule: "unsupported", msg: "satisfies", unsup: true }] : []), ...(x.type === "VariableDeclaration" && x.kind === "var" ? [{ at: x, rule: "no-var", msg: "var", unsup: false }] : [])]; } }],
  ["SYNTAX_BANS without no-this", { SYNTAX_BANS: () => new Map([["ClassDeclaration", "no-class"], ["ClassExpression", "no-class"], ["TSAnyKeyword", "no-any"], ["TSNonNullExpression", "no-non-null"], ["ImportExpression", "no-dynamic-import"], ["TSEnumDeclaration", "no-enum"], ["TSModuleDeclaration", "no-namespace"], ["TSTypeAssertion", "no-cast"]]) }],
  ["TYPE_FIELDS without typeAnnotation", { TYPE_FIELDS: () => new Set(["returnType", "typeParameters", "typeArguments"]) }],
  ["moduleShape ignores shell names", { moduleShape: (typeClash: any, isTypeStatement: any, statementCells: any) => (prog: any, builtin: any) => { const found = prog.body.filter((st: any) => !isTypeStatement(st)).map((st: any) => statementCells(st)); const cells = found.flatMap((f: any) => f.cells); const seen = new Set(), dups: any[] = []; for (const c of cells) { if (seen.has(c.name)) dups.push({ at: c.stmt, rule: "duplicate-cell", msg: `cell ${c.name} defined twice` }); seen.add(c.name); } return { cells, clashes: prog.body.flatMap((st: any) => typeClash(st, builtin)), errors: [...found.flatMap((f: any) => f.errors), ...dups] }; } }],
  ["distinctParse gives up at once", { distinctParse: (parseTree: any) => (src: string, jsx: boolean) => ({ parse: parseTree(src, jsx), text: src, dups: [], parses: 1 }) }],
];
for (const [name, over] of controls) {
  const k = run(linkAcorn(over), `control: ${name}`, cases, true);
  ok(k.shape[1] + k.syn[1] > 0 || k.skipped !== r.skipped, `control (${name}): module shape differ ${k.shape[1]}, syntax pass differ ${k.syn[1]}, skipped ${k.skipped} (${r.skipped} unmutated)`);
}
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
