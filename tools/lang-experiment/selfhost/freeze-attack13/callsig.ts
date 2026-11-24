// freeze-attack13 target 3: call-signature types with members. Each row gives a function value a type with a call
// signature that declares a member typed number, then reads the member; DIFF when it is not a number.
import { tyRow, isNum, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const MEMBERS = ["length", "name", "prototype", "arguments", "caller", "apply", "bind", "call", "tag", "preconnect", "displayName", "0", "islands", "description"];
// [source name, the cell's parameters, the call signature, the expression of the function]
const SOURCES: [string, string, string, string][] = [
  ["arrow", "", "(x: number): number", "(x: number) => x"],
  ["fnexpr", "", "(x: number): number", "function (x: number) { return x; }"],
  ["memo", "", "(x: number): number", "memo((x: number) => x)"],
  ["async", "", "(x: number): Promise<number>", "async (x: number) => x"],
  ["now", "now: Clock", "(): number", "now"],
  ["random", "random: Random", "(): number", "random"],
  ["log", "log: Log", "(...a: unknown[]): void", "log"],
];
for (const [sn, params, sig, expr] of SOURCES) for (const m of MEMBERS) {
  const key = /^\d/.test(m) ? m : m;
  R.push(tyRow(`cs-${sn}-${m}`, `interface F { ${sig}; readonly ${key}?: number }\nconst g = (${params}) => { const f: F = ${expr}; return f[${JSON.stringify(m)}] ?? 0; };`, isNum));
}
// other forms: an alias, a parameter, a kept cell, a record member, an array element, a generic, a union
const M = "name";
R.push(tyRow("cs-alias", `type F = { (x: number): number; readonly ${M}?: number };\nconst g = () => { const f: F = (x: number) => x; return f.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-alias-tag", `type F = { (x: number): number; readonly tag?: number };\nconst g = () => { const f: F = (x: number) => x; return f.tag ?? 0; };`, isNum));
R.push(tyRow("cs-param", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const use = (f: F) => f.${M} ?? 0; return use((x: number) => x); };`, isNum));
R.push(tyRow("cs-kept", `interface F { (x: number): number; readonly ${M}?: number }\nconst k = (): F => (x: number) => x;\nconst g = (k: F) => k.${M} ?? 0;`, isNum));
R.push(tyRow("cs-member", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const o: { readonly f: F } = { f: (x: number) => x }; return o.f.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-array", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const fs: readonly F[] = [(x: number) => x]; return fs[0]?.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-union", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const f: F | number = (x: number) => x; return typeof f === "number" ? f : f.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-ternary", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const f: F = Math.max(1) > 0 ? (x: number) => x : (x: number) => x + 1; return f.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-map-value", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const m = new Map<string, F>([["a", (x: number) => x]]); return m.get("a")?.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-generic", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const id = <T,>(x: T): T => x; const f: F = id((x: number) => x); return f.${M} ?? 0; };`, isNum));
R.push(tyRow("cs-default", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const use = (f: F = (x: number) => x) => f.${M} ?? 0; return use(); };`, isNum));
R.push(tyRow("cs-return", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const mk = (): F => (x: number) => x; return mk().${M} ?? 0; };`, isNum));
R.push(tyRow("cs-absorb-unknown", `interface F { (x: number): number; readonly ${M}?: number }\nconst g = () => { const one: unknown = 1; const xs = [one, (x: number) => x]; const u = xs[1]; return typeof u === "function" ? 1 : 0; };`, isNum));
// a call-signature value read through its declared member when the source type declared it (accepted: the declared type holds)
R.push(tyRow("cs-own-declared-held", `interface F { (x: number): number; readonly tag?: string }\nconst g = () => { const f: F = (x: number) => x; return (f.tag ?? "n").length; };`, isNum));
// controls (checker skipped): the detector sees a function's own member typed number
R.push(tyRow("cs-ctl-name", `interface F { (x: number): number; readonly name?: number }\nconst g = () => { const f: F = (x: number) => x; return f.name ?? 0; };`, isNum, true));
R.push(tyRow("cs-ctl-apply", `interface F { (x: number): number; readonly apply?: number }\nconst g = () => { const f: F = (x: number) => x; return f.apply ?? 0; };`, isNum, true));
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
