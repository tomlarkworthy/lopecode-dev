// 4. sc- a store channel: a function leaves an async cell before it ends (through another cell's store, which needs a
// Mut in a record field: the known root), then the async cell's own body writes what it reads (S5.7 allows it);
// lp- loops with Mut accumulators; jx- JSX props and children; cap- more capability readers; fr- more FetchResponse.
import { C, W } from "../freeze-attack3/harness.ts";
const STORE = "const reg = () => { const box: { readonly l: Mut<(() => number)[]> } = { l: [] }; return { add: (f?: () => number) => { if (f) box.l.push(f); return 0; }, all: () => box.l.map((f) => f()) }; };\n";
const RT = "{ add: (f?: () => number) => number; all: () => number[] }";
export const cands = [
  C("sc-async-body", STORE + `const a = async (reg: ${RT}) => { const xs = [0]; const c0: readonly number[] = xs; reg.add(() => c0.length); await null; xs.push(1); ${W}xs.push(2); return 0; };`),
  C("sc-gen", STORE + `const a = function* (reg: ${RT}) { for (const k of [0, 1]) { const xs = [k]; const c0: readonly number[] = xs; reg.add(() => c0.length); xs.push(1); yield k; } };`),
  C("sc-sync", STORE + `const a = (reg: ${RT}) => { const xs = [0]; const c0: readonly number[] = xs; reg.add(() => c0.length); xs.push(1); return 0; };`),
  C("sc-direct-record", STORE + `const a = (reg: ${RT}) => { const o = { n: 0 }; const c0: { readonly n: number } = o; reg.add(() => c0.n); o.n = 5; return 0; };`),
  C("sc-map", STORE + `const a = (reg: ${RT}) => { const m = new Map<string, number>(); const c0: Map<string, number> = m; reg.add(() => c0.size); m.set("k", 1); return 0; };`),
  C("sc-async-map", STORE + `const a = async (reg: ${RT}) => { const m = new Map<string, number>(); const c0: Map<string, number> = m; reg.add(() => c0.size); await null; m.set("k", 1); return 0; };`),
  // lp-: loops, accumulator annotated Mut
  C("lp-let-i", "const a = () => { const fs: Mut<(() => number)[]> = []; for (let i = 0; i < 2; i++) fs.push(() => i); return fs; };"),
  C("lp-const-of", "const a = () => { const fs: Mut<(() => number)[]> = []; for (const x of [1, 2]) fs.push(() => x); return fs; };"),
  C("lp-const-copy", "const a = () => { const fs: Mut<(() => number)[]> = []; for (let i = 0; i < 2; i++) { const j = i; fs.push(() => j); } return fs; };"),
  C("lp-mut-elem", "const a = () => { const rows = [[0], [1]]; const fs: Mut<(() => number)[]> = []; for (const row of rows) fs.push(() => row.length); return fs; };"),
  C("lp-nested-mut-elem", "const a = () => { const rows: Mut<number[]>[] = [[0], [1]]; const fs: Mut<(() => Mut<number[]>)[]> = []; for (const row of rows) fs.push(() => row); return fs; };\nconst c = (a: (() => Mut<number[]>)[]) => { const f = a[0]; if (f) f().push(1); return 0; };"),
  C("lp-row-write-after", "const a = () => { const rows = [[0], [1]]; const fs: Mut<(() => number)[]> = []; for (const row of rows) fs.push(() => row.length); return { fs, rows }; };"),
  // jx-: JSX
  C("jx-children-array", "const a = () => { const xs = [<span>a</span>]; return <div>{xs}</div>; };"),
  C("jx-children-then-push", "const a = () => { const xs = [<span>a</span>]; const el = <div>{xs}</div>; xs.push(<span>b</span>); return el; };"),
  C("jx-action-prop", "const s = () => state(0);\nconst a = (s: State<number>) => <button onClick={action(() => s.update((n) => n + 1))}>+</button>;"),
  C("jx-kept-in-gen", "const a = function* () { for (const k of [0, 1]) yield <div>{k}</div>; };"),
  // cap-
  C("cap-fetch-fn", "const a = (fetch: Fetch) => async () => (await fetch(\"https://x.test/\")).status;", { fetchBody: "b" }),
  C("cap-now-in-record", "const a = (now: Clock) => ({ t: () => now() });"),
  C("cap-random-stored", "const a = (random: Random) => { const f = () => random(); return [f]; };"),
  // fr-
  C("fr-ok-status", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => [r.ok, r.status];\nconst c = async (r: FetchResponse) => await r.text();", { fetchBody: "b" }),
  C("fr-gen-reader-race", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => { " + W + "return await r.text(); };\nconst c = async (r: FetchResponse) => { try { return await r.text(); } catch (e) { return \"used\"; } };", { fetchBody: "b", show: ["b", "c"] }),
];
