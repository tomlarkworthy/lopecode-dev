// freeze-attack13: the minimal program of each break, with its detector. Run with drive-rt.ts and drive-run.ts.
import { tyRow, callRow, twiceDrive, isNum, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const isObj = (v: unknown) => typeof v === "object" && v !== null;
// VA (i): an Action call is typed void and gives what the action's function returned
R.push(callRow("min-va-action-result", `const c = (): StateCell<number> => state(0);\nconst a = () => action(() => "s");\nconst b = (a: Action<[]>, c: State<number>) => action(() => { c.set(a() ?? 7); });\nconst g = (c: number) => c;`, "b", [], isNum));
// VA, leaving: a State handle laundered into a number state cell
R.push(callRow("min-va-handle", `const c = (): StateCell<number> => state(0);\nconst k = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c);\nconst b = (a: Action<[]>, k: State<number>) => action(() => { k.set(a() ?? 0); });\nconst g = (k: number) => k + 1;`, "b", [], isNum));
// U (i): a value joined with one typed unknown is typed unknown, which counts as plain: a promise reaches object
R.push(tyRow("min-u-promise", `const g = (): object => { const one: unknown = 1; const xs = [one, Promise.resolve("s")]; const u = xs[1]; return typeof u === "object" && u !== null ? u : {}; };`, isObj));
// U, a response leaving its cell
R.push({ name: "min-u-resp", src: `const g = async (fetch: Fetch): Promise<unknown> => { const r = await fetch("https://x.test/"); const one: unknown = 1; const xs = [one, r]; return [xs[1]]; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v[0].text()) });
// U, an Action under toJSON inside an action body: JSON.stringify calls it with "" where Action<[number]> is declared
R.push(callRow("min-u-action", `const c = (): StateCell<number> => state(0);\nconst g = (c: number) => c;\nconst d = (c: State<number>) => action((n: number) => c.set(n + 1));\nconst b = (d: Action<[number]>) => action(() => { const one: unknown = 1; const xs = [one, d]; const u = xs[1]; JSON.stringify(Object.fromEntries([["toJSON", u]])); });`, "b", [], isNum));
// T (i): a type parameter narrowed by typeof is object, which counts as plain: a promise returned as object
R.push(tyRow("min-t-narrow", `const g = (): object => { const id = <T,>(x: T): object => (typeof x === "object" && x !== null ? x : {}); return id(Promise.resolve("s")); };`, isObj));
// L (ii): Array.from reads length and the numeric keys a record type left out; its elements are typed undefined
R.push(tyRow("min-l-arraylike", `const g = () => { const o = { length: 1, 0: "s" }; return Array.from(o); };`, (v) => Array.isArray(v) && v.every((x) => x === undefined)));
// out of scope (callback arity): the third argument map passes, typed by an optional parameter
R.push(tyRow("min-e-extra-arg", `const g = () => [5].map((x: number, i?: number, s?: number) => (s ?? 0) + 1);`, (v) => Array.isArray(v) && v.every((x) => typeof x === "number")));
// controls (checker skipped): each detector sees a value outside its type
R.push(callRow("min-ctl-state-string", `const c = (): StateCell<number> => state(0);\nconst b = (c: State<number>) => action(() => { c.set("s"); });\nconst g = (c: number) => c;`, "b", [], isNum, "g", true));
R.push(tyRow("min-ctl-object-promise", `const g = (): object => Promise.resolve("s");`, isObj, true));
R.push({ name: "min-ctl-resp", ctl: true, src: `const g = async (fetch: Fetch) => { const r = await fetch("https://x.test/"); return [r]; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v[0].text()) });
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
