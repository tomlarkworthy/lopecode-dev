// a4: type operators and escape routes (q7's rows, each as a program), then the holders q7 accepted, each under P
// (published by s.set in an action, Mut written after)
import { C } from "../freeze-attack3/harness.ts";
import { act } from "./t0.ts";
import { srcs } from "./q7.ts";
const callAll = { drive: async (p: any) => { const v = p.value("a"); if (typeof v !== "function") return "no fn"; try { const r1 = JSON.stringify(v()); const r2 = JSON.stringify(v()); return `${r1 !== r2 ? "DIFF" : "same"} a() ${r1} then ${r2}`; } catch (e) { return `a() threw ${(e as Error).message}`; } } };
const fix = (s: string) => s.replace("<T extends Mut<number[]>>", "<T extends Mut<number[]>,>");
const out: ReturnType<typeof C>[] = srcs.map(([n, s]: [string, string]) => C(`a4-${n}`, fix(s), callAll));
const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const P = (n: string, setup: string, read: string, write: string) => out.push(C(`a4-P-${n}`, ST + `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { ${setup} const f = () => ${read}; s.set(f); lg.set(f()); ${write} }) });`, act()));
P("index-sig", "const xs = [0]; const t: { [k: string]: readonly number[] } = { a: xs };", "t['a']?.length ?? 0", "xs.push(1);");
P("optional-member", "const xs = [0]; const t: { readonly k?: readonly number[] } = { k: xs };", "t.k?.length ?? 0", "xs.push(1);");
P("ternary-ann-readonly", "const xs = [0]; const t: readonly number[] | null = xs.length ? xs : null;", "t ? t.length : 0", "xs.push(1);");
P("iterable-ann", "const xs = [0]; const t: Iterable<number> = xs;", "[...t].length", "xs.push(1);");
P("map-alias", "const xs = [0]; const m = new Map([['k', xs]]); const c: Map<string, readonly number[]> = m;", "c.get('k')?.length ?? 0", "xs.push(1);");
P("unknown", "const xs = [0]; const t: unknown = xs;", "Array.isArray(t) ? t.length : 0", "xs.push(1);");
P("map-alias-set", "const m = new Map<string, number>(); const c: Map<string, number> = m;", "c.size", "m.set('z', 1);");
P("typeof-readonly", "const xs = [0]; const c: readonly number[] = xs; const t: typeof c = c;", "t.length", "xs.push(1);");
P("union-alias", "const xs = [0]; const t: readonly number[] | null = xs;", "t ? t.length : 0", "xs.push(1);");
P("string-key-rec", "const xs = [0]; const t: Record<string, readonly number[]> = { k: xs };", "t['k']?.length ?? 0", "xs.push(1);");
export const cands = out;
