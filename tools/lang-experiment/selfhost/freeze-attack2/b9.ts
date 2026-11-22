import { A, W, D, B, callW } from "./common.ts";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
const T = "const t = new Uint8Array(2); ";
const G = "function g(): number { try { return late.length; } catch { return -1; } }";
export const attacks = [
  // a record yielded while its function's capture is in its dead zone is put in DONE; the capture is written before ss_tdz
  A("tdz-done", "const a = function* () { const r = { g }; yield r; const late = [0], z = yield r, w = late.push(9); yield 2; " + G + " };"),
  A("tdz-done-plain", "const a = function* () { const r = { g }; yield r; const late = [0], z = yield r, w = late.push(9); yield 2; function g(): number { return late.length; } };"),
  A("tdz-done-arr", "const a = function* () { const r = [g]; yield r; const late = [0], z = yield r, w = late.push(9); yield 2; " + G + " };"),
  A("tdz-done-fn-direct", "const a = function* () { yield g; const late = [0], z = yield 1, w = late.push(9); yield 2; " + G + " };\nconst b = (a: (() => number) | number) => ({ v: a });"),
  A("tdz-done-after-tdz-other", "const a = function* () { const r = { g }; yield r; const late = [0]; const z = yield r; late.push(9); yield 2; " + G + " };"),
  A("tdz-done-state-like", "const a = async function* () { const r = { g }; yield r; const late = [0], z = await Promise.resolve(0), y = yield r, w = late.push(9); yield 2; " + G + " };"),
  A("tdz-done-typed", "const a = function* () { const r = { g }; yield r; const late = new Uint8Array(2), z = yield r, w = late.fill(9); yield 2; function g(): number { try { return late[0] ?? -2; } catch { return -1; } } };"),
  A("tdz-done-map", "const a = function* () { const r = { g }; yield r; const late = new Map<string, number>(), z = yield r, w = late.set(\"k\", 1); yield 2; function g(): number { try { return late.size; } catch { return -1; } } };"),
  A("tdz-done-record-holder", "const a = function* () { const r = { g }; yield { r }; const late = [0], z = yield { r }, w = late.push(9); yield 2; " + G + " };"),
  A("tdz-done-consumer", "const a = function* () { const r = { g }; yield r; const late = [0], z = yield r, w = late.push(9); yield 2; " + G + " };\nconst b = (a: { g: () => number } | number) => ({ v: a });"),
  // USP via more boundaries
  A("usp-async-cell", "const a = async () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return u.searchParams; };\nconst c = (a: URLSearchParams) => () => a;"),
  A("usp-set", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return new Set([u.searchParams]); };\nconst c = (a: Set<URLSearchParams>) => () => a;"),
  A("usp-then-cb", "const a = () => { " + D + "const u = new URL(\"https://x.test/?q=1\"); D().then(() => { u.search = \"?q=2\"; }); return u.searchParams; };\nconst c = (a: URLSearchParams) => () => a;"),
  A("usp-reader-cell", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return { p: u.searchParams }; };\nconst b = (a: { p: URLSearchParams }) => ({ q: a.p.get(\"q\") });\nconst d = (a: { p: URLSearchParams }) => () => a.p.toString();"),
  // copy-in-slot, more
  A("cs-two-yields", "const a = function* () { " + T + "const o = { t }; yield 0; " + L("o.t[0] = 1;") + "yield o; };"),
  A("cs-state-map-key", "const s = () => { " + T + "const m = new Map([[t, 1]]); " + L("m.forEach((v, k) => { k[0] = 5; });") + "return state(m); };\nconst c = (s: Map<Uint8Array, number>) => () => s;"),
  A("cs-f32", "const a = () => { const t = new Float32Array(2); const o = { t }; " + L("o.t[1] = 2.5;") + "return o; };" + B("{ t: Float32Array }")),
  A("cs-reverse", "const a = () => { const t = Uint8Array.of(1, 2); const o = { t }; " + L("o.t.reverse();") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-copywithin", "const a = () => { const t = Uint8Array.of(1, 2, 3); const o = { t }; " + L("o.t.copyWithin(0, 1);") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-buffer-named", "const a = () => { const b = new ArrayBuffer(2); const o = { b }; " + L("const v = new Uint8Array(o.b); v[0] = 1;") + "return o; };" + B("{ b: ArrayBuffer }")),
  A("cs-buffer-of-typed", "const a = () => { " + T + "const b = t.buffer; const o = { b }; " + L("const v = new Uint8Array(o.b); v[0] = 1;") + "return o; };" + B("{ b: ArrayBuffer }")),
  A("cs-subarray-named", "const a = () => { " + T + "const o = { t }; " + L("const v = o.t.subarray(0, 1); v[0] = 8;") + "return o; };" + B("{ t: Uint8Array }")),
  A("cs-second-consumer-sees", "const a = () => { " + T + "const o = { t }; " + L("o.t[0] = 1;") + "return o; };\nconst b = (a: { t: Uint8Array }) => a.t[0];\nconst d = (a: { t: Uint8Array }) => () => a.t[0];", ["b"]),
  // misc controls
  A("ctl-array-late", "const a = () => { const xs = [0]; " + L("xs.push(1);") + "return xs; };" + B("number[]")),
  A("ctl-typed-direct", "const a = () => { " + T + L("t[0] = 1;") + "return t; };" + B("Uint8Array")),
  A("ctl-url-late", "const a = () => { const u = new URL(\"https://x.test/a\"); " + L("u.pathname = \"/b\";") + "return u; };" + B("URL")),
  A("ctl-error-late", "const a = () => { const e = new Error(\"x\"); " + L("e.message = \"y\";") + "return e; };" + B("Error")),
  A("ctl-map-late", "const a = () => { const m = new Map<string, number>(); " + L("m.set(\"k\", 1);") + "return m; };" + B("Map<string, number>")),
  A("ctl-set-late", "const a = () => { const s = new Set<number>(); " + L("s.add(1);") + "return s; };" + B("Set<number>")),
  A("ctl-regexp-replace", "const a = () => /a/;\nconst b = (a: RegExp) => [\"aa\".replace(a, \"b\"), \"aa\".replace(a, \"b\")];", ["b"]),
  A("ctl-rec-of-url", "const a = () => { const u = new URL(\"https://x.test/a\"); const o = { u }; " + L("u.hash = \"#q\";") + "return o; };" + B("{ u: URL }")),
  A("ctl-structured-map", "const a = () => { const m = structuredClone(new Map<string, number>()); " + L("m.set(\"k\", 1);") + "return m; };" + B("Map<string, number>")),
  A("ctl-structured-in-rec", "const a = () => { const m = structuredClone(new Map<string, number>()); const o = { m }; " + L("o.m.set(\"k\", 1);") + "return o; };" + B("{ m: Map<string, number> }")),
  A("ctl-snapshot-typed", "const a = () => { " + T + "const s = snapshot(t); const o = { s }; " + L("o.s[0] = 1;") + "return o; };" + B("{ s: Uint8Array }")),
  A("ctl-native-map-in-rec-key", "const a = () => { const m = structuredClone(new Map<string, number>()); const s = new Set([m]); " + L("s.forEach((q) => { q.set(\"z\", 2); });") + "return s; };" + B("Set<Map<string, number>>")),
];
