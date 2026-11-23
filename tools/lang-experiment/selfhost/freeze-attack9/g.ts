// target 4: registration names. Vehicle A and driveA are g1-attacks.ts's (imported, not copied): an action reads a
// setter, stores F, records F() and then writes the Mut F reads. Meant to be read with SS_MEASURE_BODYFN=0 (S4.12's
// throw off), where only the freeze of F's captures stops the write.
import { G5_SRC } from "../../lite/infer/attack/g1-attacks.ts";
import * as G1 from "../../lite/infer/attack/g1-attacks.ts";
const driveA = (G1.attacks.find((a: any) => a.name === "g1-ctl-c-arrow") as any).drive;
const row = (name: string, form: string, ctl = false) => ({ name, src: G5_SRC(form), drive: driveA, ctl });
const errDrive = async (p: any) => { await p.settle(300); const bad = [...p.recs.values()].filter((r: any) => r.status === "rejected"); return bad.length ? `DIFF accepted cell in error: ${bad.map((r: any) => `${r.name}: ${String(r.error?.message ?? r.error).slice(0, 80)}`).join("; ")}` : "same: no cell in error"; };
export const cands = [
  row("ctl-arrow-first", "const F = () => c.length;", true),
  // escaped spellings of emitted names
  row("esc-ss_closure-const", "const s\\u0073_closure = <T,>(f: T, t: unknown): T => f; const F = () => c.length;"),
  row("esc-ss_closure-brace", "const \\u{73}s_closure = <T,>(f: T, t: unknown): T => f; const F = () => c.length;"),
  row("esc-ss_methods", "const ss_m\\u0065thods = <O,>(o: O, ...r: unknown[]): O => o; const o = { m() { return c.length; } }; const F = o.m;"),
  row("esc-ss_i-capture", "const ss_\\u0069: readonly number[] = xs; const F = () => ss_\\u0069.length;"),
  row("esc-dollar-ss", "const $s\\u0073$1$F = 1; const F = () => c.length + $s\\u0073$1$F - 1;"),
  row("esc-fn-decl", "function s\\u0073_closure<T,>(f: T, t: unknown): T { return f; } const F = () => c.length;"),
  row("esc-param", "const mk = (s\\u0073_closure: <T,>(f: T, t: unknown) => T) => () => c.length; const F = mk(<T,>(f: T, t: unknown): T => f);"),
  // numeric and string method keys
  row("key-1e3", "const o = { 1e3() { return c.length; } }; const F = o[1000];"),
  row("key-1e3-str", "const o = { 1e3() { return c.length; } }; const F = o[\"1000\"];"),
  row("key-0b11", "const o = { 0b11() { return c.length; } }; const F = o[3];"),
  row("key-0x10", "const o = { 0x10() { return c.length; } }; const F = o[16];"),
  row("key-1_0", "const o = { 1_0() { return c.length; } }; const F = o[10];"),
  row("key-dot5", "const o = { .5() { return c.length; } }; const F = o[0.5];"),
  row("key-1e21", "const o = { 1e21() { return c.length; } }; const F = o[\"1e+21\"];"),
  row("key-00", "const o = { 0.10() { return c.length; } }; const F = o[\"0.1\"];"),
  row("key-string-esc", "const o = { \"\\u006d\"() { return c.length; } }; const F = o.m;"),
  row("key-ss-name", "const o = { ss_closure() { return c.length; } }; const F = o.ss_closure;"),
  row("key-proto-method", "const o = { constructor() { return c.length; } }; const F = o.constructor;"),
  row("key-dup", "const o = { m() { return 0; }, m() { return c.length; } }; const F = o.m;"),
  row("key-num-dup", "const o = { 1() { return 0; }, \"1\"() { return c.length; } }; const F = o[1];"),
  row("key-num-dup2", "const o = { 1e3() { return 0; }, 1000() { return c.length; } }; const F = o[1000];"),
  row("key-arrow-prop-num", "const o = { 1e3: () => c.length }; const F = o[1000];"),
  row("method-shorthand-fn-prop", "const o = { m: function () { return c.length; } }; const F = o.m;"),
  row("nested-method", "const o = { a: { m() { return c.length; } } }; const F = o.a.m;"),
  row("method-in-array", "const fs = [{ m() { return c.length; } }]; const F = fs[0]?.m ?? (() => 0);"),
  // emitted-name cells and h in TSX
  { name: "local-h-esc", src: "const a = () => { const \\u0068 = (...x: unknown[]) => 1; return <div />; };", drive: errDrive },
  { name: "cell-ss-esc", src: "const s\\u0073_out = () => 1;\nconst a = () => [1, 2];", drive: errDrive },
  { name: "cell-invalidation-esc", src: "const inv\\u0061lidation = () => 1;\nconst s = () => state(0);\nconst n = function* () { yield 1; };\nconst add = (s: State<number>) => action((k: number) => { s.update((v) => v + k); });\nconst l = (n: Events<number>, add: Action<[number]>) => on(n, add);", drive: errDrive },
  { name: "cell-Generators-esc", src: "const Gener\\u0061tors = () => 1;\nconst s = () => state(0);\nconst a = (s: number) => s + 1;", drive: errDrive },
  row("ctl-arrow", "const F = () => c.length;", true),
  { ...(G1.attacks.find((a: any) => a.name === "g1-ctl-let") as any), name: "ctl-g1-let" },
];
