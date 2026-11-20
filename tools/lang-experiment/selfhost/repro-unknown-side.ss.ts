// Two holes beside the unknown class (2026-11-20): a named type with a call signature narrows to never under
// typeof "function"; a closure made in an action body, kept in state, writes when a reader cell calls it.
// bun selfhost/rt/check.ts selfhost/repro-unknown-side.ss.ts
type F = { (x: number): number };
interface G { (x: number): number }
export const neverF = () => (f: F): number => (typeof f === "function" ? f.nope.deeper : 0);
export const neverG = () => (f: G): number => (typeof f === "function" ? f.nope.deeper : 0);
export const n = (): StateCell<number> => state(0);
export const later = (): StateCell<{ readonly go: () => void } | null> => state(null);
export const stash = (n: State<number>, later: State<{ readonly go: () => void } | null>) => action(() => later.set({ go: () => n.set(1) }));
export const reader = (later: { readonly go: () => void } | null) => { later?.go(); return 1; };
