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

// B2: a cell whose value holds Sub gets the invalidation input, so the set it returns is released when it re-runs
{
  const src = [
    "export const ticks = function* (now: Clock) { while (true) yield now(); };",
    "export const count = (): RefCell<number> => ref(0);",
    "export const tick = (count: Ref<number>) => action((t: number) => count.update((c) => c + 1));",
    "export const a = (ticks: Source<number>, tick: Action<[number]>, on1: boolean) => on1 ? [on(ticks, tick)] : [];",
    "export const on1 = () => true;",
    "export const both = (a: Sub[], b: Sub[]) => [...a, ...b];",
    "export const b = (ticks: Source<number>, tick: Action<[number]>) => [on(ticks, tick)];",
    "export const total = (a: Sub[], b: Sub[]): number => a.length + b.length;",
  ].join("\n\n");
  const r = checkSources({ cells: src, tsx: true });
  expect(r.cells.every((c) => c.status === "ok"), "B2 module checks ok: " + r.cells.map((c) => c.name + ":" + c.status));
  const ctx = contextFromCheck(r);
  const by = new Map(src.split("\n\n").map((t) => { const v = compileCell(t, true, ctx).at(-1)!; return [v.name, v]; }));
  const both = by.get("both")!;
  expect(both.inputs.includes("invalidation") && /invalidation: \$ss\$inv\}\); \}$/.test(both.definition), "B2 both (returns Sub[] without calling on) takes invalidation: " + JSON.stringify(both.inputs));
  expect(by.get("a")!.inputs.includes("invalidation"), "B2 a (calls on) still takes invalidation");
  const total = by.get("total")!;
  expect(!total.inputs.includes("invalidation") && /invalidation: null\}\); \}$/.test(total.definition), "B2 total (takes Sub[], value number) has no invalidation: " + JSON.stringify(total.inputs));
  expect(!by.get("on1")!.inputs.includes("invalidation"), "B2 on1 has no invalidation");
}
// through an alias: the checker shows `Subs`, so the module source is what shows it holds Sub
{
  const src = [
    "type Subs = Sub[];",
    "type More = { list: Subs };",
    "export const ticks = function* (now: Clock) { while (true) yield now(); };",
    "export const tick = () => action((t: number) => {});",
    "export const b = (ticks: Source<number>, tick: Action<[number]>): Subs => [on(ticks, tick)];",
    "export const fw = (b: Subs): Subs => b;",
    "export const n = (b: Subs): number => b.length;",
  ].join("\n\n");
  const r = checkSources({ cells: src, tsx: true });
  expect(r.cells.every((c) => c.status === "ok"), "B2 alias module checks ok: " + r.cells.map((c) => c.name + ":" + c.status));
  const ctx = contextFromCheck(r, src, true);
  const fw = compileCell("export const fw = (b: Subs): Subs => b;", true, ctx)[0];
  expect(fw.inputs.includes("invalidation"), "B2 fw (value Subs = Sub[]) takes invalidation: " + JSON.stringify(fw.inputs));
  const nn = compileCell("export const n = (b: Subs): number => b.length;", true, ctx)[0];
  expect(!nn.inputs.includes("invalidation"), "B2 n (value number) has no invalidation");
}

// C4: the compiler's memo id is read and replaced structurally; a user's `id:` property is untouched
expect(typeof (toolchain as any).idOf === "function" && typeof (toolchain as any).withId === "function", "C4 ss-toolchain exports idOf and withId");
if (typeof (toolchain as any).idOf === "function") {
  const { idOf, withId } = toolchain as any as { idOf: (d: string) => string | null; withId: (d: string, id: string) => string };
  const src = `export const user = () => ({ id: "anon", n: 1 });`;
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
  const ref = compileCell(`export const r = (): RefCell<number> => ref(0);`, false);
  const proj = ref.find((v) => v.name === "r")!.definition;
  expect(idOf(proj) === null && withId(proj, "x1") === proj, "C4 a ref's projection has no id");
  const ty = def(`export type T = { id: "z" };`);
  expect(idOf(ty) === null && withId(ty, "x1") === ty, "C4 a type variable has no id");
  expect(idOf(ref.find((v) => v.name === "viewof r")!.definition) !== null, "C4 a ref's handle has an id");
}

// F1: TS-only expression forms erase to valid JS that computes the same value
for (const [src, tsx, arg, want] of [
  ["export const f = (x: number): number => (x) satisfies number;", false, 2, 2],
  ["export const f = (x: unknown): number => (x as number) satisfies number;", false, 3, 3],
  ["export const f = (x: number): number => ((x)) satisfies number;", false, 4, 4],
  ["export const f = (x: number): number => (x) as number;", false, 5, 5],
  ["export const f = (x: number): number => (x /* c */) /* d */ as /* as */ number;", false, 5, 5],
  ["export const f = (x: number | null): number => x!;", false, 6, 6],
  ["export const f = (x: number | null): number => (x)! + 1;", false, 6, 7],
  ["export const f = (x: { y: number } | null): number => x!.y;", false, { y: 8 }, 8],
  ["export const f = (x: unknown): number => <number>x;", false, 9, 9],
  ["export const f = (x: unknown): number => <number>(x) + 1;", false, 9, 10],
  ["export const f = (x: number) => <p>{(x) satisfies number}{x!}</p>;", true, 1, null],
  // a JSX operand: the cut must not swallow the /*ss>*/ that closes the lowered element
  ["export const f = (x: number) => <p>{x}</p> as const;", true, 1, null],
  ["export const f = (x: number) => <p>{x}</p> satisfies unknown;", true, 1, null],
  ["export const f = (x: number) => [<p>{x}</p> as const, 1];", true, 1, null],
  ["export const f = (x: number) => (<p>{x}</p>)!;", true, 1, null],
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
  const e = attempt(() => compileCell("export const f = (x: number) => { let y!: number; y = x; return y; };", false));
  expect(e instanceof Error ? /^unsupported: /.test(e.message) : roundTrips("export const f = (x: number) => { let y!: number; y = x; return y; };", false) === null,
    "F1 definite assignment `let y!: T` is refused or erased: " + (e instanceof Error ? e.message : "compiled"));
}

// F2: */ and *\/ inside strings, templates, regexes, literal types, comments and JSX round-trip exactly
for (const [src, tsx, arg, want] of [
  [`export const f = (x: number): string => "*/" + x;`, false, 1, "*/1"],
  [`export const f = (x: number): string => "*\\/" + x;`, false, 1, "*/1"],
  [`export const f = (x: number): string => "*\\\\/" + x;`, false, 1, "*\\/1"],
  [`export const f = (x: string): boolean => /a*\\//.test(x);`, false, "aa/", true],
  [`export const f = (x: string): boolean => /a*\\\\\\//.test(x);`, false, "a\\/", true],
  ["export const f = (x: number): string => `*\\/${x}*/`;", false, 1, "*/1*/"],
  [`export const f = (x: "*/" | "*\\/" | "*\\\\/"): string => x;`, false, "*/", "*/"],
  [`export const f = (x: /* a *\\/ b */ number): number => x;`, false, 2, 2],
  [`export const f = (x: { a: "**/" } | "*\\**/"): unknown => x;`, false, 3, 3],
  [`export const f = (x: string) => <p title="*\\/">{/a*\\//.test(x)} */ </p>;`, true, "a/", null],
  [`export const f = (x: string) => <p>{"*\\\\/"}{x as "*\\/"}</p>;`, true, "a", null],
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
  const src = `export const f = (x: string): boolean => /a*\\//.test(x);`;
  const r = checkSources({ cells: `export const x = (): string => "a/";\n\n${src}`, tsx: false });
  expect(r.cells.every((c) => c.status === "ok"), "F2 the checker accepts the regex cell: " + JSON.stringify(r.cells.map((c) => c.status)));
  const v = attempt(() => compileCell(src, false, contextFromCheck(r)));
  expect(!(v instanceof Error), "F2 the accepted regex cell compiles: " + (v instanceof Error ? v.message : "ok"));
}

// F3: raw U+0000 and U+0001 survive the round trip, in code and in JSX
for (const [src, tsx] of [
  ["export const f = (x: number): string => \"\u0000\" + (x as number) + \"\u0001\";", false],
  ["export const f = (x: number): string => `\u0001${x}\u0000`;", false],
  ["export const f = (x: number) => <p title=\"\u0001\">{\"\u0000\"}{x as number}</p>;", true],
  ["export const f = (x: number) => [<b>{\"\u0000\"}</b>, \"\u0001\", <i>{x}</i>];", true],
] as [string, boolean][]) {
  const bad = roundTrips(src, tsx);
  expect(bad === null, `F3 ${JSON.stringify(src)}: ${bad}`);
}

console.log(`${n - fail} of ${n} edge checks pass`);
if (fail) process.exit(1);
