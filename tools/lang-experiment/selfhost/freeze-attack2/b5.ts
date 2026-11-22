import { A, W, D, B } from "./common.ts";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
// as b4, but the container built from a named Mut local (its element type is then Mut)
const T = "const t = new Uint8Array(2); ";
export const attacks = [
  A("nm-rec-field", "const a = () => { " + T + "const o = { t }; " + L("o.t[0] = 1;") + "return o; };" + B("{ t: Uint8Array }")),
  A("nm-rec-destr", "const a = () => { " + T + "const o = { t }; " + L("const { t: q } = o; q[0] = 1;") + "return o; };" + B("{ t: Uint8Array }")),
  A("nm-arr-index", "const a = () => { " + T + "const xs = [t]; " + L("const q = xs[0]; if (q) q[0] = 1;") + "return xs; };" + B("Uint8Array[]")),
  A("nm-arr-forEach", "const a = () => { " + T + "const xs = [t]; " + L("xs.forEach((q) => { q[0] = 1; });") + "return xs; };" + B("Uint8Array[]")),
  A("nm-arr-forof", "const a = () => { " + T + "const xs = [t]; " + L("for (const q of xs) q[0] = 1;") + "return xs; };" + B("Uint8Array[]")),
  A("nm-map-get", "const a = () => { " + T + "const m = new Map([[\"k\", t]]); " + L("const q = m.get(\"k\"); if (q) q[0] = 1;") + "return m; };" + B("Map<string, Uint8Array>")),
  A("nm-map-forEach", "const a = () => { " + T + "const m = new Map([[\"k\", t]]); " + L("m.forEach((q) => { q[0] = 1; });") + "return m; };" + B("Map<string, Uint8Array>")),
  A("nm-map-key", "const a = () => { " + T + "const m = new Map([[t, 1]]); " + L("m.forEach((v, k) => { k[0] = 1; });") + "return m; };" + B("Map<Uint8Array, number>")),
  A("nm-map-key-forof", "const a = () => { " + T + "const m = new Map([[t, 1]]); " + L("for (const [k] of m) k[0] = 1;") + "return m; };" + B("Map<Uint8Array, number>")),
  A("nm-set-forEach", "const a = () => { " + T + "const s = new Set([t]); " + L("s.forEach((q) => { q[0] = 1; });") + "return s; };" + B("Set<Uint8Array>")),
  A("nm-set-forof", "const a = () => { " + T + "const s = new Set([t]); " + L("for (const q of s) q[0] = 1;") + "return s; };" + B("Set<Uint8Array>")),
  A("nm-nested", "const a = () => { " + T + "const o = { p: { q: [t] } }; " + L("const z = o.p.q[0]; if (z) z[0] = 1;") + "return o; };" + B("{ p: { q: Uint8Array[] } }")),
  A("nm-rec-buffer", "const a = () => { const b = new ArrayBuffer(2); const o = { b }; " + L("new Uint8Array(o.b)[0] = 1;") + "return o; };" + B("{ b: ArrayBuffer }")),
  A("nm-rec-url", "const a = () => { const u = new URL(\"https://x.test/a\"); const o = { u }; " + L("o.u.pathname = \"/b\";") + "return o; };" + B("{ u: URL }")),
  A("nm-rec-err", "const a = () => { const e = new Error(\"x\"); const o = { e }; " + L("o.e.message = \"y\";") + "return o; };" + B("{ e: Error }")),
  A("nm-rec-arr", "const a = () => { const xs = [0]; const o = { xs }; " + L("o.xs.push(1);") + "return o; };" + B("{ xs: number[] }")),
  A("nm-map-in-rec-native", "const a = () => { const m = new Map<string, number>(); const o = { m }; " + L("o.m.set(\"k\", 1);") + "return o; };" + B("{ m: Map<string, number> }")),
  A("nm-gen-rec", "const a = function* () { " + T + "const o = { t }; yield o; o.t[0] = 1; yield 0; };"),
  A("nm-gen-map-key", "const a = function* () { " + T + "const m = new Map([[t, 1]]); yield m; m.forEach((v, k) => { k[0] = 1; }); yield 0; };"),
  A("nm-state", "const s = () => { " + T + "const o = { t }; " + L("o.t[0] = 1;") + "return state(o); };\nconst b = (s: { t: Uint8Array }) => ({ v: s });"),
  A("nm-then-cb", "const a = () => { " + D + T + "const o = { t }; D().then(() => { o.t[0] = 1; }); return o; };" + B("{ t: Uint8Array }")),
  A("nm-rec-helper", "const a = () => { " + T + "const o = { t }; const w = (p: Mut<Uint8Array>) => { p[0] = 1; }; " + L("w(o.t);") + "return o; };" + B("{ t: Uint8Array }")),
  A("nm-rec-fill", "const a = () => { " + T + "const o = { t }; " + L("o.t.fill(4);") + "return o; };" + B("{ t: Uint8Array }")),
  A("nm-rec-subarray", "const a = () => { " + T + "const o = { t }; " + L("o.t.subarray(0, 1)[0] = 4;") + "return o; };" + B("{ t: Uint8Array }")),
  A("nm-map-key-in-set", "const a = () => { " + T + "const s = new Set([t]); " + L("s.forEach((q) => { q.set([7, 7]); });") + "return { s }; };" + B("{ s: Set<Uint8Array> }")),
];
