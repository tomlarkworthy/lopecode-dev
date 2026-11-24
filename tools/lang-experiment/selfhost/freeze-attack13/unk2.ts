// freeze-attack13 target 2, part 2: a promise hidden as object inside a published record; a reader awaits it
import { tyRow, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const isObj = (v: unknown) => typeof v === "object" && v !== null;
const TV = `const id = <T,>(x: T): object => (typeof x === "object" && x !== null ? x : {});`;
R.push(tyRow("t-narrow-in-record-await", `const p = () => { ${TV} return { o: id(Promise.resolve("s")) }; };\nconst g = async (p: { readonly o: object }) => await p.o;`, isObj));
R.push(tyRow("u-arrlit-in-record-await", `const p = () => { const one: unknown = 1; const xs = [one, Promise.resolve("s")]; const u = xs[1]; return { o: typeof u === "object" && u !== null ? u : {} }; };\nconst g = async (p: { readonly o: object }) => await p.o;`, isObj));
R.push(tyRow("u-arrlit-in-array-unknown", `const p = () => { const one: unknown = 1; const xs = [one, Promise.resolve("s")]; return [xs[1]]; };\nconst g = (p: readonly unknown[]) => p.length;`, (v) => v === 1));
R.push(tyRow("u-arrlit-in-state", `const one = (): unknown => 1;\nconst s = (one: unknown): StateCell<readonly unknown[]> => { const xs = [one, Promise.resolve("s")]; return state([xs[1]]); };\nconst g = (s: readonly unknown[]) => s.length;`, (v) => v === 1));
R.push(tyRow("t-narrow-in-record-ctl", `const p = () => ({ o: Promise.resolve("s") });\nconst g = async (p: { readonly o: object }) => await p.o;`, isObj, true));
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
