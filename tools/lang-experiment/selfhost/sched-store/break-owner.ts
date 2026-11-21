// Negative control for run-tests.ts (STORE_BREAK=2): a write or read made while no action's function runs goes to the last call.
export * from "./step.ss.ts";
export const ownerOf = () => (st: any) => st.call ?? new Map();
