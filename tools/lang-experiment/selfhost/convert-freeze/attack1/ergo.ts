// Ergonomic probes: ordinary programs an author would expect to run. Accepted by the checker; any run-time error is
// reported. (run.ts --set ergo)
const A = (name: string, src: string) => ({ name, src, mech: "ergo" });
export const progs = [
  A("named-callback-accumulator", `const a = () => { const xs = [1, 2]; const out: Mut<number[]> = []; const f = (v: number) => { out.push(v * 2); }; xs.forEach(f); return out.length; };`),
  A("inline-callback-accumulator", `const a = () => { const xs = [1, 2]; const out: Mut<number[]> = []; xs.forEach((v: number) => { out.push(v * 2); }); return out.length; };`),
  A("record-of-helpers", `const a = () => { const out: Mut<number[]> = []; const ops = { add: (v: number) => { out.push(v); } }; ops.add(1); return out.length; };`),
  A("helper-passed-to-user-fn", `const a = () => { const out: Mut<number[]> = []; const each = (f: (v: number) => void) => { f(1); f(2); }; each((v: number) => { out.push(v); }); return out.length; };`),
  A("helper-in-array-called", `const a = () => { const out: Mut<number[]> = []; const steps = [() => { out.push(1); }, () => { out.push(2); }]; for (const s of steps) s(); return out.length; };`),
  A("typed-array-returned", `const a = () => { const b = new Float32Array(2); b[0] = 1; return b; };`),
  A("typed-array-slice-returned", `const a = () => { const b = new Float32Array(2); b[0] = 1; return b.slice(); };`),
  A("view-ctor-fresh-buffer", `const a = () => { const v = new Float32Array(new ArrayBuffer(8)); v[0] = 1; return v[0]; };`),
  A("view-ctor-local-buffer", `const a = () => { const buf = new ArrayBuffer(8); const v = new Uint8Array(buf); v[0] = 1; return v[0]; };`),
  A("map-built-then-summarised", `const a = () => { const m = new Map<string, number>(); m.set("a", 1); const size = () => m.size; m.set("b", 2); return size(); };`),
  A("sort-copy-then-return", `const a = () => { const xs = [3, 1, 2]; const ys = xs.sort(); return ys; };`),
  A("kept-fn-then-write", `const a = () => { const xs = [1]; const f = () => xs.length; xs.push(2); return f; };`),
  A("promise-resolve-then-write", `const a = async () => { const xs = [1]; const p = Promise.resolve(xs); xs.push(2); const v = await p; return v.length; };`),
  A("map-of-map-reads", `const a = () => { const m = new Map<string, number>([["a", 1]]); const n = new Map<string, number>(m); m.set("b", 2); return n.size; };`),
];
