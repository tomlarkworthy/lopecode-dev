// F: cell names the compiled module binds. Run under both runners:
//   bun lite/infer/attack/drive-run.ts selfhost/freeze-attack10/f.ts   (runCells)
//   bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/f.ts (compiled module in a real Runtime)
// ty(name, src, ok): cell g's value is read by ok, what g's checked type allows; DIFF when outside it.
export const ty = (name: string, src: string, ok: (v: unknown) => boolean, extra: Record<string, unknown> = {}) => ({
  name, src, show: ["g"], ...extra,
  drive: (p: any) => {
    if (p.status("g") !== "fulfilled") return `same: g ${p.status("g")} ${String(p.error?.("g") ?? "").slice(0, 160)}`;
    const v = p.value("g");
    let s: string; try { s = JSON.stringify(v) ?? String(v); } catch { s = String(v); }
    return ok(v) ? `same: ${String(s).slice(0, 120)}` : `DIFF g is outside its type: ${typeof v} ${String(s).slice(0, 120)}`;
  },
});
const num = (v: unknown) => typeof v === "number";
const str = (v: unknown) => typeof v === "string";
const R: any[] = [];
// a cell named after a capability, read by a parameter of that name typed as the cell's type
for (const cap of ["now", "random", "fetch", "log", "compile", "pool"]) {
  R.push(ty(`f-cap-${cap}`, `const ${cap} = () => 1;\nconst g = (${cap}: number) => ${cap} + 1;`, num));
  R.push(ty(`f-cap-${cap}-rec`, `const ${cap} = () => ({ n: 2 });\nconst g = (${cap}: { readonly n: number }) => ${cap}.n;`, num));
}
// the Observable input globals: a cell of that name, read by a cell that calls the global with no parameter
R.push(ty("f-sc-replace", `const structuredClone = () => (x: unknown) => "s";\nconst g = () => structuredClone([1, 2]).length;`, (v) => v === 2));
R.push(ty("f-sc-number", `const structuredClone = () => 5;\nconst g = () => { const a = structuredClone({ n: 1 }); return a.n + 1; };`, num));
R.push(ty("f-usp-replace", `const URLSearchParams = () => 7;\nconst g = () => new URLSearchParams("a=1").get("a") ?? "none";`, str));
R.push(ty("f-sc-typed-same", `const structuredClone = () => <T,>(x: T): T => x;\nconst g = () => structuredClone([1, 2]).length;`, (v) => v === 2));
// Map, Set, URL: a cell of that name, read by a parameter, and a cell that also uses the global class
for (const cl of ["Map", "Set", "URL"]) {
  R.push(ty(`f-cls-${cl}-param`, `const ${cl} = () => 1;\nconst g = (${cl}: number) => ${cl} + 1;`, num));
  R.push(ty(`f-cls-${cl}-only`, `const ${cl} = () => 1;\nconst g = () => 1;`, num));
}
R.push(ty("f-cls-URL-use", `const URL = () => 1;\nconst g = () => new URL("http://a.test/").host.length;`, num));
R.push(ty("f-cls-Map-use", `const Map = () => 1;\nconst g = () => new Map([[1, 2]]).size;`, num));
R.push(ty("f-cls-Map-body", `const Map = () => new Set([1]).size;\nconst g = (Map: number) => Map;`, num));
R.push(ty("f-cls-param-local", `const g = () => { const f = (Map: number) => Map + new Set([1]).size; return f(1); };`, num));
R.push(ty("f-cls-local-Map", `const g = () => { const URL = 3; return URL + new Map([[1, 1]]).size; };`, num));
// runtime cell names that compile to ss_ inputs
for (const rn of ["out", "closure", "methods", "ref", "events", "listen", "cross", "viewRef", "compileFor", "rejected", "release", "SsMap", "SsURL", "mut", "freeze", "borrow"])
  R.push(ty(`f-rt-${rn}`, `const ${rn} = () => 1;\nconst g = (${rn}: number) => ${rn} + 1;`, num));
// JS globals as cell names, read by a parameter, and a second cell that uses the global in its body
for (const gl of ["Object", "JSON", "Math", "Array", "Promise", "Number", "String", "Error", "Symbol", "console"])
  R.push(ty(`f-gl-${gl}`, `const ${gl} = () => 1;\nconst g = (${gl}: number) => ${gl} + 1;`, num));
R.push(ty("f-gl-JSON-use", `const JSON = () => 1;\nconst g = () => JSON.stringify([1]).length;`, num));
R.push(ty("f-gl-Math-use", `const Math = () => 1;\nconst g = () => Math.max(1, 2);`, num));
// Observable builtins
for (const ob of ["width", "md", "html", "DOM", "Inputs", "require", "Mutable", "FileAttachment", "Promises", "visibility", "this"])
  if (ob !== "this") R.push(ty(`f-ob-${ob}`, `const ${ob} = () => 1;\nconst g = (${ob}: number) => ${ob} + 1;`, num));
// escapes and case
R.push(ty("f-esc-URL", `const \\u0055RL = () => 1;\nconst g = (URL: number) => URL + 1;`, num));
R.push(ty("f-esc-now", `const n\\u006fw = () => 1;\nconst g = (now: number) => now + 1;`, num));
R.push(ty("f-esc-structuredClone", `const structured\\u0043lone = () => 5;\nconst g = () => { const a = structuredClone({ n: 1 }); return a.n + 1; };`, num));
// locals and parameters named after prelude or bound names inside a cell that uses them
R.push(ty("f-local-h-jsx", `const g = () => { const h = (t: string) => t.length; return [h("ab"), <div />].length; };`, num));
R.push(ty("f-local-h-jsx-same-scope", `const g = () => { const h = (t: string) => t.length; const e = <div>x</div>; return h("ab") + (typeof e === "object" ? 0 : 1); };`, (v) => v === 2));
R.push(ty("f-local-h-jsx-min", `const g = () => { const h = (t: string) => 7; return <div>x</div>; };`, (v) => typeof v === "object" && v !== null));
R.push({ ...ty("f-param-h-jsx", `const g = () => { const f = (h: number) => <div>{h}</div>; return f(1); };`, (v) => typeof v === "object" && v !== null), show: ["g"] });
R.push(ty("f-local-cast-nested", `const g = () => { const a = cast<number>(1); const f = () => { const cast = 5; return cast; }; return (a.ok ? a.value : 0) + f(); };`, (v) => v === 6));
R.push(ty("f-local-cast-shadow-call", `const g = () => { const f = () => { const cast = <T,>(x: unknown) => ({ ok: true as const, value: 41 }); const r = cast<number>("x"); return r.ok ? r.value + 1 : -1; }; return f(); };`, (v) => v === 42));
R.push(ty("f-local-cast", `const g = () => { const c = cast<number>(1); const cast2 = 1; return c.ok ? c.value + cast2 : 0; };`, num));
R.push(ty("f-param-state-uses", `const g = () => { const f = (state: number) => state + 1; const s = action(() => 1); return f(1) + (typeof s === "function" ? 0 : 0); };`, num));
R.push(ty("f-local-structuredClone", `const g = () => { const structuredClone = (x: number) => x + 1; return structuredClone(1); };`, (v) => v === 2));
R.push(ty("f-sc-type", `const structuredClone = () => (x: unknown) => "abc";\nconst g = () => structuredClone([1, 2]);`, (v) => Array.isArray(v)));
R.push(ty("f-sc-record", `const structuredClone = () => (x: unknown) => 5;\nconst g = () => { const o = structuredClone({ n: 1 }); return typeof o; };`, (v) => v === "object"));
R.push(ty("f-cap-now-value", `const now = () => () => 99;\nconst g = (now: () => number) => now();`, (v) => v === 99));
R.push(ty("f-cap-now-clock", `const now = () => 5;\nconst g = (now: Clock) => now();`, num));
R.push(ty("f-cap-fetch-fake", `const fetch = () => async (u: string) => ({ ok: true, status: 7 });\nconst g = async (fetch: (u: string) => Promise<{ readonly ok: boolean; readonly status: number }>) => (await fetch("u")).status;`, (v) => v === 7, { fetchBody: "b" }));
R.push(ty("f-cap-random-arr", `const random = () => [1, 2, 3];\nconst g = (random: number[]) => random.length;`, (v) => v === 3));
R.push(ty("f-cap-log-str", `const log = () => "hello";\nconst g = (log: string) => log.toUpperCase();`, (v) => v === "HELLO"));
// type names, component names, $ names, enums
R.push(ty("f-type-Map", `type Map = number;\nconst g = () => new Map([[1, 2]]).size;`, num));
R.push(ty("f-type-state", `type state = number;\nconst g = (): state => 1;`, num));
R.push(ty("f-comp-Map", `const g = () => { const Map = (p: {}) => <div>m</div>; const e = <Map />; return typeof e === "object" ? 1 : 0; };`, (v) => v === 1));
R.push(ty("f-comp-h", `const g = () => { const C = (p: {}) => <div>m</div>; const h = 3; return h + (typeof <C /> === "object" ? 1 : 0); };`, (v) => v === 4));
R.push(ty("f-dollar-name", `const $x = () => 1;\nconst g = ($x: number) => $x + 1;`, num));
R.push(ty("f-dollar-ref", `const x = () => state(1);\nconst x$ref = () => 5;\nconst g = (x$ref: number) => x$ref + 1;`, (v) => v === 6));
R.push(ty("f-enum", `enum E { A = 1 }\nconst g = () => E.A;`, num));
// controls (checker skipped): names the d1 rule rejects, and a capability cell with its reader, to show what each runner does
R.push(ty("f-ctl-state", `const state = () => 1;\nconst g = (state: number) => state + 1;`, num, { ctl: true }));
R.push(ty("f-ctl-state-use", `const state = () => 1;\nconst g = () => { const s = state(0); return typeof s === "object" ? 1 : 0; };`, num, { ctl: true }));
R.push(ty("f-ctl-h", `const h = () => 5;\nconst g = (h: number) => h + 1;`, num, { ctl: true }));
R.push(ty("f-ctl-cap-now", `const now = () => 1;\nconst g = (now: number) => now + 1;`, num, { ctl: true }));
export const cands = R;
