// 1. compile(...) islands run on the page (runHere): the island's text is erased (no closure registration, native
// Map), its cells' values are not frozen between island cells, its arguments are the caller's objects.
import { C, L, W } from "./harness.ts";
const GO = (outs: string, ins = "x", body = "") => `\nconst go = async (compile: Compile) => { const f = compile({ inputs: [${ins.split(",").filter(Boolean).map((s) => JSON.stringify(s)).join(", ")}], refs: [], outputs: [${outs.split(",").map((s) => JSON.stringify(s)).join(", ")}] }); ${body} };`;
export const cands = [
  C("isl-basic", "const x = () => 1;\nconst y = (x: number) => [x, 2];" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  C("isl-fn-out-captures-local", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return () => xs.length; };" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  C("isl-fn-out-in-rec", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return { g: () => xs.length }; };" + GO("y", "x", "const r = await f({ x: 3 }); return r;")),
  C("isl-fn-out-sync", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; return { g: () => xs.length, xs }; };" + GO("y", "x", "const r = await f({ x: 3 }); return r;")),
  C("isl-arg-captured", "const x = () => [1];\nconst y = (x: number[]) => () => x.length;" + GO("y", "x", "const xs = [0]; const r = await f({ x: xs }); " + L("xs.push(1);") + "return r.y;")),
  C("isl-arg-typed-captured", "const x = () => new Uint8Array(2);\nconst y = (x: Uint8Array) => () => x[0];" + GO("y", "x", "const t = new Uint8Array(2); const r = await f({ x: t }); " + L("t[0] = 1;") + "return r.y;")),
  C("isl-arg-identity", "const x = () => [1];\nconst y = (x: number[]) => ({ v: x });" + GO("y", "x", "const xs = [0]; const r = await f({ x: xs }); " + L("xs.push(1);") + "return r.y;")),
  C("isl-arg-typed-identity", "const x = () => new Uint8Array(2);\nconst y = (x: Uint8Array) => ({ v: x });" + GO("y", "x", "const t = new Uint8Array(2); const r = await f({ x: t }); " + L("t[0] = 1;") + "return r.y;")),
  C("isl-between-cells", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return xs; };\nconst z = (y: number[]) => () => y.length;" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  C("isl-between-cells-map", "const x = () => 1;\nconst y = (x: number) => { const m = new Map([[\"k\", x]]); " + L("m.set(\"j\", 2);") + "return m; };\nconst z = (y: Map<string, number>) => () => y.size;" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  C("isl-between-cells-url", "const x = () => 1;\nconst y = (x: number) => { const u = new URL(\"https://x.test/a\"); " + L("u.pathname = \"/b\";") + "return u; };\nconst z = (y: URL) => () => y.href;" + GO("z", "x", "const r = await f({ x: 3 }); return r.z;")),
  C("isl-native-map-out", "const x = () => 1;\nconst y = (x: number) => { const m = new Map([[\"k\", x]]); " + L("m.set(\"j\", 2);") + "return m; };" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  C("isl-url-out", "const x = () => 1;\nconst y = (x: number) => { const u = new URL(\"https://x.test/a\"); " + L("u.pathname = \"/b\";") + "return { u }; };" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  C("isl-error-out", "const x = () => 1;\nconst y = (x: number) => { const e = new Error(\"a\"); " + L("e.message = \"b\";") + "return { e }; };" + GO("y", "x", "const r = await f({ x: 3 }); return r.y;")),
  C("isl-sync-go", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; " + L("xs.push(1);") + "return () => xs.length; };\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });\nconst use = async (go: (a: { x: number }) => Promise<{ y: () => number }>) => { const r = await go({ x: 3 }); return r.y; };"),
  C("isl-ref", "const x = () => 1;\nconst k = () => [5];\nconst y = (x: number, k: number[]) => () => k.length + x;\nconst go = async (compile: Compile) => { const f = compile({ inputs: [\"x\"], refs: [\"k\"], outputs: [\"y\"] }); const r = await f({ x: 3 }); return r.y; };"),
];
