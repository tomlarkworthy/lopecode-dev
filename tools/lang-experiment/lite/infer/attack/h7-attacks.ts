// holes7 (2026-11-22): attacks on the four fixes after selfhost/freeze-attack2: thenables banned at publish, path
// copying of containers that reach a typed array, URL.searchParams detached, a function published while a capture is
// in its dead zone throws. Run by run-sets.ts (set h7) with the static rules on and off. W: 300 awaits.
const W = "for (let i = 0; i < 300; i++) await null; ";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
const B = (t: string) => `\nconst b = (a: ${t}) => ({ v: a });`;
const T = "const t = new Uint8Array(2); ";
type A = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown };
const A = (name: string, src: string, show: string[] = []): A => ({ name, src, show });
const TH = "{ then: (r: (v: number[]) => void) => { const xs = [0]; " + L("xs.push(1);") + "r(xs); } }";
export const attacks: A[] = [
  // 1. thenables
  A("h7-then-nested", "const a = () => ({ x: " + TH + " });\nconst c = (a: { x: { then: (r: (v: number[]) => void) => void } }) => () => a;"),
  A("h7-then-in-map", "const a = () => new Map([[\"k\", " + TH + "]]);\nconst c = (a: Map<string, { then: (r: (v: number[]) => void) => void }>) => () => a;"),
  A("h7-then-in-array", "const a = () => [" + TH + "];\nconst c = (a: { then: (r: (v: number[]) => void) => void }[]) => () => a;"),
  A("h7-then-helper", "const a = () => { const mk = () => (" + TH + "); return mk(); };\nconst c = (a: { then: (r: (v: number[]) => void) => void }) => ({ n: a });"),
  A("h7-then-yield", "const a = function* () { yield " + TH + "; yield 1; };"),
  A("h7-then-state", "const s = () => state(" + TH + ");\nconst c = (s: { then: (r: (v: number[]) => void) => void }) => ({ v: s });"),
  A("h7-then-method", "const a = () => { const xs = [0]; " + L("const r = xs; r.push(1);") + "return { then(r: (v: number[]) => void) { r(xs); } }; };"),
  A("h7-then-type-lie", "const a = () => ({ n: 1, then: (r: (v: string) => void) => r(\"str\") });\nconst b = (a: { n: number }) => typeof a.n;", ["b"]),
  A("h7-then-async-return", "const a = async () => ({ n: 1, then: (r: (v: string) => void) => r(\"str\") });\nconst b = (a: { n: number }) => typeof a.n;", ["b"]),
  A("h7-then-not-callable", "const a = () => ({ then: 1 });\nconst b = (a: { then: number }) => a.then + 1;", ["b"]),
  A("h7-then-from-param", "const k = () => (r: (v: number[]) => void) => r([0]);\nconst a = (k: (r: (v: number[]) => void) => void) => ({ then: k });"),
  // 2. typed arrays: path copying
  A("h7-ta-two-containers", "const a = () => { " + T + "const o = { t }; const p = [t]; " + L("o.t[0] = 1; const q = p[0]; if (q) q[1] = 2;") + "return { o, p }; };" + B("{ o: { t: Uint8Array }; p: Uint8Array[] }")),
  A("h7-ta-shared-identity", "const a = () => { " + T + "const o = { t }; return { x: o, y: o, z: t }; };\nconst b = (a: { x: { t: Uint8Array }; y: { t: Uint8Array }; z: Uint8Array }) => [a.x === a.y, a.x.t === a.z];", ["b"]),
  A("h7-ta-deep", "const a = () => { " + T + "const o = { a: { b: [{ t }] } }; " + L("const r = o.a.b[0]; if (r) r.t[0] = 1;") + "return o; };" + B("{ a: { b: { t: Uint8Array }[] } }")),
  A("h7-ta-set-member", "const a = () => { " + T + "const r = { t }; const s = new Set([r]); " + L("s.forEach((x) => { x.t[0] = 3; });") + "return s; };" + B("Set<{ t: Uint8Array }>")),
  A("h7-ta-map-key-rec", "const a = () => { " + T + "const k = { t }; const m = new Map([[k, 1]]); " + L("m.forEach((v, x) => { x.t[0] = 4; });") + "return m; };" + B("Map<{ t: Uint8Array }, number>")),
  A("h7-ta-map-value-later", "const a = () => { " + T + "const m = new Map([[\"k\", { t }]]); " + L("const r = m.get(\"k\"); if (r) r.t[1] = 5;") + "return m; };" + B("Map<string, { t: Uint8Array }>")),
  A("h7-ta-captured-container", "const a = () => { " + T + "const o = { t }; " + L("o.t[0] = 1;") + "return () => o.t[0]; };"),
  A("h7-ta-captured-in-record", "const a = () => { " + T + "const o = { t }; return { f: () => o.t[0] ?? -1, o }; };"),
  A("h7-ta-second-yield", "const a = function* () { " + T + "const o = { t }; yield o; o.t[0] = 1; yield o; o.t[1] = 2; yield 0; };"),
  A("h7-ta-yield-then-write-copy", "const a = function* () { " + T + "const o = { t }; yield o; const p = { o }; o.t[0] = 6; yield p; o.t[1] = 7; yield 0; };"),
  A("h7-ta-consumer-republishes", "const a = () => { " + T + L("t[0] = 1;") + "return { t }; };\nconst b = (a: { t: Uint8Array }) => ({ w: a, u: a.t });\nconst c = (b: { w: { t: Uint8Array }; u: Uint8Array }) => b.w.t === b.u;", ["c"]),
  A("h7-ta-consumer-closes-over-input", "const a = () => ({ t: new Uint8Array(2) });\nconst b = (a: { t: Uint8Array }) => { const u = a.t; return () => u[0] ?? -1; };", ["b"]),
  A("h7-ta-buffer-and-view", "const a = () => { " + T + L("t[0] = 1;") + "return { t, b: t.buffer }; };" + B("{ t: Uint8Array; b: ArrayBuffer }")),
  A("h7-ta-promise-in-record", "const a = () => { " + T + L("t[0] = 1;") + "return { p: Promise.resolve({ t }) }; };\nconst c = async (a: { p: Promise<{ t: Uint8Array }> }) => ({ v: await a.p });"),
  A("h7-ta-captured-promise", "const a = () => { " + T + L("t[0] = 1;") + "const p = Promise.resolve({ t }); return async () => (await p).t; };\nconst c = async (a: () => Promise<Uint8Array>) => ({ v: await a() });"),
  A("h7-ta-error-cause", "const a = () => { " + T + L("t[0] = 1;") + "return new Error(\"x\", { cause: { t } }); };" + B("Error")),
  A("h7-ta-action-arg", "const s = () => state({ t: new Uint8Array(2) });\nconst w = (s: State<{ t: Uint8Array }>) => action((x: { t: Uint8Array }) => { s.set(x); });\nconst k = (w: (x: { t: Uint8Array }) => void) => { const t = new Uint8Array(2); const o = { t }; w(o); " + L("o.t[0] = 1;") + "return 0; };\nconst b = (s: { t: Uint8Array }) => ({ v: s });", ["b"]),
  A("h7-ta-cycle", "const a = () => { " + T + "const o: Mut<{ t: Uint8Array; self: unknown }> = { t, self: null }; o.self = o; " + L("o.t[0] = 1;") + "return o; };"),
  // 3. live views
  A("h7-lv-usp-record", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return { p: u.searchParams }; };\nconst b = (a: { p: URLSearchParams }) => () => a.p.get(\"q\");"),
  A("h7-lv-usp-direct", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return u.searchParams; };" + B("URLSearchParams")),
  A("h7-lv-usp-in-map", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.searchParams.toString(); u.hash = \"#h\"; u.search = \"?q=3\";") + "return new Map([[\"p\", u.searchParams]]); };" + B("Map<string, URLSearchParams>")),
  A("h7-lv-usp-of-published-url", "const a = () => new URL(\"https://x.test/?q=1\");\nconst b = (a: URL) => ({ p: a.searchParams });\nconst c = (a: URL) => { const h = async () => { " + W + "const s = a.searchParams; s.toString(); }; h(); return a.searchParams.get(\"q\"); };"),
  A("h7-lv-subarray", "const a = () => { const t = new Uint8Array(4); " + L("t[1] = 9;") + "return { s: t.subarray(1, 3) }; };" + B("{ s: Uint8Array }")),
  A("h7-lv-regexp-lastindex", "const a = () => { const r = new RegExp(\"a\", \"g\"); " + L("r.exec(\"aa\");") + "return { r }; };" + B("{ r: RegExp }")),
  A("h7-lv-error-cause", "const a = () => { const xs = [0]; " + L("const r = xs; r.push(1);") + "return new Error(\"x\", { cause: xs }); };" + B("Error")),
  A("h7-lv-map-value", "const a = () => { const xs = [0]; const m = new Map([[\"k\", xs]]); " + L("const r = xs; r.push(1);") + "return m; };" + B("Map<string, number[]>")),
  // 4. dead zone
  A("h7-tdz-let", "const a = function* () { yield { g }; let late = [0]; yield 1; late.push(1); yield 2; function g(): number { return late.length; } };"),
  A("h7-tdz-fn-decl", "const a = function* () { yield { g }; const late = [0]; yield 1; late.push(1); yield 2; function g(): number { return late.length; } };"),
  A("h7-tdz-fn-decl-chain", "const a = function* () { yield g; const late = [0]; yield 1; late.push(1); yield 2; function g(): number { return k(); } function k(): number { return late.length; } };"),
  A("h7-tdz-param-default", "const a = function* () { yield { g }; const late = [0]; yield 1; late.push(1); yield 2; function g(q: number = late.length): number { return q; } };"),
  A("h7-tdz-catching", "const a = function* () { yield { g }; const late = [0]; yield 1; late.push(1); yield 2; function g(): number { try { return late.length; } catch { return -1; } } };"),
  A("h7-tdz-same-statement", "const a = function* () { const r = { g }; const late = [0], z = yield r, w = late.push(9); yield 2; function g(): number { return late.length; } };"),
  A("h7-tdz-ok-after-init", "const a = function* () { const late = [0]; yield { g }; yield 1; function g(): number { return late.length; } };\nconst b = (a: { g: () => number } | number) => ({ v: a });"),
  A("h7-tdz-async-gen", "const a = async function* () { yield { g }; const late = [0]; " + W + "late.push(1); yield 2; function g(): number { return late.length; } };"),
];
