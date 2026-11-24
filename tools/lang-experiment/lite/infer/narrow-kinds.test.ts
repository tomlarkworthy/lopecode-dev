// Unit probes for a kind test (typeof, Array.isArray, a truth test) over a union with a record that may hold a value
// of the tested kind (ixAdmits): the record stays, so the narrowed value is not usable as the narrow type.
// Run: bun lite/infer/narrow-kinds.test.ts
import { checkSources } from "../core.ts";

let pass = 0, fail = 0;
const FN = "((n: number) => string)";
const verdict = (src: string): string => {
  const cells = checkSources({ cells: "const f = () => (s: string): number => s.length;\n" + src, tsx: false }).cells;
  const k = cells.find((c) => c.name === "k");
  return k ? `${k.status}${k.errors.map((e) => ` [${e.rule}]`).join("")}` : "missing";
};
const expect = (name: string, src: string, want: "ok" | "rejected") => {
  const got = verdict(src);
  if (got.startsWith(want)) { pass++; console.log(`pass ${name}: ${got}`); } else { fail++; console.log(`FAIL ${name}: ${got}, expected ${want}`); }
};

const holders: [string, string, string][] = [
  ["{}", "", "{}"], ["{ a?: number }", "", "{ a?: number }"], ["interface E {}", "interface E {}\n", "E"], ["type E = {}", "type E = {};\n", "E"],
  ["{} | null", "", "{} | null"], ["{} | number", "", "{} | number"],
];
const tests: [string, string][] = [
  ["=== function", `typeof y === "function" ? y(3) : ""`],
  ["else of !== function", `typeof y !== "function" ? "" : y(3)`],
  ["else of === object", `typeof y === "object" ? "" : y(3)`],
  ["switch case function", `(() => { switch (typeof y) { case "function": return y(3); default: return ""; } })()`],
  ["&& function", `(typeof y === "function" && y(3)) || ""`],
];
for (const [l, pre, H] of holders) for (const [tl, t] of tests)
  expect(`${l} | fn, ${tl}`, `${pre}const k = (f: (s: string) => number) => { const x: ${H} = f; const y: ${H} | ${FN} = x; return ${t}; };`, "rejected");
expect("{ readonly a: number } | fn (a callable G with a), === function", `interface G { (s: string): number; readonly a: number }\nconst k = () => (g: G) => { const x: { readonly a: number } = g; const y: { readonly a: number } | ${FN} = x; return typeof y === "function" ? y(3) : ""; };`, "rejected");
expect("({} | fn)[] element, === function", `const k = (f: (s: string) => number) => { const b: ({} | ${FN})[] = [f]; return typeof b[0] === "function" ? b[0](3) : ""; };`, "rejected");
expect("{ p: {} | fn }, === function on p", `const k = (f: (s: string) => number) => { const b: { p: {} | ${FN} } = { p: f }; return typeof b.p === "function" ? b.p(3) : ""; };`, "rejected");
expect("{} | 'a', typeof string", `const k = () => { const x: {} = "b"; const y: {} | "a" = x; if (typeof y !== "string") return ""; const z: "a" = y; return z; };`, "rejected");
expect("{} | 1, typeof number", `const k = () => { const x: {} = 2; const y: {} | 1 = x; if (typeof y !== "number") return 1; const z: 1 = y; return z; };`, "rejected");
expect("{} | number[], Array.isArray", `const k = () => { const x: {} = ["s"]; const y: {} | number[] = x; return Array.isArray(y) ? (y[0] ?? 0) + 1 : 0; };`, "rejected");
expect("T | number[], Array.isArray", `const k = () => <T,>(x: T): number => { const y: T | number[] = x; return Array.isArray(y) ? (y[0] ?? 0) + 1 : 0; };`, "rejected");
expect("{} | null, falsy", `const k = () => { const x: {} = 0; const y: {} | null = x; if (y) return null; const z: null = y; return z; };`, "rejected");
expect("{} | 0, falsy", `const k = () => { const x: {} = ""; const y: {} | 0 = x; if (y) return 0; const z: 0 = y; return z; };`, "rejected");

const N = "type N = { readonly n: number };\n";
expect("control: N | string, typeof string", `${N}const k = () => (v: N | string): number => (typeof v === "string" ? v.length : v.n);`, "ok");
expect("control: N | number[], Array.isArray", `${N}const k = () => (v: N | number[]): number => (Array.isArray(v) ? v.length : v.n);`, "ok");
expect("control: N | null, truth test", `${N}const k = () => (v: N | null): number => (v ? v.n : 0);`, "ok");
// w1 (2026-11-24): {} no longer takes a function (the forgetting rule), so this control is refused where x is bound
expect("control: {} | fn, else of === function", `const k = (f: (s: string) => number) => { const x: {} = f; const y: {} | ${FN} = x; return typeof y !== "function" ? 0 : 1; };`, "rejected [forgets]");
expect("control: G | number, === function", `interface G { (x: number): number }\nconst k = () => (g: G | number): number => (typeof g === "function" ? g(1) : g);`, "ok");
// holes step 9: a callable reaches a call-less record only if it has no required member and no index, so N holds no
// function and the value-or-thunk idiom checks again (it was the cost row, rejected)
expect("control: N | (() => N), === function (value or thunk)", `${N}const k = () => (v: N | (() => N)): number => (typeof v === "function" ? v() : v).n;`, "ok");
expect("control: N | string, === object", `${N}const k = () => (v: N | string): number => (typeof v === "object" ? v.n : v.length);`, "ok");
expect("G to { readonly a: number } (a callable to a record with a required member)", `interface G { (s: string): number; readonly a: number }\nconst k = () => (g: G) => { const x: { readonly a: number } = g; return x; };`, "rejected");
expect("a function to { length: number }", `const k = () => (f: (s: string) => number) => { const x: { readonly length: number } = f; return x; };`, "rejected");
expect("a function to { [k: string]: unknown }", `const k = () => (f: (s: string) => number) => { const x: { [k: string]: unknown } = f; return x; };`, "rejected");

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
