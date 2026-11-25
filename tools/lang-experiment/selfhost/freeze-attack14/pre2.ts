// freeze-attack14 class 4: a shadowing local used where the prelude name is special. Silent when the checker gives the
// call the prelude's meaning (type, purity, freeze) and the local does something else
import { tyRow, callRow, isNum, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const isFn = (v: unknown) => typeof v === "function";
R.push(tyRow("p2-action-not-fn", `const g = () => { const action = (f: () => number) => 5; return action(() => 1); };`, (v) => v === 5));
R.push(tyRow("p2-action-type", `const g = (): number => { const action = (f: () => number): number => 5; return action(() => 1); };`, isNum));
R.push(tyRow("p2-memo-num", `const g = (): number => { const memo = (f: (x: number) => number): number => 5; return memo((x: number) => x); };`, isNum));
R.push(tyRow("p2-memo-impure", `const g = (): number => { const xs = [0]; const memo = (f: (x: number) => number) => f; const m = memo((x: number) => { xs.push(x); return xs.length; }); return m(1) + m(1); };`, (v) => v === 5));
R.push(tyRow("p2-equals", `const g = (): boolean => { const equals = (a: number, b: number): boolean => a !== b; return equals(1, 1); };`, (v) => v === false));
R.push(tyRow("p2-messageOf", `const g = (): string => { const messageOf = (e: unknown): string => "m"; try { throw new Error("x"); } catch (e) { return messageOf(e); } };`, (v) => v === "m"));
R.push(tyRow("p2-cast", `const g = (): string => { const cast = (x: unknown): string => "s"; return cast(1); };`, (v) => v === "s"));
R.push(tyRow("p2-freeze-mut", `const g = (): number => { const mut = (xs: number[]): number[] => xs; const ys = mut([1]); ys.push(2); return ys.length; };`, (v) => v === 2));
R.push(tyRow("p2-state-local", `const g = (): number => { const state = (x: number): number => x; return state(3); };`, (v) => v === 3));
R.push(callRow("p2-read-in-action", `const k = (): StateCell<number> => state(1);\nconst g = (k: number) => k;\nconst b = (k: State<number>) => action(() => { const read = (x: unknown): number => 7; k.set(read(k)); });`, "b", [], (v) => v === 7, "g"));
R.push(callRow("p2-read-param", `const k = (): StateCell<number> => state(1);\nconst g = (k: number) => k;\nconst b = (k: State<number>) => action((read: number) => { k.set(read); });`, "b", [7], (v) => v === 7, "g"));
R.push(tyRow("p2-on-local", `const g = (): number => { const on = (a: string, f: () => number): number => f(); return on("click", () => 4); };`, (v) => v === 4));
R.push(tyRow("p2-ctl", `const g = (): number => "s";`, isNum, true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
