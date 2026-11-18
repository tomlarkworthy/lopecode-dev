// bun lite/toolchain/ojs-roundtrip.test.ts [notebook.html]
// Compiled SoundScript through the standard Observable JavaScript toolchain (@tomlarkworthy/observablejs-toolchain),
// as a host with no SoundScript support would treat it: compiled variables -> decompile -> OJS text -> compile.
// For each cell it asserts:
//  1. the round trip gives the same variables: name, inputs and definition text;
//  2. decompileVariable on the round-tripped definition returns the cell's exact SoundScript source;
//  3. a second round trip is a fixpoint (the same OJS text, the same variables).
// The corpus: the study's 37 cells (ojs-roundtrip/corpus.ts), compiled as one module; every SoundScript cell of the
// built notebook (tutorial, sections, spec, core); and every cell of the generated runtime and checker modules.
// For the 37 cells it also asserts that the OJS text SoundScript emits (compileCellText), compiled by the standard
// compiler, gives the variables compileCell emits, and it runs the compiled and the round-tripped variables on a
// bun Observable Runtime and compares every value, after each action call and after calling each function value.
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blocks, blockContent } from "../../../lib/notebook-blocks.ts";
import { loadOjs } from "../../ojs-roundtrip/ojs.ts";
import { CORPUS, EXTRA, OUTSIDE } from "../../ojs-roundtrip/corpus.ts";
import { run, diffRuns } from "../../ojs-roundtrip/harness.ts";
import { compileCell, compileCellText, contextFromCheck, decompileVariable, langOf, declaredName, STATE_VALUE } from "./ss-toolchain.ts";
import { checkCells } from "../stdlib/runtime.ts";
import { ALLOWED_GLOBALS, OJS_INPUT_GLOBALS } from "../intrinsics.ts";
import { RUNTIME, CHECKER } from "../soundscript/ts-cells.ts";
import { moduleJs } from "./module-js.ts";
import * as acorn from "acorn";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const html = readFileSync(resolve(process.argv[2] ?? join(ROOT, "lopebooks/notebooks/soundscript.html")), "utf8");
const log = console.log;
console.log = () => {};
const ojs = await loadOjs();
console.log = log;

type V = { name: string | null; inputs: string[]; definition: string };
const norm = (vs: any[]): V[] => vs.map((v) => ({ name: v._name ?? v.name ?? null, inputs: v._inputs ?? v.inputs ?? [], definition: String(v._definition ?? v.definition) }));
const toOjs = (vs: V[]) => vs.map((v) => ({ _name: v.name, _inputs: v.inputs, _definition: v.definition }));
const same = (a: V[], b: V[]) => JSON.stringify(a) === JSON.stringify(b);
const firstDiff = (a: V[], b: V[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return `want ${JSON.stringify(a[i])?.slice(0, 300)}\n     got  ${JSON.stringify(b[i])?.slice(0, 300)}`;
  return "";
};
const counts = new Map<string, { cells: number; vars: number; fail: number }>();
const failures: string[] = [];
const fail = (group: string, label: string, why: string) => { counts.get(group)!.fail++; failures.push(`[${group}] ${label}: ${why}`); };

// one cell: its variables as compiled, and its SoundScript source (null for a cell in Observable JavaScript)
async function trip(group: string, label: string, vars: V[], source: string | null, ojsText?: string) {
  const c = counts.get(group) ?? { cells: 0, vars: 0, fail: 0 };
  counts.set(group, c);
  c.cells++;
  c.vars += vars.length;
  const f0 = c.fail;
  const text1: string = await ojs.decompile(toOjs(vars));
  const back = norm(ojs.compile(text1));
  if (!same(vars, back)) fail(group, label, `decompile -> compile differs\n     ${firstDiff(vars, back)}`);
  if (ojsText !== undefined) {
    if (text1 !== ojsText) fail(group, label, `the standard decompile is not the text SoundScript emits:\n${text1}\n---\n${ojsText}`);
    const direct = norm(ojs.compile(ojsText));
    if (!same(vars, direct)) fail(group, label, `the standard compile of compileCellText differs from compileCell\n     ${firstDiff(vars, direct)}`);
  }
  if (source !== null) {
    const got = back.map((v) => decompileVariable(v.definition)).filter((x) => x !== null);
    if (got.length !== 1 || got[0] !== source) fail(group, label, `decompileVariable after the round trip gives ${JSON.stringify(got).slice(0, 200)}`);
  }
  const text2: string = await ojs.decompile(toOjs(back));
  if (text2 !== text1) fail(group, label, `a second decompile differs:\n${text1}\n---\n${text2}`);
  else if (!same(back, norm(ojs.compile(text2)))) fail(group, label, "a second compile differs");
  return c.fail === f0 ? back : null;
}

// 1. the study's 37 cells, compiled as one module (as lite/stdlib/runtime.test.ts load does)
const study = [...CORPUS, ...EXTRA];
if (study.length !== 37) throw new Error(`the study corpus has ${study.length} cells, not 37`);
const checked = checkCells(study.map((c) => c[1]), true, OUTSIDE).result;
const ctx = contextFromCheck(checked);
const seen = new Map<string, number>();
const compiled: V[] = [], tripped: V[] = [];
for (const [label, text] of study) {
  const d = declaredName(text);
  const k = d ? (seen.get(d) ?? 0) + 1 : 0;
  if (d) seen.set(d, k);
  const hint = k > 1 ? `${d} (${k})` : null;
  const vars = norm(compileCell(text, true, ctx, hint));
  compiled.push(...vars);
  const back = await trip("study", label, vars, text, compileCellText(text, true, ctx, hint));
  tripped.push(...(back ?? vars));
}

// 2. the built notebook: each module block's variables, read from the parse of its $def calls
const defsOf = (module: string): V[] => {
  const src = blockContent(html, module);
  if (!src) throw new Error(`no ${module} block`);
  return moduleJs(src).variables.map(({ name, inputs, definition }) => ({ name, inputs, definition }));
};
// a cell's variables: viewof x with x, mutable x with initial x and x
const cellsOf = (vs: V[]): V[][] => {
  const byName = new Map(vs.filter((v) => v.name).map((v) => [v.name!, v]));
  const taken = new Set<V>(), out: V[][] = [];
  for (const v of vs) {
    if (taken.has(v)) continue;
    const n = v.name ?? "";
    const group = n.startsWith("viewof ") ? [v, byName.get(n.slice(7))] : n.startsWith("initial ") ? [v, byName.get(`mutable ${n.slice(8)}`), byName.get(n.slice(8))] : [v];
    const g = group.filter((x): x is V => !!x && !taken.has(x));
    g.forEach((x) => taken.add(x));
    out.push(g);
  }
  return out;
};
// module blocks only, not their file attachments
const modules = blocks(html).filter((b) => /^@tomlarkworthy\/soundscript(-[\w-]+)?$/.test(b.id) && b.attrs.includes('data-mime="application/javascript"')).map((b) => b.id);
for (const m of modules) {
  const all = cellsOf(defsOf(m));
  const generated = m === RUNTIME || m === CHECKER;
  for (const cell of all) {
    const ss = cell.find((v) => langOf(v.definition) === "ss");
    if (generated) {
      if (cell[0].name === null || !cell[0].name.startsWith("module ")) await trip("generated", `${m} ${cell[0].name}`, cell, null);
    } else if (ss) {
      if (cell.length > 1 && !(cell.length === 2 && cell[1].definition === STATE_VALUE)) fail("notebook", `${m} ${cell[0].name}`, "a SoundScript cell other than a state cell has more than one variable");
      await trip("notebook", `${m} ${ss.name}`, cell, decompileVariable(ss.definition));
    }
  }
}

// 2b. compiled cells depend on the runtime module only: every member of ss a compiled definition reads
// (ss.x, or const { x } = ss) is an input of the runtime module's ss cell, whose inputs are its keys
{
  const c = { cells: 0, vars: 0, fail: 0 };
  counts.set("ss-members", c);
  const ssCell = defsOf(RUNTIME).find((v) => v.name === "ss");
  if (!ssCell) fail("ss-members", RUNTIME, "the runtime module defines no ss");
  const keys = new Set(ssCell?.inputs ?? []);
  const membersOf = (def: string): string[] => {
    const out: string[] = [];
    // ss read any other way (passed on, aliased, spread) is "[bare]", which no key matches
    const read = new Set<any>();
    const walk = (n: any) => {
      if (!n || typeof n.type !== "string") return;
      if (n.type === "MemberExpression" && n.object.type === "Identifier" && n.object.name === "ss") { read.add(n.object); out.push(n.computed ? "[computed]" : n.property.name); }
      if (n.type === "VariableDeclarator" && n.init?.type === "Identifier" && n.init.name === "ss" && n.id.type === "ObjectPattern") {
        read.add(n.init);
        for (const p of n.id.properties) out.push(p.type === "Property" && !p.computed ? p.key.name : "[rest]");
      }
      if (/Function/.test(n.type)) n.params.forEach((p: any) => read.add(p));
      if (n.type === "MemberExpression" && !n.computed) read.add(n.property);
      if (n.type === "Property" && !n.computed && !n.shorthand) read.add(n.key);
      if (n.type === "Identifier" && n.name === "ss" && !read.has(n)) out.push("[bare]");
      for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
    };
    try { walk(acorn.parseExpressionAt(def, 0, { ecmaVersion: "latest" })); } catch (e) { throw new Error(`${(e as Error).message} in ${def.slice(0, 200)}`); }
    return out;
  };
  const used = new Set<string>();
  const ssDefs = [...compiled, ...modules.filter((m) => m !== RUNTIME && m !== CHECKER).flatMap(defsOf)].filter((v) => langOf(v.definition) === "ss" && v.inputs.includes("ss"));
  for (const v of ssDefs) {
    c.cells++;
    const bad = membersOf(v.definition).filter((m) => (used.add(m), !keys.has(m)));
    if (bad.length) fail("ss-members", String(v.name), `reads ss.${bad.join(", ss.")}, which the runtime's ss does not hold`);
  }
  c.vars = used.size;
  log(`ss members compiled cells read: ${[...used].sort().join(", ")}`);
}

// 3. the allowed globals the parser does not know are exactly OJS_INPUT_GLOBALS
{
  const c = { cells: 0, vars: 0, fail: 0 };
  counts.set("globals", c);
  for (const g of ALLOWED_GLOBALS) {
    c.cells++;
    const input = norm(ojs.compile(`x = ${g}`))[0].inputs.includes(g);
    if (input !== OJS_INPUT_GLOBALS.includes(g)) fail("globals", g, input ? "the parser makes it an input; OJS_INPUT_GLOBALS does not list it" : "OJS_INPUT_GLOBALS lists it; the parser treats it as a global");
  }
}

// 4. the 37 cells run the same compiled and round-tripped
const a = await run(compiled), b = await run(tripped);
const d = diffRuns(a, b);
counts.set("values", { cells: d.names, vars: a.length, fail: d.rows.length });
for (const [n, x, y] of d.rows) failures.push(`[values] ${n}: compiled ${x}; round-tripped ${y}`);

ojs.dispose();
for (const f of failures) console.log("FAIL", f);
for (const [g, c] of counts) console.log(`${g}: ${c.cells - (g === "values" ? 0 : 0)} ${g === "values" ? `values compared at ${c.vars} snapshots` : g === "globals" ? "globals" : g === "ss-members" ? `compiled definitions read ${c.vars} distinct members of ss` : `cells (${c.vars} variables)`}, ${c.fail} failure(s)`);
const total = [...counts.values()].reduce((n, c) => n + c.fail, 0);
console.log(total ? `${total} failure(s)` : "all pass");
process.exit(total ? 1 : 0);
