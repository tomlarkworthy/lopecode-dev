import { A, W, D, B, callW } from "./common.ts";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
const T = "const t = new Uint8Array(2); ";
export const attacks = [
  // events: a listener's action receives each value; the generator keeps its own container
  A("ev-rec-typed", "const g = function* () { yield { n: 1 }; yield { n: 2 }; };\nconst s = () => state<{ n: number }[]>([]);\nconst add = (s: State<{ n: number }[]>) => action((x: { n: number }) => { s.update((v) => [...v, x]); });\nconst l = (g: Events<{ n: number }>, add: Action<[{ n: number }]>) => on(g, add);\nconst c = (s: { n: number }[]) => () => s;", ["s"]),
  A("ev-usp", "const g = function* () { const u = new URL(\"https://x.test/?q=1\"); yield { q: u.search }; };\nconst s = () => state(\"\");\nconst add = (s: State<string>) => action((x: { q: string }) => { s.set(x.q); });\nconst l = (g: Events<{ q: string }>, add: Action<[{ q: string }]>) => on(g, add);", ["s"]),
  A("ev-listener-writes-arg", "const g = function* () { yield [0]; };\nconst s = () => state<number[]>([]);\nconst add = (s: State<number[]>) => action((x: number[]) => { s.set(x); });\nconst l = (g: Events<number[]>, add: Action<[number[]]>) => on(g, add);\nconst c = (s: number[]) => () => s;", ["s"]),
  // state initial and the store: USP, copy-slot through state of records in arrays
  A("st-usp-rec", "const s = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=3\";") + "return state({ p: u.searchParams }); };\nconst c = (s: { p: URLSearchParams }) => () => s;"),
  A("st-cs-nested", "const s = () => { " + T + "const o = { a: [{ t }] }; " + L("const z = o.a[0]; if (z) z.t[0] = 2;") + "return state(o); };\nconst c = (s: { a: { t: Uint8Array }[] }) => () => s;"),
  A("st-cs-then-read-in-action", "const s = () => { " + T + "const o = { t }; " + L("o.t[0] = 2;") + "return state(o); };\nconst w = (s: State<{ t: Uint8Array }>) => action(() => { const v = read(s); s.set({ t: new Uint8Array(1) }); return v; });\nconst c = (s: { t: Uint8Array }) => () => s;"),
  // thenable record as a state value written by an action (sync, typed)
  A("th-action-set-typed", "const s = () => state<{ n: number }>({ n: 0 });\nconst w = (s: State<{ n: number }>) => action(() => { s.set({ n: 1 }); });\nconst c = (s: { n: number }) => () => s;", ["s"], callW),
  A("th-state-update-thenable", "type Th = { then: (r: (v: number[]) => void) => void };\nconst s = () => state<Th>({ then: (r: (v: number[]) => void) => { r([0]); } });\nconst c = (s: Th) => () => s;", ["s"]),
  A("th-state-thenable-async", "const s = () => state({ then: (r: (v: { t: Uint8Array }) => void) => { " + T + "const o = { t }; " + L("t[0] = 4;") + "r(o); } });\nconst c = (s: unknown) => () => s;"),
  A("th-two-consumers", "const a = () => ({ then: (r: (v: number[]) => void) => { const xs = [0]; " + L("xs.push(1);") + "r(xs); } });\nconst b = (a: unknown) => () => a;\nconst d = (a: unknown) => () => a;"),
  A("th-records-equal", "const a = () => ({ then: (r: (v: number[]) => void) => { r([1, 2]); }, xs: [0] });\nconst b = (a: { xs: number[] }) => equals(a, { xs: [0] });", ["a", "b"]),
  A("th-messageOf", "const a = () => ({ then: (r: (v: Error) => void) => { const e = new Error(\"x\"); " + L("e.message = \"y\";") + "r(e); } });\nconst c = (a: unknown) => () => messageOf(a);"),
  // typed array in a Set inside a Map value, nested three levels, published from an async cell
  A("cs-deep-async", "const a = async () => { " + T + "const m = new Map([[\"k\", new Set([t])]]); " + L("m.forEach((s) => s.forEach((q) => { q[1] = 6; }));") + "return { m }; };" + B("{ m: Map<string, Set<Uint8Array>> }")),
  A("cs-map-value-arr", "const a = () => { " + T + "const xs = [t]; const m = new Map([[\"k\", xs]]); " + L("const q = m.get(\"k\")?.[0]; if (q) q[0] = 6;") + "return m; };" + B("Map<string, Uint8Array[]>")),
  A("cs-arr-of-rec", "const a = () => { " + T + "const o = { t }; const xs = [o]; " + L("xs.forEach((p) => { p.t[0] = 6; });") + "return xs; };" + B("{ t: Uint8Array }[]")),
];
