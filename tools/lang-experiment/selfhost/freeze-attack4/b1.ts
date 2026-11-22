// 1. the known T2 root (a captured local whose type holds a Mut below its own type) moved into every function form and
// binding form closure registration might miss, and given different writers. Names: k1-<form>. Question: does any
// form escape registration (silent with REG on = T1)? Silent with REG=0 only = the known root, not counted as new.
import { C, W } from "../freeze-attack3/harness.ts";
const R = "const r: { readonly t: Mut<number[]> } = { t: [0] }; ";
const CW = "\nconst c = (a: { m: () => Mut<number[]> }) => { a.m().push(1); return 0; };";
const BN = "const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; ";
// calls each function a's value holds (or a itself) once, after the run, and reports the result or the throw
const callAll = { drive: async (p: any) => { const v = p.value("a"); const fs: [string, any][] = typeof v === "function" ? [["a", v]] : Object.entries(v ?? {}).filter(([, f]) => typeof f === "function"); return fs.map(([n, f]) => { try { return `${n}() = ${JSON.stringify(f())}`; } catch (e) { return `${n}() threw ${(e as Error).message}`; } }).join("; "); } };
const k = (n: string, src: string, x = {}) => C(`k1-${n}`, src, /self-writer|nested/.test(n) && !("drive" in x) ? { ...callAll, ...x } : x);
export const cands = [
  k("string-method", "const a = () => { " + R + "return { \"m\"(): Mut<number[]> { return r.t; } }; };" + CW),
  k("method", "const a = () => { " + R + "return { m(): Mut<number[]> { return r.t; } }; };" + CW),
  k("dup-method", "const a = () => { " + R + "return { m(): Mut<number[]> { return [9]; }, m(): Mut<number[]> { return r.t; } }; };" + CW),
  k("dup-method-rev", "const a = () => { " + R + "return { m(): Mut<number[]> { return r.t; }, m(): Mut<number[]> { return [9]; } }; };" + CW),
  k("numeric-method", "const a = () => { " + R + "return { 0(): Mut<number[]> { return r.t; } }; };\nconst c = (a: { 0: () => Mut<number[]> }) => { a[0]().push(1); return 0; };"),
  k("fn-decl", "const a = () => { " + R + "function m(): Mut<number[]> { return r.t; } return { m }; };" + CW),
  k("fn-decl-before-r", "const a = () => { function m(): Mut<number[]> { return r.t; } " + R + "return { m }; };" + CW),
  k("fn-decl-nested-block", "const a = () => { " + R + "{ function m(): Mut<number[]> { return r.t; } return { m }; } };" + CW),
  k("fn-expr-named", "const a = () => { " + R + "const m = function mm(): Mut<number[]> { return r.t; }; return { m }; };" + CW),
  k("catch-bind", "const a = () => { try { throw 1; } catch (e) { " + R + "return { m: (): Mut<number[]> => r.t }; } };" + CW),
  k("catch-param", "const a = () => { try { throw { t: [0] }; } catch (e) { const r = e as { readonly t: Mut<number[]> }; return { m: (): Mut<number[]> => r.t }; } };" + CW),
  k("for-of-body", "const a = () => { const out = []; for (const q of [0]) { " + R + "out.push((): Mut<number[]> => r.t); } return { m: out[0] ?? ((): Mut<number[]> => [5]) }; };" + CW),
  k("for-of-const", "const a = () => { const rs: { readonly t: Mut<number[]> }[] = [{ t: [0] }]; for (const r of rs) return { m: (): Mut<number[]> => r.t }; return { m: (): Mut<number[]> => [5] }; };" + CW),
  k("destructured", "const a = () => { const { r } = { r: { t: [0] } as { readonly t: Mut<number[]> } }; return { m: (): Mut<number[]> => r.t }; };" + CW),
  k("destructured-ann", "const a = () => { const { r }: { r: { readonly t: Mut<number[]> } } = { r: { t: [0] } }; return { m: (): Mut<number[]> => r.t }; };" + CW),
  k("array-destr", "const a = () => { const [r]: { readonly t: Mut<number[]> }[] = [{ t: [0] }]; return { m: (): Mut<number[]> => r ? r.t : [5] }; };" + CW),
  k("helper-local", "const a = () => { const mk = () => { " + R + "return (): Mut<number[]> => r.t; }; return { m: mk() }; };" + CW),
  k("helper-param", "const a = () => { const mk = (r: { readonly t: Mut<number[]> }) => (): Mut<number[]> => r.t; return { m: mk({ t: [0] }) }; };" + CW),
  k("helper-default-param", "const a = () => { const mk = (r: { readonly t: Mut<number[]> } = { t: [0] }) => (): Mut<number[]> => r.t; return { m: mk() }; };" + CW),
  k("helper-destr-param", "const a = () => { const mk = ({ t }: { readonly t: Mut<number[]> }) => (): Mut<number[]> => t; return { m: mk({ t: [0] }) }; };" + CW),
  k("made-on-call", "const a = () => { " + R + "return { m: () => (): Mut<number[]> => r.t }; };\nconst c = (a: { m: () => () => Mut<number[]> }) => { a.m()().push(1); return 0; };"),
  k("made-on-call-param", "const a = () => (r: { readonly t: Mut<number[]> }) => (): Mut<number[]> => r.t;\nconst b = (a: (r: { readonly t: Mut<number[]> }) => () => Mut<number[]>) => a({ t: [0] });\nconst c = (b: () => Mut<number[]>) => { b().push(1); return 0; };"),
  k("spread-literal", "const a = () => { " + R + "return { ...{ m(): Mut<number[]> { return r.t; } } }; };" + CW),
  k("nested-literal", "const a = () => { " + R + "return { o: { m(): Mut<number[]> { return r.t; } } }; };\nconst c = (a: { o: { m: () => Mut<number[]> } }) => { a.o.m().push(1); return 0; };"),
  k("array-literal-fn", "const a = () => { " + R + "return [(): Mut<number[]> => r.t]; };\nconst c = (a: (() => Mut<number[]>)[]) => { const f = a[0]; if (f) f().push(1); return 0; };"),
  k("map-value-fn", "const a = () => { " + R + "return new Map([[\"m\", (): Mut<number[]> => r.t]]); };\nconst c = (a: Map<string, () => Mut<number[]>>) => { const f = a.get(\"m\"); if (f) f().push(1); return 0; };"),
  k("map-set-fn", "const a = () => { " + R + "const mp = new Map<string, () => Mut<number[]>>(); mp.set(\"m\", (): Mut<number[]> => r.t); return mp; };\nconst c = (a: Map<string, () => Mut<number[]>>) => { const f = a.get(\"m\"); if (f) f().push(1); return 0; };"),
  k("set-of-fn", "const a = () => { " + R + "return new Set([(): Mut<number[]> => r.t]); };"),
  k("map-callback-makes", "const a = () => { " + R + "return [0].map(() => (): Mut<number[]> => r.t); };\nconst c = (a: (() => Mut<number[]>)[]) => { const f = a[0]; if (f) f().push(1); return 0; };"),
  k("iife-result", "const a = () => { " + R + "return { m: ((): (() => Mut<number[]>) => () => r.t)() }; };" + CW),
  k("recursive", "const a = () => { " + R + "const m = (n: number): Mut<number[]> => (n > 0 ? m(n - 1) : r.t); return { m: () => m(2) }; };" + CW),
  k("default-arg-return", "const a = () => { " + R + "return { m: (x: Mut<number[]> = r.t): Mut<number[]> => x }; };" + CW),
  k("async-method", "const a = () => { " + R + "return { m: async (): Promise<number> => { r.t.push(1); return r.t.length; } }; };"),
  k("generator-fn-kept", "const a = () => { " + R + "return { m: (): number => { r.t.push(1); return r.t.length; } }; };"),
  k("self-writer-box", "const a = () => { " + BN + "return () => { r.b.n++; return r.b.n; }; };"),
  k("self-writer-two", "const a = () => { " + BN + "return { inc: () => { r.b.n++; return 0; }, m: () => r.b.n }; };"),
  k("action-writer", "const a = () => { " + R + "return { go: action(() => { r.t.push(1); }), f: () => r.t.length }; };", { drive: async (p: any) => { const v = p.value("a"); v.go(); return "go"; } }),
  k("then-writer", "const a = () => { " + R + "Promise.resolve(1).then(() => { r.t.push(1); }); return () => r.t.length; };"),
  k("invalidation-writer", "const a = (invalidation: Invalidation) => { " + R + "invalidation.then(() => { r.t.push(1); }); return () => r.t.length; };"),
  k("map-nested", "const a = () => { const r: { readonly m: Mut<Map<string, number>> } = { m: new Map() }; return { set: () => { r.m.set(String(r.m.size), 1); return 0; }, m: () => r.m.size }; };"),
  k("set-nested", "const a = () => { const r: { readonly s: Mut<Set<number>> } = { s: new Set() }; return { add: () => { r.s.add(r.s.size); return 0; }, m: () => r.s.size }; };"),
  k("typed-nested", "const a = () => { const r: { readonly u: Mut<Uint8Array> } = { u: new Uint8Array(2) }; return { w: () => { r.u[0]++; return 0; }, m: () => r.u[0] }; };"),
  k("url-nested", "const a = () => { const r: { readonly u: Mut<URL> } = { u: new URL(\"https://x.test/a\") }; return { w: () => { r.u.pathname = r.u.pathname + \"b\"; return 0; }, m: () => r.u.href }; };"),
  k("error-nested", "const a = () => { const r: { readonly e: Mut<Error> } = { e: new Error(\"x\") }; return { w: () => { r.e.message = r.e.message + \"y\"; return 0; }, m: () => r.e.message }; };"),
  k("record-nested-field", "const a = () => { const r: { readonly o: Mut<{ v: string }> } = { o: { v: \"x\" } }; return { w: () => { r.o.v = r.o.v + \"y\"; return 0; }, m: () => r.o.v }; };"),
  k("tuple", "const a = () => { const r: readonly [Mut<number[]>] = [[0]]; return { m: (): Mut<number[]> => r[0] }; };" + CW),
  k("array-elem", "const a = () => { const r: readonly Mut<number[]>[] = [[0]]; return { m: (): Mut<number[]> => r[0] ?? [] }; };" + CW),
  k("map-arg", "const a = () => { const r: Map<string, Mut<number[]>> = new Map([[\"k\", [0]]]); return { m: (): Mut<number[]> => r.get(\"k\") ?? [] }; };" + CW),
  k("alias-box", "type Box = { readonly t: Mut<number[]> };\nconst a = () => { const r: Box = { t: [0] }; return { m: (): Mut<number[]> => r.t }; };" + CW),
  k("generic-holder", "type H<T> = { readonly v: T };\nconst a = () => { const r: H<Mut<number[]>> = { v: [0] }; return { m: (): Mut<number[]> => r.v }; };" + CW),
  k("fn-typed-const", "const a = () => { " + R + "const g: () => Mut<number[]> = () => r.t; return { m: () => g() }; };" + CW),
  k("input-fn-result", "const g = () => { " + R + "return (): Mut<number[]> => r.t; };\nconst a = (g: () => Mut<number[]>) => ({ m: g });" + CW),
];
