// D4 (known: selfhost/NOTES-memo-soundness.md §1): object identity is rejected through === and accepted through
// Array.includes and Array.indexOf, which compare with the same identity.
export type R = { n: number };
export const eq = () => (a: R, b: R): boolean => a === b;
export const viaIncludes = () => (a: R, b: R): boolean => [a].includes(b);
export const viaIndexOf = () => (a: R, b: R): boolean => [a].indexOf(b) >= 0;
