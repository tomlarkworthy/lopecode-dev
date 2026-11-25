// freeze-attack14 class 1: an async function whose body can reach its end with a Promise<T> result type, T without
// undefined; a record spread over another whose type forgot a member by width; one key named twice in a type
import { tyRow, isNum, isStr, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const A = (name: string, src: string, ok: (v: unknown) => boolean = isNum) => R.push(tyRow(`a-${name}`, src, ok));
A("empty", `const g = async (): Promise<number> => { };`);
A("if", `const k = () => 1;\nconst g = async (k: number): Promise<number> => { if (k > 5) return 1; };`);
A("while-break", `const g = async (): Promise<number> => { while (true) { break; } };`);
A("await-only", `const g = async (): Promise<number> => { await null; };`);
A("fn-decl", `async function g(): Promise<number> { }`);
A("nested", `const g = async (): Promise<number> => { const f = async (): Promise<string> => { }; const s = await f(); return typeof s === "string" ? 1 : 99; };`, isLit(1));
A("nested-length", `const g = async (): Promise<string> => { const f = async (): Promise<string> => { }; const s = await f(); return s + "!"; };`, (v) => v !== "undefined!");
A("method", `const g = async (): Promise<string> => { const o = { async m(): Promise<string> { } }; const s = await o.m(); return typeof s; };`, isLit("string"));
A("cell-reader", `const k = async (): Promise<number> => { };\nconst g = (k: number): string => typeof k;`, isLit("number"));
A("record", `const g = async (): Promise<{ readonly n: number }> => { };`, (v) => typeof v === "object" && v !== null);
A("arr", `const g = async (): Promise<readonly number[]> => { if (1 > 2) return [1]; };`, (v) => Array.isArray(v));
A("then", `const g = async (): Promise<number> => { const f = async (): Promise<number> => { }; return f().then((n) => n + 1); };`, (v) => typeof v === "number" && !Number.isNaN(v));
A("promise-all", `const g = async (): Promise<readonly number[]> => { const f = async (): Promise<number> => { }; return Promise.all([f(), f()]); };`, (v) => Array.isArray(v) && v.every((x) => typeof x === "number"));
A("switch", `const k = (): 1 | 2 => 2;\nconst g = async (k: 1 | 2): Promise<number> => { switch (k) { case 1: return 1; } };`);
A("try", `const g = async (): Promise<number> => { try { return JSON.parse("{") === 1 ? 1 : 2; } catch (e) { } };`);
A("expr-arrow-cb", `const g = async (): Promise<number> => { const xs = await Promise.all([1].map(async (x): Promise<number> => { if (x > 1) return x; })); return xs[0] ?? 0; };`);
A("state", `const c = (): StateCell<number> => state(0);\nconst f = () => async (): Promise<number> => { };\nconst g = async (f: () => Promise<number>): Promise<number> => (await f()) ?? 5;`);
A("noannot-generic", `const g = async (): Promise<number> => { const w = async <T,>(x: T): Promise<T> => { if (x === x) { } }; return w(1); };`);
// S: a spread puts back a member that a width step forgot, over a member written before it
const S = (name: string, src: string, ok: (v: unknown) => boolean = isNum) => R.push(tyRow(`w-${name}`, src, ok));
S("spread-override", `const g = (): number => { const o = { a: 1, b: "s" }; const r: { readonly a: number } = o; const s = { b: 5, ...r }; return s.b; };`);
S("spread-override-inline", `const g = (): number => { const o = { a: 1, b: "s" }; const r: { readonly a: number } = o; return { b: 5, ...r }.b; };`);
S("spread-cell-input", `const k = () => ({ a: 1, b: "s" });\nconst g = (k: { readonly a: number }): number => ({ b: 5, ...k }).b;`);
S("spread-length", `const g = (): number => { const o = { a: 1, length: "s" }; const r: { readonly a: number } = o; return { length: 5, ...r }.length; };`);
S("spread-fn-member", `const g = (): number => { const o = { a: 1, f: 7 }; const r: { readonly a: number } = o; const s = { f: () => 5, ...r }; return typeof s.f === "function" ? 1 : 99; };`, isLit(1));
S("spread-published", `const g = (): { readonly a: number; readonly b: number } => { const o = { a: 1, b: "s" }; const r: { readonly a: number } = o; return { b: 5, ...r }; };`, (v: any) => typeof v?.b === "number");
S("spread-param", `const g = (): number => { const f = (r: { readonly a: number }) => ({ b: 5, ...r }).b; return f({ a: 1, b: "s" }); };`);
S("spread-param2", `const g = (): number => { const f = (r: { readonly a: number }) => ({ b: 5, ...r }).b; const o = { a: 1, b: "s" }; return f(o); };`);
S("spread-union", `const g = (): number => { const o = { a: 1, b: "s" }; const r: { readonly a: number } | { readonly a: string } = o; return { b: 5, ...r }.b; };`);
S("spread-generic", `const g = (): number => { const over = <T,>(r: T) => ({ b: 5, ...r }); const o = { a: 1, b: "s" }; const r: { readonly a: number } = o; return over(r).b; };`);
S("spread-nested", `const g = (): number => { const o = { a: { b: "s", c: 1 } }; const r: { readonly a: { readonly c: number } } = o; return { b: 5, ...r.a }.b; };`);
S("spread-state", `const c = (): StateCell<{ readonly a: number; readonly b: string }> => state({ a: 1, b: "s" });\nconst g = (c: { readonly a: number }): number => ({ b: 5, ...c }).b;`);
S("spread-arr-el", `const g = (): number => { const xs = [{ a: 1, b: "s" }]; const r: readonly { readonly a: number }[] = xs; return r.map((x) => ({ b: 5, ...x }))[0]?.b ?? 0; };`);
// K: a type with two members that name one key
const K = (name: string, src: string, ok: (v: unknown) => boolean) => R.push(tyRow(`k-${name}`, src, ok));
K("num-str", `type R = { readonly 1: string; readonly "1": number };\nconst g = (): string => { const r: R = { 1: "a", "1": 5 }; return r[1]; };`, isStr);
K("num-str2", `type R = { readonly 1: string; readonly "1": number };\nconst g = (): number => { const r: R = { "1": 5, 1: "a" }; return r["1"]; };`, isNum);
K("hex", `type R = { readonly 0x1: string; readonly 1: number };\nconst g = (): string => { const r: R = { 0x1: "a", 1: 5 }; return r[0x1]; };`, isStr);
K("exp", `type R = { readonly 1e0: string; readonly 1: number };\nconst g = (): string => { const r: R = { 1e0: "a", 1: 5 }; return r[1e0]; };`, isStr);
K("str-id", `type R = { readonly a: string; readonly "a": number };\nconst g = (): string => { const r: R = { a: "a", "a": 5 }; return r.a; };`, isStr);
R.push(tyRow("a-ctl-undef", `const g = (): number => undefined;`, isNum, true));
R.push(tyRow("w-ctl-str", `const g = (): number => "s";`, isNum, true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
