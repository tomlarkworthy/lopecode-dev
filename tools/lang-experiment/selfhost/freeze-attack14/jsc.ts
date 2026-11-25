// freeze-attack14 class 1, JavaScript-side callers: the drive calls an action or a published function the way another
// language would, with arguments outside the parameter types. Silent when the wrong value reaches a typed reader
import { callRow, tyRow, isNum, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const K = `const k = (): StateCell<number> => state(0);\nconst g = (k: number) => k;\n`;
R.push(callRow("jc-action-str", K + `const b = (k: State<number>) => action((v: number) => k.set(v));`, "b", ["s"], isNum, "g"));
R.push(callRow("jc-action-missing", K + `const b = (k: State<number>) => action((v: number) => k.set(v));`, "b", [], isNum, "g"));
R.push(callRow("jc-action-obj", K + `const b = (k: State<number>) => action((v: number) => k.set(v + 1));`, "b", [{ valueOf: () => 4 }], isNum, "g"));
R.push(callRow("jc-action-rec", `const k = (): StateCell<{ readonly a: number }> => state({ a: 0 });\nconst g = (k: { readonly a: number }) => k.a;\nconst b = (k: State<{ readonly a: number }>) => action((v: { readonly a: number }) => k.set(v));`, "b", [{ a: "s" }], isNum, "g"));
R.push(callRow("jc-action-arr-mutated", `const k = (): StateCell<readonly number[]> => state([]);\nconst g = (k: readonly number[]) => k.length;\nconst b = (k: State<readonly number[]>) => action((v: readonly number[]) => k.set(v));`, "b", [[1]], (v) => v === 1, "g"));
R.push({ ...callRow("jc-fn-str", `const f = () => (x: number): number => x + 1;\nconst g = (f: (x: number) => number) => 0;`, "f", ["s"], isNum, "g") } as Cand);
R.push(callRow("jc-ctl", K + `const b = (k: State<number>) => action((v: number) => k.set(v));`, "b", [5], (v) => v !== 5, "g", true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
