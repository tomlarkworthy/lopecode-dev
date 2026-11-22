// 1b. islands: function-valued outputs that pass [compile-boundary] (Map/Set type arguments are not looked into, unknown,
// nesting deeper than 8), run on the page where the island's functions are not registered
import { C, L, W } from "./harness.ts";
const GO = (outs: string, ins: string, body: string) => `\nconst go = async (compile: Compile) => { const f = compile({ inputs: [${ins.split(",").filter(Boolean).map((s) => JSON.stringify(s)).join(", ")}], refs: [], outputs: [${outs.split(",").map((s) => JSON.stringify(s)).join(", ")}] }); ${body} };`;
const CALLER_ARR = "const xs = [0]; const r = await f({ x: xs }); " + L("xs.push(1);");
const CALLER_TA = "const t = new Uint8Array(2); const r = await f({ x: t }); " + L("t[0] = 1;");
const deep = (inner: string, n: number) => { let s = inner; for (let i = 0; i < n; i++) s = `{ a: ${s} }`; return s; };
const deepV = (inner: string, n: number) => { let s = inner; for (let i = 0; i < n; i++) s = `({ a: ${s} })`; return s; };
export const cands = [
  // arg captured by an island function returned inside a Map
  C("isl-map-fn-arg", "const x = () => [1];\nconst y = (x: number[]) => new Map([[\"g\", () => x.length]]);" + GO("y", "x", CALLER_ARR + "return r.y;")),
  C("isl-set-fn-arg", "const x = () => [1];\nconst y = (x: number[]) => new Set([() => x.length]);" + GO("y", "x", CALLER_ARR + "return r.y;")),
  C("isl-map-fn-arg-typed", "const x = () => new Uint8Array(2);\nconst y = (x: Uint8Array) => new Map([[\"g\", () => x[0]]]);" + GO("y", "x", CALLER_TA + "return r.y;")),
  C("isl-unknown-fn-arg", "const x = () => [1];\nconst y = (x: number[]): unknown => () => x.length;" + GO("y", "x", CALLER_ARR + "return r.y;")),
  C("isl-unknown-rec-fn-arg", "const x = () => [1];\nconst y = (x: number[]): unknown => ({ g: () => x.length });" + GO("y", "x", CALLER_ARR + "return r.y;")),
  C("isl-deep9-fn-arg", "const x = () => [1];\nconst y = (x: number[]): " + deep("() => number", 9) + " => " + deepV("() => x.length", 9) + ";" + GO("y", "x", CALLER_ARR + "return r.y;")),
  C("isl-deep7-fn-arg", "const x = () => [1];\nconst y = (x: number[]): " + deep("() => number", 7) + " => " + deepV("() => x.length", 7) + ";" + GO("y", "x", CALLER_ARR + "return r.y;")),
  // between island cells: an upstream island cell's value is not frozen before a downstream island cell captures it
  C("isl-between-map-fn", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return xs; };\nconst z = (y: number[]) => new Map([[\"g\", () => y.length]]);" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  C("isl-between-unknown", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return xs; };\nconst z = (y: number[]): unknown => () => y.length;" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  C("isl-between-typed-unknown", "const x = () => 1;\nconst y = (x: number) => { const t = new Uint8Array(2); " + L("t[0] = 1;") + "return t; };\nconst z = (y: Uint8Array): unknown => () => y[0];" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  // the caller publishes a record holding the island result, consumer reads it twice
  C("isl-map-fn-consumer", "const x = () => [1];\nconst y = (x: number[]) => new Map([[\"g\", () => x.length]]);" + GO("y", "x", CALLER_ARR + "return r.y;") + "\nconst obs = async function* (go: Map<string, () => number>) { const g = go.get(\"g\"); yield [g ? g() : -1]; " + W + W + "yield [g ? g() : -1]; };", { twice: ["obs"] }),
  // a pool given as runtime: the result crosses by structured clone (functions cannot)
  C("isl-pool-map-fn", "const x = () => [1];\nconst y = (x: number[]) => new Map([[\"g\", () => x.length]]);\nconst go = async (compile: Compile, pool: Pool) => { const f = compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"], options: { runtime: pool } }); const xs = [0]; const r = await f({ x: xs }); return r.y; };"),
  C("isl-pool-typed", "const x = () => 1;\nconst y = (x: number) => { const t = new Uint8Array(2); t[0] = x; return { t }; };\nconst go = async (compile: Compile, pool: Pool) => { const f = compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"], options: { runtime: pool } }); const r = await f({ x: 3 }); return r.y; };"),
];
