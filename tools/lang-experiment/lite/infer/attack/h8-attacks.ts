// holes8 (2026-11-22): attacks after selfhost/freeze-attack3. Run by run-sets.ts (set h8). W: 300 awaits.
// 1. b4's 30 `-obs` rows, repaired: the attacker's consumer read `v.size` off an `unknown` ([no-member]); here the
// consumer is typed with what the promise holds and reads it twice in one run (twice)
const W = "for (let i = 0; i < 300; i++) await null; ";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
type A = { name: string; src: string; show?: string[]; twice?: string[]; drive?: (p: any) => unknown };
const A = (name: string, src: string, more: Partial<A> = {}): A => ({ name, src, ...more });
// leaf: setup, type, late write, how a consumer reads one (x: the leaf or undefined)
const LEAVES: [string, string, string, string, (x: string) => string][] = [
  ["ta", "const t = new Uint8Array(2); ", "Uint8Array", "t[0] = 1;", (x) => `${x} ? ${x}[0] : -1`],
  ["nmap", "const t = structuredClone(new Map<string, number>()); ", "Map<string, number>", "t.set(\"k\", 1);", (x) => `${x} ? ${x}.size : -1`],
  ["ab", "const t = new ArrayBuffer(2); ", "ArrayBuffer", "new Uint8Array(t)[0] = 1;", (x) => `${x} ? new Uint8Array(${x})[0] : -1`],
];
// holder: how p is made from t, p's type from the leaf type, and the leaf read back from p's value v
const HOLDERS: [string, (ty: string) => string, (ty: string) => string, string][] = [
  ["mk-arg", (ty) => `const mk = async (x: ${ty}) => x; const p = mk(t); `, (ty) => `Promise<${ty}>`, "v"],
  ["mk-rec-arg", (ty) => `const mk = async (x: { t: ${ty} }) => x; const p = mk({ t }); `, (ty) => `Promise<{ t: ${ty} }>`, "v.t"],
  ["mk-arr-arg", (ty) => `const mk = async (x: ${ty}[]) => x; const p = mk([t]); `, (ty) => `Promise<${ty}[]>`, "v[0]"],
  ["mk-map-arg", (ty) => `const mk = async (x: Map<string, ${ty}>) => x; const p = mk(new Map([["k", t]])); `, (ty) => `Promise<Map<string, ${ty}>>`, "v.get(\"k\")"],
  ["mk-two-step", (ty) => `const mk = async (x: ${ty}) => x; const id = (x: ${ty}) => x; const p = mk(id(t)); `, (ty) => `Promise<${ty}>`, "v"],
  ["mk-wrap-later", (ty) => `const mk = async (x: { t: ${ty} }) => x; const o = { t }; const p = mk(o); `, (ty) => `Promise<{ t: ${ty} }>`, "v.t"],
  ["then-arg", () => "const p = Promise.resolve(0).then((z: number) => z); const q = p.then(async () => 0); ", () => "Promise<number>", ""],
  ["all-arg", (ty) => `const mk = async (x: ${ty}) => x; const p = Promise.all([mk(t)]); `, (ty) => `Promise<${ty}[]>`, "v[0]"],
  ["mk-gen", (ty) => `const mk = async (x: ${ty}) => { ${W} return x; }; const p = mk(t); `, (ty) => `Promise<${ty}>`, "v"],
  ["mk-await", (ty) => `const mk = async (x: ${ty}) => { const y = await Promise.resolve(x); return y; }; const p = mk(t); `, (ty) => `Promise<${ty}>`, "v"],
];
const obs: A[] = LEAVES.flatMap(([ln, setup, ty, write, read]) => HOLDERS.map(([hn, hold, pty, at]): A => {
  const r = at === "" ? "v" : read("u"), u = at === "" ? "" : `const u = ${at}; `;
  return A(`h8-obs-${ln}-${hn}`, `const a = () => { ${setup}${hold(ty)}${L(write)}return () => p; };\nconst obs = async function* (a: () => ${pty(ty)}) { const v = await a(); ${u}yield [${r}]; ${W}${W}yield [${r}]; };`, { twice: ["obs"] });
}));
// compile on the page: a caller's argument, an island cell's local and the result (class A)
const GO = (outs: string, ins: string, body: string) => `\nconst go = async (compile: Compile) => { const f = compile({ inputs: [${ins.split(",").filter(Boolean).map((x) => JSON.stringify(x)).join(", ")}], refs: [], outputs: [${outs.split(",").map((x) => JSON.stringify(x)).join(", ")}] }); ${body} };`;
const isl: A[] = [
  A("h8-isl-arg-identity-late", "const x = () => [1];\nconst y = (x: number[]) => x;" + GO("y", "x", "const xs = [0]; const r = await f({ x: xs }); " + L("xs.push(1);") + "return r.y;")),
  A("h8-isl-arg-typed-late", "const x = () => new Uint8Array(2);\nconst y = (x: Uint8Array) => x;" + GO("y", "x", "const t = new Uint8Array(2); const r = await f({ x: t }); " + L("t[0] = 1;") + "return r.y;")),
  A("h8-isl-arg-map-late", "const x = () => new Map<string, number>();\nconst y = (x: Map<string, number>) => x;" + GO("y", "x", "const m = new Map<string, number>(); const r = await f({ x: m }); " + L("m.set(\"k\", 1);") + "return r.y;")),
  A("h8-isl-arg-in-rec-late", "const x = () => [1];\nconst y = (x: number[]) => ({ x });" + GO("y", "x", "const xs = [0]; const r = await f({ x: xs }); " + L("xs.push(1);") + "return r.y;")),
  A("h8-isl-local-late", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return xs; };" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  A("h8-isl-between-local-late", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return xs; };\nconst z = (y: number[]) => ({ y });" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  A("h8-isl-typed-local-late", "const x = () => 1;\nconst y = (x: number) => { const t = new Uint8Array(2); " + L("t[0] = 1;") + "return t; };" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  A("h8-isl-result-consumer-twice", "const x = () => [1];\nconst y = (x: number[]) => x;" + GO("y", "x", "const xs = [0]; const r = await f({ x: xs }); " + L("xs.push(1);") + "return r.y;") + "\nconst obs = async function* (go: number[]) { yield [go.length]; " + W + W + "yield [go.length]; };", { twice: ["obs"] }),
  A("h8-isl-result-reused", "const x = () => [1];\nconst y = (x: number[]) => x;" + GO("y", "x", "const xs = [0]; const r = await f({ x: xs }); const q = await f({ x: xs }); return [r.y, q.y];"), { show: ["go"] }),
];
// a promise a published function, method, handle or frozen value holds (classes B and C): each throws at publish
const P = "const t = [0]; const mk = async (x: number[]) => x; const p = mk(t); ";
const kp: A[] = [
  A("h8-kp-closure", "const a = () => { " + P + L("t.push(1);") + "return () => p; };"),
  A("h8-kp-method", "const a = () => { " + P + L("t.push(1);") + "return { get() { return p; } }; };"),
  A("h8-kp-nested-closure", "const a = () => { " + P + L("t.push(1);") + "const g = () => p; return () => g(); };"),
  A("h8-kp-rec-in-closure", "const a = () => { " + P + L("t.push(1);") + "const o = { p }; return () => o.p; };"),
  A("h8-kp-arr-in-closure", "const a = () => { " + P + L("t.push(1);") + "const ps = [p]; return () => ps[0]; };"),
  A("h8-kp-all", "const a = () => { " + P + L("t.push(1);") + "const q = Promise.all([p]); return () => q; };"),
  A("h8-kp-then-derived", "const a = () => { " + P + L("t.push(1);") + "const q = p.then((x: number[]) => x); return () => q; };"),
  A("h8-kp-yield-fn", "const a = function* () { " + P + "yield () => p; t.push(1); yield 0; };"),
  A("h8-kp-async-gen-fn", "const a = async function* () { " + P + "yield () => p; " + W + "t.push(1); yield () => p; };"),
  A("h8-kp-state-fn", "const s = () => { " + P + L("t.push(1);") + "return state({ g: () => p }); };\nconst obs = async function* (s: { g: () => Promise<number[]> }) { const v = await s.g(); yield [v.length]; " + W + W + "yield [v.length]; };", { twice: ["obs"] }),
  A("h8-kp-action-handle", "const a = () => { " + P + L("t.push(1);") + "return action(() => { p.then((v: number[]) => v.length); }); };"),
  A("h8-kp-async-cell-fn", "const a = async () => { " + P + L("t.push(1);") + "return () => p; };"),
  A("h8-kp-promise-of-fn", "const a = () => { " + P + L("t.push(1);") + "const mk2 = async () => () => p; return { q: mk2() }; };"),
  A("h8-kp-jsx-prop", "const a = () => { " + P + L("t.push(1);") + "return <b data={p}>x</b>; };"),
];
// native Map and Set inside a checked cell (class D): structuredClone, snapshot, groupBy, the Set algebra
const NM = "const m = structuredClone(new Map<string, number>()); ";
const nm: A[] = [
  A("h8-nm-slot", "const a = () => { " + NM + L("m.set(\"k\", 1);") + "return { m }; };\nconst b = (a: { m: Map<string, number> }) => () => a.m.size;"),
  A("h8-nm-yield", "const a = function* () { " + NM + "yield { m }; m.set(\"k\", 1); yield { m: new Map<string, number>() }; };"),
  A("h8-nm-snapshot", "const a = () => { const m = snapshot(new Map<string, number>()); " + L("m.set(\"k\", 1);") + "return { m }; };"),
  A("h8-nm-snapshot-input", "const s = () => new Map<string, number>();\nconst a = (s: Map<string, number>) => { const m = snapshot(s); " + L("m.set(\"k\", 1);") + "return [m]; };"),
  A("h8-nm-nested-clone", "const a = () => { const o = structuredClone({ m: new Map<string, number>() }); " + L("o.m.set(\"k\", 1);") + "return o; };"),
  A("h8-ns-clone", "const a = () => { const s = structuredClone(new Set<number>()); " + L("s.add(1);") + "return { s }; };"),
  A("h8-nm-captured", "const a = () => { " + NM + L("m.set(\"k\", 1);") + "return () => m.size; };"),
  A("h8-nm-groupby", "const a = () => { const m = Map.groupBy([1, 2], (x: number) => x % 2); " + L("m.set(9, []);") + "return { m }; };"),
  A("h8-ns-union", "const a = () => { const s = new Set([1]).union(new Set([2])); " + L("s.add(3);") + "return { s }; };"),
  A("h8-nm-state", "const s = () => { " + NM + L("m.set(\"k\", 1);") + "return state({ m }); };\nconst b = (s: { m: Map<string, number> }) => () => s.m.size;"),
  A("h8-nm-promise-slot", "const a = () => { " + NM + "const mk = async (x: Map<string, number>) => x; " + L("m.set(\"k\", 1);") + "return { p: mk(m) }; };\nconst obs = async function* (a: { p: Promise<Map<string, number>> }) { const v = await a.p; yield [v.size]; " + W + W + "yield [v.size]; };", { twice: ["obs"] }),
];
// rejection reasons (class E): each consumer of one rejection reads one frozen reason
const MKE = "const mk = async (x: Error): Promise<number> => { throw x; }; ";
const CATCH = (get: string) => `{ try { await ${get}; yield "none"; } catch (x) { yield messageOf(x); ${W}${W}yield messageOf(x); } }`;
const rej: A[] = [
  A("h8-rej-slot", "const a = () => { const e = new Error(\"x\"); " + MKE + L("e.message = \"y\";") + "return { p: mk(e) }; };\nconst obs = async function* (a: { p: Promise<number> }) " + CATCH("a.p") + ";", { twice: ["obs"] }),
  A("h8-rej-async-cell", "const a = async () => { const e = new Error(\"x\"); " + L("e.message = \"y\";") + "throw e; };"),
  A("h8-rej-two-consumers", "const a = () => { const e = new Error(\"x\"); " + MKE + L("e.message = \"y\";") + "return { p: mk(e) }; };\nconst b = async (a: { p: Promise<number> }) => { try { await a.p; return [\"none\"]; } catch (x) { return [messageOf(x)]; } };\nconst c = async (a: { p: Promise<number> }) => { try { await a.p; return [\"none\"]; } catch (x) { " + W + W + "return [messageOf(x)]; } };", { show: ["b", "c"] }),
  A("h8-rej-array-reason", "const a = () => { const xs = [0]; const mk = async (x: number[]): Promise<number> => { throw x; }; " + L("xs.push(1);") + "return { p: mk(xs) }; };\nconst obs = async function* (a: { p: Promise<number> }) { try { await a.p; yield \"none\"; } catch (x) { yield JSON.stringify(x); " + W + W + "yield JSON.stringify(x); } };", { twice: ["obs"] }),
  A("h8-rej-yield", "const a = function* () { const e = new Error(\"x\"); " + MKE + "yield { p: mk(e) }; e.message = \"y\"; yield 1; };"),
  A("h8-rej-async-gen-throw", "const a = async function* () { const e = new Error(\"x\"); yield 0; " + L("e.message = \"y\";") + "throw e; };"),
  A("h8-rej-state", "const s = () => { const e = new Error(\"x\"); " + MKE + L("e.message = \"y\";") + "return state({ p: mk(e) }); };\nconst obs = async function* (s: { p: Promise<number> }) " + CATCH("s.p") + ";", { twice: ["obs"] }),
  A("h8-rej-cause", "const a = () => { const xs = [0]; const e = new Error(\"x\"); const mk = async (x: { e: Error; xs: number[] }): Promise<number> => { throw x; }; " + L("xs.push(1);") + "return { p: mk({ e, xs }) }; };"),
];
// action arguments all or nothing, and a match array's indices and groups (class F)
const callW = (p: any) => { try { p.value("w")(); } catch (x) { return "w threw " + (x as Error).message; } };
const fx: A[] = [
  A("h8-act-partial", "const s = () => state(0);\nconst add = (s: State<number>) => action((a: number[], b: Iterable<number>) => { s.set(a.length); });\nconst w = (add: Action<[number[], Iterable<number>]>) => action(() => { const xs = [0]; try { add(xs, [1].values()); } catch (e) { xs.push(1); } });", { drive: callW, show: ["s"] }),
  A("h8-act-two-args", "const s = () => state([0]);\nconst add = (s: State<number[]>) => action((a: number[], b: number[]) => { s.set([...a, ...b]); });\nconst w = (add: Action<[number[], number[]]>) => action(() => { const xs = [0]; const ys = [1]; add(xs, ys); });", { drive: callW, show: ["s"] }),
  A("h8-re-indices", "const a = () => { const m = /(?<g>a)/d.exec(\"ab\"); return { m }; };", { drive: (p: any) => { const m = p.value("a").m as any; return `array ${Object.isFrozen(m)} indices ${Object.isFrozen(m.indices)} ${Object.isFrozen(m.indices[0])} groups ${Object.isFrozen(m.groups)} ${Object.isFrozen(m.indices.groups)}`; } }),
  A("h8-re-match-yield", "const a = function* () { const m = \"ab\".match(/(?<g>a)/d); yield { m }; };", { drive: (p: any) => String(Object.isFrozen((p.value("a") as any)?.m?.groups ?? {})) }),
];
export const attacks: A[] = [...obs, ...isl, ...kp, ...nm, ...rej, ...fx];
