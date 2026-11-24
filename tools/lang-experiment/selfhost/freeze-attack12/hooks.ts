// freeze-attack12 target 2: conversion hooks reached without a declared member or a literal key named after one.
// Object.fromEntries builds a record whose keys come from data, so toString, valueOf, toJSON and then are own members
import { ACT, sRow, tyRow, type Cand } from "./lib12.ts";
const R: Cand[] = [];
const FE = (k: string, v: string) => `Object.fromEntries([["${k}", ${v}]])`;
const sync = (b: string) => ACT + `const g = (a: Action<[]>) => { ${b} };`;
const asy = (b: string) => ACT + `const g = async (a: Action<[]>) => { await null; ${b} };`;
// an Action as the hook, each conversion, sync (the guard should refuse: loud) and after an await (the guard is off)
const CONV: [string, string][] = [
  ["template", "`${o}`"], ["template-arr", "`${[o]}`"], ["join", "[o].join()"], ["concat-str", `"" + o`], ["messageOf", "messageOf(o)"],
  ["toSorted", "[o, o].toSorted().length"], ["eq-num", "o == 1"], ["eq-str", `o == "x"`], ["map-key", "new Map([[`${o}`, 1]]).size"],
];
for (const [cn, e] of CONV) {
  const key = cn.startsWith("eq") ? "valueOf" : "toString";
  R.push(sRow(`h-act-${key}-${cn}-sync`, sync(`const o = ${FE(key, "a")}; return ${e};`)));
  R.push(sRow(`h-act-${key}-${cn}-async`, asy(`const o = ${FE(key, "a")}; return ${e};`)));
}
// keys that are not literals: a const, a joined string, a Map, entries of another record
R.push(sRow("h-act-key-const-async", asy(`const k = "toString"; const o = Object.fromEntries([[k, a]]); return \`\${o}\`;`)));
R.push(sRow("h-act-key-join-async", asy(`const k = ["to", "String"].join(""); const o = Object.fromEntries([[k, a]]); return \`\${o}\`;`)));
R.push(sRow("h-act-key-map-async", asy(`const m = new Map<string, Action<[]>>([["toString", a]]); const o = Object.fromEntries(m); return \`\${o}\`;`)));
R.push(sRow("h-act-key-entries-async", asy(`const o = Object.fromEntries(Object.entries({ toStr: a }).map(([k, v]) => [k + "ing", v])); return \`\${o}\`;`)));
R.push(sRow("h-act-nested-async", asy(`const o = { r: ${FE("toString", "a")} }; return \`\${o.r}\`;`)));
R.push(sRow("h-act-arr-join-async", asy(`const xs = [${FE("toString", "a")}]; return xs.join("-");`)));
// then: an Action, and a plain function, as then on a value an async cell returns, awaits or resolves
R.push(sRow("h-act-then-async-return", ACT + `const g = async (a: Action<[]>) => ${FE("then", "a")};`));
R.push(sRow("h-act-then-sync-return", ACT + `const g = (a: Action<[]>) => ${FE("then", "a")};`));
R.push(sRow("h-act-then-await", asy(`const v = await ${FE("then", "a")}; return 1;`)));
R.push(sRow("h-act-then-resolve", ACT + `const g = (a: Action<[]>) => Promise.resolve(${FE("then", "a")}).then(() => 1);`));
R.push(sRow("h-act-then-in-rec", ACT + `const g = async (a: Action<[]>) => ({ p: ${FE("then", "a")} });`));
// the type holds in these rows; the value shows the program's function ran in the conversion (HOOK RAN, not a DIFF)
const hookRow = (name: string, src: string, ran: (v: unknown) => boolean) => ({ name, src, show: ["g"], drive: (p: any) =>
  p.status("g") !== "fulfilled" ? `same: g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 100)}` : `same: ${ran(p.value("g")) ? "HOOK RAN" : "no hook"} g=${JSON.stringify(p.value("g"))}` });
const isObj = (v: unknown) => typeof v === "object" && v !== null;
const TH = `(r: (v: string) => void) => r("s")`;
R.push(tyRow("h-then-async-return", `const g = async () => ${FE("then", TH)};`, isObj));
R.push(tyRow("h-then-sync-return", `const g = () => ${FE("then", TH)};`, isObj));
// await o is typed unknown (S9.7), so these rows hold their type; the value shows then ran
const any = () => true;
R.push(hookRow("h-then-await", `const g = async () => { const v = await ${FE("then", TH)}; return v; };`, (v) => v === "s"));
R.push(tyRow("h-then-await-typed", `const g = async () => { const o = ${FE("then", TH)}; const v = await o; const w: { readonly [k: string]: (r: (v: string) => void) => void } = v; return w; };`, isObj));
R.push(tyRow("h-then-resolve", `const g = () => Promise.resolve(${FE("then", TH)});`, isObj));
R.push(tyRow("h-then-all", `const g = async () => (await Promise.all([${FE("then", TH)}]))[0];`, isObj));
R.push(tyRow("h-then-helper", `const g = async () => { const mk = async () => ${FE("then", TH)}; return mk(); };`, isObj));
R.push(tyRow("h-then-gen", `const g = async function* () { yield ${FE("then", TH)}; };`, isObj));
R.push(hookRow("h-then-number", `const g = async () => { const o = Object.fromEntries([["then", (r: (v: number) => void) => r(5)]]); return (await o); };`, (v) => v === 5));
// toJSON gives what JSON.stringify returns: undefined where the checker types string, or another shape
R.push(tyRow("h-tojson-undefined", `const g = () => JSON.stringify(${FE("toJSON", "() => undefined")});`, (v) => typeof v === "string"));
R.push(hookRow("h-tojson-number", `const g = () => JSON.parse(JSON.stringify(${FE("toJSON", "() => 5")}));`, (v) => v === 5));
R.push(tyRow("h-tojson-cast", `const g = () => { const r = cast<{ readonly [k: string]: number }>(JSON.parse(JSON.stringify(Object.fromEntries([["n", 1], ["toJSON", 2]])))); return r.ok ? 1 : 0; };`, (v) => v === 1 || v === 0));
// valueOf and toString giving values the checker does not expect: a number from Number(o), a string from a template
R.push(hookRow("h-valueof-number", `const g = () => Number(${FE("valueOf", "() => 42")});`, (v) => v === 42));
R.push(hookRow("h-tostring-template", `const g = () => \`\${${FE("toString", `() => "hooked"`)}}\`;`, (v) => v === "hooked"));
R.push(hookRow("h-tostring-String", `const g = () => String(${FE("toString", `() => "hooked"`)});`, (v) => v === "hooked"));
R.push(hookRow("h-tostring-messageOf", `const g = () => messageOf(${FE("toString", `() => "hooked"`)});`, (v) => v === "hooked"));
R.push(hookRow("h-tostring-join", `const g = () => [${FE("toString", `() => "hooked"`)}].join();`, (v) => v === "hooked"));
R.push(hookRow("h-valueof-eq", `const g = () => ${FE("valueOf", "() => 1")} == 1;`, (v) => v === true));
R.push(hookRow("h-tojson-shape", `const g = () => JSON.stringify(${FE("toJSON", "() => [1, 2]")});`, (v) => v === "[1,2]"));
R.push(hookRow("h-then-await-ran", `const g = async () => { const v = await ${FE("then", TH)}; return typeof v; };`, (v) => v === "string"));
R.push(tyRow("h-tostring-sort", `const g = () => [${FE("toString", `() => "b"`)}, ${FE("toString", `() => "a"`)}].toSorted().map((o) => Object.keys(o).length);`, (v) => Array.isArray(v)));
// a value from another language (drive-rt only: drive-run gives no outside cells, so [inject-unknown] there): the
// boundary copy keeps the declared members, so the JavaScript object's toString does not reach the SoundScript cell
let extCalls = 0;
const ext = { ext: [[], () => ({ n: 1, toString: () => { extCalls++; return "js"; } })] as [string[], (...a: any[]) => unknown] };
R.push({ name: "h-outside-declared", src: `const g = (ext: { readonly n: number }) => \`\${ext}\`;`, outside: ext, show: ["g"], drive: (p: any) => `same: g=${JSON.stringify(p.value("g"))} ${p.status("g")} js toString calls ${extCalls}` } as Cand);
R.push({ name: "h-outside-unknown", src: `const g = (ext: unknown) => \`\${ext}\`;`, outside: ext, show: ["g"], drive: (p: any) => `same: g=${JSON.stringify(p.value("g"))} ${p.status("g")} js toString calls ${extCalls} (JavaScript is trusted, S11.11)` } as Cand);
// controls: the same vehicles run without the checker on an object literal key, which the checker refuses (w1)
R.push({ ...sRow("h-ctl-literal-toString-async", asy("const o = { toString: a }; return `${o}`;")), ctl: true });
R.push({ ...sRow("h-ctl-literal-toString-sync", sync("const o = { toString: a }; return `${o}`;")), ctl: true });
R.push({ ...tyRow("h-ctl-literal-then", `const g = async () => ({ then: ${TH} });`, isObj), ctl: true });
export const cands = R;
