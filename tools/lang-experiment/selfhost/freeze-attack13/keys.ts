// freeze-attack13 target 4: records with keys a run time reads by name. (L) a record with length and numeric keys
// given { readonly length: number } (Array.from's array-like overload, elements typed undefined). (K) plain values
// under conversion names, made by Object.fromEntries, JSON.parse, a Map or Object.entries, then converted or copied.
import { tyRow, isNum, isStr, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const undefs = (v: unknown) => Array.isArray(v) && v.every((x) => x === undefined);
const nums = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "number");
// L: Array.from of an array-like whose numeric keys the type forgot
R.push(tyRow("l-literal-local", `const g = () => { const o = { length: 2, 0: "s", 1: "t" }; return Array.from(o); };`, undefs));
R.push(tyRow("l-literal-annot", `const g = () => { const o: { readonly length: number } = { length: 1 }; return Array.from(o); };`, undefs));
R.push(tyRow("l-literal-map-cb", `const g = () => { const o = { length: 1, 0: "s" }; return Array.from(o, (v, i) => v ?? i + 5); };`, nums));
R.push(tyRow("l-param", `const g = () => { const mk = (a: { readonly length: number }) => Array.from(a); const o = { length: 1, 0: "s" }; return mk(o); };`, undefs));
R.push(tyRow("l-cell-input", `const o = () => ({ length: 1, 0: "s" });\nconst g = (o: { readonly length: number }) => Array.from(o);`, undefs));
R.push(tyRow("l-cell-input-cb", `const o = () => ({ length: 1, 0: "s" });\nconst g = (o: { readonly length: number }) => Array.from(o, (v, i) => v ?? i + 5);`, nums));
R.push(tyRow("l-nested-key", `const g = () => { const o = { length: 1, "0": { x: 1 } }; return Array.from(o); };`, undefs));
R.push(tyRow("l-string-key", `const g = () => { const o = { length: 1, ["0"]: 7 }; return Array.from(o); };`, undefs));
R.push(tyRow("l-fe-length", `const g = () => { const o = Object.fromEntries([["length", 1], ["0", 7]]); const n = o["length"] ?? 0; return Array.from({ length: n }); };`, undefs));
R.push(tyRow("l-cast", `const g = () => { const r = cast<{ readonly length: number }>(JSON.parse('{"length": 1, "0": "s"}')); return r.ok ? Array.from(r.value) : []; };`, undefs));
R.push(tyRow("l-array-given", `const g = () => { const o: { readonly length: number } = ["s"]; return Array.from(o); };`, undefs));
R.push(tyRow("l-string-given", `const g = () => { const o: { readonly length: number } = "s"; return Array.from(o); };`, undefs));
R.push(tyRow("l-u8-given", `const g = () => { const o: { readonly length: number } = new Uint8Array([7]); return Array.from(o); };`, undefs));
R.push(tyRow("l-ctl", `const g = () => Array.from({ length: 1, 0: "s" });`, undefs, true));
// K: plain values under conversion names
const NAMES = ["toString", "valueOf", "toJSON", "then", "constructor", "__proto__", "length", "0", "hasOwnProperty", "next", "return", "size"];
const MAKERS: [string, (k: string) => string][] = [
  ["fe", (k) => `Object.fromEntries([[${JSON.stringify(k)}, 5], ["x", 1]])`],
  ["map", (k) => `Object.fromEntries(new Map([[${JSON.stringify(k)}, 5], ["x", 1]]))`],
  ["entries", (k) => `Object.fromEntries(Object.entries(Object.fromEntries([[${JSON.stringify(k)}, 5], ["x", 1]])))`],
];
for (const [mn, mk] of MAKERS) for (const k of NAMES) {
  // a conversion that ignores an own plain value except where the name is called: JSON, await, Object.keys, equals
  R.push(tyRow(`k-${mn}-${k}-json`, `const g = () => JSON.stringify(${mk(k)}).length;`, isNum));
  R.push(tyRow(`k-${mn}-${k}-await`, `const g = async () => { const o = ${mk(k)}; const r = await Promise.resolve(o); return Object.keys(r).length; };`, (v) => v === 2));
  R.push(tyRow(`k-${mn}-${k}-equals`, `const g = () => equals(${mk(k)}, ${mk(k)});`, (v) => v === true));
}
R.push(tyRow("k-jsonparse-proto-cast", `const g = () => { const r = cast<{ readonly x?: number }>(JSON.parse('{"__proto__": {"x": 1}}')); return r.ok ? r.value.x ?? 0 : -1; };`, (v) => v === 0));
R.push(tyRow("k-sc-proto", `const g = () => { const o = Object.fromEntries([["__proto__", 5]]); const c = structuredClone(o); return Object.keys(c).length; };`, (v) => v === 1));
R.push(tyRow("k-usp", `const g = () => { const o = Object.fromEntries([["toString", "a"], ["then", "b"]]); return new URLSearchParams(o).toString(); };`, (v) => v === "toString=a&then=b"));
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
