// a6: generators across yield (S5.6), async across await (S5.7), and the memo route of a2 inside an async cell body
// (which S5.7 lets use a Mut across an await)
import { C } from "../freeze-attack3/harness.ts";
const out: ReturnType<typeof C>[] = [];
const add = (n: string, s: string, x: any = {}) => out.push(C(`a6-${n}`, s, x));
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
const T = "(o: { readonly n: number }) => { readonly n: number }";
const prog = { drive: async (p: any) => { const a = p.value("a"); if (!a || a.length !== 2) return `no pair: ${JSON.stringify(a)}`; return `${a[0] !== a[1] ? "DIFF" : "same"} ${a[0]} then ${a[1]}`; } };
// generators: publish by yield, write after
add("gen-yield-then-write", `const g = function* () { ${SP} yield f; xs.push(1); };`);
add("gen-yield-rec-then-write", `const g = function* () { ${SP} yield { f }; xs.push(1); };`);
add("gen-write-in-loop-next-iter", `const g = function* () { ${SP} for (let k = 0; k < 2; k++) { yield f; } };`);
add("gen-helper-after", `const g = function* () { ${SP} const wr = () => { xs.push(1); }; yield f; wr(); };`);
add("gen-yield-in-write", `const g = function* () { ${SP} xs.push(yield f); };`);
add("gen-try-finally", `const g = function* () { ${SP} try { yield f; } finally { xs.push(1); } };`);
add("gen-param-of-helper", "const g = function* () { const mk = (ys: Mut<number[]>) => { const c: readonly number[] = ys; return () => c.length; }; const xs = [0]; const f = mk(xs); yield f; xs.push(1); };");
add("gen-loop-body-local", "const g = function* () { for (let k = 0; k < 3; k++) { const xs = [k]; const c: readonly number[] = xs; xs.push(k); yield () => c.length; } };", { twice: ["g"] });
add("gen-yield-then-read-only", `const g = function* () { ${SP} yield f; yield c.length; };`);
add("gen-memo-width-across-yield", `const sq = () => memo((o: { readonly n: number }) => o);\nconst g = function* (sq: ${T}) { ${SP} const r = { n: 1, f }; sq(r); yield 1; xs.push(1); };`);
add("asyncgen-yield-then-write", `const g = async function* () { ${SP} yield f; await null; xs.push(1); };`);
// async cells: the body may use a Mut across an await (S5.7)
add("async-write-after-await", `const a = async () => { ${SP} await null; xs.push(1); return f; };`);
add("async-nested-helper", `const a = async () => { const h = async () => { ${SP} await null; xs.push(1); return f(); }; return h(); };`);
add("async-memo-width", `const sq = () => memo((o: { readonly n: number }) => o);\nconst a = async (sq: ${T}) => { ${SP} const r = { n: 1, f }; sq(r); const before = r.f(); await null; xs.push(1); return [before, r.f()] as const; };`, prog);
add("async-memo-width-hit-other", `const sq = () => memo((o: { readonly n: number }) => o);\nconst a = async (sq: ${T}) => { ${SP} const r = { n: 1, f }; const got = sq(r); await null; xs.push(1); return { r, got }; };\nconst b = (sq: ${T}, a: { readonly r: { readonly n: number } }) => sq(a.r);`,
  { drive: async (p: any) => { const b = p.value("b"); return `${b.f() !== 1 ? "DIFF" : "same"} the memo was given r with f() = 1; it now gives ${b.f()}`; } });
add("async-memo-data", `const sq = () => memo((o: readonly number[]) => o.length);\nconst a = async (sq: (o: readonly number[]) => number) => { const xs = [0]; sq(xs); await null; xs.push(1); return xs.length; };`);
add("async-promise-fn", `const a = async () => { ${SP} const p = Promise.resolve(f); xs.push(1); return (await p)(); };`);
add("async-then-cb", `const a = async () => { ${SP} return Promise.resolve(1).then((n) => n + c.length); };`);
add("async-cell-input-fn-called-later", "const k = () => (g: () => number) => g();\nconst a = async (k: (g: () => number) => number) => { const xs = [0]; const c: readonly number[] = xs; const r = k(() => c.length); await null; xs.push(1); return r; };");
// controls (checker skipped)
add("ctl-gen-let", "const g = function* () { let n = 0; const f = () => n; yield f; n = 1; yield 0; };", { ctl: true, twice: ["g"] });
add("ctl-async-memo-direct-mut", `const sq = () => memo((o: { readonly n: number }) => o);\nconst a = async (sq: ${T}) => { const xs = [0]; const f = () => xs.length; const r = { n: 1, f }; sq(r); const before = r.f(); await null; xs.push(1); return [before, r.f()] as const; };`, { ctl: true, ...prog });
export const cands = out;
