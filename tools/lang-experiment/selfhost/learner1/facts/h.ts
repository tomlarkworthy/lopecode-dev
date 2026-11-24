// probe helpers: frames delivered by timer during a drive, so listeners run between calls
import { scheduler } from "../../../lite/browser/cells.ts";
// only under drive-rt.ts (its prog has values()): under drive-run.ts the harness's follow() calls every function value it
// meets, actions included, with no arguments, and timer frames turn that into a runaway (q02-clock.out)
export const live = async <X>(f: () => Promise<X>, rt = true): Promise<X> => {
  if (!rt) return f();
  const old = scheduler.frame;
  scheduler.frame = (g: () => void) => void setTimeout(g, 2);
  try { return await f(); } finally { scheduler.frame = old; }
};
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// call action `name` (or a function picked from the value) n times, settling between, then read cells
export const callN = (pick: (p: any) => unknown, n: number, read: string[], args: unknown[] = []) => async (p: any) => live(async () => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = pick(p);
    if (typeof a !== "function") return `no action: ${typeof a} (${read.map((r) => p.status(r)).join(",")})`;
    try { a(...args); } catch (e) { out.push(`call ${i} threw ${(e as Error).message.slice(0, 120)}`); }
    await p.settle(200); await wait(30); await p.settle(200);
  }
  return [...out, ...read.map((r) => `${r}=${JSON.stringify(p.value(r))}${p.status(r) === "rejected" ? " ERR " + p.error(r) : ""}`)].join(" ; ");
}, typeof p.values === "function");
export type Cand = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown; fetchBody?: string };
export const toSrcs = (cs: Cand[]): [string, string][] => cs.map((c) => [c.name, c.src]);
