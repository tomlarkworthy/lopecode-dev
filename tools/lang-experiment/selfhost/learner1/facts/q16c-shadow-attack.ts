// a local named after a prelude function (only snapshot, mut, freeze, borrow are refused): does the checker take a call
// of the local for the prelude's? b calls what a returns; if a is a plain function that writes n, b writes state
import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "local-action-shadow-write-from-cell", src: `const n = (): StateCell<number> => state(0);
const a = (n: State<number>) => { const action = (f: () => void) => f; return action(() => n.set(7)); };
const b = (a: () => void) => { a(); return 1; };
const seen = (n: number, b: number) => n;`, show: ["n", "b", "seen"] },
  { name: "local-read-shadow-outside-action", src: `const n = (): StateCell<number> => state(5);
const a = (n: State<number>) => { const read = (s: State<number>) => 1; return read(n); };`, show: ["a"] },
  { name: "local-state-shadow-placement", src: `const a = () => { const state = (x: number) => ({ v: x }); const s = state(1); return s.v; };`, show: ["a"] },
];
export const srcs = toSrcs(cands);
