// bun lite/toolchain/roundtrip-edge.test.ts — compile/decompile edge cases: Sub-typed cells, the memo id,
// TS constructs the eraser must not break, comment terminators and control characters in source.
import * as acorn from "acorn";
import * as toolchain from "./ss-toolchain.ts";
import { compileCell, decompileVariable, contextFromCheck } from "./ss-toolchain.ts";
import { checkSources } from "../core.ts";

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
  expect(ticks.definition.startsWith("function (") && /kind: "events", name: "ticks", memo: false, prev: this, id: "\w+", invalidation: \$ss\$inv\}\); \}$/.test(ticks.definition), "an events cell passes this and takes invalidation: " + ticks.definition.slice(-90));
  expect(decompileVariable(ticks.definition) === src.split("\n\n")[0], "an events cell decompiles to its source");
  const onTick = by.get("onTick")!;
  expect(/kind: "listener"/.test(onTick.definition) && onTick.inputs.at(-1) === "invalidation" && /memo: true/.test(onTick.definition), "a listener takes invalidation and is memoised: " + JSON.stringify(onTick.inputs));
  const label = by.get("label")!;
  expect(/kind: "cell"/.test(label.definition) && !label.inputs.includes("invalidation"), "a cell that takes Events but does not call on is a plain cell: " + JSON.stringify(label.inputs));
  expect(!by.get("fast")!.inputs.includes("invalidation") && /kind: "cell"/.test(by.get("pulses")!.definition) === false, "fast has no invalidation; pulses is events");
}

// C4: the compiler's memo id is read and replaced structurally; a user's `id:` property is untouched
expect(typeof (toolchain as any).idOf === "function" && typeof (toolchain as any).withId === "function", "C4 ss-toolchain exports idOf and withId");
if (typeof (toolchain as any).idOf === "function") {
  const { idOf, withId } = toolchain as any as { idOf: (d: string) => string | null; withId: (d: string, id: string) => string };
  const src = `const user = () => ({ id: "anon", n: 1 });`;
  const d = def(src);
  const id = idOf(d);
  expect(typeof id === "string" && /^\w+$/.test(id!) && d.includes(`id: "${id}", invalidation:`), "C4 idOf returns the compiler id: " + id);
  const d2 = withId(d, "abc_123");
  expect(idOf(d2) === "abc_123", "C4 withId sets the compiler id: " + idOf(d2));
  expect(decompileVariable(d2) === src, "C4 withId leaves the user's id: \"anon\" alone: " + decompileVariable(d2));
  expect(d2.replace(`id: "abc_123", invalidation:`, `id: "${id}", invalidation:`) === d, "C4 withId changes only the compiler id");
  expect(/\bid: "(\w+)", invalidation: [\w$]+\}\); \}$/.exec(d2)?.[1] === "abc_123", "C4 runtime evals regex reads the new id");
  expect(JSON.stringify(run(d2)) === JSON.stringify({ id: "anon", n: 1 }), "C4 the cell still returns the user's object");
  expect(attempt(() => withId(d, "bad id")) instanceof Error, "C4 withId refuses an id that is not \\w+");
  const ref = compileCell(`const r = (): StateCell<number> => state(0);`, false);
  expect(ref.length === 1 && ref[0].name === "r", "C4 a state cell is one variable: " + ref.map((v) => v.name));
  const ty = def(`type T = { id: "z" };`);
  expect(idOf(ty) === null && withId(ty, "x1") === ty, "C4 a type variable has no id");
  expect(idOf(ref[0].definition) !== null, "C4 a state cell's variable has an id");
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

console.log(`${n - fail} of ${n} edge checks pass`);
if (fail) process.exit(1);
