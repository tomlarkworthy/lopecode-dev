// prelude.runtime.ts action, handleOf
export const mark = () => (f: () => void): void => { Object.defineProperty(f, "x", { value: true }); };
