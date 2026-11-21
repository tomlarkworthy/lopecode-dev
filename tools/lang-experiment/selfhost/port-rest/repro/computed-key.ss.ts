// prelude.runtime.ts state: { [STATECELL]: true, initial }
export const state = () => (s: symbol, initial: unknown) => ({ [s]: true, initial });
