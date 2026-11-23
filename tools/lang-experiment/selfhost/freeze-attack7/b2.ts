// b2 (item 2): memo. A miss deep-freezes its arguments in place and stores only when no argument reaches a function
// (prelude.runtime.ts reachesFn; an unknown kind counts as reaching one). Cell a calls sq(r) and records a reading,
// then writes by one of the routes that got past S4.11 in b4 (or directly: memo is not a point); cell b calls sq(a.r):
// a hit gives what a's call stored. Also kinds reachesFn treats as data, and results that hold a function.
import { C, hit } from "./lib.ts";
const T = "(o: { readonly n: number }) => { readonly o: { readonly n: number } }";
const AT = "{ readonly before: number; readonly r: { readonly n: number }; readonly got: { readonly o: { readonly n: number } } }";
const SQ = "const sq = () => memo((o: { readonly n: number }) => ({ o }));\n";
// setup declares what r carries; rec is r's literal; read is the reading recorded before the write
const M = (id: string, setup: string, rec: string, read: string, write: string) =>
  C(`b2-${id}`, `${SQ}const a = (sq: ${T}) => { ${setup} const r = ${rec}; const got = sq(r); const before = ${read}; ${write} return { before, r, got }; };\nconst b = (sq: ${T}, a: ${AT}) => sq(a.r);`, { drive: hit });
const XS = "const xs = [0]; const c: readonly number[] = xs;";
const out: ReturnType<typeof C>[] = [
  // a function rides in by width (not stored since 2026-11-23)
  M("fn-width-direct", XS, "{ n: 1, f: () => c.length }", "r.f()", "xs.push(1);"),
  M("fn-width-alias", XS, "{ n: 1, f: () => c.length }", "r.f()", "const ys = xs; ys.push(1);"),
  M("fn-width-getter", XS + " const get = () => xs;", "{ n: 1, f: () => c.length }", "r.f()", "get().push(1);"),
  M("fn-in-array", XS, "{ n: 1, fs: [() => c.length] }", "c.length", "const ys = xs; ys.push(1);"),
  M("fn-in-map", XS, "{ n: 1, m: new Map([['k', () => c.length]]) }", "c.length", "const ys = xs; ys.push(1);"),
  M("fn-in-set", XS, "{ n: 1, s0: new Set([() => c.length]) }", "c.length", "const ys = xs; ys.push(1);"),
  M("fn-nested", XS, "{ n: 1, in: { in: { f: () => c.length } } }", "c.length", "const ys = xs; ys.push(1);"),
  M("fn-method", XS, "{ n: 1, f() { return c.length; } }", "r.f()", "const ys = xs; ys.push(1);"),
  M("fn-dupkey", XS + " const k = 1;", "{ n: 1, f() { return k; }, f: () => c.length }", "r.f()", "const ys = xs; ys.push(1);"),
  M("fn-error-cause", XS, "{ n: 1, e: new Error('x', { cause: () => c.length }) }", "c.length", "const ys = xs; ys.push(1);"),
  M("action-in-key", XS, "{ n: 1, f: action(() => {}) }", "c.length", "const ys = xs; ys.push(1);"),
  M("memo-in-key", XS, "{ n: 1, f: memo((q: number) => q) }", "c.length", "const ys = xs; ys.push(1);"),
  // data only: frozen in place, so a write by any route throws (both modes)
  M("data-alias", XS, "{ n: 1, t: c }", "c.length", "const ys = xs; ys.push(1);"),
  M("data-getter", XS + " const get = () => xs;", "{ n: 1, t: c }", "c.length", "get().push(1);"),
  M("data-forof", XS, "{ n: 1, t: c }", "c.length", "for (const y of [xs]) y.push(1);"),
  M("data-map-alias", "const m = new Map<string, number>(); const c: Map<string, number> = m;", "{ n: 1, t: c }", "c.size", "const m2 = m; m2.set('k', 1);"),
  M("data-set-alias", "const st0 = new Set<number>(); const c: Set<number> = st0;", "{ n: 1, t: c }", "c.size", "const s2 = st0; s2.add(1);"),
  M("data-rec-alias", "const o = { k: 1 }; const c: { readonly k: number } = o;", "{ n: 1, t: c }", "c.k", "const o2 = o; o2.k = 9;"),
  M("data-err-alias", "const e = new Error('x'); const c: Error = e;", "{ n: 1, t: c }", "c.message.length", "const e2 = e; e2.message = 'longer';"),
  // kinds the walk treats as data (LEAF_PROTOS, typed arrays) or copies
  M("regexp", "const re = /a/g;", "{ n: 1, re }", "re.lastIndex", "re.exec('aa');"),
  M("regexp-test", "const re = /a/y;", "{ n: 1, re }", "re.lastIndex", "re.test('aa');"),
  M("url", "const u = new URL('https://x.test/a');", "{ n: 1, u }", "u.pathname.length", "u.pathname = '/abc';"),
  M("url-alias", "const u = new URL('https://x.test/a');", "{ n: 1, u }", "u.pathname.length", "const u2 = u; u2.pathname = '/abc';"),
  M("typed", "const ta = new Uint8Array(2);", "{ n: 1, ta }", "ta[0] ?? -1", "ta[0] = 7;"),
  M("buffer", "const ta = new Uint8Array(2); const bf = ta.buffer;", "{ n: 1, bf }", "ta[0] ?? -1", "ta[0] = 7;"),
  M("match-groups", "const mt = /(?<g>a)/.exec('ab');", "{ n: 1, mt }", "mt?.groups?.g?.length ?? -1", ""),
  M("clone-map", "const m = structuredClone(new Map([['a', 1]]));", "{ n: 1, m }", "m.size", "m.set('k', 2);"),
  M("snapshot-set", "const s0 = snapshot(new Set([1]));", "{ n: 1, s0 }", "s0.size", "s0.add(2);"),
  M("promise", "const p = Promise.resolve(1);", "{ n: 1, p }", "1", ""),
  M("jsx", XS, "{ n: 1, el: <b data={c}>x</b> }", "c.length", "const ys = xs; ys.push(1);"),
  M("iterator", "const it = [1].values();", "{ n: 1, it }", "1", ""),
  M("groupby", "const g = Object.groupBy([1, 2], (q) => (q > 1 ? 'b' : 'a'));", "{ n: 1, g }", "g.a?.length ?? -1", ""),
  M("map-groupby", "const g = Map.groupBy([1, 2], (q) => q > 1);", "{ n: 1, g }", "g.size", "g.set(true, [9]);"),
];
// a result that holds a function over a Mut local of f, read through a read-only alias (f has returned: no later writer)
out.push(C("b2-result-fn", "const mk = () => memo((n: number) => { const xs = [n]; const c: readonly number[] = xs; xs.push(n); return { g: () => c.length }; });\nconst a = (mk: (n: number) => { readonly g: () => number }) => mk(1);\nconst b = (mk: (n: number) => { readonly g: () => number }) => mk(1);", { drive: async (p: any) => { const a = p.value("a"), b = p.value("b"); return a === b ? `hit, g() ${a.g()}` : "miss"; } }));
out.push(C("b2-result-fn-alias", "const mk = () => memo((n: number) => { const xs = [n]; const c: readonly number[] = xs; const r = { g: () => c.length }; const ys = xs; ys.push(n); return r; });\nconst a = (mk: (n: number) => { readonly g: () => number }) => mk(1);\nconst b = (mk: (n: number) => { readonly g: () => number }) => mk(1);", { drive: async (p: any) => { const a = p.value("a"), b = p.value("b"); return a === b ? `hit, g() ${a.g()}` : "miss"; } }));
// memo inside an action, after a laundered publish of the same record
out.push(C("b2-action-memo-st", "const s = () => state<{ readonly n: number }>({ n: 0 });\nconst lg = () => state(-1);\nconst v = (s: { readonly n: number }) => s;\nconst w = (lg: number) => lg;\n" + SQ + `const put = (s: State<{ readonly n: number }>, lg: State<number>, sq: ${T}) => ({ go: action(() => { const ls = lg.set; const st = s.set; ${XS} const r = { n: 1, f: () => c.length }; sq(r); st(r); ls(r.f()); xs.push(1); }) });`, { drive: async (p: any) => { const g = p.value("put").go; try { g(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 80)}`; } await p.settle(400); const h = p.value("v"); return `${h.f() !== p.value("w") ? "DIFF" : "same"} given ${p.value("w")} holds ${h.f()}`; } }));
// memo from another cell given a function-typed input
out.push(C("b2-memo-input-fn", `${SQ}const fi = () => () => 3;\nconst a = (sq: ${T}, fi: () => number) => { const r = { n: 1, f: fi }; const got = sq(r); return { before: r.f(), r, got }; };\nconst b = (sq: ${T}, a: ${AT}) => sq(a.r);`, { drive: hit }));
// controls, checker skipped: the round-6 memo P form (fires in neither mode since the run-time change), and a data
// key read through a hit (the detector sees a hit)
out.push(C("b2-ctl-P-memo", `${SQ}const a = (sq: ${T}) => { ${XS} const r = { n: 1, f: () => c.length }; const got = sq(r); const before = r.f(); xs.push(1); return { before, r, got }; };\nconst b = (sq: ${T}, a: ${AT}) => sq(a.r);`, { drive: hit, ctl: true }));
out.push(C("b2-ctl-hit-data", `${SQ}const a = (sq: ${T}) => { const r = { n: 1, k: 2 }; const got = sq(r); return { before: 0, r, got }; };\nconst b = (sq: ${T}, a: ${AT}) => sq(a.r);`, { drive: async (p: any) => { const a = p.value("a"), b = p.value("b"); return a && b && b === a.got ? "hit seen (detector sanity, not a fire)" : "no hit"; }, ctl: true }));
export const cands = out;
