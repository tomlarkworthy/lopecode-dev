import { A, W, D, B } from "./common.ts";
const HOLD = "\nconst c = (a: unknown) => () => a;";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
export const attacks = [
  // the copy deepFreeze puts in the producer's own container slot, written later through that container
  A("cs-record", "const a = () => { const o = { t: new Uint8Array(2) }; " + L("o.t[0] = 1;") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-record-fill", "const a = () => { const o = { t: new Float64Array(2) }; " + L("o.t.fill(3);") + "return o; };" + B("{ t: Float64Array }")),
  A("cs-array", "const a = () => { const xs = [new Uint8Array(2)]; " + L("const t = xs[0]; if (t) t[0] = 1;") + "return xs; };" + B("Uint8Array[]")),
  A("cs-map", "const a = () => { const m = new Map([[\"k\", new Int32Array(2)]]); " + L("const t = m.get(\"k\"); if (t) t[1] = 7;") + "return m; };" + B("Map<string, Int32Array>")),
  A("cs-set", "const a = () => { const s = new Set([new Uint8Array(2)]); " + L("s.forEach((t) => { t[0] = 4; });") + "return s; };" + B("Set<Uint8Array>")),
  A("cs-nested3", "const a = () => { const o = { p: { q: { t: new Uint8Array(2) } } }; " + L("o.p.q.t[0] = 1;") + "return o; };" + B("{ p: { q: { t: Uint8Array } } }")),
  A("cs-record-in-array", "const a = () => { const o = { t: new Uint8Array(2) }; " + L("o.t[0] = 1;") + "return [o]; };" + B("{ t: Uint8Array }[]")),
  A("cs-alias-record", "const a = () => { const o = { t: new Uint8Array(2) }; const r = o; " + L("r.t[0] = 1;") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-buffer", "const a = () => { const o = { b: new ArrayBuffer(2) }; " + L("new Uint8Array(o.b)[0] = 1;") + "return o; };" + B("{ b: ArrayBuffer }")),
  A("cs-sort", "const a = () => { const o = { t: Uint8Array.of(3, 1, 2) }; " + L("o.t.sort();") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-set-method", "const a = () => { const o = { t: new Uint8Array(2) }; " + L("o.t.set([5, 6]);") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-subarray", "const a = () => { const o = { t: new Uint8Array(4) }; " + L("o.t.subarray(1, 3)[0] = 9;") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-gen", "const a = function* () { const o = { t: new Uint8Array(2) }; yield o; o.t[0] = 1; yield 0; };"),
  A("cs-gen-alias", "const a = function* () { const o = { t: new Uint8Array(2) }; const r = o; yield o; r.t[0] = 1; yield 0; };"),
  A("cs-gen-map", "const a = function* () { const m = new Map([[\"k\", new Uint8Array(2)]]); yield m; const t = m.get(\"k\"); if (t) t[0] = 1; yield 0; };"),
  A("cs-gen-helper", "const a = function* () { const o = { t: new Uint8Array(2) }; const w = (p: Mut<Uint8Array>) => { p[0] = 1; }; yield o; w(o.t); yield 0; };"),
  A("cs-then", "const a = () => { " + D + "const o = { t: new Uint8Array(2) }; D().then(() => { o.t[0] = 1; }); return o; };" + B("{ t: Uint8Array }")),
  A("cs-state-initial", "const s = () => { const o = { t: new Uint8Array(2) }; " + L("o.t[0] = 1;") + "return state(o); };" + B("{ t: Uint8Array }").replace("(a:", "(s:").replace("v: a", "v: s")),
  A("cs-key-map", "const a = () => { const t = new Uint8Array(2); const m = new Map([[t, 1]]); " + L("m.forEach((v, k) => { k[0] = 1; });") + "return m; };" + B("Map<Uint8Array, number>")),
  A("cs-fn-cap-rec", "const a = () => { const o = { t: new Uint8Array(2) }; const f = () => o.t[0]; " + L("o.t[0] = 1;") + "return f; };"),
  A("cs-sync-in-cell", "const a = () => { const o = { t: new Uint8Array(2) }; const f = () => o; return { f, g: () => 0 }; };"),
  // URL.searchParams: a URLSearchParams is kind 0 (not frozen, not copied); the URL that owns it stays the cell's
  A("usp-async", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return { p: u.searchParams }; };" + HOLD),
  A("usp-top", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return u.searchParams; };" + HOLD),
  A("usp-gen", "const a = function* () { const u = new URL(\"https://x.test/?q=1\"); yield u.searchParams; u.search = \"?q=2\"; yield 0; };"),
  A("usp-gen-rec", "const a = function* () { const u = new URL(\"https://x.test/?q=1\"); yield { p: u.searchParams }; u.href = \"https://x.test/?q=3\"; yield 0; };"),
  A("usp-fn", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); const p = u.searchParams; " + L("u.search = \"?q=2\";") + "return () => p.get(\"q\"); };"),
  A("usp-state", "const s = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return state(u.searchParams); };\nconst c = (s: URLSearchParams) => () => s;"),
  A("usp-copy-url-in", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.hash = \"#z\";") + "return { u }; };"),
  // a frozen record holding a URL whose searchParams is read later
  A("usp-from-published-url", "const a = () => new URL(\"https://x.test/?q=1\");\nconst b = (a: URL) => ({ p: a.searchParams });"),
];
