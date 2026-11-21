// What the loop would need and the boundary refuses. Checked by:
// bun ../../rt/check.ts rejected.ss.ts --outside performers,performAsync,performNote
export type Ev = { readonly t: "tick"; readonly n: number };
// a table of performers: a function inside an object (S11.3)
export const viaTable = (performers: { readonly note: (n: number) => void }) => 1;
// an async performer that feeds back: a function as a parameter of a function (S11.3)
export const viaCallback = (performAsync: (n: number, feed: (ev: Ev) => void) => void) => 1;
// the state held between feeds, written by an action that calls a performer (S11.9)
export const held = () => state(0);
export const feed = (held: State<number>, performNote: (n: number) => void) => action((n: number) => { performNote(n); held.set(n); });
