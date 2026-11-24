// freeze-attack11 E: a nested function narrows a let/parameter; the declaring function writes it in some form (t1's
// E-1 rule asks whether the declaring function assigns it). tyRow: g must be a number.
import { tyRow, type Cand } from "../freeze-attack9/lib9.ts";
const R: Cand[] = [];
const num = (v: unknown) => typeof v === "number" && !Number.isNaN(v);
const N = (b: string) => `const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); ${b}; return await p;`;
const AG = (b: string) => `const g = async () => { ${b} };`;
const LET = `let r: number | string = 1; `;
const writes: [string, string][] = [
  // "plain" (r = "s") is t1-e-await-outer-write-typeof, not repeated
  ["plus-assign", `r += "s"`],
  ["nullish-assign", `r ??= "s"`],
  ["or-assign", `r ||= "s"`],
  ["and-assign", `r &&= "s"`],
  ["array-destr", `[r] = ["s"]`],
  ["object-destr", `({ r } = { r: "s" })`],
  ["object-destr-rename", `({ v: r } = { v: "s" })`],
  ["array-destr-default", `[r = "s"] = []`],
  ["array-rest", `const q: (number | string)[] = []; [, ...q] = [1]; [r] = ["s"]`],
  ["for-of", `for (r of ["s"]) {}`],
  ["for-in", `for (r in { s: 1 }) {}`],
  ["ternary-in-expr", `const t = (r = "s")`],
  ["comma", `(0, (r = "s"))`],
  ["in-call-arg", `String((r = "s"))`],
  ["in-if-test", `if ((r = "s")) {}`],
  ["in-template", `const t = \`\${(r = "s")}\``],
  ["in-short-circuit", `const t = true && (r = "s")`],
  ["in-array-literal", `const t = [(r = "s")]`],
  ["in-object-literal", `const t = { a: (r = "s") }`],
  ["after-label", `out: { r = "s"; break out; }`],
  ["in-switch", `switch (1) { case 1: r = "s"; }`],
  ["in-try", `try { r = "s"; } finally {}`],
  ["in-catch", `try { throw 1; } catch { r = "s"; }`],
  ["in-while", `let i = 0; while (i++ < 1) r = "s"`],
  ["in-do", `do { r = "s"; } while (false)`],
  ["in-for-update", `for (let i = 0; i < 1; i++, r = "s") {}`],
  ["in-for-init", `for (r = "s"; false; ) {}`],
];
for (const [n, w] of writes) R.push(tyRow(`e-w-${n}`, AG(LET + N(w)), num));
// binders other than a plain let
R.push(tyRow("e-b-param-destr", AG(`const f = async ({ r }: { readonly r: number | string }) => { ${N(`r = "s"`)} }; return await f({ r: 1 });`), num));
R.push(tyRow("e-b-param-arr-destr", AG(`const f = async ([r]: readonly (number | string)[]) => { ${N(`r = "s"`)} }; return await f([1]);`), num));
R.push(tyRow("e-b-param-default", AG(`const f = async (r: number | string = 1) => { ${N(`r = "s"`)} }; return await f();`), num));
R.push(tyRow("e-b-let-destr", AG(`let { r } = { r: 1 as number | string }; ${N(`r = "s"`)}`), num));
R.push(tyRow("e-b-let-destr-typed", AG(`const src: { readonly r: number | string } = { r: 1 }; let { r } = src; ${N(`r = "s"`)}`), num));
R.push(tyRow("e-b-let-arr-destr", AG(`const src: readonly (number | string)[] = [1]; let [r = 0] = src; ${N(`r = "s"`)}`), num));
R.push(tyRow("e-b-catch-param", AG(`try { throw 1; } catch (r) { const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p; } return 0;`), num));
R.push(tyRow("e-b-for-let", AG(`const ps: Promise<number>[] = []; for (let r: number | string = 1; typeof r === "number"; r = "s") { ps.push((async () => { if (typeof r === "number") { await null; return r + 1; } return 0; })()); r = "t"; } const xs = await Promise.all(ps); return xs[0] ?? 0;`), num));
R.push(tyRow("e-b-for-of-let", AG(`const ps: Promise<number>[] = []; for (let r of [1 as number | string]) { ps.push((async () => { if (typeof r === "number") { await null; return r + 1; } return 0; })()); r = "s"; } const xs = await Promise.all(ps); return xs[0] ?? 0;`), num));
R.push(tyRow("e-b-fn-decl", AG(`let r: number | string = 1; async function get() { if (typeof r === "number") { await null; return r + 1; } return 0; } const p = get(); r = "s"; return await p;`), num));
R.push(tyRow("e-b-fn-expr-named", AG(`let r: number | string = 1; const get = async function k() { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p;`), num));
R.push(tyRow("e-b-method", AG(`let r: number | string = 1; const o = { async m() { if (typeof r === "number") { await null; return r + 1; } return 0; } }; const p = o.m(); r = "s"; return await p;`), num));
R.push(tyRow("e-b-getter", `const g = () => { let r: number | string = 1; const o = { get v() { return typeof r === "number" ? r + 1 : 0; } }; r = "s"; return o.v; };`, num));
R.push(tyRow("e-b-map-promise-all", AG(`${LET}const ps = [1, 2].map(async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }); r = "s"; const xs = await Promise.all(ps); return (xs[0] ?? 0) + (xs[1] ?? 0);`), num));
R.push(tyRow("e-b-cell-param", `const r = () => 1 as number | string;\nconst g = async (r: number | string) => { ${N(`r = "s"`)} };`, num));
R.push(tyRow("e-b-default-reads-later", `const g = () => { let r: number | string = 1; const f = (k = typeof r === "number" ? () => (r as number) + 1 : () => 0) => k; const k = f(); r = "s"; return 0; };`, num));
// the declaring function's own narrowing, "as before"
R.push(tyRow("e-d-loop-backedge", AG(`${LET}let t = 0; for (let i = 0; i < 2; i++) { if (i === 1) { t = t + (typeof r === "number" ? 0 : 100); } if (typeof r === "number") { await null; t = t + r; r = "s"; } } return t;`), num));
R.push(tyRow("e-d-while-narrow-write", AG(`${LET}let t = 0; let i = 0; if (typeof r === "number") { while (i < 2) { i++; t = t + r; r = "s"; } } return t;`), num));
R.push(tyRow("e-d-do-narrow-write", `const g = () => { let r: number | string = 1; let t = 0; let i = 0; if (typeof r === "number") { do { t = t + r; r = "s"; i++; } while (i < 2); } return t; };`, num));
R.push(tyRow("e-d-for-narrow-write", `const g = () => { let r: number | string = 1; let t = 0; if (typeof r === "number") { for (let i = 0; i < 2; i++) { t = t + r; r = "s"; } } return t; };`, num));
R.push(tyRow("e-d-for-of-narrow-write", `const g = () => { let r: number | string = 1; let t = 0; if (typeof r === "number") { for (const k of [1, 2]) { t = t + r * k; r = "s"; } } return t; };`, num));
R.push(tyRow("e-d-continue", `const g = () => { let r: number | string = 1; let t = 0; for (let i = 0; i < 2; i++) { if (typeof r !== "number") continue; t = t + r; r = "s"; } return t; };`, num));
R.push(tyRow("e-d-label-break", `const g = () => { let r: number | string = 1; let t = 0; if (typeof r === "number") { out: for (let i = 0; i < 2; i++) { for (let j = 0; j < 2; j++) { t = t + r; if (j === 0) { r = "s"; continue out; } } } } return t; };`, num));
R.push(tyRow("e-d-switch-fall", `const g = () => { let r: number | string = 1; let t = 0; const k = 1 as number; if (typeof r === "number") { switch (k) { case 1: r = "s"; case 2: t = t + r; } } return t; };`, num));
R.push(tyRow("e-d-try-finally", `const g = () => { let r: number | string = 1; let t = 0; if (typeof r === "number") { try { r = "s"; throw 1; } catch { } finally { t = t + r; } } return t; };`, num));
R.push(tyRow("e-d-try-catch", `const g = () => { let r: number | string = 1; let t = 0; if (typeof r === "number") { try { r = "s"; JSON.parse("{"); r = 2; } catch { t = t + r; } } return t; };`, num));
R.push(tyRow("e-d-gen-yield", `const k = function* () { let r: number | string = 1; if (typeof r === "number") { yield 0; yield r + 1; } };\nconst g = () => 1;`, num));
R.push(tyRow("e-d-await-in-cond", AG(`${LET}const t = typeof r === "number" ? (await null, r + 1) : 0; return t;`), num));
R.push(tyRow("e-d-short-circuit-write", `const g = () => { let r: number | string = 1; if (typeof r === "number" && ((r = "s"), true)) return r + 1; return 0; };`, num));
R.push(tyRow("e-d-assign-in-cond-call", `const g = () => { let r: number | string = 1; const t = typeof r === "number" ? [(r = "s"), r][1] : 0; return typeof t === "number" ? t : -1; };`, num));
R.push(tyRow("e-d-narrow-in-arg", `const g = () => { let r: number | string = 1; const two = (a: number, b: number | string) => a; return typeof r === "number" ? two(r, (r = "s")) + 1 : 0; };`, num));
R.push(tyRow("e-d-narrow-then-write-in-arg", `const g = () => { let r: number | string = 1; const two = (b: number | string, a: number) => a; return typeof r === "number" ? two((r = "s"), r) : 0; };`, num));
R.push(tyRow("e-d-destr-narrow", `const g = () => { let r: number | string = 1; if (typeof r === "number") { [r] = ["s"]; return r + 1; } return 0; };`, num));
R.push(tyRow("e-d-forof-narrow", `const g = () => { let r: number | string = 1; if (typeof r === "number") { for (r of ["s"]) {} return r + 1; } return 0; };`, num));
R.push(tyRow("e-d-obj-destr-narrow", `const g = () => { let r: number | string = 1; if (typeof r === "number") { ({ r } = { r: "s" }); return r + 1; } return 0; };`, num));
R.push(tyRow("e-d-logical-narrow", `const g = () => { let r: number | string | null = 1; if (typeof r === "number") { r ||= "s"; r &&= "s"; return r + 1; } return 0; };`, num));
R.push(tyRow("e-d-nested-call-narrow", `const g = () => { let r: number | string = 1; const read = () => 0; if (typeof r === "number") { read(); return r + 1; } return 0; };`, num));
R.push(tyRow("e-d-update-expr", `const g = () => { let r: number | string = 1; if (typeof r === "number") { r++; return r + 1; } return 0; };`, num));
R.push(tyRow("e-ctl-w-array-destr", AG(LET + N(`[r] = ["s"]`)), num, true));
export const cands = R;
