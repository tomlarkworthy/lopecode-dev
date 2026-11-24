import { toSrcs, type Cand } from "./h.ts";
const W = (name: string, decl: string, write: string, ret: string, pre = ""): Cand => ({ name, src: `${pre}const a = () => { ${decl} ${write} return ${ret}; };`, show: ["a"] });
export const cands: Cand[] = [
  W("accept-array-annotation", "const xs: number[] = [];", "xs.push(1);", "xs"),
  W("reject-readonly-array-annotation", "const xs: readonly number[] = [];", "xs.push(1);", "xs"),
  W("accept-tuple-annotation", "const t: [number, number] = [0, 0];", "t[0] = 5;", "t"),
  W("accept-record-annotation", "const o: { n: number } = { n: 0 };", "o.n = 2;", "o"),
  W("index-signature-annotation-literal-key", "const o: { [k: string]: number } = {};", `o["x"] = 1;`, "Object.keys(o)"),
  W("index-signature-annotation-runtime-key", "const o: { [k: string]: number } = {}; const k = String(1);", `o[k] = 1;`, "Object.keys(o)"),
  W("Record-annotation", "const o: Record<string, number> = {};", `o["x"] = 1;`, "Object.keys(o)"),
  W("reject-type-alias-annotation", "const xs: Nums = [];", "xs.push(1);", "xs", "type Nums = number[];\n"),
  W("reject-union-annotation", "const xs: number[] | string[] = [];", "xs.push(1);", "xs"),
  W("accept-map-annotation", "const m: Map<string, number> = new Map();", `m.set("a", 1);`, "m.size"),
  W("accept-typed-array-annotation", "const b: Float64Array = new Float64Array(2);", "b[1] = 3;", "b[1] ?? -1"),
  W("accept-unannotated-literal-top-field", "const o = { n: 0, xs: [1] };", "o.n = 1;", "o"),
  W("reject-nested-array-of-fresh-literal", "const o = { n: 0, xs: [1] };", "o.xs.push(2);", "o"),
  W("accept-let-fresh-reassigned", "let xs = [1];", "xs = [...xs, 2]; xs.push(3);", "xs"),
  W("reject-non-fresh-binding", "const src: readonly number[] = [1]; const xs = src;", "xs.push(2);", "xs"),
  W("accept-structuredClone-copy", "const src: readonly number[] = [1]; const xs = structuredClone(src);", "xs.push(2);", "xs"),
];
export const srcs = toSrcs(cands);
