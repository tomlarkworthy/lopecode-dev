// bun selfhost/typed-imports/freeze.ts: what a value made by a checked cell is at run time. Each producer is a cell
// of @b compiled by the toolchain and run in a Runtime; for its value: whether it is deeply frozen, and whether
// JavaScript (a cell in another language holding the same reference) can change it. Then, for each, whether a
// checked importer that writes it is rejected (the checker's immutability), and the producers the checker refuses.
import { build } from "./rt.ts";
import { checkProgram } from "./ti-link.ts";

const PRODUCERS: [string, string, string][] = [
  // name, cell source in @b, a checked write in @a
  ["obj", "export const obj = () => ({ a: 1, b: { c: 2 } });", "const w = (obj) => {\n  obj.b.c = 3;\n  return 1;\n};"],
  ["arr", "export const arr = () => [1, 2];", "const w = (arr) => {\n  arr.push(3);\n  return 1;\n};"],
  ["map", 'export const map = () => new Map([["a", 1]]);', 'const w = (map) => {\n  map.set("b", 2);\n  return 1;\n};'],
  ["set", "export const set = () => new Set([1]);", "const w = (set) => {\n  set.add(2);\n  return 1;\n};"],
  ["typed", "export const typed = () => new Float64Array(3);", "const w = (typed) => {\n  typed[0] = 1;\n  return 1;\n};"],
  ["regexp", 'export const regexp = () => new RegExp("a", "g");', 'const w = (regexp) => regexp.test("aa");'],
  ["fn", "export const fn = () => (n: number): number => n + 1;", "const w = (fn) => {\n  fn.x = 1;\n  return 1;\n};"],
  ["frozenMut", "export const frozenMut = () => {\n  const m = mut([1]);\n  m.push(2);\n  return freeze(m);\n};", "const w = (frozenMut) => {\n  frozenMut.push(3);\n  return 1;\n};"],
  ["cloned", "export const cloned = (obj) => structuredClone(obj);", "const w = (cloned) => {\n  cloned.a = 5;\n  return 1;\n};"],
  ["parsed", 'export const parsed = () => JSON.parse("{\\"a\\":1}");', "const w = (parsed) => 1;"],
  ["spread", "export const spread = (obj) => ({ ...obj, d: [1] });", "const w = (spread) => {\n  spread.d.push(2);\n  return 1;\n};"],
  ["elem", "export const elem = () => <div class=\"k\">ok</div>;", "const w = (elem) => 1;"],
  ["crossed", "export const crossed = (raw: { readonly a: number; readonly kids: readonly number[] }) => raw;", "const w = (crossed) => 1;"],
  ["stateValue", "export const stateValue = () => state({ a: 1, kids: [1] });", "const w = (stateValue: { readonly a: number }) => 1;"],
];
const REFUSED: [string, string][] = [
  ["a Mut returned", "export const m = () => {\n  const m = mut([1]);\n  return m;\n};"],
  ["a function closing over a Mut", "export const f = () => {\n  const m = mut([1]);\n  return () => m.length;\n};"],
  ["a Mut-typed result", "export const t = (): Mut<number[]> => mut([1]);"],
];

const deepFrozen = (v: unknown, seen = new Set<unknown>()): boolean => {
  if (v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return true;
  seen.add(v);
  if (!Object.isFrozen(v)) return false;
  return Reflect.ownKeys(v as object).every((k) => deepFrozen((v as any)[k], seen));
};
// what JavaScript can do to the value: the first write that succeeds
const jsWrite = (v: any): string => {
  "use strict";
  const tries: [string, () => boolean][] = [
    ["set a property", () => { try { v.__x = 1; return v.__x === 1; } catch { return false; } }],
    ["Map.set", () => v instanceof Map && (Map.prototype.set.call(v, "__x", 1), v.has("__x"))],
    ["Set.add", () => v instanceof Set && (Set.prototype.add.call(v, "__x"), v.has("__x"))],
    ["typed array element", () => ArrayBuffer.isView(v) && ((v as any)[0] = 7, (v as any)[0] === 7)],
    ["RegExp lastIndex", () => v instanceof RegExp && (v.lastIndex = 3, v.lastIndex === 3)],
    ["nested property", () => { try { const k = Object.keys(v).find((x) => v[x] && typeof v[x] === "object"); if (!k) return false; v[k].__y = 1; return v[k].__y === 1; } catch { return false; } }],
  ];
  const hit = tries.find(([, f]) => f());
  return hit ? hit[0] : "none";
};

const bCells = PRODUCERS.map((p) => p[1]).join("\n");
const b = build([{ name: "@b", cells: bCells, js: { raw: [[], () => ({ a: 1, kids: [1, 2], extra: true })] } }], "typed");
const check = checkProgram([{ name: "@b", cells: bCells, outside: [{ name: "raw", view: false }], imports: [] }]);
console.log("| producer | status in @b | deeply frozen at run time | JavaScript can | a checked importer's write |");
console.log("|---|---|---|---|---|");
for (const [name, , write] of PRODUCERS) {
  const st = check.modules.get("@b")!.result.cells.find((c) => c.name === name);
  let v: unknown, frozen = "-", js = "-";
  try { v = await b.value("@b", name); frozen = String(deepFrozen(v)); js = jsWrite(v); } catch (e) { frozen = `threw ${(e as Error).message}`; }
  const P = checkProgram([{ name: "@b", cells: bCells, outside: [{ name: "raw", view: false }], imports: [] }, { name: "@a", cells: write, outside: [], imports: [{ local: name, imported: name, from: "@b", view: false }] }]);
  const w = P.modules.get("@a")!.result.cells.find((c) => c.name === "w")!;
  console.log(`| ${name} | ${st?.status} | ${frozen} | ${js} | ${w.status}${w.errors.length ? " " + [...new Set(w.errors.map((e) => e.rule))].join(",") : ""}${w.blockedBy.length ? " by " + w.blockedBy : ""} |`);
}
console.log("\n| refused producer | verdict |\n|---|---|");
for (const [what, src] of REFUSED) {
  const P = checkProgram([{ name: "@b", cells: src, outside: [], imports: [] }]);
  console.log(`| ${what} | ${P.modules.get("@b")!.result.cells.map((c) => `${c.status} ${c.errors.map((e) => `[${e.rule}] ${e.msg}`).join("; ")}`).join(" ")} |`);
}
// the regexp's test result depends on which importer ran before: two checked cells, one value
const order = build([{ name: "@b", cells: 'export const re = () => new RegExp("a", "g");' }, { name: "@a", cells: 'const t1 = (re) => re.test("a");\nconst t2 = (re) => re.test("a");', imports: [{ local: "re", imported: "re", from: "@b" } as any] }], "typed");
const t1 = await order.value("@a", "t1"), t2 = await order.value("@a", "t2");
console.log(`\nregexp shared by reference: t1 = ${t1}, t2 = ${t2} (the same call on the same value, run one after the other)`);
console.log(`errors: ${JSON.stringify([...b.errors, ...order.errors])}`);
