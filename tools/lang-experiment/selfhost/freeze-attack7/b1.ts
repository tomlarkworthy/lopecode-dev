// b1 (item 1): a state write or an action call that reaches the body under a plain function type, so that S4.11 sees
// no point. Part A: channels for s.set / s.update x holders. Part B: routes for an Action under a function type.
import { C, act, ST, body, SP, HOLD, controls } from "./lib.ts";
// [id, code before the holder's setup, code after it that publishes f]
const CH: [string, string, string][] = [
  ["st-before", "const st = s.set;", "st(f);"],
  ["up-before", "const up = s.update;", "up(() => f);"],
  ["destr-set", "", "const { set } = s; set(f);"],
  ["destr-update", "", "const { update } = s; update(() => f);"],
  ["destr-rename", "", "const { set: put1 } = s; put1(f);"],
  ["computed-set", "", "s['set'](f);"],
  ["computed-update", "", "s['update']((old) => f);"],
  ["destr-before", "const { set } = s;", "set(f);"],
];
const out: ReturnType<typeof C>[] = [];
for (const [cid, pre, pub] of CH) for (const h of HOLD) {
  const ws = cid === "st-before" ? h.writes : h.writes.slice(0, 1);
  for (const [wn, wr] of ws) out.push(C(`b1-${cid}-${h.id}-${wn}`, ST() + body(`${pre} ${h.setup} const f = () => ${h.read}; ${pub} ls(f()); ${wr}`), { drive: act() }));
}
// the channel inside a helper bound to a const (the helper is not a point: its body has none S4.11 sees)
out.push(C("b1-helper-destr", ST() + body(`${SP} const pub = (h: () => number) => { const { set } = s; set(h); }; pub(f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-helper-computed", ST() + body(`${SP} const pub = (h: () => number) => { s['set'](h); }; pub(f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-foreach-st", ST() + body(`const st = s.set; ${SP} [f].forEach((g) => st(g)); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-foreach-st-ref", ST() + body(`const st = s.set; ${SP} [f].forEach(st); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-wrapped-fn", ST() + body(`const st = s.set; ${SP} st(() => f() + 0); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-record", ST("{ readonly f: () => number }", "{ f: () => -1 }") + body(`const st = s.set; ${SP} st({ f }); ls(f()); xs.push(1);`, "{ readonly f: () => number }"), { drive: act() }));
out.push(C("b1-st-width", ST("{ readonly n: number }", "{ n: 0 }") + body(`const st = s.set; ${SP} const r = { n: 0, f }; st(r); ls(f()); xs.push(1);`, "{ readonly n: number }"), { drive: act("put", "go", "v", "w", (x: any) => x.f()) }));
out.push(C("b1-st-map", ST("ReadonlyMap<string, () => number>", "new Map()") + body(`const st = s.set; ${SP} st(new Map([['k', f]])); ls(f()); xs.push(1);`, "ReadonlyMap<string, () => number>"), { drive: act("put", "go", "v", "w", (x: any) => x.get("k")()) }));
out.push(C("b1-st-method", ST("{ readonly f: () => number }", "{ f: () => -1 }") + body(`const st = s.set; ${SP} st({ f() { return c.length; } }); ls(f()); xs.push(1);`, "{ readonly f: () => number }"), { drive: act() }));
out.push(C("b1-st-decl", ST() + body("const st = s.set; const xs = [0]; const c: readonly number[] = xs; function f() { return c.length; } st(f); ls(f()); xs.push(1);"), { drive: act() }));
out.push(C("b1-st-generic", ST() + body(`const id = <T,>(x: T): T => x; const st = id(s.set); ${SP} st(f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-template", ST() + body(`${SP} s[\`set\`](f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-key-const", ST() + body(`const k = 'set' as const; ${SP} s[k](f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-optional", ST() + body(`${SP} s?.['set'](f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-paren", ST() + body(`${SP} (s)['set'](f); ls(f()); xs.push(1);`), { drive: act() }));
out.push(C("b1-st-loop-later", ST() + body(`const st = s.set; ${SP} for (let i = 0; i < 2; i++) { if (i === 0) { st(f); ls(f()); } else { xs.push(1); } }`), { drive: act() }));
out.push(C("b1-st-in-loop-decl", ST() + body(`${SP} for (let i = 0; i < 1; i++) { const st = s.set; st(f); ls(f()); } xs.push(1);`), { drive: act() }));
out.push(C("b1-st-after-xs", ST() + body(`${SP} const st = s.set; st(f); ls(f()); xs.push(1);`), { drive: act() }));
// Part B: an Action under a plain function type
const P0 = "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\n";
const bodyA = (b: string, ins = "put0: Action<[() => number]>") => `const put = (${ins}, lg: State<number>) => ({ go: action(() => { const ls = lg.set; ${b} }) });`;
const B: [string, string, string?][] = [
  ["act-annot", `const g: (h: () => number) => void = put0; ${SP} g(f); ls(f()); xs.push(1);`],
  ["act-cast", `const g = put0 as (h: () => number) => void; ${SP} g(f); ls(f()); xs.push(1);`],
  ["act-generic-id", `const id = <T,>(x: T): T => x; const g = id(put0); ${SP} g(f); ls(f()); xs.push(1);`],
  ["act-destr", `const { p } = acts; ${SP} p(f); ls(f()); xs.push(1);`, "acts: { readonly p: Action<[() => number]> }"],
  ["act-computed", `${SP} acts['p'](f); ls(f()); xs.push(1);`, "acts: { readonly p: Action<[() => number]> }"],
  ["act-tuple", `const t = [put0] as const; ${SP} t[0](f); ls(f()); xs.push(1);`],
  ["act-map", `const m = new Map([['p', put0]]); ${SP} m.get('p')?.(f); ls(f()); xs.push(1);`],
  ["act-helper-before", `const g = (h: () => number) => put0(h); ${SP} g(f); ls(f()); xs.push(1);`],
  ["act-spread-args", `${SP} put0(...[f]); ls(f()); xs.push(1);`],
  ["act-spread-before", `const args = [() => 0] as const; ${SP} put0(...args); ls(f()); xs.push(1);`],
  ["act-ternary", `${SP} (xs.length > 9 ? put0 : put0)(f); ls(f()); xs.push(1);`],
  ["act-optional", `${SP} put0?.(f); ls(f()); xs.push(1);`],
  ["act-nonnull", `${SP} put0!(f); ls(f()); xs.push(1);`],
  ["act-comma", `${SP} (0, put0)(f); ls(f()); xs.push(1);`],
  ["act-satisfies", `const g = put0 satisfies (h: () => number) => void; ${SP} g(f); ls(f()); xs.push(1);`],
  ["act-default-param", `const run = (g: (h: () => number) => void = put0) => g; const g = run(); ${SP} g(f); ls(f()); xs.push(1);`],
  ["act-fn-input", `${SP} put0(f); ls(f()); xs.push(1);`, "put0: (g: () => number) => void"],
  ["act-runner-cell", `${SP} runner(put0, f); ls(f()); xs.push(1);`, "put0: Action<[() => number]>, runner: (a: (h: () => number) => void, h: () => number) => void"],
];
for (const [id, b, ins] of B) out.push(C(`b1-${id}`, ST() + P0 + (id.startsWith("act-destr") || id.startsWith("act-computed") ? "const acts = (put0: Action<[() => number]>) => ({ p: put0 });\n" : "") + (id === "act-runner-cell" ? "const runner = () => (a: (h: () => number) => void, h: () => number) => { a(h); };\n" : "") + bodyA(b, ins), { drive: act() }));
// a producer cell hands the action on under a plain function type
out.push(C("b1-act-producer-fn", ST() + P0 + "const wrap = (put0: Action<[() => number]>): ((h: () => number) => void) => put0;\n" + bodyA(`${SP} wrap(f); ls(f()); xs.push(1);`, "wrap: (h: () => number) => void"), { drive: act() }));
out.push(C("b1-act-producer-wrapper", ST() + P0 + "const wrap = (put0: Action<[() => number]>) => (h: () => number) => put0(h);\n" + bodyA(`${SP} wrap(f); ls(f()); xs.push(1);`, "wrap: (h: () => number) => void"), { drive: act() }));
out.push(C("b1-set-producer-wrapper", ST() + "const wrap = (s: State<() => number>) => (h: () => number) => s.set(h);\n" + bodyA(`${SP} wrap(f); ls(f()); xs.push(1);`, "wrap: (h: () => number) => void"), { drive: act() }));
out.push(C("b1-set-producer-action-rec", ST() + "const wrap = (s: State<() => number>) => ({ p: action((h: () => number) => { s.set(h); }) });\n" + bodyA(`${SP} wrap.p(f); ls(f()); xs.push(1);`, "wrap: { readonly p: (h: () => number) => void }"), { drive: act() }));
out.push(...controls("b1"));
export const cands = out;
