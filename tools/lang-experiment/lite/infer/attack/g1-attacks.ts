// g1 (e1, 2026-11-23): the closure registration gaps of selfhost/freeze-attack8 (G1-G4), standing. Every row is checked by
// the live checker and, when accepted, run; S4.12's throw masks all of them in shipped mode, so the set is meant to be
// read with SS_MEASURE_BODYFN=0 (live.test.ts spawns it that way), where only the freeze of what the stored function
// captures can stop the write. Before e1, G1/G2/G4 rows were silent there and G3 rows were accepted cells in error;
// since e1, G1 rows register and throw at the write, G2/G3/G4 rows are rejected ([reserved-name], BigInt key).
// Vehicles: A is freeze-attack8 lib2.ts's (round 7's Q1 action form: st = s.set read before the Mut is declared, then
// st(F); ls(F()); xs.push(1)); B is r3's b7 form (snap, an action of another cell, reads the holder between the publish
// and the write). G3 rows are cells the checker accepted that crash because of an inserted name: their drive says DIFF
// when an accepted cell is in error, so the set counts each as a finding. G5 rows (registration gaps behind a checker
// rule that stays) are run in vehicle A too; live.test.ts asserts the exact rules that reject each, so a row the checker
// starts to accept shows. Controls (ctl, run without the checker): g1-ctl-c-* fire only with SS_MEASURE_REG=0 too;
// g1-ctl-let fires whenever S4.12's throw is off (a let is not frozen).
type A = { name: string; src: string; ctl?: boolean; drive?: (p: any) => unknown };
const P = "const xs = [0]; const c: readonly number[] = xs;";
// freeze-attack8/lib2.ts A and driveA, copied (that file imports freeze-attack3's harness, which imports run-sets.ts)
const VA = (pre: string, form: string) => `const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; const st = s.set; ${pre} ${form} st(F); ls(F()); xs.push(1); }) });`;
const driveA = async (p: any) => {
  const a = p.value("put");
  if (!a || typeof a.go !== "function") return `no action (${p.status("put")} ${String(p.error?.("put") ?? "").slice(0, 100)})`;
  try { a.go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 140)}`; }
  await p.settle(300);
  const h = p.value("v"), w = p.value("w");
  let now: unknown; try { now = h(); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  if (now === -1) return "same: holder not written";
  return `${JSON.stringify(now) !== JSON.stringify(w) ? "DIFF" : "same"} given (lg, recorded in the body) ${JSON.stringify(w)} holds ${JSON.stringify(now)}`;
};
const S2 = "const s = () => state<() => number>(() => -1);\nconst t = () => state(-1);\nconst v = (s: () => number) => s();\nconst w = (t: number) => t;\nconst snap = (s: State<() => number>, t: State<number>) => action(() => { t.set(read(s)()); });\n";
const VB = (b: string) => `${S2}const put = (s: State<() => number>, snap: Action<[]>) => ({ go: action(() => { const st = s.set; ${b} }) });`;
const driveB = async (p: any) => {
  try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; }
  await p.settle(400);
  const v = p.value("v"), w = p.value("w");
  return `${v !== w ? "DIFF" : "same"} v = s() = ${v}, w = what snap read = ${w}`;
};
// G3: an accepted cell in error is the finding (the checker's verdict is passed in, so only accepted rows run)
const driveErr = async (p: any) => {
  await p.settle(400);
  const bad = [...p.recs.values()].filter((r: any) => r.status === "rejected");
  return bad.length ? `DIFF accepted cell in error: ${bad.map((r: any) => `${r.name}: ${String(r.error?.message ?? r.error).slice(0, 80)}`).join("; ")}` : "same: no cell in error";
};
const I = "const i: readonly number[] = xs;";
const G1: [string, string][] = [
  ["I-arrow", `${I} const F = () => i.length;`],
  ["I-arrow-two", `${I} const k1 = 1; const F = () => i.length + k1;`],
  ["I-arrow-three", `${I} const a1 = 1; const z1 = 2; const F = () => i.length + a1 + z1;`],
  ["I-fn-expr", `${I} const F = function () { return i.length; };`],
  ["I-fn-decl", `${I} function F() { return i.length; }`],
  ["I-method", `${I} const o = { m() { return i.length; } }; const F = o.m;`],
  ["I-method-two", `${I} const k1 = 1; const o = { m() { return i.length + k1; } }; const F = o.m;`],
  ["I-map-param-ro", "const rows: readonly (readonly number[])[] = [c]; const F = rows.map((i) => () => i.length)[0] ?? (() => 0);"],
  ["I-helper-param", "const mk = (i: readonly number[]) => () => i.length; const F = mk(c);"],
  ["I-for-of", "const fs: (() => number)[] = []; for (const i of [c]) fs.push(() => i.length); const F = fs[0] ?? (() => 0);"],
  ["I-transitive", `${I} const g = () => i.length; const F = () => g();`],
  ["I-holds-fn", "const i = () => c.length; const F = () => i();"],
  ["I-holds-record", "const i = { t: c }; const F = () => i.t.length;"],
  ["I-destr", "const { i } = { i: c }; const F = () => i.length;"],
  // the e1 parameter name itself, as a user would spell it (rejected since e1 as a reserved name)
  ["I-ss_i", "const ss_i: readonly number[] = xs; const F = () => ss_i.length;"],
];
const G2: [string, string][] = [
  ["SH-const", "const ss_closure = <T,>(f: T, t: unknown): T => f; const F = () => c.length;"],
  ["SH-fndecl", "function ss_closure<T,>(f: T, t: unknown): T { return f; } const F = () => c.length;"],
  ["SH-destr", "const { ss_closure } = { ss_closure: <T,>(f: T, t: unknown): T => f }; const F = () => c.length;"],
  ["SH-inner", "const F = (() => { const ss_closure = <T,>(f: T, t: unknown): T => f; return () => c.length; })();"],
  ["SH-methods", "const ss_methods = <O,>(o: O, ...r: unknown[]): O => o; const o = { m() { return c.length; } }; const F = o.m;"],
  ["SH-leak-thunk", "const seen: unknown[] = []; const ss_closure = <T,>(f: T, t: unknown): T => { seen.push(t); return f; }; const F = () => c.length;"],
  ["SH-param", "const mk = (ss_closure: <T,>(f: T, t: unknown) => T) => () => c.length; const F = mk(<T,>(f: T, t: unknown): T => f);"],
];
// G3 and the cells named like an emitted input: each must be rejected, or run with no cell in error
const G3: [string, string][] = [
  ["CR-param", "const put = () => { const mk = (ss_closure: number) => { const xs = [0]; const c: readonly number[] = xs; return () => c.length + ss_closure; }; return { f: mk(0) }; };"],
  ["CR-catch", "const put = () => { const xs = [0]; const c: readonly number[] = xs; try { throw 0; } catch (ss_closure) { const f = () => c.length; return { f }; } return { f: () => 0 }; };"],
  ["CR-const-number", "const put = () => { const ss_closure = 0; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length + ss_closure; return { f }; };"],
  ["CR-cell-input", "const ss_closure = () => 1;\nconst put = (ss_closure: number) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length + ss_closure; return { f }; };"],
  ["CR-methods-number", "const put = () => { const ss_methods = 0; const xs = [0]; const c: readonly number[] = xs; const o = { m() { return c.length + ss_methods; } }; return o; };"],
  ["CR-fn-decl-hoist", "const put = () => { const xs = [0]; const c: readonly number[] = xs; function f() { return c.length; } const ss_closure = <T,>(g: T, t: unknown): T => g; return { f }; };"],
  ["CR-generator-param", "const g = function* () { const mk = (ss_closure: number) => () => ss_closure; const xs = [0]; const c: readonly number[] = xs; yield { f: mk(c.length) }; };"],
  ["CELL-ss_out", "const ss_out = () => 1;\nconst a = () => [1, 2];"],
  ["CELL-ss_state", "const ss_state = () => 1;\nconst s = () => state(0);\nconst a = (s: number) => s + 1;"],
  ["CELL-Generators", "const Generators = () => 1;\nconst s = () => state(0);\nconst a = (s: number) => s + 1;"],
  ["CELL-invalidation", "const invalidation = () => 1;\nconst s = () => state(0);\nconst n = function* () { yield 1; };\nconst add = (s: State<number>) => action((k: number) => { s.update((v) => v + k); });\nconst l = (n: Events<number>, add: Action<[number]>) => on(n, add);"],
  ["CELL-dollar-ss", "const $ss$type$T = () => 1;\ntype T = number;\nconst a = (): T => 2;"],
];
// G4: a BigInt method key; the checker typed the record's key as null, the toolchain registered under "null"
const G4 = (name: string, key: string): A => ({ name: `g1-G4-${name}`,
  src: `const s = () => state<{ readonly null: () => number }>({ null: () => -1 });\nconst lg = () => state(-1);\nconst v = (s: { readonly null: () => number }) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<{ readonly null: () => number }>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; const st = s.set; ${P} const o = { ${key}() { return c.length; } }; st(o); ls(c.length); xs.push(1); }) });`,
  drive: async (p: any) => {
    try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; }
    await p.settle(300);
    const o = p.value("v"), w = p.value("w"), f = Object.values(o).find((x) => typeof x === "function") as (() => number) | undefined;
    if (f === undefined) return "same: no method stored";
    return `${f() !== w ? "DIFF" : "same"} the stored method gives ${f()}, lg = ${w}`;
  } });
// G5: registration gaps behind a checker rule that stays (live.test.ts asserts each one's rules)
export const G5: [string, string, string[]][] = [
  ["G5-case-decl", "let F = () => 0; switch (c.length) { case 1: function h() { return c.length; } F = h; }", ["switch-declaration"]],
  ["G5-computed-method", "const o = { ['m']() { return c.length; } }; const F = o.m;", ["unsupported"]],
  ["G5-getter", "const o = { get m() { return () => c.length; } }; const F = o.m;", ["unsupported"]],
  ["G5-setter", "const o = { set m(x: number) {}, n: () => c.length }; const F = o.n;", ["unsupported"]],
  ["G5-class", "class K { m() { return c.length; } } const F = new K().m;", ["new-non-intrinsic", "no-class"]],
  ["G5-class-expr", "const K = class { static m() { return c.length; } }; const F = K.m;", ["no-class"]],
  ["G5-this", "const o = { k: c, m() { return () => this.k.length; } }; const F = o.m();", ["no-this"]],
  ["G5-arguments", "const g = function (a: readonly number[]) { return () => arguments[0].length; }; const F = g(c);", ["no-arguments"]],
  ["G5-bind", "const g = (a: readonly number[]) => a.length; const F = g.bind(null, c);", ["no-member"]],
  ["G5-bind-arrow", "const F = (() => c.length).bind(null);", ["no-member"]],
  ["G5-weakmap", "const wm = new WeakMap<object, () => number>(); const key = {}; wm.set(key, () => c.length); const F = wm.get(key) ?? (() => 0);", ["new-non-intrinsic"]],
];
export const G5_SRC = (form: string) => VA(P, form);
export const attacks: A[] = [
  ...G1.map(([id, f]): A => ({ name: `g1-G1-${id}`, src: VA(P, f), drive: driveA })),
  { name: "g1-G1-I-snap", src: VB("const xs = [0]; const i: readonly number[] = xs; const F = () => i.length; st(F); snap(); xs.push(1);"), drive: driveB },
  { name: "g1-G1-I-method-snap", src: VB("const xs = [0]; const i: readonly number[] = xs; const o = { m() { return i.length; } }; st(o.m); snap(); xs.push(1);"), drive: driveB },
  ...G2.map(([id, f]): A => ({ name: `g1-G2-${id}`, src: VA(P, f), drive: driveA })),
  { name: "g1-G2-SH-snap", src: VB("const ss_closure = <T,>(f: T, g: unknown): T => f; const xs = [0]; const c: readonly number[] = xs; const F = () => c.length; st(F); snap(); xs.push(1);"), drive: driveB },
  ...G3.map(([id, src]): A => ({ name: `g1-G3-${id}`, src, drive: driveErr })),
  G4("1n", "1n"), G4("0x10n", "0x10n"),
  ...G5.map(([id, f]): A => ({ name: `g1-${id}`, src: G5_SRC(f), drive: driveA })),
  { name: "g1-ctl-c-arrow", src: VA(P, "const F = () => c.length;"), drive: driveA, ctl: true },
  { name: "g1-ctl-c-method", src: VA(P, "const o = { m() { return c.length; } }; const F = o.m;"), drive: driveA, ctl: true },
  { name: "g1-ctl-c-snap", src: VB("const xs = [0]; const c: readonly number[] = xs; const F = () => c.length; st(F); snap(); xs.push(1);"), drive: driveB, ctl: true },
  { name: "g1-ctl-let", src: VA("const xs = [0]; let n = 1;", "const F = () => n; n = 1;").replace("xs.push(1);", "n = 2;"), drive: driveA, ctl: true },
];
