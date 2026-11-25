// cd lite && bun test infer/attack/live.test.ts: the live arm of selfhost/mut-groups-attack. The minimal programs of
// breaks.ts, the attack programs of the families each hole belongs to, and the variants written for each hole
// (variants.ts), checked by the shipped checker (lite/core.ts). Since the S4 change, see below. The programs that need
// the owner (owner.ts) are checked and their verdicts printed, not asserted.
import { test, expect } from "bun:test";
import { checkSources } from "../../core.ts";
import { attacks as breaks } from "../../../selfhost/mut-groups-attack/breaks.ts";
import { attacks as a1 } from "../../../selfhost/mut-groups-attack/a1-prelude-values.ts";
import { attacks as a5 } from "../../../selfhost/mut-groups-attack/a5-prelude2.ts";
import { attacks as a18 } from "../../../selfhost/mut-groups-attack/a18-holders.ts";
import { VARIANTS, RUNTIME_FREEZE } from "./variants.ts";
import { attacks as B_ATTACKS } from "./b-attacks.ts";
import { rewriteSS } from "./strip-calls.ts";
import { observe } from "./observe.ts";
import { OWNER } from "./owner.ts";
import { attacks as G1_ATTACKS, G5, G5_SRC } from "./g1-attacks.ts";
import { TOOLCHAIN } from "../../toolchain/ss-toolchain.ts";
import * as FROZEN_TC from "../frozen/ts/toolchain/ss-toolchain.ts";
import { attacks as B2_ATTACKS } from "./b2-attacks.ts";
import { attacks as CAST_ATTACKS } from "./cast-attacks.ts";
import { attacks as A9_ATTACKS } from "./a9-attacks.ts";
import { attacks as D1_ATTACKS } from "./d1-attacks.ts";
import { attacks as T1_ATTACKS } from "./t1-attacks.ts";
import { attacks as W1_ATTACKS } from "./w1-attacks.ts";
import { attacks as X1_ATTACKS } from "./x1-attacks.ts";
import { attacks as Y1_ATTACKS } from "./y1-attacks.ts";
import { attacks as OPEN_ATTACKS, FWD_RULES, A14_RULES } from "./open-attacks.ts";
import { checkSources as frozenCheck } from "../frozen/core.ts";

// a verdict: ACCEPT, or REJECT with each cell that is not ok and its rules
export const verdict = (src: string, foreign: string | null = null): string => {
  const r = checkSources({ cells: src, tsx: true, outside: [], foreign });
  const bad = r.cells.filter((c) => c.status !== "ok" || c.errors.length);
  if (!bad.length && !r.module.length && r.cells.length) return "ACCEPT";
  return `REJECT ${[...r.module.map((m) => `module[${m.rule}]`), ...bad.map((c) => `${c.name}:${c.status}${c.errors.map((e) => `[${e.rule}]`).join("")}`)].join(" ")}`;
};
// S4 language change (2026-11-22): a value another cell holds is deep-frozen at run time, and most ownership rules are
// gone. Every program (the attack families, the variants, the run-time programs, and the stage B attacks of
// b-attacks.ts) is checked with mut/freeze/borrow(e) rewritten to e (strip-calls.ts); one the checker accepts is run,
// and no value a cell was fulfilled with (a function: what calling it returns) may change unless that cell is in error.
const OWNER_BREAKS = new Set(["B3-same-mut-twice"]);
const FAMILY = new Set(["prelude-as-value", "mut-holder", "known-base-hole", "hidden-intrinsic-state", "group-generic-field"]);
type Run = { name: string; hole: string; src: string; foreign?: string | null; lent?: string[] };
const fromAttack: Run[] = [...breaks, ...a1, ...a5, ...a18]
  .filter((a) => !OWNER_BREAKS.has(a.name) && FAMILY.has(a.family))
  .map((a) => ({ name: `attack:${a.name}`, hole: a.family, src: a.src }));
const ALL: Run[] = [...fromAttack, ...VARIANTS, ...RUNTIME_FREEZE.map((p) => ({ name: p.name, hole: `run-${p.hole}`, src: p.src })), ...B_ATTACKS.map((a) => ({ name: a.name, hole: "B", src: a.src }))];
const stripped = (src: string): string => rewriteSS(src, true, "")?.out ?? src;
const tally = { n: 0, accepted: 0, threw: 0 };
for (const p of ALL)
  test(`${p.hole} ${p.name}: rejected, or accepted with no value changed silently`, async () => {
    const src = stripped(p.src), v = verdict(src, p.foreign ?? null);
    tally.n++;
    if (v !== "ACCEPT" || p.foreign) return;
    tally.accepted++;
    const r = await observe(src, p.lent ?? []);
    if (r.threw) tally.threw++;
    expect(r.silent).toEqual([]);
  });
test("counts (printed)", () => console.log(`live: ${tally.n} programs, ${tally.accepted} accepted and run, ${tally.threw} of them with a cell in error`));
// the stage B rules each reject the program written for them
const MUST: Record<string, string> = { "b4-kept-fn-writes": "mut-capture", "b4-typed-array-captured": "mut-capture", "b4-typed-array-subarray": "mut-capture", "b4-let-reassign-after": "let-capture", "b4-alias-write-after-gen": "mut-capture", "b5-yield-typed-array": "mut-yield", "b5-yield-in-record": "mut-yield", "b6-url-input": "member-write", "b6-map-input": "mutating-method", "b6-url-yield-then-set": "mut-yield", "b6-url-captured-gen": "mut-capture", "b4-fn-returns-captured": "mut-capture", "b4-async-helper-alias-many-awaits": "mut-capture" };
for (const [name, rule] of Object.entries(MUST))
  test(`B ${name} is rejected by [${rule}]`, () => expect(verdict(B_ATTACKS.find((a) => a.name === name)!.src)).toContain(`[${rule}]`));
test("the programs that need the owner (printed)", () => {
  for (const p of OWNER) console.log(`owner ${p.hole} ${p.name}: ${verdict(p.src, p.foreign ?? null)}`);
});
// holes6 (2026-11-22): the break families of selfhost/freeze-attack (b1-b7: aliases and helpers in kept functions, the
// freeze skip, async helpers after return, Error), this round's own (h6-attacks.ts), and holes7's: selfhost/freeze-attack2
// (thenables, a typed-array copy in the cell's own container, searchParams, the dead zone) and h7-attacks.ts; run by run-sets.ts in a child
// process (a late write that throws is an unhandled rejection, which bun:test would count against this test):
// accepted by the checker; running it changes nothing another cell holds, or throws.
// holes8: selfhost/freeze-attack3 (islands on the page, promises a kept function captures, rejection reasons) and
// h8-attacks.ts, read by the observer with promise snapshots, compile islands and two readings per run; rule set R:
// h9-attacks.ts; m1 step 2: m1-attacks.ts (memo against memoStrip, [mut-nested], R-M), whose 3 controls must fire; k1:
// k1-attacks.ts (the deep R-K test, the strip), whose 3 controls closure registration stops here (they fire with SS_MEASURE_REG=0);
// p1: p1-attacks.ts (a function published before its body ends, then a write; S4.11), read by drives and the publish tap,
// whose controls fire in neither mode since f1 (the let and P ones did before: a state write of a function made in the
// body now throws, S4.12; the memo one not since S2.13 stores no argument that reaches a function); f1: f1-attacks.ts
// (S4.12, freeze-attack7's causes observed by a second cell), whose let control fires in both modes and whose R memo
// control fires with SS_MEASURE_REG=0 (and in shipped mode only if one registration replaces another)
test("freeze-attack, h6, freeze-attack2, h7, freeze-attack3, h8, h9, m1, k1, p1 and f1 families: accepted programs change nothing another cell holds, or throw", () => {
  const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "freeze,h6,freeze2,h7,freeze3,h8,h9,m1,k1,p1,f1,g1"], { stdout: "pipe", stderr: "pipe" });
  const out = r.stdout.toString(), lines = out.split("\n");
  console.log(lines.filter((l) => l.startsWith("-- ")).join("\n"));
  expect(lines.filter((l) => l.startsWith("SILENT "))).toEqual([]);
  expect(out).toMatch(/^-- freeze: 315 programs/m);
  expect(out).toMatch(/^-- freeze2: 309 programs/m);
  expect(out).toMatch(/^-- h7: \d+ programs/m);
  expect(out).toMatch(/^-- freeze3: 360 programs/m);
  expect(out).toMatch(/^-- h8: \d+ programs/m);
  expect(out).toMatch(/^-- h9: \d+ programs/m);
  expect(out).toMatch(/^-- m1: \d+ programs/m);
  expect(out).toMatch(/^-- m1-controls: 3, fired 3$/m);
  expect(out).toMatch(/^-- k1: 65 programs/m);
  expect(out).toMatch(/^-- k1-controls: 3, fired 0$/m);
  expect(out).toMatch(/^-- p1: 40 programs/m);
  expect(out).toMatch(/^-- p1-controls: 5, fired 0$/m);
  // w1 (2026-11-24): f1-ok-mut-alias-plain-read hid its Mut member behind a type that leaves it out; the forgetting rule
  // refused it. y1: the width test is gone and it is accepted again, as its name says
  expect(out).toMatch(/^-- f1: 16 programs, accepted 16, silent 0/m);
  expect(out).toMatch(/^-- f1-controls: 4, fired 1$/m);
  expect(out).toMatch(/^-- g1: 50 programs, accepted 15, silent 0/m);
  expect(out).toMatch(/^-- g1-controls: 4, fired 0$/m);
}, 300000); // the child run takes about 15 s, over bun's default limit
// e1 (2026-11-23): g1-attacks.ts with S4.12's throw off (SS_MEASURE_BODYFN=0), where only closure registration stops
// the write: before e1, 32 of its programs were silent here (G1 a capture named i, G2 a binding named ss_closure or
// ss_methods, G3 accepted cells in error, G4 a BigInt method key); g1-ctl-let fires (a let is not frozen)
test("g1: with S4.12's throw off, closure registration alone stops every write", () => {
  const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "g1"], { stdout: "pipe", stderr: "pipe", env: { ...process.env, SS_MEASURE_BODYFN: "0" } });
  const out = r.stdout.toString();
  expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
  expect(out).toMatch(/^-- g1: 50 programs, accepted 15, silent 0/m);
  expect(out).toMatch(/^-- g1-controls: 4, fired 1$/m);
}, 300000);
// e1 (2026-11-23), B2: a write on a receiver made in the same expression is accepted; b2-attacks.ts's other rows try
// receivers that may be another name for a read-only c. Every row reads the same in shipped mode and with registration
// off (driveG says DIFF when c changed), and the frozen checker gives every b2 cell the same verdict and rules
for (const env of [{}, { SS_MEASURE_REG: "0" }])
  test(`b2: a write accepted on a fresh receiver changes nothing another name reads${"SS_MEASURE_REG" in env ? " (SS_MEASURE_REG=0)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "b2"], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toMatch(/^-- b2: 90 programs, accepted 20, silent 0, with a cell in error 0$/m);
    expect(out).toMatch(/^-- b2-controls: 4, fired 4$/m);
  }, 300000);
const rulesOf = (r: { module: readonly { rule: string }[]; cells: readonly { errors: readonly { rule: string }[]; unsupported: readonly unknown[]; status: string }[] }) =>
  ({ ok: !r.module.length && r.cells.every((c) => c.status === "ok"), rules: [...new Set(r.cells.flatMap((c) => [...c.errors.map((e) => e.rule), ...(c.unsupported.length ? ["unsupported"] : [])]))].sort() });
for (const a of B2_ATTACKS.filter((x) => !x.ctl))
  test(`b2 ${a.name} is ${a.name.startsWith("b2-ok-") ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(a.name.startsWith("b2-ok-"));
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
// e1 (2026-11-23), S9.8: cast<T>(v) on values made in JavaScript (cast-attacks.ts): no row is handed a value that is not
// a T, is not deep-frozen plain data, or is the value given, in shipped mode, with registration off and with the rules
// that --off drops off; cast-ok-* rows (a T with extra members, holes typed undefined, NaN, ...) are handed the copy
for (const args of [[], ["--off"]]) for (const env of [{}, { SS_MEASURE_REG: "0" }])
  test(`cast: no hostile value passes as a T${args.length ? " (--off)" : ""}${"SS_MEASURE_REG" in env ? " (SS_MEASURE_REG=0)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "cast", ...args], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toMatch(/^-- cast: 34 programs, accepted 34, silent 0, with a cell in error 0$/m);
    expect(out).toMatch(/^-- cast-controls: 4, fired 4$/m);
  }, 300000);
// the types cast refuses when the cell is checked, and the calls it refuses; the frozen checker agrees on each
const CAST_REFUSED: [string, string][] = [
  ["no type argument", "cast(v)"], ["two type arguments", "cast<number, string>(v)"], ["no argument", "cast<number>()"], ["two arguments", "cast<number>(v, 1)"],
  ["a function", "cast<() => number>(v)"], ["a record holding a function", "cast<{ readonly f: (x: number) => number }>(v)"], ["a method", "cast<{ m(): void }>(v)"],
  ["Mut", "cast<Mut<number[]>>(v)"], ["a Promise", "cast<Promise<number>>(v)"], ["Map", "cast<Map<string, number>>(v)"], ["Set", "cast<Set<number>>(v)"],
  ["a class instance", "cast<RegExp>(v)"], ["a typed array", "cast<Float64Array>(v)"], ["URL", "cast<URL>(v)"], ["an index signature", "cast<{ readonly [k: string]: number }>(v)"],
  ["an open type parameter", "(<T,>(y: unknown) => cast<T>(y))(v)"], ["never", "cast<never>(v)"], ["object", "cast<object>(v)"], ["Elem", "cast<Elem>(v)"], ["bigint", "cast<bigint>(v)"], ["an Action", "cast<Action<[]>>(v)"], ["State", "cast<State<number>>(v)"],
];
for (const [what, call] of CAST_REFUSED)
  test(`cast: ${what} is refused when the cell is checked, by both checkers alike`, () => {
    const src = `const g = () => {\n  const v: unknown = JSON.parse("1");\n  const r = ${call};\n  return 1;\n};`;
    const live = rulesOf(checkSources({ cells: src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(false);
    expect(live.rules.filter((r) => !["cast-type", "arity", "unknown-type", "mut-nested"].includes(r))).toEqual([]);
    expect(rulesOf(frozenCheck({ cells: src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
for (const a of CAST_ATTACKS.filter((x) => !x.ctl))
  test(`cast ${a.name} is accepted by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live).toEqual({ ok: true, rules: [] });
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
// e1 (2026-11-23), B5: ergonomics1's isolate/hang-self-alias.ts (28's program with type Key = Key) did not return from
// checkSources; the alias is [type-cycle] and is not loaded, so the uses of Key are [unknown-type]
test("b5: a type alias defined by itself is [type-cycle], and the checker returns", async () => {
  const src = await Bun.file(new URL("../../../selfhost/ergonomics1/isolate/hang-self-alias.ts", import.meta.url).pathname).text();
  const r = checkSources({ cells: src, tsx: true, outside: [], foreign: null });
  expect(r.module.map((e) => e.rule)).toEqual(["type-cycle"]);
  expect(r.cells.filter((c) => c.status !== "ok").map((c) => c.name)).toEqual(["onKey", "listen"]);
});
// each of these did not return from checkSources before e1 (a member read of a value of the alias's type); Mut and
// Borrowed are no structure, since the registry reads Mut<T> as T
for (const src of ["type Key = Key;", "type K = Mut<K>;", "type K = Borrowed<K>;", "type A = Mut<B>;\ntype B = A;", "type Id<T> = T;\ntype K = Id<Id<K>>;", "type K = K | { readonly key: number };"])
  test(`b5: ${JSON.stringify(src)} is [type-cycle] and a member read of it returns`, () => {
    const r = checkSources({ cells: `${src}\nconst f = () => (e: ${src.includes("type Key") ? "Key" : src.includes("type A") ? "A" : "K"}) => e.key;`, tsx: true, outside: [], foreign: null });
    expect(r.module.map((e) => e.rule)).toContain("type-cycle");
    expect(r.cells.map((c) => c.status)).toEqual(["rejected"]);
  });
// e1 (2026-11-23), B4: false rejections of ergonomics1 that are accepted since e1, and reduce's message
const B4_ACCEPTS: [string, string][] = [
  ["reduce with an annotated callback", "const a = () => [1, 2].reduce((acc: number, v: number) => acc + v, 0);"],
  ["a local typed { [k: string]: T } is writable", "const a = () => {\n  const m: { [k: string]: number } = {};\n  m[\"a\"] = 1;\n  return m;\n};"],
  ["key on a component", "const B = () => (p: { n: number }) => <span>{p.n}</span>;\nconst v = (B: (p: { n: number }) => Elem) => <div>{[1, 2].map((n) => <B key={n} n={n} />)}</div>;"],
  ["a generator yielding an object literal as Events", "const g = function* (now: Clock) { yield { k: 1, t: now() }; };\nconst hk = () => action((e: { k: number; t: number }) => {});\nconst l = (g: Events<{ k: number; t: number }>, hk: Action<[{ k: number; t: number }]>) => on(g, hk);"],
  ["an async function returning a promise", "const f = async () => {\n  const g = async () => 1;\n  const n: number = await (async () => g())();\n  return n;\n};"],
];
for (const [what, src] of B4_ACCEPTS)
  test(`b4: ${what} is accepted`, () => {
    const r = checkSources({ cells: src, tsx: true, outside: [], foreign: null });
    expect([...r.module, ...r.cells.flatMap((c) => c.errors)].map((e) => `[${e.rule}] ${e.msg}`)).toEqual([]);
  });
test("b4: reduce without a start value stays rejected, and its message says a start value is required", () => {
  const r = checkSources({ cells: "const a = () => [1, 2].reduce((x, y) => x + y);", tsx: true, outside: [], foreign: null });
  expect(r.cells[0]?.errors.find((e) => e.rule === "arity")?.msg).toContain("a start value is required");
});
// the registration gaps a checker rule masks (G5): each form is rejected by exactly these rules, so a rule that goes
// away, or a second rule that starts to mask the form, shows here
for (const [id, form, rules] of G5)
  test(`g1 ${id} is rejected by ${rules.join(", ")} only`, () => {
    const r = checkSources({ cells: G5_SRC(form), tsx: true, outside: [], foreign: null });
    const got = [...new Set(r.cells.flatMap((c) => [...c.errors.map((e) => e.rule), ...(c.unsupported.length ? ["unsupported"] : [])]))].sort();
    expect(got).toEqual([...rules].sort());
  });
// the two registration twins (fnreg.ts, used by link.ts and the frozen toolchain; tc-reg.ss.ts, the shipped
// toolchain) emit the same text for every g1 program and every method key spelling
test("g1: fnreg.ts and tc-reg.ss.ts register the same captures under the same keys", () => {
  const keys = ["m", "'a-b'", "1", "0x10", "1e21", "0.5", "1n", "0x10n", "1_0n"].map((k) => `const put = () => { const xs = [0]; const c: readonly number[] = xs; const o = { ${k}() { return c.length; } }; return 1; };`);
  const regs = (defs: { definition: string }[]) => defs.map((v) => v.definition).join("\n");
  for (const src of [...G1_ATTACKS.map((a) => a.src), ...keys]) expect(regs(TOOLCHAIN.compileModule(src, true, null))).toBe(regs(FROZEN_TC.compileModule(src, true, null)));
});
// a9 (2026-11-23): freeze-attack9's breaks (a9-attacks.ts). No row is silent in shipped mode or with registration off;
// a9-ok-* rows are accepted and every other row is rejected, by both checkers alike. The rows that branch 18 to 40
// deep each finish inside the test (SHAPE_PARTS); before a9 the depth-30 row gave no verdict in 150 s
for (const env of [{}, { SS_MEASURE_REG: "0" }])
  test(`a9: no row of freeze-attack9's breaks is silent${"SS_MEASURE_REG" in env ? " (SS_MEASURE_REG=0)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "a9"], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toMatch(/^-- a9: 64 programs, accepted 19, silent 0, with a cell in error 0$/m);
  }, 300000);
for (const a of A9_ATTACKS)
  test(`a9 ${a.name} is ${a.name.startsWith("a9-ok-") ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(a.name.startsWith("a9-ok-"));
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
// B-2 at the boundary: a parameter that names a cell in another language, annotated with a literal JSON writes as null
for (const ann of ["1e400", "-1e400", "{ readonly a: 1e400 }", "readonly (1 | 1e400)[]"])
  test(`a9: a boundary annotation ${ann} is [boundary-type] in both checkers`, () => {
    const src = { cells: `const f = (x: ${ann}) => 1;`, tsx: true, outside: [{ name: "x" }], foreign: null };
    const live = rulesOf(checkSources(src as Parameters<typeof checkSources>[0]));
    expect(live).toEqual({ ok: false, rules: ["boundary-type"] });
    expect(rulesOf(frozenCheck(src as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
// y1 (2026-11-24): controls (checker skipped) that the run time now refuses at hand-over (a response, or a generator object
// a cell that is not a generator returns): loud, so they no longer fire
const HANDED = new Set(["d1-ctl-resp-two-readers", "t1-a-ctl-empty", "w1-1-a-r-ctl-direct", "x1-1-gobj-ctl-generator-own-type"]);
// d1 (2026-11-24): the owner's decisions A to F (d1-attacks.ts). No row is silent in shipped mode or with registration off,
// each control fires; d1-ok-* rows are accepted and every other row is rejected, by both checkers alike
const D1_ROWS = D1_ATTACKS.filter((a) => !a.ctl), D1_OK = D1_ROWS.filter((a) => a.name.startsWith("d1-ok-")).length;
for (const env of [{}, { SS_MEASURE_REG: "0" }])
  test(`d1: no row of the owner's decisions is silent${"SS_MEASURE_REG" in env ? " (SS_MEASURE_REG=0)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "d1"], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toContain(`-- d1: ${D1_ROWS.length} programs, accepted ${D1_OK}, silent 0, with a cell in error 0`);
    const ctl = D1_ATTACKS.length - D1_ROWS.length, fire = D1_ATTACKS.filter((a) => a.ctl && !HANDED.has(a.name)).length;
    if (!("SS_MEASURE_REG" in env)) expect(out).toContain(`-- d1-controls: ${ctl}, fired ${fire}`);
  }, 300000);
for (const a of D1_ROWS)
  test(`d1 ${a.name} is ${a.name.startsWith("d1-ok-") ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(a.name.startsWith("d1-ok-"));
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
// t1 (2026-11-24): the fixes of freeze-attack10 (t1-attacks.ts). No row is silent under runCells or the compiled runner
// (--rt); each control fires under the compiled runner, and under runCells except the -rt- ones, which only the compiled
// runner shows; t1-ok-* rows are accepted and every other row is rejected, by both checkers alike
// y1 (2026-11-24): rows a removed check (w1's record-width non-plain test, x1's unknown/object non-plain test) rejected
// and both checkers now accept. Y1_LOUD: a response a type left out, refused at hand-over (a cell in error); Y1_QUIET: a
// function, an Action or a promise that stays in its cell, which no member and no conversion reaches. None is silent
const Y1_LOUD = new Set(["w1-1-a-r-extra", "w1-1-a-r-extra-alias", "w1-1-a-r-extra-arr", "w1-1-a-r-extra-gen", "w1-1-a-r-extra-iface", "w1-1-a-r-extra-kept", "w1-1-a-r-extra-map", "w1-1-a-r-extra-name", "w1-1-a-r-extra-nested", "w1-1-a-r-extra-opt-union", "w1-1-a-r-extra-param", "w1-1-a-r-extra-promise", "w1-1-a-r-extra-rest", "w1-1-a-r-extra-set", "w1-1-a-r-extra-spread", "w1-1-a-r-extra-ternary", "w1-1-a-r-extra-union", "w1-1-a-r-extra-unknown", "w1-1-a-o-extra-direct", "w1-1-a-o-extra-spread", "w1-1-a-o-extra-unknown", "w1-1-a-g-unknown-arr-extra", "w1-1-a-r-two-ss", "w1-1-min-resp-race"]);
const Y1_QUIET = new Set(["t1-a-undeclared-action", "w1-1-a-m-extra-action", "w1-1-a-m-extra-action-unknown", "w1-1-extra-fn", "w1-1-extra-fn-return", "w1-1-extra-promise", "x1-1-unknown-fn", "x1-1-object-map-of-fns", "x1-1-index-of-fns-unknown"]);
const y1Ok = (n: string) => Y1_LOUD.has(n) || Y1_QUIET.has(n);
const y1In = (rows: { name: string }[]) => rows.filter((a) => y1Ok(a.name)).length;
const y1LoudIn = (rows: { name: string }[]) => rows.filter((a) => Y1_LOUD.has(a.name)).length;
const T1_ROWS = T1_ATTACKS.filter((a) => !a.ctl), T1_OK = T1_ROWS.filter((a) => a.name.startsWith("t1-ok-")).length;
for (const rt of [false, true])
  test(`t1: no row of the attack 10 fixes is silent${rt ? " (compiled runner)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "t1", ...(rt ? ["--rt"] : [])], { stdout: "pipe", stderr: "pipe" });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toContain(`-- t1: ${T1_ROWS.length} programs, accepted ${T1_OK + y1In(T1_ROWS)}, silent 0, with a cell in error ${y1LoudIn(T1_ROWS)}`);
    const ctl = T1_ATTACKS.filter((a) => a.ctl && !HANDED.has(a.name) && (rt || !a.name.includes("-rt-"))).length;
    expect(out).toContain(`-- t1-controls: ${T1_ATTACKS.length - T1_ROWS.length}, fired ${ctl}`);
  }, 300000);
for (const a of T1_ROWS)
  test(`t1 ${a.name} is ${a.name.startsWith("t1-ok-") || y1Ok(a.name) ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(a.name.startsWith("t1-ok-") || y1Ok(a.name));
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });

// w1 (2026-11-24): freeze-attack10 and 11 by w1 step (w1-attacks.ts). No row is silent under runCells or the compiled
// runner; the w1-guard-* controls (an action called while a cell computes) fire under neither, every other control fires
// under both; w1-ok-* rows are accepted and every other row is rejected, by both checkers alike
const W1_ROWS = W1_ATTACKS.filter((a) => !a.ctl), W1_OK = W1_ROWS.filter((a) => a.name.startsWith("w1-ok-")).length;
for (const rt of [false, true])
  test(`w1: no row of the w1 fixes is silent${rt ? " (compiled runner)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "w1", ...(rt ? ["--rt"] : [])], { stdout: "pipe", stderr: "pipe" });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toContain(`-- w1: ${W1_ROWS.length} programs, accepted ${W1_OK + y1In(W1_ROWS)}, silent 0, with a cell in error ${y1LoudIn(W1_ROWS)}`);
    const fire = W1_ATTACKS.filter((a) => a.ctl && !HANDED.has(a.name) && !a.name.startsWith("w1-guard-")).length;
    expect(out).toContain(`-- w1-controls: ${W1_ATTACKS.length - W1_ROWS.length}, fired ${fire}`);
    expect(r.exitCode).toBe(0);
  }, 300000);
for (const a of W1_ROWS)
  test(`w1 ${a.name} is ${a.name.startsWith("w1-ok-") || y1Ok(a.name) ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(a.name.startsWith("w1-ok-") || y1Ok(a.name));
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });

// x1 (2026-11-24): freeze-attack12 by x1 step (x1-attacks.ts). No row is silent under runCells or the compiled runner;
// the x1-guard-* controls (an action called after an await, in a then callback or in an async generator while a cell
// computes) fire under neither, and each one this round added, and attack 12's that fired before, fires under both
// with SS_MEASURE_GUARD=0; every other control fires; x1-ok-* rows are accepted and every other row is rejected, by
// both checkers alike
const X1_ROWS = X1_ATTACKS.filter((a) => !a.ctl), X1_OK = X1_ROWS.filter((a) => a.name.startsWith("x1-ok-")).length;
const X1_FIRE = X1_ATTACKS.filter((a) => a.ctl && !HANDED.has(a.name) && !a.name.startsWith("x1-guard-")).length;
// attack 12's guard controls that the guard of a cell's synchronous part already refused before x1
const X1_A12_HELD = ["sync", "gen-between", "agen-between", "kept-sync-caller", "invalidation", "component", "memo", "memo-async", "map-callback", "set-callback", "set-callback-async"];
for (const [rt, off] of [[false, false], [true, false], [false, true], [true, true]])
  test(`x1: no row of the x1 fixes is silent${rt ? " (compiled runner)" : ""}${off ? " (SS_MEASURE_GUARD=0)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "x1", ...(rt ? ["--rt"] : [])], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...(off ? { SS_MEASURE_GUARD: "0" } : {}) } });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toContain(`-- x1: ${X1_ROWS.length} programs, accepted ${X1_OK + y1In(X1_ROWS)}, silent 0, with a cell in error ${y1LoudIn(X1_ROWS)}`);
    const guardOff = X1_ATTACKS.filter((a) => a.name.startsWith("x1-guard-") && !X1_A12_HELD.some((n) => a.name === `x1-guard-a12-${n}`)).length;
    expect(out).toContain(`-- x1-controls: ${X1_ATTACKS.length - X1_ROWS.length}, fired ${X1_FIRE + (off ? guardOff : 0)}`);
    expect(out).toContain("-- guard depth left above 0 by 0 programs");
    expect(r.exitCode).toBe(0);
  }, 300000);
for (const a of X1_ROWS)
  test(`x1 ${a.name} is ${a.name.startsWith("x1-ok-") || y1Ok(a.name) ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(a.name.startsWith("x1-ok-") || y1Ok(a.name));
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });

// y1 (2026-11-24): the run time as the guarantee for the capability class (y1-attacks.ts). No row is silent under runCells
// or the compiled runner; each y1-ok-* row (a legal value that crosses a hand-over) is accepted and runs with no cell in
// error; the y1-ctl-* controls (checker skipped) are refused at hand-over, so none fires, and every one fires with
// SS_MEASURE_HANDOVER=0, which shows the refusal is what stops them
const Y1_CTL = Y1_ATTACKS.filter((a) => a.ctl).length;
const blocksOf = (out: string): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  let cur: string[] | null = null;
  for (const l of out.split("\n")) {
    const h = /^== y1(?:-controls)? (\S+): (.*)$/.exec(l);
    if (h) { cur = [h[2]!]; m.set(h[1]!, cur); } else if (cur && l.startsWith("   ")) cur.push(l.trim()); else cur = null;
  }
  return m;
};
for (const [rt, off] of [[false, false], [true, false], [false, true], [true, true]])
  test(`y1: no row is silent, the legal rows run clean, the controls are refused${rt ? " (compiled runner)" : ""}${off ? " (SS_MEASURE_HANDOVER=0)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "y1", ...(rt ? ["--rt"] : [])], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...(off ? { SS_MEASURE_HANDOVER: "0" } : {}) } });
    const out = r.stdout.toString();
    expect(out).toContain(`-- y1-controls: ${Y1_CTL}, fired ${off ? Y1_CTL : 0}`);
    if (off) return;
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    const bad = [...blocksOf(out)].filter(([n, ls]) => n.startsWith("y1-ok-") && (!ls[0]!.startsWith("ACCEPT") || ls.some((l) => l.startsWith("error ") || l.includes("DIFF") || /^drive -> same: \S+ (rejected|pending|not a function)/.test(l))));
    expect(bad).toEqual([]);
    // a program a removed check rejected (y1-rm-*): rejected by another rule, or accepted and loud
    const quietRm = [...blocksOf(out)].filter(([n, ls]) => n.startsWith("y1-rm-") && ls[0]!.startsWith("ACCEPT") && !ls.some((l) => l.startsWith("error ") || l.includes("call threw") || l.startsWith("drive threw") || /^late /.test(l)));
    expect(quietRm.map(([n]) => n)).toEqual([]);
    expect(blocksOf(out).size).toBe(Y1_ATTACKS.length);
    expect(r.exitCode).toBe(0);
  }, 600000);

// open (2026-11-25): a function with more parameters than its type (open-attacks.ts). No row is silent under either
// runner; each open-ok-* row is accepted and runs with no cell in error and no DIFF; each control fires; every other
// row is rejected, with [arity] (or [inject-type] for a cell's parameter; part 2's open-act-* rows [action-capture]), by
// both checkers alike
// part 6: open-ho-* rows are accepted and their cell g is in error with the hole RangeError (S3.21); with the check
// off (SS_MEASURE_HOLES=0) each one is silent
const OPEN_ROWS = OPEN_ATTACKS.filter((a) => !a.ctl), OPEN_HO = OPEN_ROWS.filter((a) => a.name.startsWith("open-ho-")).length;
const accepts = (n: string) => n.startsWith("open-ok-") || n.startsWith("open-ho-"), OPEN_OK = OPEN_ROWS.filter((a) => accepts(a.name)).length;
for (const rt of [false, true])
  test(`open: no row is silent, the legal rows run clean, the controls fire${rt ? " (compiled runner)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "open", ...(rt ? ["--rt"] : [])], { stdout: "pipe", stderr: "pipe" });
    const out = r.stdout.toString();
    expect(out.split("\n").filter((l) => l.startsWith("SILENT "))).toEqual([]);
    expect(out).toContain(`-- open: ${OPEN_ROWS.length} programs, accepted ${OPEN_OK}, silent 0, with a cell in error ${OPEN_HO}`);
    expect(out).toContain(`-- open-controls: ${OPEN_ATTACKS.length - OPEN_ROWS.length}, fired ${OPEN_ATTACKS.length - OPEN_ROWS.length}`);
    expect(r.exitCode).toBe(0);
  }, 300000);
for (const a of OPEN_ROWS)
  test(`open ${a.name} is ${accepts(a.name) ? "accepted" : "rejected"} by both checkers alike`, () => {
    const live = rulesOf(checkSources({ cells: a.src, tsx: true, outside: [], foreign: null }));
    expect(live.ok).toBe(accepts(a.name));
    // part 3: open-fwd-* is [free-name]; open-fwdr-* is the rule FWD_RULES names and never [free-name]
    const want = a.name.startsWith("open-act-") ? ["action-capture"] : a.name.startsWith("open-fwd-") || a.name.startsWith("open-fwdo-") ? ["free-name"] : a.name.startsWith("open-fwdr-") ? [FWD_RULES.get(a.name) ?? "?"] : a.name.startsWith("open-a14-") ? A14_RULES.get(a.name) ?? ["?"] : ["arity", "inject-type"];
    if (!live.ok) expect(want.some((w) => live.rules.includes(w))).toBe(true);
    if (a.name.startsWith("open-fwdr-")) expect(live.rules.includes("free-name")).toBe(false);
    expect(rulesOf(frozenCheck({ cells: a.src, tsx: true, outside: [], foreign: null } as Parameters<typeof frozenCheck>[0]))).toEqual(live);
  });
for (const rt of [false, true])
  test(`open: with SS_MEASURE_HOLES=0 each open-ho row is silent${rt ? " (compiled runner)" : ""}`, () => {
    const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "open", "--only", "open-ho-", ...(rt ? ["--rt"] : [])], { stdout: "pipe", stderr: "pipe", env: { ...process.env, SS_MEASURE_HOLES: "0" } });
    expect(r.stdout.toString()).toContain(`-- open: ${OPEN_HO} programs, accepted ${OPEN_HO}, silent ${OPEN_HO}, with a cell in error 0`);
  }, 300000);
// open part 6: the out-of-scope rows of attack 14 (out-of-scope.ts) are the only silent rows of their files under drive-rt
import { OUT_OF_SCOPE } from "./out-of-scope.ts";
for (const [file, names] of Object.entries(OUT_OF_SCOPE))
  test(`out of scope: ${file} is silent only on its ${names.length} recorded rows`, () => {
    const root = new URL("../../../", import.meta.url).pathname;
    const r = Bun.spawnSync(["bun", new URL("./drive-rt.ts", import.meta.url).pathname, file], { cwd: root, stdout: "pipe", stderr: "pipe" });
    const silent = r.stdout.toString().split("\n").filter((l) => l.startsWith("SILENT ")).map((l) => l.slice(l.lastIndexOf(":") + 1)).sort();
    expect(silent).toEqual([...names].sort());
  }, 300000);
