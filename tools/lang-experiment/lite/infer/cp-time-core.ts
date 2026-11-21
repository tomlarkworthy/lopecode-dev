// cp-time.ts's stand-in for ../core.ts as lite/complete.ts imports it: checkSources goes to globalThis.__cpCheck when set
import { checkSources as real, type Sources, type CheckOpts, type LiteResult } from "../core.ts";
export * from "../core.ts";
export const checkSources = (src: Sources, opts: CheckOpts = {}): LiteResult => {
  const f = (globalThis as { __cpCheck?: ((s: Sources, o: CheckOpts) => LiteResult) | null }).__cpCheck;
  return f ? f(src, opts) : real(src, opts);
};
