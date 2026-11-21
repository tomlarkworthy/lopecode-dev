// prelude.runtime.ts snapshot
export const snapshot = () => <T,>(v: T): T => structuredClone(v);
