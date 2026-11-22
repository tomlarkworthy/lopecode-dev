import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show = ["a"]): Attack => ({ name, src, show });
const X = "const x = () => new Float32Array(2);\n";
const XB = "const x = () => new ArrayBuffer(8);\n";
const RD = "\nconst r = (x: Float32Array) => x;";
export const attacks: Attack[] = [
  A("ta-view-of-cell-buffer", X + "const a = (x: Float32Array) => {\n  const m = mut(new Float32Array(x.buffer));\n  m[0] = 5;\n  return 0;\n};" + RD, ["r", "a"]),
  A("ta-view-of-cell-ab", XB + "const a = (x: ArrayBuffer) => {\n  const m = mut(new Float32Array(x));\n  m[0] = 5;\n  return 0;\n};\nconst r = (x: ArrayBuffer) => new Float32Array(x.slice(0));", ["r"]),
  A("ta-union-overload", XB + "const c = () => true;\nconst a = (x: ArrayBuffer, c: boolean) => {\n  const src: ArrayBuffer | number[] = c ? x : [1, 2];\n  const m = mut(new Float32Array(src));\n  m[0] = 5;\n  return 0;\n};\nconst r = (x: ArrayBuffer, a: number) => new Float32Array(x.slice(0))[0];", ["r"]),
  A("ta-cond-overload", XB + "const c = () => true;\nconst a = (x: ArrayBuffer, c: boolean) => {\n  const m = mut(new Float32Array(c ? x : [1, 2]));\n  m[0] = 5;\n  return 0;\n};\nconst r = (x: ArrayBuffer, a: number) => new Float32Array(x.slice(0))[0];", ["r"]),
  A("ta-iterable-param", XB + "const a = (x: ArrayBuffer) => {\n  const mk = (src: Iterable<number>) => { const m = mut(new Float32Array(src)); m[0] = 5; return 0; };\n  return 0;\n};"),
  A("ta-from-cell-ta-then-write", X + "const a = (x: Float32Array) => {\n  const m = mut(new Float32Array(x));\n  m[0] = 5;\n  return x[0];\n};"),
  A("ta-with-offset-view", XB + "const a = (x: ArrayBuffer) => {\n  const m = mut(new Float32Array(x, 0, 2));\n  m[0] = 5;\n  return 0;\n};"),
  A("ta-view-from-frozen-own", "const a = () => {\n  const b = mut(new Float32Array(2));\n  const fb = freeze(b);\n  const m = mut(new Uint8Array(fb.buffer));\n  m[0] = 7;\n  return [fb[0]];\n};"),
  A("ta-set-from-self-buffer", "const a = () => {\n  const m = mut(new Float32Array(2));\n  m.set(m);\n  return freeze(m);\n};"),
  A("ta-subarray-of-frozen-mut", "const a = () => {\n  const b = mut(new Float32Array(2));\n  const fb = freeze(b);\n  const m = mut(fb.subarray(0));\n  m[0] = 1;\n  return fb;\n};"),
  A("ta-map-fresh-via-cell", X + "const a = (x: Float32Array) => {\n  const m = mut(x.map((v) => v));\n  m[0] = 5;\n  return x[0];\n};"),
  A("ta-ofbuffer-typed-number", XB + "const a = (x: ArrayBuffer) => {\n  const n: number = x.byteLength;\n  const m = mut(new Float32Array(n));\n  return 0;\n};"),
  A("array-from-ta-of-cell", X + "const a = (x: Float32Array) => {\n  const m = mut(Array.from(x));\n  m[0] = 5;\n  return x[0];\n};"),
  A("concat-mut-alias-element", "const a = () => {\n  const m = mut([1]);\n  const c = [0].concat(m);\n  m.push(2);\n  return c;\n};"),
  A("fromEntries-mut-map", "const a = () => {\n  const m = mut(new Map<string, number>([[\"a\", 1]]));\n  const o = Object.fromEntries(m);\n  m.set(\"a\", 2);\n  return o;\n};"),
  A("map-ctor-from-mut-map", "const a = () => {\n  const m = mut(new Map<string, number>([[\"a\", 1]]));\n  const o = new Map(m);\n  m.set(\"a\", 2);\n  return o;\n};"),
  A("set-ctor-from-mut-array", "const a = () => {\n  const m = mut([1]);\n  const o = new Set(m);\n  m.push(2);\n  return o;\n};"),
  A("promise-all-mut", "const a = async () => {\n  const m = mut([Promise.resolve(1)]);\n  const r = await Promise.all(m);\n  return r;\n};"),
  A("mut-fill-with-object", "const a = () => {\n  const m = mut([{ k: 1 }, { k: 2 }]);\n  m.fill({ k: 3 });\n  return freeze(m);\n};"),
  A("mut-fill-with-cell-value", "const x = () => ({ k: 1 });\nconst a = (x: { k: number }) => {\n  const m = mut([x]);\n  return freeze(m);\n};"),
  A("mut-array-of-cell-value-then-reassign", "const x = () => [1];\nconst a = (x: number[]) => {\n  const m = mut([x]);\n  m[0] = [9];\n  return [x, freeze(m)];\n};"),
  A("mut-spread-of-cell-array-of-arrays", "const x = () => [[1]];\nconst a = (x: number[][]) => {\n  const m = mut([...x]);\n  m.push([2]);\n  return x.length;\n};"),
  A("splice-insert-cell-array", "const x = () => [1];\nconst a = (x: number[]) => {\n  const m = mut([[0]]);\n  m.splice(0, 0, x);\n  return freeze(m);\n};"),
  A("forEach-callback-receives-element", "const a = () => {\n  const m = mut(new Map<string, number[]>([[\"a\", [1]]]));\n  m.forEach((v) => { v.push(2); });\n  return 1;\n};"),
  A("map-callback-index-alias", "const a = () => {\n  const m = mut([1]);\n  const r = m.map((v, i) => i);\n  return r;\n};"),
  A("reduce-acc-is-mut", "const a = () => {\n  const m = mut([1]);\n  const r = [1, 2].reduce((acc, v) => acc + v, 0);\n  m.push(r);\n  return freeze(m);\n};"),
  A("reduce-init-mut", "const a = () => {\n  const m = mut([1]);\n  const r = [1, 2].reduce((acc, v) => acc, m);\n  return 1;\n};"),
  A("sort-comparator-writes-self", "const a = () => {\n  const m = mut([3, 1, 2]);\n  m.sort((x, y) => { return x - y; });\n  return freeze(m);\n};"),
  A("find-returns-inner-of-mut-then-shallow-write", "const a = () => {\n  const m = mut([[1]]);\n  const inner = m.find(() => true);\n  m[0] = [5];\n  return inner;\n};"),
  A("for-of-mut-map-entries-then-set", "const a = () => {\n  const m = mut(new Map<string, number>([[\"a\", 1]]));\n  let n = 0;\n  for (const [k, v] of m) { n = n + v; }\n  m.set(\"b\", 2);\n  return n;\n};"),
  A("for-of-mut-values-iter-arg", "const a = () => {\n  const m = mut([1, 2]);\n  let n = 0;\n  for (const v of m.values()) { n = n + v; }\n  return n;\n};"),
  A("for-of-destructure-group-field", "const a = () => {\n  const g = mut({ t: mut([[1]]), n: 0 });\n  for (const [x] of g.t) { g.n = x; }\n  return freeze(g).n;\n};"),
];
