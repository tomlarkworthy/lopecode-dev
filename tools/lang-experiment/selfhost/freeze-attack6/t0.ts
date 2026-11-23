import { C } from "../freeze-attack3/harness.ts";
// drive: call the action, settle, compare what the state was given (lg, recorded inside the action before the write)
// with what the consumer cell v's function gives now
export const act = (cell = "put", key = "go", holder = "v", given = "w", call = (h: any) => (typeof h === "function" ? h() : h.f ? h.f() : h[0]())) => ({ drive: async (p: any) => {
  const a = p.value(cell); const g = typeof a === "function" ? a : a[key];
  try { g(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; }
  await p.settle(400);
  const h = p.value(holder), w = p.value(given);
  let now: unknown; try { now = call(h); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `${JSON.stringify(now) !== JSON.stringify(w) ? "DIFF" : "same"} given ${JSON.stringify(w)} holds ${JSON.stringify(now)}`;
} });
const S = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
export const cands = [
  C("t0-set-push", S + "const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }) });", act()),
  C("t0-ctl-let", S + "const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { let n = 1; const f = () => n; s.set(f); lg.set(f()); n = 2; }) });", { ...act(), ctl: true }),
];
