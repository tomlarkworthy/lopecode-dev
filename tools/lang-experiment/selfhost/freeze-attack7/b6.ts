// b6 (item 6, mode A): a published function whose registration does not follow what it captures. fnreg.ts registers an
// object literal's methods with ss_methods(o, "m", thunk) after the literal is built, on whatever o.m then is: a later
// field or spread with the same key puts another function there, and the method's thunk replaces that function's own.
import { C, act, cmp, ST, body, SP } from "./lib.ts";
const S = (b: string) => ST() + body(b);
const K = "const k = 1;";
const out: ReturnType<typeof C>[] = [
  // with a channel S4.11 does not see (b1), and with an alias written after the point (b4)
  C("b6-dupkey-st", S(`${K} const st = s.set; ${SP} const o = { m() { return k; }, m: f }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-dupkey-destr", S(`${K} ${SP} const o = { m() { return k; }, m: f }; const { set } = s; set(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-dupkey-alias-after", S(`${K} ${SP} const o = { m() { return k; }, m: f }; s.set(o.m); ls(o.m()); const ys = xs; ys.push(1);`), { drive: act() }),
  C("b6-dupkey-getter", S(`${K} ${SP} const get = () => xs; const o = { m() { return k; }, m: f }; s.set(o.m); ls(o.m()); get().push(1);`), { drive: act() }),
  C("b6-dupkey-foreach", S(`${K} ${SP} const o = { m() { return k; }, m: f }; [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(o.m); ls(o.m()); } });`), { drive: act() }),
  C("b6-spread-st", S(`${K} const st = s.set; ${SP} const o = { m() { return k; }, ...{ m: f } }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-spread-rec-st", S(`${K} const st = s.set; ${SP} const r = { m: f }; const o = { m() { return k; }, ...r }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-strkey-st", S(`${K} const st = s.set; ${SP} const o = { m() { return k; }, 'm': f }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-strmethod-st", S(`${K} const st = s.set; ${SP} const o = { 'm'() { return k; }, m: f }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-numkey-st", S(`${K} const st = s.set; ${SP} const o = { 0() { return k; }, 0: f }; st(o[0]); ls(o[0]()); xs.push(1);`), { drive: act() }),
  C("b6-computedkey-st", S(`${K} const st = s.set; ${SP} const o = { m() { return k; }, ['m']: f }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-method-then-method-st", S(`${K} const st = s.set; ${SP} const o = { m() { return c.length; }, m() { return k; } }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  C("b6-field-then-method-st", S(`${K} const st = s.set; ${SP} const o = { m: f, m() { return k; } }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  // the whole record published
  C("b6-dupkey-rec-st", ST("{ readonly m: () => number }", "{ m: () => -1 }") + body(`${K} const st = s.set; ${SP} const o = { m() { return k; }, m: f }; st(o); ls(o.m()); xs.push(1);`, "{ readonly m: () => number }"), { drive: act("put", "go", "v", "w", (x: any) => x.m()) }),
  // the overwritten function published by the cell's return (all writes before it: not silent expected)
  C("b6-dupkey-return", `const a = () => { ${K} ${SP} xs.push(1); const o = { m() { return k; }, m: f }; return o.m; };\nconst b = (a: () => number) => a();`, { show: ["a", "b"] }),
  // a method with no capture is not registered: nothing to overwrite (control for the mechanism)
  C("b6-nocap-method-st", S(`const st = s.set; ${SP} const o = { m() { return 1; }, m: f }; st(o.m); ls(o.m()); xs.push(1);`), { drive: act() }),
  // as a listener, and in a JSX handler
  C("b6-dupkey-listener", "const tick = function* () { yield 1; };\n" + ST() + "const put = (s: State<() => number>, lg: State<number>) => action((q: number) => { const ls = lg.set; const st = s.set; const k = 1; const xs = [q]; const c: readonly number[] = xs; const f = () => c.length; const o = { m() { return k; }, m: f }; st(o.m); ls(o.m()); xs.push(q); });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);", { drive: cmp() }),
  C("b6-dupkey-jsx", ST() + "const el = (s: State<() => number>, lg: State<number>) => <button onClick={action(() => { const ls = lg.set; const st = s.set; const k = 1; " + SP + " const o = { m() { return k; }, m: f }; st(o.m); ls(o.m()); xs.push(1); })}>x</button>;",
    { drive: async (p: any) => { try { p.value("el").props.onClick(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } return cmp()(p); } }),
  // controls, checker skipped: direct s.set with the overwrite (fires in both modes); without it (B only)
  C("b6-ctl-dupkey-direct", S(`${K} ${SP} const o = { m() { return k; }, m: f }; s.set(o.m); ls(o.m()); xs.push(1);`), { drive: act(), ctl: true }),
  C("b6-ctl-P", S(`${SP} s.set(f); ls(f()); xs.push(1);`), { drive: act(), ctl: true }),
];
export const cands = out;
