// Negative control for run-tests.ts (STORE_BREAK=1): a top-level call that throws keeps its writes.
export * from "./step.ss.ts";
export { onExit as onExitOrig } from "./step.ss.ts";
export const onExit = (onExitOrig: any) => (st: any, threw: boolean, value: unknown) => onExitOrig(st, false, threw ? undefined : value);
