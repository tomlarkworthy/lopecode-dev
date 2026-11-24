// freeze-attack12 target 1, the two accepted routes that gave a break in forget.ts, and their variants:
// V: a function type whose result is void takes a function that returns a response (fnSub: a void result takes any);
// G: a generator object given object (or unknown) by a plain cell, which the runtime then runs as a generator cell
import { tyRow, twiceDrive, type Cand } from "./lib12.ts";
const R: Cand[] = [];
const U = `"https://x.test/"`;
const resp = async (v: any) => await v.text();
const respAt = (k: string) => async (v: any) => await v[k].text();
const V = (name: string, src: string, read = resp) => R.push({ name: `v-${name}`, src, fetchBody: "body", show: ["g"], drive: twiceDrive(read) });
V("param-mut", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = (y) => y; const u: unknown = f(res); return u; };`);
V("param-plain", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: FetchResponse) => void = (y) => y; const u: unknown = f(res); return u; };`);
V("annotated-void", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f = (y: Mut<FetchResponse>): void => y; const u: unknown = f(res); return u; };`);
V("in-record", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const k: { readonly f: (y: Mut<FetchResponse>) => void } = { f: (y) => y }; const u: unknown = k.f(res); return u; };`);
V("into-record", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = (y) => y; return { n: 1, u: f(res) }; };`, respAt("u"));
V("void-typed-member", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = (y) => y; const r: { readonly v: void } = { v: f(res) }; return r; };`, respAt("v"));
V("return-void", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = (y) => y; return f(res); };`);
V("array", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = (y) => y; return [f(res)]; };`, async (v: any) => await v[0].text());
V("async-fn", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = async (y) => y; const u: unknown = await f(res); return u; };`);
V("generic-helper", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const run = <T,>(h: (y: T) => void, y: T): void => h(y); const u: unknown = run((z: Mut<FetchResponse>) => z, res); return u; };`);
V("map-void", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const xs: readonly void[] = [res].map((y): void => y); return xs; };`, async (v: any) => await v[0].text());
V("map-cb-void-type", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const id: (y: Mut<FetchResponse>) => void = (y) => y; const xs = [res].map(id); return xs; };`, async (v: any) => await v[0].text());
V("two-cells", `const r = async (fetch: Fetch) => { const res = await fetch(${U}); const f: (y: Mut<FetchResponse>) => void = (y) => y; return { v: f(res) }; };\nconst g = (r: { readonly v: void }) => r;`, respAt("v"));
R.push({ name: "v-ctl-direct-unknown", ctl: true, src: `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const u: unknown = res; return u; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(resp) });
// G: the cell's checked type is object; a value of type object is not a number
const isObj = (v: unknown) => (typeof v === "object" && v !== null) || typeof v === "function";
R.push(tyRow("gobj-object", `const g = () => { function* mk() { yield 1; yield 2; } const u: object = mk(); return u; };`, isObj));
R.push(tyRow("gobj-object-async", `const g = () => { async function* mk() { yield "s"; } const u: object = mk(); return u; };`, isObj));
R.push(tyRow("gobj-object-union", `const g = () => { function* mk() { yield 1; } const u: object | null = mk(); return u; };`, (v) => v === null || isObj(v)));
R.push(tyRow("gobj-object-ret", `const g = (): object => { function* mk() { yield 1; } return mk(); };`, isObj));
R.push(tyRow("gobj-consumer-typeof", `const g = () => { function* mk() { yield 1; } const u: object = mk(); return u; };\nconst k2 = (g: object) => typeof g;`, (v) => v === "object" || v === "function", false, "k2"));
R.push(tyRow("gobj-consumer-keys", `const g = () => { function* mk() { yield "ab"; } const u: object = mk(); return u; };\nconst k2 = (g: object) => (Array.isArray(g) ? -1 : typeof g === "string" ? 99 : 0);`, (v) => v !== 99, false, "k2"));
R.push(tyRow("gobj-yield-action", `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst g = (a: Action<[]>) => { function* mk() { yield a; } const u: object = mk(); return u; };`, isObj));
R.push(tyRow("gobj-catch", `const g = () => { function* mk() { yield 1; } try { throw mk(); } catch (e) { const u: unknown = e; return u; } return 0; };`, () => true));
R.push(tyRow("gobj-iter-object", `const g = () => { const u: object = [1, 2].values(); return u; };`, isObj));
R.push(tyRow("gobj-mapiter-object", `const g = () => { const u: object = new Map([[1, 2]]).entries(); return u; };`, isObj));
R.push({ ...tyRow("gobj-ctl-generator-own-type", `const g = () => { function* mk() { yield 1; yield 2; } return mk(); };`, isObj), ctl: true });
export const cands = R;
