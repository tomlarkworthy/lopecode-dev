// boundary.ts plain, prelude.runtime.ts equals: the prototype of an object
export const plain = () => (v: object): boolean => { const p = Object.getPrototypeOf(v); return p === null; };
