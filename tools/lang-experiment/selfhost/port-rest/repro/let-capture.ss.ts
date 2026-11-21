// prelude.runtime.ts makeClock
export const makeClock = () => () => { let t = 0; return () => (t += 1); };
