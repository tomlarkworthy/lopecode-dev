// freeze-attack12: the minimal program of each break, with its detector. Run with drive-rt.ts and drive-run.ts.
import { ACT, sRow, tyRow, twiceDrive, type Cand } from "./lib12.ts";
const R: Cand[] = [];
const isObj = (v: unknown) => (typeof v === "object" && v !== null) || typeof v === "function";
// (i) a void result takes a response; the response leaves its cell
R.push({ name: "min-void-resp", src: `const g = async (fetch: Fetch) => { const res = await fetch("https://x.test/"); const f: (y: FetchResponse) => void = (y) => y; return [f(res)]; };`,
  fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v[0].text()) });
// (i) a promise and a generator object given object at a cell's top; the runtime adopts them
R.push(tyRow("min-object-promise", `const g = (): object => Promise.resolve("s");`, isObj));
R.push(tyRow("min-object-generator", `const g = (): object => { function* mk() { yield 1; } return mk(); };`, isObj));
// (ii) Object.fromEntries makes own toJSON and then members
R.push(tyRow("min-fe-tojson", `const g = () => JSON.stringify(Object.fromEntries([["toJSON", () => undefined]]));`, (v) => typeof v === "string"));
R.push(tyRow("min-fe-then", `const g = async () => Object.fromEntries([["then", (r: (v: string) => void) => r("s")]]);`, isObj));
// (ii) + (iii) an Action as an own toString, converted after an await: the guard is off
R.push(sRow("min-fe-action-after-await", ACT + "const g = async (a: Action<[]>) => { await null; return `${Object.fromEntries([[\"toString\", a]])}`; };"));
R.push(sRow("min-fe-action-sync", ACT + "const g = (a: Action<[]>) => `${Object.fromEntries([[\"toString\", a]])}`;"));
R.push(sRow("min-fe-action-then-callback", ACT + "const g = (a: Action<[]>) => { const o: { readonly [k: string]: Action<[]> } = Object.fromEntries([[\"toString\", a]]); return Promise.resolve(1).then(() => `${o}`); };"));
// (iii) the guard with the checker skipped: a direct call after an await (the checker says [action-call])
R.push(sRow("min-ctl-action-after-await", ACT + `const g = async (a: Action<[]>) => { await null; a(); return 1; };`, true));
// (iv) a record type with a call signature declares name over a function's own name
R.push(tyRow("min-callsig-name", `interface F { (x: number): number; readonly name?: number }\nconst g = () => { const f: F = (x: number) => x; return f.name ?? 0; };`, (v) => typeof v === "number"));
// (iv) a cell declared void holds what it returned
R.push(tyRow("min-void-cell", `const g = (): void => 1;`, (v) => v === undefined));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
