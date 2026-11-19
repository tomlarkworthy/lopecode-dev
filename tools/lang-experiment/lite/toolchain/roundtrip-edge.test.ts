// bun lite/toolchain/roundtrip-edge.test.ts — compile/decompile edge cases: Sub-typed cells, plain cells and ids,
// TS constructs the eraser must not break, comment terminators and control characters in source.
import * as acorn from "acorn";
import * as toolchain from "./ss-toolchain.ts";
import { compileCell, decompileVariable, contextFromCheck } from "./ss-toolchain.ts";
import { checkSources } from "../core.ts";
// an events cell's compiled definition, read on its parse: a function named _<name> whose ss.cell options
// pass this as prev and the invalidation input
const passesThis = (def: string, name: string) => {
  const fn: any = acorn.parseExpressionAt(def, 0, { ecmaVersion: "latest" });
  const o = toolchain.parseCompiled(def)?.call?.arguments.at(-1);
  const opt = (k: string) => o?.type === "ObjectExpression" ? o.properties.find((p: any) => p.key?.name === k)?.value : undefined;
  return fn.type === "FunctionExpression" && fn.id?.name === `_${name}` && toolchain.compiledKind(def)?.kind === "events" && opt("name")?.value === name &&
    opt("prev")?.type === "ThisExpression" && opt("invalidation")?.type === "Identifier" && opt("invalidation").name === "invalidation";
};


let fail = 0, n = 0;
const expect = (ok: boolean, what: string) => { n++; if (!ok) { fail++; console.log("FAIL " + what); } };
const attempt = <T>(f: () => T): T | Error => { try { return f(); } catch (e) { return e as Error; } };
// a stand-in for the stdlib object: cell(fn, args) calls fn
const fakeSS = { cell: (f: (...a: unknown[]) => unknown, args: unknown[]) => f(...args), h: (tag: unknown, props: unknown, ...kids: unknown[]) => ({ tag, props, kids }) };
const run = (def: string, ...args: unknown[]) => (0, eval)(`(${def})`)(fakeSS, ...args);

// compiles, every definition parses and survives Function.toString, and decompiles to the exact source
function roundTrips(src: string, tsx: boolean): string | null {
  const vs = attempt(() => compileCell(src, tsx));
  if (vs instanceof Error) return "compile threw: " + vs.message;
  for (const v of vs) {
    const p = attempt(() => acorn.parseExpressionAt(v.definition, 0, { ecmaVersion: "latest" }));
    if (p instanceof Error) return "JS does not parse: " + p.message;
    if ((0, eval)(`(${v.definition})`).toString() !== v.definition) return "Function.toString changed the text";
  }
  const back = vs.map((v) => decompileVariable(v.definition)).filter((x) => x !== null);
  if (back.length !== 1 || back[0] !== src) return "decompiled " + JSON.stringify(back);
  return null;
}
const def = (src: string, tsx = false) => compileCell(src, tsx).at(-1)!.definition;

// Events and listeners: an events cell's handle survives its re-runs (a function definition that
// passes `this`), and a listener cell takes invalidation, which ends its listener when it runs again.
{
  const src = [
    "const ticks = function* (now: Clock, fast: boolean) { while (true) yield now(); };",
    "const pulses = function* () { while (true) yield 1; };",
    "const count = (): StateCell<number> => state(0);",
    "const tick = (count: State<number>) => action((t: number) => count.update((c) => c + 1));",
    "const fast = () => true;",
    "const onTick = (ticks: Events<number>, pulses: Events<number>, tick: Action<[number]>, fast: boolean) => (fast ? on(ticks, tick) : on(pulses, tick));",
    "const label = (ticks: Events<number>, count: number) => `count ${count}`;",
  ].join("\n\n");
  const r = checkSources({ cells: src, tsx: true });
  expect(r.cells.every((c) => c.status === "ok"), "events module checks ok: " + r.cells.map((c) => c.name + ":" + c.status));
  const ctx = contextFromCheck(r);
  const by = new Map(src.split("\n\n").map((t) => { const v = compileCell(t, true, ctx).at(-1)!; return [v.name, v]; }));
  const ticks = by.get("ticks")!;
  expect(passesThis(ticks.definition, "ticks"), "an events cell passes this and takes invalidation: " + ticks.definition.slice(-90));
  expect(decompileVariable(ticks.definition) === src.split("\n\n")[0], "an events cell decompiles to its source");
  const onTick = by.get("onTick")!;
  expect(/kind: "listener"/.test(onTick.definition) && onTick.inputs.at(-1) === "invalidation", "a listener takes invalidation: " + JSON.stringify(onTick.inputs));
  const label = by.get("label")!;
  expect(toolchain.compiledKind(label.definition)?.callee === "plain" && !label.inputs.includes("invalidation"), "a cell that takes Events but does not call on is a plain cell: " + JSON.stringify(label.inputs));
  expect(!by.get("fast")!.inputs.includes("invalidation") && /kind: "cell"/.test(by.get("pulses")!.definition) === false, "fast has no invalidation; pulses is events");
}

// C4: a definition carries no compiler id, and a user's `id:` property is untouched. A checked plain cell is its
// typed function applied to its inputs, with no ss; it decompiles to its source and runs with no stdlib.
expect(!("idOf" in toolchain) && !("withId" in toolchain), "C4 ss-toolchain has no idOf or withId");
{
  const src = `const user = () => ({ id: "anon", n: 1 });`;
  const d = def(src);
  expect(decompileVariable(d) === src && JSON.stringify(run(d)) === JSON.stringify({ id: "anon", n: 1 }), "C4 a user's id property is kept and returned: " + decompileVariable(d));
  const texts = ["const width = () => 640;", "const height = () => 2;", "const area = (width: number, height: number) => width * height;", "const pick = (r: { h: number }) => r.h;", "const r = () => ({ h: 3 });", "const n = (): StateCell<number> => state(0);", "const held = (n: State<number>) => [n];", "const bump = (n: State<number>) => action(() => n.update((x) => x + 1));", "const ticks = function* () {\n  yield 1;\n};"];
  const ctx = contextFromCheck(checkSources({ cells: texts.join("\n\n"), tsx: true }));
  const by = new Map(texts.map((t) => [t, compileCell(t, true, ctx)]));
  const area = by.get(texts[2])!;
  expect(toolchain.compileCellText(texts[2], true, ctx) === `area = (/*{lang:"ss"}*//*ss^{"h":"const area = ","t":";"}*/(width/*ss:: number*/, height/*ss:: number*/) => width * height)(width, height)`, "C4 a plain cell's text: " + toolchain.compileCellText(texts[2], true, ctx));
  expect(area.length === 1 && JSON.stringify(area[0].inputs) === JSON.stringify(["width", "height"]) && toolchain.compiledKind(area[0].definition)?.callee === "plain", "C4 a plain cell takes its inputs and no ss: " + JSON.stringify(area[0].inputs));
  expect(decompileVariable(area[0].definition) === texts[2] && (0, eval)(`(${area[0].definition})`)(3, 4) === 12, "C4 a plain cell decompiles to its source and runs with no stdlib");
  expect(toolchain.compiledKind(by.get(texts[3])![0].definition)?.callee === "plain", "C4 a property named like a built-in (r.h) leaves a cell plain");
  const held = by.get(texts[6])![0];
  expect(JSON.stringify(held.inputs) === JSON.stringify(["viewof n"]) && toolchain.compiledKind(held.definition)?.callee === "plain", "C4 a plain cell taking State<T> takes viewof n: " + JSON.stringify(held.inputs));
  for (const t of [texts[5], texts[7], texts[8]]) expect(by.get(t)!.every((v) => v.inputs[0] === "ss" || v.inputs[0] === "Generators"), "C4 a state cell, a cell calling action and a generator still take ss: " + t);
  expect(toolchain.compiledKind(compileCell(texts[2], true).at(-1)!.definition)?.callee === "cell", "C4 with no module context a cell stays an ss.cell");
}

// F1: TS-only expression forms erase to valid JS that computes the same value
for (const [src, tsx, arg, want] of [
  ["const f = (x: number): number => (x) satisfies number;", false, 2, 2],
  ["const f = (x: unknown): number => (x as number) satisfies number;", false, 3, 3],
  ["const f = (x: number): number => ((x)) satisfies number;", false, 4, 4],
  ["const f = (x: number): number => (x) as number;", false, 5, 5],
  ["const f = (x: number): number => (x /* c */) /* d */ as /* as */ number;", false, 5, 5],
  ["const f = (x: number | null): number => x!;", false, 6, 6],
  ["const f = (x: number | null): number => (x)! + 1;", false, 6, 7],
  ["const f = (x: { y: number } | null): number => x!.y;", false, { y: 8 }, 8],
  ["const f = (x: unknown): number => <number>x;", false, 9, 9],
  ["const f = (x: unknown): number => <number>(x) + 1;", false, 9, 10],
  ["const f = (x: number) => <p>{(x) satisfies number}{x!}</p>;", true, 1, null],
  // a JSX operand: the cut must not swallow the /*ss>*/ that closes the lowered element
  ["const f = (x: number) => <p>{x}</p> as const;", true, 1, null],
  ["const f = (x: number) => <p>{x}</p> satisfies unknown;", true, 1, null],
  ["const f = (x: number) => [<p>{x}</p> as const, 1];", true, 1, null],
  ["const f = (x: number) => (<p>{x}</p>)!;", true, 1, null],
] as [string, boolean, unknown, unknown][]) {
  const bad = roundTrips(src, tsx);
  expect(bad === null, `F1 ${src}: ${bad}`);
  if (bad === null && want !== null) {
    const got = attempt(() => run(def(src, tsx), arg));
    expect(got === want, `F1 ${src}: runs to ${got}, want ${want}`);
  }
}
// a TS construct the eraser does not handle is refused with a named error, never emitted as broken JS
{
  const e = attempt(() => compileCell("const f = (x: number) => { let y!: number; y = x; return y; };", false));
  expect(e instanceof Error ? /^unsupported: /.test(e.message) : roundTrips("const f = (x: number) => { let y!: number; y = x; return y; };", false) === null,
    "F1 definite assignment `let y!: T` is refused or erased: " + (e instanceof Error ? e.message : "compiled"));
}

// F2: */ and *\/ inside strings, templates, regexes, literal types, comments and JSX round-trip exactly
for (const [src, tsx, arg, want] of [
  [`const f = (x: number): string => "*/" + x;`, false, 1, "*/1"],
  [`const f = (x: number): string => "*\\/" + x;`, false, 1, "*/1"],
  [`const f = (x: number): string => "*\\\\/" + x;`, false, 1, "*\\/1"],
  [`const f = (x: string): boolean => /a*\\//.test(x);`, false, "aa/", true],
  [`const f = (x: string): boolean => /a*\\\\\\//.test(x);`, false, "a\\/", true],
  ["const f = (x: number): string => `*\\/${x}*/`;", false, 1, "*/1*/"],
  [`const f = (x: "*/" | "*\\/" | "*\\\\/"): string => x;`, false, "*/", "*/"],
  [`const f = (x: /* a *\\/ b */ number): number => x;`, false, 2, 2],
  [`const f = (x: { a: "**/" } | "*\\**/"): unknown => x;`, false, 3, 3],
  [`const f = (x: string) => <p title="*\\/">{/a*\\//.test(x)} */ </p>;`, true, "a/", null],
  [`const f = (x: string) => <p>{"*\\\\/"}{x as "*\\/"}</p>;`, true, "a", null],
] as [string, boolean, unknown, unknown][]) {
  const bad = roundTrips(src, tsx);
  expect(bad === null, `F2 ${src}: ${bad}`);
  if (bad === null && want !== null) {
    const got = attempt(() => run(def(src, tsx), arg));
    expect(got === want, `F2 ${src}: runs to ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
// the checker accepts a regex holding *\/, so compile must too
{
  const src = `const f = (x: string): boolean => /a*\\//.test(x);`;
  const r = checkSources({ cells: `const x = (): string => "a/";\n\n${src}`, tsx: false });
  expect(r.cells.every((c) => c.status === "ok"), "F2 the checker accepts the regex cell: " + JSON.stringify(r.cells.map((c) => c.status)));
  const v = attempt(() => compileCell(src, false, contextFromCheck(r)));
  expect(!(v instanceof Error), "F2 the accepted regex cell compiles: " + (v instanceof Error ? v.message : "ok"));
}

// F3: raw U+0000 and U+0001 survive the round trip, in code and in JSX
for (const [src, tsx] of [
  ["const f = (x: number): string => \"\u0000\" + (x as number) + \"\u0001\";", false],
  ["const f = (x: number): string => `\u0001${x}\u0000`;", false],
  ["const f = (x: number) => <p title=\"\u0001\">{\"\u0000\"}{x as number}</p>;", true],
  ["const f = (x: number) => [<b>{\"\u0000\"}</b>, \"\u0001\", <i>{x}</i>];", true],
] as [string, boolean][]) {
  const bad = roundTrips(src, tsx);
  expect(bad === null, `F3 ${JSON.stringify(src)}: ${bad}`);
}

// E1 (2026-11-15): a cell is written without `export`; with it, it still compiles, and both spellings
// decompile to exactly what was typed, a leading comment and a generator included
for (const src of [
  "const k = () => 1;",
  "export const k = () => 1;",
  "let k = (a: number) => a + 1;",
  "export let k = (a: number) => a + 1;",
  "function k(a: number): number { return a; }",
  "export function k(a: number): number { return a; }",
  "const k = function* (a: number) { yield a; };",
  "export const k = function* (a: number) { yield a; };",
  "// a comment before the cell\nconst k = async (a: number) => a;",
  "// a comment before the cell\nexport const k = async (a: number) => a;",
  "/* c */ export /* d */ const k = () => 2;",
  "const k = (): StateCell<number> => state(0);",
  "export const k = (): StateCell<number> => state(0);",
  "type K = { a: number };",
  "export type K = { a: number };",
]) {
  const vs = attempt(() => compileCell(src, false));
  if (vs instanceof Error) { expect(false, `E1 ${JSON.stringify(src)}: compile threw ${vs.message}`); continue; }
  const back = vs.map((v) => decompileVariable(v.definition)).filter((x) => x !== null);
  expect(back.length === 1 && back[0] === src, `E1 ${JSON.stringify(src)} decompiles as ${JSON.stringify(back)}`);
}
// E2: the edit model's name rule. A cell that does not parse is stored under the name at its start,
// `const <name>`, `let <name>` or `function <name>`, after comments, with or without `export`
{
  const { checkCells } = await import("../stdlib/runtime.ts");
  for (const [text, want] of [
    ["const k = (a: number) => a +;", "k"],
    ["let k = (", "k"],
    ["function k(a: number) { return a +; }", "k"],
    ["function* k() { yield +; }", "k"],
    ["async function k() { return +; }", "k"],
    ["// note\nconst k = ) => 1;", "k"],
    ["export const k = (a: number) => a +;", "k"],
    ["k = (a: number) => a +;", null],
    ["(a: number) => a +;", null],
  ] as [string, string | null][]) {
    expect(toolchain.declaredName(text) === want, `E2 ${JSON.stringify(text)} is named ${toolchain.declaredName(text)}, want ${want}`);
    const r = attempt(() => checkCells(["const ok1 = () => 1;", text], false));
    if (want) expect(!(r instanceof Error) && r.result.unparsed?.get(want) !== undefined, `E2 ${JSON.stringify(text)} is kept as the unparsed cell ${want}`);
    else expect(r instanceof Error, `E2 ${JSON.stringify(text)} has no name, so the module check fails: ${r instanceof Error ? "threw" : "did not throw"}`);
  }
}
// both spellings check as the same cells
{
  const a = checkSources({ cells: "const a = () => 1;\n\nconst b = (a: number) => a + 1;", tsx: false });
  const b = checkSources({ cells: "export const a = () => 1;\n\nexport const b = (a: number) => a + 1;", tsx: false });
  const sig = (r: typeof a) => JSON.stringify(r.cells.map((c) => [c.name, c.status, c.value]));
  expect(sig(a) === sig(b) && a.cells.length === 2 && a.cells.every((c) => c.status === "ok"), `E1 with and without export check the same: ${sig(a)} vs ${sig(b)}`);
}

// A cell is a listener only when it calls the prelude's on, and a state cell only when it returns the
// prelude's state(...): a property key, a type member or a local binding of either name is neither
{
  const src = [
    "const cfg = () => ({ on: true, n: 1 });",
    "const use = (cfg: { readonly on: boolean; readonly n: number }) => cfg.n + 1;",
    "const sum = () => { const on = (a: number, b: number) => a + b; return on(1, 2); };",
    "const inc = () => [1, 2].map((on: number) => on + 1);",
    "const box = () => { const state = (x: number) => ({ initial: x }); return state(3); };",
  ].join("\n\n");
  const r = checkSources({ cells: src, tsx: false });
  const ctx = contextFromCheck(r, src, false);
  const vs = new Map(toolchain.splitCells(src, false).flatMap((t) => compileCell(t, false, ctx)).map((v) => [v.name, v]));
  expect(r.cells.every((c) => c.status === "ok"), `L1 the cells check ok: ${JSON.stringify(r.cells.map((c) => [c.name, c.status]))}`);
  for (const name of ["cfg", "use", "sum", "inc", "box"]) expect(toolchain.compiledKind(vs.get(name)?.definition ?? "")?.callee === "plain", `L1 ${name} compiles as a plain cell, not a listener or state cell`);
  // a plain cell takes no ss
  const value = (name: string, ...args: unknown[]) => attempt(() => (0, eval)(`(${vs.get(name)!.definition})`)(...args));
  const cfg = value("cfg");
  expect(JSON.stringify(cfg) === '{"on":true,"n":1}', `L1 cfg runs: ${cfg instanceof Error ? cfg.message : JSON.stringify(cfg)}`);
  const use = value("use", cfg);
  expect(use === 2, `L1 use runs: ${use instanceof Error ? use.message : use}`);
  expect(value("sum") === 3 && JSON.stringify(value("inc")) === "[2,3]" && JSON.stringify(value("box")) === '{"initial":3}', `L1 sum, inc and box run as plain cells`);
  const lis = compileCell("const l = (ev: Events<number>, act: Action<[number]>) => on(ev, act);", false);
  expect(/kind: "listener"/.test(lis[0].definition), "L1 a cell that returns the prelude's on(...) is still a listener");
}

console.log(`${n - fail} of ${n} edge checks pass`);
if (fail) process.exit(1);
