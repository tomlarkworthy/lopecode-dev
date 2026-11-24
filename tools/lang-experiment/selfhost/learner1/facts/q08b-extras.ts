import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "replace-with-function", src: `const a = () => "abc".replace(/b/, (m: string) => m.toUpperCase());` },
  { name: "accept-object-freeze-literal", src: `const a = () => Object.freeze({ n: 1 }).n;`, show: ["a"] },
  { name: "reject-object-freeze-existing", src: `const a = () => { const o = { n: 1 }; return Object.freeze(o).n; };` },
  { name: "object-assign-empty", src: `const a = () => Object.assign({}, { n: 1 });` },
  { name: "accept-pad-fixed-locale", src: `const a = () => [(3.14159).toFixed(2).padStart(8, "."), "x".padEnd(3, "-"), ["b", "a"].toSorted((x, y) => x.localeCompare(y)).join("")].join("|");`, show: ["a"] },
  { name: "accept-regexp-test-match", src: `const a = () => { const re = /^(\\d+)-(\\d+)$/; const m = "12-34".match(re); return [re.test("1-2"), m === null ? -1 : m.length, Number.isInteger(4)]; };`, show: ["a"] },
  { name: "accept-toSorted-stable", src: `const a = () => [{ k: 1, v: "a" }, { k: 0, v: "b" }, { k: 1, v: "c" }, { k: 0, v: "d" }].toSorted((x, y) => x.k - y.k).map((x) => x.v).join("");`, show: ["a"] },
  { name: "accept-flatMap-includes-charAt", src: `const a = () => [[1, 2], [3]].flatMap((x) => x).includes(3) && "abc".charAt(1) === "b";`, show: ["a"] },
  { name: "accept-big-number", src: `const a = () => { let x = 0; let y = 1; for (let i = 0; i < 50; i++) { const t = x + y; x = y; y = t; } return x; };`, show: ["a"] },
  { name: "accept-global-functions", src: `const a = () => [String(1), Number("2"), Boolean(0), isNaN(1), isFinite(1), parseInt("7", 10), parseFloat("1.5"), encodeURIComponent("a b"), decodeURIComponent("a%20b"), encodeURI("a b"), decodeURI("a%20b"), btoa("hi"), atob("aGk="), structuredClone([1]).length, typeof BigInt(3)].join(",");`, show: ["a"] },
  ...["Float32Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array"].map((T) => ({ name: `accept-typed-array-${T}`, src: `const a = () => { const b = new ${T}([1, 2, 3]); b.fill(4, 0, 1); return [b.length, b.subarray(1).length, b.toSorted().join(","), ${T}.from([5]).length, ${T}.of(6).length]; };`, show: ["a"] })),
  { name: "absent-String-fromCharCode", src: `const a = () => String.fromCharCode(65);` },
  { name: "absent-new-Array-n", src: `const a = () => new Array(3).length;` },
  { name: "absent-toLocaleUpperCase", src: `const a = () => "a".toLocaleUpperCase();` },
  { name: "absent-Number-toLocaleString-call", src: `const a = () => (1234.5).toLocaleString();` },
];
export const srcs = toSrcs(cands);
