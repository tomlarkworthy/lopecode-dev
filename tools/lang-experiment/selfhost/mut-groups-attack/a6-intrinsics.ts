import type { Attack } from "./harness.ts";
// intrinsics that share storage with their argument, or carry hidden state, accepted as fresh or as reads
export const attacks: Attack[] = [
  {
    name: "typed-array-over-cell-buffer", family: "fresh-intrinsic-shares-storage",
    src: `const x = () => new ArrayBuffer(4);
const y = (x: ArrayBuffer) => {
  const v = mut(new Uint8Array(x));
  v[0] = 7;
  return 0;
};
const z = (x: ArrayBuffer, y: number) => new Uint8Array(x).slice();`,
    show: ["z"],
  },
  {
    name: "typed-array-over-frozen-buffer", family: "fresh-intrinsic-shares-storage",
    src: `const a = () => {
  const t = mut(new Uint8Array(2));
  t[0] = 1;
  const fr = freeze(t);
  const before = fr[0];
  const w = mut(new Uint8Array(fr.buffer));
  w[0] = 9;
  return [before, fr[0]];
};`,
    show: ["a"],
  },
  {
    name: "typed-array-from-cell-typed-array-buffer", family: "fresh-intrinsic-shares-storage",
    src: `const x = () => new Float32Array([1, 2]);
const y = (x: Float32Array) => {
  const w = mut(new Float32Array(x.buffer));
  w[0] = 42;
  return 0;
};`,
    show: ["x"],
  },
  {
    name: "regexp-lastindex", family: "hidden-intrinsic-state",
    src: `const x = () => /a/g;
const y = (x: RegExp) => [x.test("aa"), x.test("aa"), x.test("aa")];`,
    show: ["y"],
  },
  {
    name: "regexp-exec-lastindex", family: "hidden-intrinsic-state",
    src: `const x = () => /a/g;
const y = (x: RegExp) => {
  const first = x.exec("ba");
  const second = x.exec("ba");
  return [first === null, second === null, x.lastIndex];
};`,
    show: ["y"],
  },
];
