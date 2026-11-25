// freeze-attack14: the two breaks that need a cell in another language (drive-rt's outside cells; drive-run has none)
import { tyRow, isNum, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
// BT: the boundary reads a tuple's length twice; a proxy gives 2 to the check and 1 to the copy
const proxy = () => { let n = 0; return new Proxy([1, 2], { get(t, p, r) { return p === "length" ? (n++ === 0 ? 2 : 1) : Reflect.get(t, p, r); } }); };
R.push({ ...tyRow("min-bt", `const g = (ext: [number, number]): number => ext[1];`, isNum), outside: { ext: [[], proxy] } } as Cand);
// JW: a typed array a cell published is written by a cell in another language, with no throw; a reader sees it
R.push({ ...tyRow("min-jw", `const k = () => new Float32Array(2);\nconst g = (k: Float32Array, w: number): number => k[0] ?? -1;`, isLit(0)), outside: { w: [["k"], (k: Float32Array) => { k[0] = 9; return 1; }] } } as Cand);
R.push({ ...tyRow("min-rt-ctl", `const g = (ext: [number, number]): number => "s";`, isNum, true), outside: { ext: [[], () => [1, 2]] } } as Cand);
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
