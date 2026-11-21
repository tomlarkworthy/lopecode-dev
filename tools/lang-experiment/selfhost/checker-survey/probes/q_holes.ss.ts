// checks of the capture rule and identity, met while porting the Checker as one cell of local helpers
export type R = { n: number };
// identity through Array.includes / indexOf (=== on the same objects is rejected)
export const includesIdentity = () => (a: R, b: R): boolean => [a].includes(b);
export const indexOfIdentity = () => (a: R, b: R): number => [a].indexOf(b);
// a local helper that writes a Mut, aliased and passed as a callback
export const aliasHelper = () => (xs: number[]): number => {
  const out: Mut<number[]> = mut([]);
  function add(x: number): void { out.push(x); }
  const f = add;
  xs.forEach(f);
  return out.length;
};
// a local helper that writes a Mut, returned
export const returnHelper = () => (): ((x: number) => void) => {
  const out: Mut<number[]> = mut([]);
  function add(x: number): void { out.push(x); }
  return add;
};
// a local helper that writes a Mut, placed in a record that is returned
export const recordHelper = () => (): { add: (x: number) => void } => {
  const out: Mut<number[]> = mut([]);
  function add(x: number): void { out.push(x); }
  return { add };
};
// a helper that writes a Mut, called by a second helper that is passed as a callback
export const twoLevel = () => (xs: number[]): number => {
  const out: Mut<number[]> = mut([]);
  function add(x: number): void { out.push(x); }
  function both(x: number): void { add(x); add(x); }
  xs.forEach(both);
  return out.length;
};
// a let written by a local helper that is passed as a callback
export const letViaCallback = () => (xs: number[]): number => {
  let n = 0;
  function bump(x: number): void { n += x; }
  xs.forEach(bump);
  return n;
};
