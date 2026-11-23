import { C } from "../freeze-attack3/harness.ts";
// A: round 7's Q1 action form (s.set read before the Mut is declared, so S4.11 sees no point before the write; the
// checker accepts it). Shipped: S4.12 throws at st(F). With SS_MEASURE_BODYFN=0 (S4.12 off) only the freeze of F's
// captures can stop the write: a registration gap makes it silent. Measurement of a gap S4.12 masks, not shipped.
export const A = (pre: string, form: string) => `const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; const st = s.set; ${pre} ${form} st(F); ls(F()); xs.push(1); }) });`;
export const driveA = async (p: any) => {
  const a = p.value("put");
  if (!a || typeof a.go !== "function") return `no action (${p.status("put")} ${String(p.error?.("put") ?? "").slice(0, 100)})`;
  try { a.go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 140)}`; }
  await p.settle(300);
  const h = p.value("v"), w = p.value("w");
  let now: unknown; try { now = h(); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  if (now === -1) return `same: holder not written`;
  return `${JSON.stringify(now) !== JSON.stringify(w) ? "DIFF" : "same"} given (lg, recorded in the body) ${JSON.stringify(w)} holds ${JSON.stringify(now)}`;
};
export { C };
