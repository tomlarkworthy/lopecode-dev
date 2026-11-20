// Negative control for run-tests.ts (SCHED_BREAK=1): step.ss.ts with every third listener call dropped.
export * from "./step.ss.ts";
export { step as stepOrig } from "./step.ss.ts";
export const step = (stepOrig: any) => {
  let n = 0;
  return (st: any, ev: any) => { const r = stepOrig(st, ev); return { ...r, effects: r.effects.filter((e: any) => e.fx !== "call" || ++n % 3 !== 0) }; };
};
