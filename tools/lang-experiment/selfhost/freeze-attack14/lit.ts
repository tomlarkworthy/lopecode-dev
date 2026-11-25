// freeze-attack14 class 1: ++ and -- on a binding or member of a literal type; String.prototype.split with a group
// that does not take part
import { tyRow, callRow, isNum, strArr, isLit, allIdx, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const L = (name: string, src: string, ok: (v: unknown) => boolean) => R.push(tyRow(`l-${name}`, src, ok));
L("inc", `const g = (): 1 => { let b: 1 = 1; b++; return b; };`, isLit(1));
L("preinc", `const g = (): 1 => { let b: 1 = 1; ++b; return b; };`, isLit(1));
L("dec", `const g = (): 1 => { let b: 1 = 1; b--; return b; };`, isLit(1));
L("predec-expr", `const g = (): 0 => { let b: 1 = 1; return --b - 1 === -1 ? 0 : 0; };`, isLit(0));
L("union-inc", `const g = (): 0 | 1 => { let b: 0 | 1 = 1; b++; return b; };`, (v) => v === 0 || v === 1);
L("member-inc", `const g = (): 1 => { const o: { n: 1 } = { n: 1 }; o.n++; return o.n; };`, isLit(1));
L("arr-inc", `const g = (): readonly 1[] => { const xs: 1[] = [1]; xs[0]++; return xs; };`, allIdx((x) => x === 1));
L("tuple-inc", `const g = (): 1 => { const t: [1, 2] = [1, 2]; t[0]++; return t[0]; };`, isLit(1));
L("switch-dead", `const g = (): string => { let b: 1 = 1; b++; switch (b) { case 1: return "one"; } };`, (v) => typeof v === "string");
L("discriminant", `type U = { readonly k: 1; readonly n: number } | { readonly k: 2; readonly s: string };\nconst g = (): string => { const o: { k: 1; n: number } = { k: 1, n: 5 }; o.k++; const u: U = o; return u.k === 2 ? u.s : "n"; };`, (v) => typeof v === "string");
L("record-key", `const g = (): number => { let k: "a" | "b" = "a"; const r = { a: 1, b: 2 }; return r[k]; };`, isNum);
L("bool-lit", `const g = (): true => { let b: true = true; return b; };`, isLit(true));
L("lit-in-loop", `const g = (): 0 => { let b: 0 = 0; for (const i of [1, 2]) b++; return b; };`, isLit(0));
L("lit-cell-reader", `const k = (): 1 => { let b: 1 = 1; b++; return b; };\nconst g = (k: 1): string => (k === 1 ? "one" : "never");`, isLit("one"));
L("lit-helper", `const g = (): 1 => { let b: 1 = 1; const bump = () => { b++; }; bump(); return b; };`, isLit(1));
L("lit-mutparam", `const g = (): 1 => { const o: { n: 1 } = { n: 1 }; const bump = (m: Mut<{ n: 1 }>) => { m.n++; }; bump(o); return o.n; };`, isLit(1));
R.push(callRow("l-state", `const c = (): StateCell<1> => state(1);\nconst g = (c: 1) => c;\nconst b = (c: State<1>) => action(() => { let v: 1 = 1; v++; c.set(v); });`, "b", [], isLit(1)));
// split with a group that does not take part gives undefined elements, typed string[]
const S = (name: string, src: string, ok: (v: unknown) => boolean = strArr) => R.push(tyRow(`s-${name}`, src, ok));
S("split-group", `const g = (): string[] => "ab".split(/(x)?/);`);
S("split-group-upper", `const g = (): string[] => "ab".split(/(x)?/).map((s) => s + "!");`, allIdx((x) => x !== "undefined!"));
S("split-forof", `const g = (): number => { let n = 0; for (const s of "ab".split(/(x)?/)) n = n + (typeof s === "string" ? 0 : 1); return n; };`, isLit(0));
S("split-join", `const g = (): string[] => { const p = "a-b".split(/(-)|(\\+)/); return p; };`);
S("split-regexp-ctor", `const g = (): string[] => "ab".split(new RegExp("(x)?"));`);
S("split-limit", `const g = (): string[] => "abc".split(/(x)?/, 3);`);
S("split-cell-reader", `const k = (): string[] => "ab".split(/(x)?/);\nconst g = (k: readonly string[]): number[] => k.map((s) => (typeof s === "string" ? s.length : -1));`, allIdx((x) => typeof x === "number" && x >= 0));
R.push(tyRow("l-ctl-lit", `const g = (): 1 => 2;`, isLit(1), true));
R.push(tyRow("s-ctl-undef", `const g = (): string[] => ["a", undefined];`, strArr, true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
