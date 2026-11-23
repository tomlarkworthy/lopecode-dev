// f1 (2026-11-23): S4.12, a function made in a body that still runs does not leave it. selfhost/freeze-attack7's seven
// causes, each observed by a second cell: snap is an action of another cell (no arguments) that copies read(s)() into
// the state t between the publish and the write; v = s() and w = t are two more cells, and the drive says DIFF when
// they differ after the one call commits. Before f1 the Q programs were silent with SS_MEASURE_REG=0 (registration
// made the write throw in shipped mode), and the R programs (an object literal's method registration replacing the
// registration of the function a later key or spread put there) were silent in both modes. Since f1 the publish throws
// in both modes (prelude.runtime.ts noBodyFn); a publish the checker sees is [fn-publish] first, so each Q hole is
// taken by a route it does not see (a setter read as a value, a member). By prefix: f1-q Q1-Q6, f1-r R, f1-ok programs
// that must stay accepted and run, f1-ctl controls run without the checker: f1-ctl-dupkey-direct (freeze-attack7's
// b6-ctl-dupkey-direct) and f1-ctl-P fired before f1 (dupkey in both modes, P with SS_MEASURE_REG=0) and fire in
// neither since; f1-ctl-R-memo gives the function to a memoised call (not checked, S2.13), so fires with
// SS_MEASURE_REG=0 only and, in shipped mode, only if a registration replaces another again; f1-ctl-let-return fires
// in both modes (a let one returned function reads and another writes, [let-capture] at check time): it shows the
// drive still fires. f1-q-promise-width (found in f1): a promise in a record given by width defers its value's freeze
// past the body's writes.
type A = { name: string; src: string; ctl?: boolean; drive?: (p: any) => unknown };
const S2 = "const s = () => state<() => number>(() => -1);\nconst t = () => state(-1);\nconst v = (s: () => number) => s();\nconst w = (t: number) => t;\nconst snap = (s: State<() => number>, t: State<number>) => action(() => { t.set(read(s)()); });\n";
const PUT = (b: string) => `const put = (s: State<() => number>, snap: Action<[]>) => ({ go: action(() => { ${b} }) });`;
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
const K = "const k = 1;";
const two = async (p: any) => {
  const g = p.value("put")?.go;
  if (typeof g !== "function") return `no action (${p.status("put")})`;
  try { g(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 100)}`; }
  await p.settle(400);
  const v = p.value("v"), w = p.value("w");
  return `${v !== w ? "DIFF" : "same"} v = s() = ${v}, w = what snap read = ${w}`;
};
const T = (name: string, b: string, ctl = false): A => ({ name, src: S2 + PUT(b), drive: two, ...(ctl ? { ctl } : {}) });
// a memoised call's arguments are frozen on a miss and not checked (S2.13 stores nothing for them): with registration
// the freeze reaches what the function given captures, so the write after it throws; a registration replaced by another
// would freeze the wrong locals. The cell records o.m() before the write and after it
const memoR = (name: string, b: string): A => ({ name, ctl: true, src: `const sq = () => memo((g: () => number) => 0);\nconst a = (sq: (g: () => number) => number) => { ${K} ${SP} ${b} };`,
  drive: async (p: any) => { await p.settle(400); if (p.status("a") === "rejected") return `a threw: ${String(p.error("a")?.message ?? p.error("a")).slice(0, 80)}`; const [x, y] = p.value("a"); return `${x !== y ? "DIFF" : "same"} o.m() = ${x} before the write, ${y} after`; } });
export const attacks: A[] = [
  T("f1-q1-setter-value", `const st = s.set; ${SP} st(f); snap(); xs.push(1);`),
  T("f1-q1-update-value", `const up = s.update; ${SP} up(() => f); snap(); xs.push(1);`),
  T("f1-q2-destructured", `${SP} const { set } = s; set(f); snap(); xs.push(1);`),
  T("f1-q3-computed", `${SP} s['set'](f); snap(); xs.push(1);`),
  T("f1-q4-alias-after", `${SP} const r = { f }; s.set(r.f); snap(); const ys = xs; ys.push(1);`),
  T("f1-q4-cbparam-after", `const st = s.set; ${SP} st(f); snap(); [xs].forEach((y) => { y.push(1); });`),
  T("f1-q5-helper-result", `${SP} const get = () => xs; const r = { f }; s.set(r.f); snap(); get().push(1);`),
  T("f1-q6-callback-twice", `${SP} const r = { f }; [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(r.f); snap(); } });`),
  T("f1-q1-record", `const st = s.set; ${SP} const r = { g: f }; st(r.g); snap(); xs.push(1);`),
  // a promise defers its value's freeze until it settles, after the body's writes (a record field by width)
  { name: "f1-q-promise-width", src: "const s = () => state<{ readonly n: number }>({ n: 0 });\nconst t = () => state(-1);\nconst w = (t: number) => t;\nconst v = (s: { readonly n: number }) => s;\nconst put = (s: State<{ readonly n: number }>, t: State<number>) => ({ go: action(() => { const st = s.set; const ts = t.set; const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, p: Promise.resolve(c) }; st(r); ts(c.length); xs.push(1); }) });",
    drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 100)}`; } await p.settle(400); const x = await p.value("v").p; return `${x.length !== p.value("w") ? "DIFF" : "same"} the promise gives length ${x.length}, w = ${p.value("w")}`; } },
  T("f1-r-dupkey-st", `${K} const st = s.set; ${SP} const o = { m() { return k; }, m: f }; st(o.m); snap(); xs.push(1);`),
  T("f1-r-spread-st", `${K} const st = s.set; ${SP} const r = { m: f }; const o = { m() { return k; }, ...r }; st(o.m); snap(); xs.push(1);`),
  T("f1-r-spread-alias-after", `${K} ${SP} const r = { m: f }; const o = { m() { return k; }, ...r }; s.set(o.m); snap(); const ys = xs; ys.push(1);`),
  // stay accepted and run: a function another cell published, stored by an action (fixtures/lite-game/accept-action-in-state);
  // a function the cell made before it returned, captured by its action (shipped mode stores it; with SS_MEASURE_REG=0
  // nothing marks it published and the write throws: over-rejection in that mode only); data
  { name: "f1-ok-input-fn", src: "const s = () => state<() => number>(() => -1);\nconst three = () => () => 3;\nconst put = (s: State<() => number>, three: () => number) => ({ go: action(() => { s.set(three); }) });\nconst v = (s: () => number) => s();",
    drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 80)}`; } await p.settle(400); return `v = ${p.value("v")}`; } },
  { name: "f1-ok-cell-made", src: "const s = () => state<() => number>(() => -1);\nconst put = (s: State<() => number>) => { const f = () => 3; return { go: action(() => { s.set(f); }) }; };\nconst v = (s: () => number) => s();",
    drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 80)}`; } await p.settle(400); return `v = ${p.value("v")}`; } },
  { name: "f1-ok-data", src: "const s = () => state(-1);\nconst put = (s: State<number>) => ({ go: action(() => { const xs = [0]; xs.push(1); s.set(xs.length); }) });\nconst v = (s: number) => s;",
    drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 80)}`; } await p.settle(400); return `v = ${p.value("v")}`; } },
  T("f1-ctl-dupkey-direct", `${K} ${SP} const o = { m() { return k; }, m: f }; s.set(o.m); snap(); xs.push(1);`, true),
  T("f1-ctl-P", `${SP} s.set(f); snap(); xs.push(1);`, true),
  memoR("f1-ctl-R-memo", "const r = { m: f }; const o = { m() { return k; }, ...r }; sq(o.m); const before = o.m(); xs.push(1); return [before, o.m()] as const;"),
  { name: "f1-ctl-let-return", ctl: true, src: "const a = () => { let n = 1; return { f: () => n, inc: () => { n++; } }; };",
    drive: async (p: any) => { await p.settle(400); const a = p.value("a"); const x = a.f(); try { a.inc(); } catch (e) { return `threw at the write: ${(e as Error).message.slice(0, 80)}`; } return `${x !== a.f() ? "DIFF" : "same"} f() = ${x} then ${a.f()}`; } },
];
