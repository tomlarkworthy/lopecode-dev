// a2: memo (S2.13-S2.14). A record bound to a local reaches a parameter { readonly n: number } by width, so a function
// rides in a memo argument past [memo-pure]; the argument is published on the miss, then the caller writes the Mut
// that the function's read-only capture names. b calls the memoised function again with the same key (a hit).
import { C } from "../freeze-attack3/harness.ts";
const T = "(o: { readonly n: number }) => { readonly n: number }";
const cmp = (given = "a", holder = "b") => ({ drive: async (p: any) => { const a = p.value(given), b = p.value(holder); const now = typeof b === "function" ? b() : b; return `${JSON.stringify(a.before) !== JSON.stringify(now) ? "DIFF" : "same"} given ${JSON.stringify(a.before)} holds ${JSON.stringify(now)}`; } });
type H = { id: string; setup: string; read: string; write: string };
const H: H[] = [
  { id: "arr", setup: "const xs = [0]; const c: readonly number[] = xs;", read: "c.length", write: "xs.push(1);" },
  { id: "map", setup: "const m = new Map<string, number>(); const c: Map<string, number> = m;", read: "c.size", write: "m.set('k', 1);" },
  { id: "set", setup: "const st = new Set<number>(); const c: Set<number> = st;", read: "c.size", write: "st.add(1);" },
  { id: "rec", setup: "const o = { n: 1 }; const c: { readonly n: number } = o;", read: "c.n", write: "o.n = 7;" },
  { id: "err", setup: "const e = new Error('x'); const c: Error = e;", read: "c.message.length", write: "e.message = 'longer';" },
];
const out: ReturnType<typeof C>[] = [];
for (const h of H) {
  const mk = `const r = { n: 1, f: () => ${h.read} };`;
  // the memoised function returns its argument; another cell's call with the same key gets it from the store
  // the program itself observes: what f gave right after the memo took r, and what it gives after the write
  out.push(C(`a2-prog-${h.id}`, `const sq = () => memo((o: { readonly n: number }) => o);\nconst a = (sq: ${T}) => { ${h.setup} ${mk} sq(r); const before = r.f(); ${h.write} return [before, r.f()] as const; };`,
    { drive: async (p: any) => { const a = p.value("a"); return `${a[0] !== a[1] ? "DIFF" : "same"} after the memo took r: ${a[0]}, later: ${a[1]}`; } }));
  out.push(C(`a2-cross-hit-${h.id}`, `const sq = () => memo((o: { readonly n: number }) => o);\nconst a = (sq: ${T}) => { ${h.setup} ${mk} sq(r); const before = r.f(); ${h.write} return { before, r }; };\nconst b = (sq: ${T}, a: { readonly before: number; readonly r: { readonly n: number } }) => sq(a.r);`,
    { drive: async (p: any) => { const a = p.value("a"), b = p.value("b"); const now = b.f(); return `${a.before !== now ? "DIFF" : "same"} given ${a.before} holds ${now}`; } }));
  // the memoised function wraps its argument in its result
  out.push(C(`a2-wrap-${h.id}`, `const sq = () => memo((o: { readonly n: number }) => ({ o }));\nconst a = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { ${h.setup} ${mk} const res = sq(r); const before = r.f(); ${h.write} return { before, res }; };`,
    { drive: async (p: any) => { const a = p.value("a"); const now = a.res.o.f(); return `${a.before !== now ? "DIFF" : "same"} given ${a.before} holds ${now}`; } }));
  // same cell: memo bound locally
  out.push(C(`a2-local-${h.id}`, `const a = () => { const sq = memo((o: { readonly n: number }) => o); ${h.setup} ${mk} const got = sq(r); const before = r.f(); ${h.write} return { before, got, sq }; };`,
    { drive: async (p: any) => { const a = p.value("a"); const now = a.got.f(); return `${a.before !== now ? "DIFF" : "same"} given ${a.before} holds ${now}`; } }));
  // data only: the argument is frozen in place, so the later write throws (both modes)
  out.push(C(`a2-data-${h.id}`, `const sq = () => memo((o: { readonly n: number }) => o.n);\nconst a = (sq: (o: { readonly n: number }) => number) => { ${h.setup} const r = { n: 1, c }; sq(r); ${h.write} return 0; };`, cmp()));
}
// R-M blind spots named in S2.13, with data: each should throw at the write
out.push(C("a2-rm-second-name", "const a = () => { const sq = memo((xs: readonly number[]) => xs.length); const m = [1]; const m2 = m; sq(m2); m.push(2); return m.length; };"));
out.push(C("a2-rm-field", "const a = () => { const sq = memo((r: { readonly t: readonly number[] }) => r.t.length); const m = [1]; sq({ t: m }); m.push(2); return m.length; };"));
out.push(C("a2-rm-input", "const sq = () => memo((xs: readonly number[]) => xs.length);\nconst a = (sq: (xs: readonly number[]) => number) => { const m = [1]; sq(m); m.push(2); return m.length; };"));
out.push(C("a2-rm-unann-input", "const sq = () => memo((xs: readonly number[]) => xs.length);\nconst a = (sq) => { const m = [1]; sq(m); m.push(2); return m.length; };"));
out.push(C("a2-rm-loop", "const a = () => { const sq = memo((xs: readonly number[]) => xs.length); const m = [1]; let t = 0; for (let i = 0; i < 2; i++) { t += sq(m); } return t; };"));
// memo result function capturing a fresh local of f; f writes before returning (accepted, not a publish)
out.push(C("a2-result-fn", "const sq = () => memo((n: number) => { const xs = [n]; const c: readonly number[] = xs; xs.push(1); return () => c.length; });\nconst b = (sq: (n: number) => () => number) => sq(1);\nconst c = (sq: (n: number) => () => number) => sq(1);"));
// memo inside an action: argument published mid-body
out.push(C("a2-in-action", "const s = () => state<{ readonly n: number }>({ n: 0 });\nconst sq = () => memo((o: { readonly n: number }) => o);\nconst put = (s: State<{ readonly n: number }>, sq: (o: { readonly n: number }) => { readonly n: number }) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; s.set(sq(r)); xs.push(1); }) });\nconst v = (s: { readonly n: number }) => s;",
  { drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } await p.settle(400); const now = p.value("v").f(); return `${now !== 1 ? "DIFF" : "same"} given 1 holds ${now}`; } }));
// memo key is a function-holding record: hit with the same record from two cells
out.push(C("a2-key-shared", "const k = () => { const r = { n: 1, f: () => 3 }; return r; };\nconst sq = () => memo((o: { readonly n: number }) => o.n + 1);\nconst b = (sq: (o: { readonly n: number }) => number, k: { readonly n: number }) => sq(k);\nconst c = (sq: (o: { readonly n: number }) => number, k: { readonly n: number }) => sq(k);"));
// controls: checker skipped; memo f captures a let / a Mut directly (m1's), and the width row with a let
out.push(C("a2-ctl-memo-let", "const a = () => { let k = 1; const f = memo((n: number) => n + k); const r1 = f(1); k = 2; return { before: r1, f }; };\nconst b = (a: any) => () => a.f(2);", { ctl: true, ...cmp() }));
out.push(C("a2-ctl-width-mut", `const sq = () => memo((o: { readonly n: number }) => o);\nconst a = (sq: ${T}) => { const xs = [0]; const r = { n: 1, f: () => xs.length }; sq(r); const before = r.f(); xs.push(1); return { before, r }; };\nconst b = (sq: ${T}, a: any) => () => (sq(a.r) as any).f();`, { ctl: true, ...cmp() }));
export const cands = out;
