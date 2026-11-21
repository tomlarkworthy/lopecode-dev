// uses: ast, types
// Questions before porting: can open recursion be tied by a knot cell, and can working tables be passed as Mut.
export type Ctr = { n: number };
export type Recur = { ev: (st: Ctr, x: number) => { st: Ctr; v: number } };
// 1. open recursion: the cell takes R and calls R.ev; it does not take a cell that takes it
export const evPure = () => (R: Recur, st: Ctr, x: number): { st: Ctr; v: number } => {
  if (x <= 0) return { st: { n: st.n + 1 }, v: 0 };
  const r = R.ev(st, x - 1);
  return { st: { n: r.st.n + 1 }, v: r.v + x };
};
// 1a. knot with a local function declaration naming R before R is declared
export const knotA = (evPure) => {
  function ev(st: Ctr, x: number): { st: Ctr; v: number } { return evPure(R, st, x); }
  const R: Recur = { ev };
  return R;
};
// 1b. knot as a function returning the record, built on each call
export const knotB = (evPure) => {
  function R(): Recur { return { ev: (st: Ctr, x: number) => evPure(R(), st, x) }; }
  return R();
};
// 2. working tables passed as Mut parameters (events.ss.ts style)
export type W = { types: Mut<Map<number, string>>; diags: Mut<string[]>; ctr: Mut<{ next: number }> };
export type RecurW = { ev: (w: W, x: number) => number };
export const evW = () => (R: RecurW, w: W, x: number): number => {
  w.ctr.next += 1;
  w.types.set(x, "seen");
  if (x <= 0) { w.diags.push("bottom"); return 0; }
  return R.ev(w, x - 1) + x;
};
export const knotW = (evW) => (x: number): { types: Map<number, string>; diags: string[]; next: number } => {
  function ev(w: W, y: number): number { return evW(R(), w, y); }
  function R(): RecurW { return { ev }; }
  const types: Mut<Map<number, string>> = mut(new Map()), diags: Mut<string[]> = mut([]), ctr = mut({ next: 0 });
  const w: W = { types, diags, ctr };
  ev(w, x);
  return { types: freeze(w.types), diags: freeze(w.diags), next: w.ctr.next };
};
// 3. Mut tables as separate parameters, no record
export type RecurM = { ev: (types: Mut<Map<number, string>>, x: number) => number };
export const evM = () => (R: RecurM, types: Mut<Map<number, string>>, x: number): number => {
  types.set(x, "seen");
  return x <= 0 ? 0 : R.ev(types, x - 1) + x;
};
export const knotM = (evM) => (x: number): Map<number, string> => {
  function ev(types: Mut<Map<number, string>>, y: number): number { return evM(R(), types, y); }
  function R(): RecurM { return { ev }; }
  const types = mut(new Map<number, string>());
  ev(types, x);
  return freeze(types);
};
// 1c. knot: the record first, then the annotated (hoisted) function that names it
export const knotC = (evPure) => {
  const R: Recur = { ev };
  function ev(st: Ctr, x: number): { st: Ctr; v: number } { return evPure(R, st, x); }
  return R;
};
// 4. rollback of a Mut array by length, and a field of a Mut record holding a Map reassigned
export type Ctl = { flow: Map<string, number>; n: number };
export const rollback = () => (diags: Mut<string[]>, ctl: Mut<Ctl>): number => {
  const d = diags.length;
  diags.push("x");
  diags.length = d;
  const saved = ctl.flow;
  ctl.flow = new Map([["a", 1]]);
  ctl.n += 1;
  ctl.flow = saved;
  return diags.length;
};
// 5. a knot local function capturing a Mut, placed in the record ([mut-capture] expected)
export const knotCapture = (evM) => (x: number): number => {
  const types = mut(new Map<number, string>());
  function ev(t: Mut<Map<number, string>>, y: number): number { return evM(R(), types, y); }
  function R(): RecurM { return { ev }; }
  return ev(types, x);
};
// 6. [[T, true], [F, false]] as const over two local Mut maps
export const pairLoop = () => (m: Map<string, number>): number => {
  const T = mut(new Map(m)), F = mut(new Map(m));
  for (const [M, br] of [[T, true], [F, false]] as const) M.set("k", br ? 1 : 0);
  return T.size + F.size;
};
