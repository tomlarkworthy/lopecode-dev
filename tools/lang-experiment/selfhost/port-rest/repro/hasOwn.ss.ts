// boundary.ts copy, prelude.runtime.ts equals, isStateCell, isAction, isRefHandle: an own property test
export const has = () => (v: object, n: string): boolean => Object.hasOwn(v, n);
