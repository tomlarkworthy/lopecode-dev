// The differential: each program of programs.ts is checked by the real Checker (lite/infer.ts fnExpr on the arrow)
// and by each shape on the same parsed nodes, with the parameters' types and the globals the real run made.
// Compared: show() of every expression type recorded inside the body (both directions), the diagnostics
// (rule, node span, message; unsupported included), and the types of the return statements.
// Type variable names are numbered by a counter that the real checker never resets, so `T'12` is compared as `T'`.
// Then a control (a shape linked with a wrong join) that must fail, and timings, with a size sweep.
// Run: bun selfhost/checker-shape/diff.ts [--reps N] [--shapes A,B,B2,C] [--no-sweep] > selfhost/checker-shape/out/diff.txt
import { parse, kids, type Node } from "../../lite/parse.ts";
import { Registry } from "../../lite/registry.ts";
import { Checker } from "../../lite/infer.ts";
import { show } from "../../lite/types.ts";
import * as typeCells from "../../lite/types.ss.ts";
import * as prelude from "../../prelude.runtime.ts";
import * as common from "./common.ss.ts";
import { link } from "./mylink.ts";
import { PROGRAMS, type Program } from "./programs.ts";
import { sha } from "../checker-survey/inventory.ts";
console.log(`real checker: lite/infer.ts@${sha("lite/infer.ts")} lite/registry.ts@${sha("lite/registry.ts")} lite/types.ss.ts@${sha("lite/types.ss.ts")}`);

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] ?? d : d; };
const REPS = Number(opt("--reps", "20"));
const SHAPES = opt("--shapes", "A,B,B2,C").split(",");

// node types and operators the shapes implement; anything else in a program is a gap in the program set
const SLICE = new Set(["Identifier", "Literal", "MemberExpression", "CallExpression", "ConditionalExpression", "BinaryExpression", "UnaryExpression",
  "LogicalExpression", "VariableDeclaration", "VariableDeclarator", "BlockStatement", "ReturnStatement", "ExpressionStatement"]);
function sliceGaps(n: Node, out: string[] = []): string[] {
  if (!SLICE.has(n.type)) out.push(n.type);
  if (n.type === "MemberExpression" && (n.computed || n.optional)) out.push("computed or optional member");
  if (n.type === "CallExpression" && (n.optional || n.arguments.some((a: Node) => a.type === "SpreadElement"))) out.push("optional call or spread");
  if (n.type === "BinaryExpression" && (n.operator === "in" || n.operator === "instanceof")) out.push(n.operator);
  if (n.type === "UnaryExpression" && n.operator === "delete") out.push("delete");
  if (n.type === "VariableDeclarator" && (n.id.type !== "Identifier" || n.id.typeAnnotation)) out.push("pattern or annotated declarator");
  if (n.type === "Literal" && (n.regex || n.bigint !== undefined)) out.push("regex or bigint literal");
  for (const k of kids(n)) sliceGaps(k, out);
  return out;
}

let cur = new Registry();
let overloaded = 0;
const regView = {
  isAlias: (n: string) => cur.isAlias(n), expand: (t: any) => cur.expand(t), member: (t: any, k: string) => cur.member(t, k),
  sub: (a: any, b: any) => cur.sub(a, b), callSigs: (t: any) => { const s = cur.callSigs(t); if (s.length > 1) overloaded++; return s; }, iterElem: (t: any) => cur.iterElem(t),
  unify: (p: any, a: any, m: any, tvs: any) => cur.unify(p, a, m, tvs),
  userType: (n: string) => { const d = cur.types.get(n); return !!d && d.origin !== "intrinsic"; },
  get strictIndex() { return cur.strictIndex; },
};
// B2 is shape B's method cells with tablesB2.ss.ts (persistent logs) in place of tablesB.ss.ts (copied maps)
const FILES: Record<string, [string[], string]> = { A: [["shapeA"], "checkerA"], B: [["tablesB", "shapeB"], "checkerB"], B2: [["tablesB2", "shapeB"], "checkerB"], C: [["shapeC"], "checkerC"] };
const ENTRY: Record<string, [Record<string, any>, string]> = {};
for (const s of SHAPES) { const [fs, entry] = FILES[s]!; ENTRY[s] = [Object.assign({}, ...(await Promise.all(fs.map((f) => import(`./${f}.ss.ts`))))), entry]; }
const linkShape = (s: string, given: Record<string, unknown> = {}) => {
  const [cells, entry] = ENTRY[s]!;
  return link({ ...typeCells, ...common, ...cells } as any, prelude as any, { regView, ...given })[entry] as (i: any) => { types: Map<Node, any>; diags: any[]; rets: any[] };
};

const norm = (s: string) => s.replace(/'\d+/g, "'");
const key = (n: Node) => `${n.type}@${n.start}-${n.end}`;
type Facts = { types: Map<string, string>; diags: string[]; rets: string[] };
const within = (n: Node, body: Node) => n.start >= body.start && n.end <= body.end;
function factsOf(types: Map<Node, any>, diags: { node: Node; rule: string; msg: string }[], rets: any[], body: Node): Facts {
  const t = new Map<string, string>();
  for (const [n, ty] of types) if (n && within(n, body)) t.set(key(n), norm(show(ty)));
  return { types: t, diags: diags.map((d) => `[${d.rule}] ${d.node ? key(d.node) : "?"} ${norm(d.msg)}`).sort(), rets: rets.map((r) => norm(show(r))) };
}
function compare(a: Facts, b: Facts): string[] {
  const out: string[] = [];
  for (const [k, v] of a.types) { const w = b.types.get(k); if (w !== v) out.push(`type ${k}: real ${v}, shape ${w ?? "(none)"}`); }
  for (const [k, w] of b.types) if (!a.types.has(k)) out.push(`type ${k}: real (none), shape ${w}`);
  if (a.diags.join("\n") !== b.diags.join("\n")) out.push(`diags: real ${JSON.stringify(a.diags)}, shape ${JSON.stringify(b.diags)}`);
  if (a.rets.join("|") !== b.rets.join("|")) out.push(`rets: real ${a.rets.join(" | ")}, shape ${b.rets.join(" | ")}`);
  return out;
}

type Prepared = { prog: Program; arrow: Node; P: ReturnType<typeof parse> };
const prepare = (prog: Program): Prepared => {
  const P = parse(prog.src);
  return { prog, P, arrow: P.program.body[0].declarations[0].init };
};
function realRun(p: Prepared) {
  const ch = new Checker(cur, new Set(), p.P);
  const t0 = performance.now();
  ch.fnExpr(p.arrow, null, undefined);
  const ms = performance.now() - t0;
  return { ch, ms };
}
function inputOf(p: Prepared, ch: Checker) {
  return {
    params: p.arrow.params.map((q: Node) => ({ node: q, name: q.name, t: ch.facts.bindingOf.get(q)!.t })),
    globals: [...ch.globals.vars.values()].map((b) => ({ name: b.name, t: b.t, kind: b.kind })),
    body: p.arrow.body.body,
  };
}
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? NaN; };

// 1. slice check of the programs, and what the real checker reports
const prepared = PROGRAMS.map(prepare);
let gaps = 0;
for (const p of prepared) {
  const g = sliceGaps(p.arrow.body);
  if (g.length) { gaps++; console.log(`program ${p.prog.name} leaves the slice: ${[...new Set(g)].join(", ")}`); }
}
const realFacts = new Map<string, Facts>();
const inputs = new Map<string, any>();
let hintMiss = 0;
for (const p of prepared) {
  const { ch } = realRun(p);
  const f = factsOf(ch.facts.types, [...ch.diags, ...ch.unsup], ch.facts.fnInfo.get(p.arrow)!.rets, p.arrow.body);
  realFacts.set(p.prog.name, f);
  inputs.set(p.prog.name, inputOf(p, ch));
  const rules = f.diags.map((d) => d.slice(1, d.indexOf("]")));
  if (JSON.stringify(rules.toSorted()) !== JSON.stringify((p.prog.err ?? []).toSorted())) { hintMiss++; console.log(`note ${p.prog.name}: real reports ${JSON.stringify(rules)}, program lists ${JSON.stringify(p.prog.err ?? [])}`); }
}
const withErr = [...realFacts.values()].filter((f) => f.diags.length).length;
console.log(`${prepared.length} programs, ${gaps} outside the slice, ${withErr} with a diagnostic from the real checker, ${hintMiss} whose listed rules differ from the real ones`);

// 2. the differential per shape, and the control
function differential(label: string, run: (i: any) => any, terse = false): { pass: number; fail: number; lines: string[] } {
  let pass = 0, fail = 0;
  const lines: string[] = [];
  for (const p of prepared) {
    let d: string[];
    try {
      const o = run(inputs.get(p.prog.name));
      d = compare(realFacts.get(p.prog.name)!, factsOf(o.types, o.diags, o.rets, p.arrow.body));
    } catch (e) { d = [`threw ${(e as Error).stack?.split("\n").slice(0, 3).join(" ")}`]; }
    if (d.length) { fail++; lines.push(terse ? `  ${p.prog.name}: ${d.length} differences, first: ${d[0]!.slice(0, 140)}` : `  ${label} ${p.prog.name}:`, ...(terse ? [] : d.map((x) => `    ${x}`))); } else pass++;
  }
  console.log(`differential ${label}: ${pass} pass, ${fail} fail`);
  for (const l of lines) console.log(l);
  return { pass, fail, lines };
}
const runs = new Map<string, (i: any) => any>();
for (const s of SHAPES) runs.set(s, linkShape(s));
for (const [s, run] of runs) { overloaded = 0; differential(s, run); console.log(`  (${s} met ${overloaded} callees with more than one signature)`); }
for (const s of SHAPES) {
  differential(`${s}-control (join2 returns its first flow)`, linkShape(s, { join2: (a: unknown) => a }), true);
  differential(`${s}-control (narrowByProp keeps every member)`, linkShape(s, { narrowByProp: (t: unknown) => t }), true);
}
// state controls: a shape's own diagnostic write dropped (A has no such cell: its err is a local function)
for (const s of SHAPES.filter((x) => x !== "A")) {
  const given = s === "C" ? { errC: () => {} } : { errB: (st: unknown) => st };
  differential(`${s}-control (${s === "C" ? "errC writes nothing" : "errB returns the state unchanged"})`, linkShape(s, given), true);
}

// 3. time per program: the real fnExpr on a fresh Checker, against each shape on the same input; median of REPS
function timeAll(ps: Prepared[], ins: Map<string, any>) {
  const real: number[] = [], shape = new Map<string, number[]>(SHAPES.map((s) => [s, []]));
  for (const p of ps) {
    const r: number[] = [];
    for (let i = 0; i < REPS; i++) r.push(realRun(p).ms);
    real.push(median(r));
    for (const [s, run] of runs) {
      const xs: number[] = [];
      for (let i = 0; i < REPS; i++) { const t0 = performance.now(); run(ins.get(p.prog.name)); xs.push(performance.now() - t0); }
      shape.get(s)!.push(median(xs));
    }
  }
  return { real, shape };
}
const us = (ms: number[]) => ((ms.reduce((a, b) => a + b, 0) / ms.length) * 1000).toFixed(1);
// warm-up, then the measured pass
timeAll(prepared, inputs);
const t = timeAll(prepared, inputs);
console.log(`time per program (mean of per-program medians, ${REPS} reps): real ${us(t.real)} µs${[...t.shape].map(([s, m]) => `, ${s} ${us(m)} µs`).join("")}`);

// 4. size sweeps. chain: one block of n const declarations, each a call with a conditional argument.
// diags: n declarations of a free name (n diagnostics). blocks: n sibling blocks (n scopes), then one return.
const SWEEPS: Record<string, (n: number) => string> = {
  chain: (n) => ["const v0 = 1;", ...Array.from({ length: n - 1 }, (_, i) => `const v${i + 1} = f(x ? v${i} : 0);`), `return v${n - 1};`].join("\n"),
  diags: (n) => [...Array.from({ length: n }, (_, i) => `const v${i} = q${i};`), "return 0;"].join("\n"),
  blocks: (n) => [...Array.from({ length: n }, (_, i) => `{ const v${i} = f(x ? ${i} : 0); }`), "return 0;"].join("\n"),
};
if (!argv.includes("--no-sweep")) for (const [kind, gen] of Object.entries(SWEEPS)) for (const n of [10, 100, 1000]) {
  const body = gen(n);
  const p = prepare({ name: `${kind}${n}`, src: `const p = (f: (x: number) => number, x: number | undefined) => {\n${body}\n};` });
  const { ch } = realRun(p);
  const ins = new Map([[p.prog.name, inputOf(p, ch)]]);
  const rf = factsOf(ch.facts.types, [...ch.diags, ...ch.unsup], ch.facts.fnInfo.get(p.arrow)!.rets, p.arrow.body);
  const same = [...runs].map(([s, run]) => { const o = run(ins.get(p.prog.name)); return `${s} ${compare(rf, factsOf(o.types, o.diags, o.rets, p.arrow.body)).length ? "DIFFERS" : "same"}`; });
  const tt = timeAll([p], ins);
  console.log(`sweep ${kind} n=${n} (${rf.types.size} typed nodes, ${rf.diags.length} diagnostics; ${same.join(", ")}): real ${us(tt.real)} µs${[...tt.shape].map(([s, m]) => `, ${s} ${us(m)} µs`).join("")}`);
}
