import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show = ["a"]): Attack => ({ name, src, show });
const XB = "const x = () => new ArrayBuffer(8);\n";
const R = "\nconst r = (x: ArrayBuffer, a: number) => new Float32Array(x.slice(0))[0];";
const mk = (param: string, arg: string, pre = "") => XB + pre + `const a = (x: ArrayBuffer) => {\n  const mk = (src: ${param}) => { const m = mut(new Float32Array(src)); m[0] = 5; return 0; };\n  return mk(${arg});\n};` + R;
export const attacks: Attack[] = [
  A("iterable-given-ab", mk("Iterable<number>", "x"), ["r"]),
  A("iterable-given-ab-via-unknown", mk("Iterable<number>", "x as unknown as Iterable<number>"), ["r"]),
  A("arraylike-given-ab", XB + "const a = (x: ArrayBuffer) => {\n  const mk = (src: { readonly length: number }) => { const m = mut(Array.from(src)); return 0; };\n  return mk(x);\n};", ["a"]),
  A("generic-src", XB + "const a = (x: ArrayBuffer) => {\n  const mk = <S,>(src: S) => { const m = mut(new Float32Array(src)); m[0] = 5; return 0; };\n  return mk(x);\n};" + R, ["r"]),
  A("ta-given-as-iterable", "const x = () => new Float32Array(2);\nconst a = (x: Float32Array) => {\n  const mk = (src: Iterable<number>) => { const m = mut(new Float32Array(src)); m[0] = 5; return 0; };\n  return mk(x);\n};\nconst r = (x: Float32Array, a: number) => x[0];", ["r"]),
  A("object-param-given-ab", XB + "const a = (x: ArrayBuffer) => {\n  const mk = (src: object) => { const m = mut(new Float32Array(src)); m[0] = 5; return 0; };\n  return mk(x);\n};" + R, ["r"]),
  A("byteLength-record-given-ab", XB + "const a = (x: ArrayBuffer) => {\n  const mk = (src: { readonly byteLength: number }) => { const m = mut(new Float32Array(src)); m[0] = 5; return 0; };\n  return mk(x);\n};" + R, ["r"]),
  A("iterable-of-ab-union-narrowed", XB + "const a = (x: ArrayBuffer) => {\n  const v: ArrayBuffer | number[] = x;\n  if (Array.isArray(v)) return 0;\n  const m = mut(new Float32Array(v));\n  m[0] = 5;\n  return 0;\n};" + R, ["r"]),
  A("iterable-via-map-keys", "const a = () => {\n  const s = new Map<number, number>([[1, 2]]);\n  const m = mut(new Float32Array(s.keys()));\n  return freeze(m);\n};"),
];
