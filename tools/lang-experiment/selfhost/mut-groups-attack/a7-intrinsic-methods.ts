import type { Attack } from "./harness.ts";
// intrinsic members that change their receiver or argument, on a value another cell produced, with no Mut in sight
export const attacks: Attack[] = [
  {
    name: "regexp-test-cross-cell", family: "hidden-intrinsic-state",
    src: `const x = () => /a/g;
const y = (x: RegExp) => [x.test("aa"), x.test("aa")];
const z = (x: RegExp, y: boolean[]) => [x.test("aa"), /a/g.test("aa")];`,
    show: ["y", "z"],
  },
  {
    name: "regexp-replace-resets", family: "hidden-intrinsic-state",
    src: `const x = () => /a/g;
const y = (x: RegExp) => {
  const before = x.test("aa");
  const s = "aa".replace(x, "b");
  const after = x.test("aa");
  return [before, s, after];
};`,
    show: ["y"],
  },
  {
    name: "urlsearchparams-append", family: "unlisted-mutating-method",
    src: `const x = () => new URLSearchParams("a=1");
const y = (x: URLSearchParams) => {
  x.append("b", "2");
  return 0;
};
const z = (x: URLSearchParams, y: number) => x.toString();`,
    show: ["z"],
  },
  {
    name: "urlsearchparams-set-delete-sort", family: "unlisted-mutating-method",
    src: `const x = () => new URLSearchParams("b=1&a=2");
const y = (x: URLSearchParams) => {
  x.set("c", "3");
  x.delete("b");
  x.sort();
  return x.toString();
};`,
    show: ["x", "y"],
  },
  {
    name: "url-searchparams-member", family: "unlisted-mutating-method",
    src: `const x = () => new URL("https://e.com/?a=1");
const y = (x: URL) => {
  x.searchParams.append("b", "2");
  return x.href;
};`,
    show: ["x", "y"],
  },
  {
    name: "arraybuffer-transfer", family: "unlisted-mutating-method",
    src: `const x = () => new ArrayBuffer(8);
const y = (x: ArrayBuffer) => x.transfer().byteLength;
const z = (x: ArrayBuffer, y: number) => x.byteLength;`,
    show: ["y", "z"],
  },
  {
    name: "arraybuffer-resize", family: "unlisted-mutating-method",
    src: `const x = () => new ArrayBuffer(4, { maxByteLength: 8 });
const y = (x: ArrayBuffer) => {
  x.resize(8);
  return x.byteLength;
};`,
    show: ["x", "y"],
  },
  {
    name: "structuredclone-transfer", family: "unlisted-mutating-method",
    src: `const x = () => new ArrayBuffer(8);
const y = (x: ArrayBuffer) => structuredClone(x, { transfer: [x] }).byteLength;
const z = (x: ArrayBuffer, y: number) => x.byteLength;`,
    show: ["y", "z"],
  },
  {
    name: "uint8-setfromhex", family: "unlisted-mutating-method",
    src: `const x = () => new Uint8Array(2);
const y = (x: Uint8Array) => x.setFromHex("ffff").written;`,
    show: ["x", "y"],
  },
  {
    name: "typedarray-set-via-subarray", family: "unlisted-mutating-method",
    src: `const x = () => new Uint8Array(2);
const y = (x: Uint8Array) => {
  const s = mut(x.subarray(0, 2));
  s[0] = 5;
  return 0;
};`,
    show: ["x"],
  },
];
