// freeze-attack13 target 2: unknown and object. (U) a non-plain value joined with a value typed unknown: the join is
// unknown, which counts as plain, so the value is never tested; then used. (T) a type parameter narrowed to object and
// returned as object. (X) the exempt built-in signatures given non-plain values that could be called or consumed.
import { tyRow, callRow, twiceDrive, isNum, isStr, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const isObj = (v: unknown) => typeof v === "object" && v !== null;
// sites: each defines u from K, where some other value is typed unknown
const SITES: [string, (k: string) => string][] = [
  ["arrlit", (k) => `const one: unknown = 1; const xs = [one, ${k}]; const u = xs[1];`],
  ["with", (k) => `const one: unknown = 1; const xs = [one].with(0, ${k}); const u = xs[0];`],
  ["map-ternary", (k) => `const one: unknown = 1; const xs = [1].map(() => (Math.max(1) > 0 ? ${k} : one)); const u = xs[0];`],
  ["two-returns", (k) => `const one: unknown = 1; const f = (b: boolean) => { if (b) return one; return ${k}; }; const u = f(false);`],
  ["find", (k) => `const one: unknown = 1; const xs = [one, ${k}]; const u = xs.find((v, i) => i === 1);`],
  ["flatmap", (k) => `const one: unknown = 1; const xs = [1].flatMap(() => [one, ${k}]); const u = xs[1];`],
  ["arrfrom", (k) => `const one: unknown = 1; const xs = Array.from([one, ${k}]); const u = xs[1];`],
  ["spread", (k) => `const none: unknown[] = []; const xs = [...none, ${k}]; const u = xs[0];`],
  ["ternary-local", (k) => `const one: unknown = 1; const u = Math.max(1) > 0 ? ${k} : one;`],
  ["nullish", (k) => `const one: unknown = null; const u = one ?? ${k};`],
  ["at", (k) => `const one: unknown = 1; const xs = [one, ${k}]; const u = xs.at(1);`],
  ["slice", (k) => `const one: unknown = 1; const xs = [one, ${k}].slice(1); const u = xs[0];`],
];
const OBJ = (u: string) => `return typeof ${u} === "object" && ${u} !== null ? ${u} : {};`;
for (const [s, site] of SITES) {
  // a promise at a cell's top under object: the runtime adopts it and the cell holds its string
  R.push(tyRow(`u-${s}-promise-object`, `const g = (): object => { ${site(`Promise.resolve("s")`)} ${OBJ("u")} };`, isObj));
  // a generator object at a cell's top under object: run as the cell's generator
  R.push(tyRow(`u-${s}-gen-object`, `const g = (): object => { function* mk() { yield 1; } ${site("mk()")} ${OBJ("u")} };`, isObj));
  // a response under unknown leaves its cell; a reader in another language reads it twice
  R.push({ name: `u-${s}-resp-unknown`, src: `const g = async (fetch: Fetch): Promise<unknown> => { const r = await fetch("https://x.test/"); ${site("r")} return [u]; };`, fetchBody: "body", show: ["g"],
    drive: twiceDrive(async (v: any) => await v[0].text()) });
  // an Action under unknown, inside an action body, put under toJSON: JSON.stringify calls it with "" (Action<[number]>)
  R.push(callRow(`u-${s}-action-tojson`, `const c = (): StateCell<number> => state(0);\nconst g = (c: number) => c;\nconst d = (c: State<number>) => action((n: number) => c.set(n + 1));\nconst b = (d: Action<[number]>) => action(() => { ${site("d")} JSON.stringify(Object.fromEntries([["toJSON", u]])); });`, "b", [], isNum));
}
// held twins: the Action under unknown in a cell body, converted sync / after await: the guard refuses (loud)
R.push(tyRow("u-arrlit-action-tostring-sync", `const c = (): StateCell<number> => state(0);\nconst d = (c: State<number>) => action(() => c.set(1));\nconst g = (d: Action<[]>) => { const one: unknown = 1; const xs = [one, d]; const u = xs[1]; return \`\${Object.fromEntries([["toString", u]])}\`; };`, isStr));
R.push(tyRow("u-arrlit-action-tostring-await", `const c = (): StateCell<number> => state(0);\nconst d = (c: State<number>) => action(() => c.set(1));\nconst g = async (d: Action<[]>) => { const one: unknown = 1; const xs = [one, d]; const u = xs[1]; await null; return \`\${Object.fromEntries([["toString", u]])}\`; };`, isStr));
// T: a type parameter narrowed to object inside a generic, returned as object
const TV = `const id = <T,>(x: T): object => (typeof x === "object" && x !== null ? x : {});`;
R.push(tyRow("t-narrow-promise", `const g = (): object => { ${TV} return id(Promise.resolve("s")); };`, isObj));
R.push(tyRow("t-narrow-gen", `const g = (): object => { ${TV} function* mk() { yield 1; } return id(mk()); };`, isObj));
R.push(tyRow("t-narrow-agen", `const g = (): object => { ${TV} async function* mk() { yield 1; } return id(mk()); };`, isObj));
R.push(tyRow("t-narrow-fn-promise", `const g = (): object => { const id = <T,>(x: T): object => (typeof x === "function" ? x : Promise.resolve("s")); return id(1); };`, isObj));
R.push({ name: "t-narrow-resp", src: `const g = async (fetch: Fetch): Promise<readonly object[]> => { const r = await fetch("https://x.test/"); ${TV} return [id(r)]; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v[0].text()) });
R.push(tyRow("t-narrow-cell-input", `const p = (): object => { ${TV} return id(Promise.resolve("s")); };\nconst g = (p: object) => p;`, isObj));
R.push(tyRow("t-narrow-reader", `const p = (): object => { ${TV} return id(Promise.resolve("s")); };\nconst g = (p: object) => (typeof p === "string" ? 99 : 0);`, (v) => v === 0));
R.push(tyRow("t-narrow-in-record", `const g = () => { ${TV} return { o: id(Promise.resolve("s")) }; };`, isObj));
R.push(tyRow("u-narrow-object-plain-held", `const g = (): object => { const u: unknown = { a: 1 }; ${OBJ("u")} };`, isObj));
// controls: the detectors with the checker skipped
R.push(tyRow("u-ctl-promise-object", `const g = (): object => Promise.resolve("s");`, isObj, true));
R.push(tyRow("u-ctl-gen-object", `const g = (): object => { function* mk() { yield 1; } return mk(); };`, isObj, true));
R.push({ name: "u-ctl-resp", ctl: true, src: `const g = async (fetch: Fetch) => { const r = await fetch("https://x.test/"); return [r]; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v[0].text()) });
R.push(callRow("u-ctl-action-tojson", `const c = (): StateCell<number> => state(0);\nconst g = (c: number) => c;\nconst d = (c: State<number>) => action((n: number) => c.set(n + 1));\nconst b = (d: Action<[number]>) => action(() => { JSON.stringify({ toJSON: d }); });`, "b", [], isNum, "g", true));
// X: each exempt built-in given a value it could call or consume: the value must be intact after
const XF: [string, (k: string) => string][] = [
  ["String", (k) => `String(${k})`], ["Number", (k) => `Number(${k})`], ["Boolean", (k) => `Boolean(${k})`],
  ["isArray", (k) => `Array.isArray(${k})`], ["isInteger", (k) => `Number.isInteger(${k})`], ["isFinite", (k) => `Number.isFinite(${k})`],
  ["isNaN", (k) => `Number.isNaN(${k})`], ["isSafe", (k) => `Number.isSafeInteger(${k})`], ["stringify-rec", (k) => `JSON.stringify({ k: ${k} })`],
  ["keys", (k) => `Object.keys(${k})`], ["is", (k) => `Object.is(${k}, 1)`], ["template", (k) => `\`\${${k}}\``], ["messageOf", (k) => `messageOf(${k})`], ["equals", (k) => `equals(${k}, ${k})`],
];
for (const [n, f] of XF) {
  // a function that counts its calls
  // a function that throws when called: a call shows as the cell in error
  R.push(tyRow(`x-${n}-fn`, `const g = () => { const k = (): number => { throw new Error("called"); }; ${f("k")}; return 0; };`, (v) => v === 0));
  // a generator object: still yields both values after
  R.push(tyRow(`x-${n}-gen`, `const g = () => { function* mk() { yield 1; yield 2; } const k = mk(); ${f("k")}; return [...k].length; };`, (v) => v === 2));
  // an array iterator
  R.push(tyRow(`x-${n}-iter`, `const g = () => { const k = [1, 2].values(); ${f("k")}; return [...k].length; };`, (v) => v === 2));
  // a Mut map
  R.push(tyRow(`x-${n}-map`, `const g = () => { const k = new Map([[1, 2]]); ${f("k")}; return k.size; };`, (v) => v === 1));
  // a response: its body still readable after
  R.push(tyRow(`x-${n}-resp`, `const g = async (fetch: Fetch) => { const k = await fetch("https://x.test/"); ${f("k")}; return await k.text(); };`, (v) => v === "body"));
}
for (const c of R) if (c.name.endsWith("-resp")) (c as any).fetchBody = "body";
// equals on non-plain values the type cannot tell apart
R.push(tyRow("x-equals-promises", `const g = () => equals(Promise.resolve(1), Promise.resolve(2));`, (v) => v === false));
R.push(tyRow("x-equals-gens", `const g = () => { function* m() { yield 1; } function* n() { yield 2; } return equals(m(), n()); };`, (v) => v === false));
R.push({ ...tyRow("x-equals-resps", `const g = async (fetch: Fetch) => { const r = await fetch("https://x.test/a"); const q = await fetch("https://x.test/b"); const a = await r.text(); return equals(r, q) ? a : "differ"; };`, (v) => v === "differ"), fetchBody: "body" });
R.push(tyRow("x-equals-maps-held", `const g = () => equals(new Map([[1, 2]]), new Map([[1, 3]]));`, (v) => v === false));
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
