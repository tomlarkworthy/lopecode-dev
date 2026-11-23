// r2 (target 1): registration gaps in forms the checker accepts (base verdict). Families:
//   I  a captured local named i: every thunk is (i) => i < 0 ? n : ... i ..., so the capture reads the thunk's own index
//   SH a local named ss_closure / ss_methods: the inserted registration calls the cell's own function
// Vehicles D and G (writer rejected by the checker, run with it skipped) and A (round 7 Q1 action form, accepted;
// shipped S4.12 throws; with SS_MEASURE_BODYFN=0 the gap alone decides). Each family has a twin with the alias named c
// (registration works there) as a control of the vehicle in the same mode.
import { C, D, Dbase, driveD, G, Gbase, driveG } from "./lib.ts";
import { A, driveA } from "./lib2.ts";
const I = "const i: readonly number[] = xs;";
export const FORMS: [string, string][] = [
  ["I-arrow", `${I} const F = () => i.length;`],
  ["I-arrow-two", `${I} const k1 = 1; const F = () => i.length + k1;`],
  ["I-arrow-three", `${I} const a1 = 1; const z1 = 2; const F = () => i.length + a1 + z1;`],
  ["I-fn-expr", `${I} const F = function () { return i.length; };`],
  ["I-fn-decl", `${I} function F() { return i.length; }`],
  ["I-method", `${I} const o = { m() { return i.length; } }; const F = o.m;`],
  ["I-method-two", `${I} const k1 = 1; const o = { m() { return i.length + k1; } }; const F = o.m;`],
  ["I-map-param", "const rows = [xs]; const fs = rows.map((i) => () => i.length); const F = fs[0]!;"],
  ["I-map-param-ro", "const rows: readonly (readonly number[])[] = [c]; const F = rows.map((i) => () => i.length)[0]!;"],
  ["I-helper-param", "const mk = (i: readonly number[]) => () => i.length; const F = mk(c);"],
  ["I-for-of", "const fs: (() => number)[] = []; for (const i of [c]) fs.push(() => i.length); const F = fs[0]!;"],
  ["I-transitive", `${I} const g = () => i.length; const F = () => g();`],
  ["I-holds-fn", "const i = () => c.length; const F = () => i();"],
  ["I-holds-record", "const i = { t: c }; const F = () => i.t.length;"],
  ["I-catch", "const F = (() => { try { throw c; } catch (i) { const j = i as readonly number[]; return () => j.length; } })();"],
  ["I-destr", "const { i } = { i: c }; const F = () => i.length;"],
  ["SH-const", "const ss_closure = <T,>(f: T, t: unknown): T => f; const F = () => c.length;"],
  ["SH-fndecl", "function ss_closure<T,>(f: T, t: unknown): T { return f; } const F = () => c.length;"],
  ["SH-destr", "const { ss_closure } = { ss_closure: <T,>(f: T, t: unknown): T => f }; const F = () => c.length;"],
  ["SH-inner", "const F = (() => { const ss_closure = <T,>(f: T, t: unknown): T => f; return () => c.length; })();"],
  ["SH-methods", "const ss_methods = <O,>(o: O, ...r: unknown[]): O => o; const o = { m() { return c.length; } }; const F = o.m;"],
  ["SH-leak-thunk", "const seen: unknown[] = []; const ss_closure = <T,>(f: T, t: unknown): T => { seen.push(t); return f; }; const F = () => c.length;"],
  ["CTL-c-arrow", "const F = () => c.length;"],
  ["CTL-c-method", "const o = { m() { return c.length; } }; const F = o.m;"],
  ["CTL-j-arrow", "const j: readonly number[] = xs; const F = () => j.length;"],
];
const ctl = (id: string) => id.startsWith("CTL-");
export const cands = FORMS.flatMap(([id, form]) => [
  C(`r2-D-${id}`, D(form), { drive: driveD, base: Dbase(form), ctl: ctl(id) }),
  C(`r2-G-${id}`, G(form), { drive: driveG, base: Gbase(form), ctl: ctl(id) }),
  C(`r2-A-${id}`, A("const xs = [0]; const c: readonly number[] = xs;", form), { drive: driveA, ctl: ctl(id) }),
]);
// crash forms: a binding named ss_closure that is not a function where a registration runs (accepted cells)
const CR: [string, string][] = [
  ["CR-param", "const put = () => { const mk = (ss_closure: number) => { const xs = [0]; const c: readonly number[] = xs; return () => c.length + ss_closure; }; return { f: mk(0) }; };"],
  ["CR-catch", "const put = () => { const xs = [0]; const c: readonly number[] = xs; try { throw 0; } catch (ss_closure) { const f = () => c.length; return { f }; } return { f: () => 0 }; };"],
  ["CR-const-number", "const put = () => { const ss_closure = 0; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length + ss_closure; return { f }; };"],
  ["CR-cell-input", "const ss_closure = () => 1;\nconst put = (ss_closure: number) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length + ss_closure; return { f }; };"],
  ["CR-methods-number", "const put = () => { const ss_methods = 0; const xs = [0]; const c: readonly number[] = xs; const o = { m() { return c.length + ss_methods; } }; return o; };"],
  ["CR-fn-decl-hoist", "const put = () => { const xs = [0]; const c: readonly number[] = xs; function f() { return c.length; } const ss_closure = <T,>(g: T, t: unknown): T => g; return { f }; };"],
  ["CR-generator-param", "const g = function* () { const mk = (ss_closure: number) => () => ss_closure; const xs = [0]; const c: readonly number[] = xs; yield { f: mk(c.length) }; };"],
];
for (const [id, src] of CR) cands.push(C(`r2-${id}`, src, { show: ["put", "g"].filter((n) => src.includes(`const ${n} =`)) }));
