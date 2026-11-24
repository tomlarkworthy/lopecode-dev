// d1 (2026-11-24): the owner's five decisions. A: fetch gives a Mut<FetchResponse>, and a response is one-shot (S3.19):
// no cell value, state content or capture holds one. B: a record with an index signature takes literal keys only.
// D: delete only on an optional member or an index-signature entry. E: a let or parameter a nested function assigns is
// never narrowed. F: a cell may not take a name the compiled module declares. A row named d1-ok-* must be accepted and
// behave; every other row must be rejected (live.test.ts asserts both, in both checkers). A row with ctl runs with the
// checker skipped and must show the break (counted apart as d1-controls). tyRow (lib9, imported) reads cell g and says
// DIFF when g holds a value outside its checked type.
import { tyRow, type Cand } from "../../../selfhost/freeze-attack9/lib9.ts";
// freeze-attack3/harness.ts W, written here: that harness imports run-sets.ts, which imports this file
const W = "for (let i = 0; i < 300; i++) await null; ";
type A = Cand;
const R: A[] = [];
const is = (...xs: unknown[]) => (v: unknown) => xs.some((x) => JSON.stringify(x) === JSON.stringify(v));
const any = () => true;

// A: a response. f(body) gives the row a fetch whose response has that body
const U = `"https://x.test/"`;
const f = (body: string) => (row: A): A => ({ ...row, fetchBody: body });
const RD = `\nconst g = async (r: FetchResponse) => await r.text();`;
R.push(f("body")(tyRow("d1-resp-direct", `const r = async (fetch: Fetch) => fetch(${U});${RD}`, any)));
R.push(f("body")(tyRow("d1-resp-await", `const r = async (fetch: Fetch) => await fetch(${U});${RD}`, any)));
R.push(f("body")(tyRow("d1-resp-sync-cell", `const r = (fetch: Fetch) => fetch(${U});${RD}`, any)));
R.push(f("body")(tyRow("d1-resp-record", `const r = async (fetch: Fetch) => ({ res: await fetch(${U}) });\nconst g = async (r: { readonly res: FetchResponse }) => await r.res.text();`, any)));
R.push(f("body")(tyRow("d1-resp-array", `const g = async (fetch: Fetch) => [await fetch(${U})];`, any)));
R.push(f("body")(tyRow("d1-resp-promise-in-record", `const g = (fetch: Fetch) => ({ p: fetch(${U}) });`, any)));
R.push(f("body")(tyRow("d1-resp-union", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); return res.ok ? res : null; };`, any)));
R.push(f("body")(tyRow("d1-resp-alias", `type Resp = FetchResponse;\nconst g = async (fetch: Fetch) => { const res: Resp = await fetch(${U}); return res; };`, any)));
R.push(f("body")(tyRow("d1-resp-unknown", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const c: unknown = res; return c; };`, any)));
R.push(f("body")(tyRow("d1-resp-object", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const c: object = res; return { c }; };`, any)));
R.push(f("body")(tyRow("d1-resp-kept-fn", `const k = async (fetch: Fetch) => { const res = await fetch(${U}); return () => res.ok; };\nconst g = (k: () => boolean) => k();`, any)));
R.push(f("body")(tyRow("d1-resp-kept-plain-rebind", `const k = async (fetch: Fetch) => { const res = await fetch(${U}); const c: FetchResponse = res; return async () => await c.text(); };\nconst g = async (k: () => Promise<string>) => [await k(), await k()];`, any)));
R.push(f("body")(tyRow("d1-resp-kept-record", `const k = async (fetch: Fetch) => { const res = await fetch(${U}); const o = { res }; return { t: async () => await o.res.text() }; };\nconst g = async (k: { readonly t: () => Promise<string> }) => [await k.t(), await k.t()];`, any)));
R.push(f("body")(tyRow("d1-resp-kept-promise", `const k = (fetch: Fetch) => { const p = fetch(${U}); return async () => (await p).text(); };\nconst g = async (k: () => Promise<string>) => [await k(), await k()];`, any)));
R.push(f("body")(tyRow("d1-resp-helper", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); const okOf = () => res.ok; return okOf(); };`, any)));
R.push(f("body")(tyRow("d1-resp-action", `const s = () => state(0);\nconst a = async (fetch: Fetch, s: State<number>) => { const res = await fetch(${U}); return { go: action(() => s.set(res.status)) }; };\nconst g = (s: number) => s;`, any)));
R.push(f("body")(tyRow("d1-resp-generator", `const g = async function* (fetch: Fetch) { const res = await fetch(${U}); yield res; };`, any)));
R.push(f("body")(tyRow("d1-resp-generator-fn", `const g = async function* (fetch: Fetch) { const res = await fetch(${U}); yield { f: () => res.status }; };`, any)));
R.push(tyRow("d1-resp-state", `const g = () => state<FetchResponse | null>(null);`, any));
R.push(f("body")(tyRow("d1-resp-state-hidden", `const s = () => state<{ readonly v: unknown } | null>(null);\nconst a = async (fetch: Fetch, s: State<{ readonly v: unknown } | null>) => { const res = await fetch(${U}); return { go: action(() => s.set({ v: res })) }; };\nconst g = (s: { readonly v: unknown } | null) => s;`, any)));
R.push(f("body")(tyRow("d1-resp-write-ok", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); res.ok = false; return res.ok; };`, any)));
R.push(f("body")(tyRow("d1-resp-write-json", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); res.json = async () => 1; return await res.json(); };`, any)));
R.push(f("body")(tyRow("d1-resp-delete", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); delete res.ok; return res.ok; };`, any)));
R.push(f("body")(tyRow("d1-resp-memo", `const g = (fetch: Fetch) => memo((r: FetchResponse) => r.ok);`, any)));
// accepted: the response is read in the cell that fetched it
R.push(f("[1,2]")(tyRow("d1-ok-resp-one-cell", `const g = async (fetch: Fetch) => (await fetch(${U})).json();`, is([1, 2]))));
R.push(f("[1,2]")(tyRow("d1-ok-resp-local-check", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); if (!res.ok) return null; return res.json(); };`, is([1, 2]))));
R.push(f("body")(tyRow("d1-ok-resp-members", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); return [res.ok, res.status, await res.text()]; };`, is([true, 200, "body"]))));
R.push(f("abcd")(tyRow("d1-ok-resp-arraybuffer", `const g = async (fetch: Fetch) => { const res = await fetch(${U}); return (await res.arrayBuffer()).byteLength; };`, is(4))));
R.push(f("[3]")(tyRow("d1-ok-resp-then", `const g = (fetch: Fetch) => fetch(${U}).then((r) => r.json());`, is([3]))));
R.push(f("body")(tyRow("d1-ok-resp-read-then-capture", `const k = async (fetch: Fetch) => { const res = await fetch(${U}); const ok = res.ok; return () => ok; };\nconst g = (k: () => boolean) => k();`, is(true))));
R.push(f("body")(tyRow("d1-ok-resp-helper-param", `const g = async (fetch: Fetch) => { const read = (r: FetchResponse) => r.text(); const res = await fetch(${U}); return await read(res); };`, is("body"))));
// a response held across an await or a yield: no other code reaches it, so R-A and R-Y do not take it (S5.6, S5.7)
R.push(f("[1]")(tyRow("d1-ok-resp-generator", `const g = async function* (fetch: Fetch) { const res = await fetch(${U}); yield await res.json(); };`, is([1]))));
R.push(f("[1]")(tyRow("d1-ok-resp-nested-async", `const g = async (fetch: Fetch) => { const load = async () => { const res = await fetch(${U}); return await res.json(); }; return await load(); };`, is([1]))));
// control (checker skipped): two cells read one response's body; the second finds it used
R.push({ name: "d1-ctl-resp-two-readers", ctl: true, fetchBody: "body", show: ["b", "c"],
  src: `const r = async (fetch: Fetch) => await fetch(${U});\nconst b = async (r: FetchResponse) => await r.text();\nconst c = async (r: FetchResponse) => { ${W}${W}try { return await r.text(); } catch (e) { return "used: " + messageOf(e); } };`,
  drive: (p: any) => { const c = p.value("c"); return typeof c === "string" && c.startsWith("used") ? `DIFF c read the body after b: ${c}` : `same: ${c}`; } });

// B: a record with an index signature takes literal keys only. K: a cell giving the key "toString" at run time
const K = (k = "toString") => `const k = () => ${JSON.stringify(k)};\n`;
const IX = "{ [k: string]: number }";
R.push(tyRow("d1-key-read", `${K()}const g = (k: string) => { const m: ${IX} = { x: 1 }; const v = m[k]; return v === undefined ? "none" : typeof v; };`, is("none", "number")));
R.push(tyRow("d1-key-read-record-type", `${K()}const g = (k: string) => { const m: Record<string, number> = { x: 1 }; return typeof m[k]; };`, is("number", "undefined")));
R.push(tyRow("d1-key-read-input", `${K()}const m = (): ${IX} => ({ x: 1 });\nconst g = (k: string, m: ${IX}) => typeof m[k];`, is("number", "undefined")));
R.push(tyRow("d1-key-in", `${K()}const g = (k: string) => { const m: ${IX} = { x: 1 }; return k in m; };`, is(false)));
R.push(tyRow("d1-key-write-proto", `${K("__proto__")}const g = (k: string) => { const m: { [k: string]: number[] } = {}; m[k] = [1]; return Object.keys(m).length; };`, is(1)));
R.push(tyRow("d1-key-compound", `${K()}const g = (k: string) => { const m: ${IX} = {}; m[k] = (m[k] ?? 0) + 1; return m; };`, any));
R.push(tyRow("d1-key-delete", `${K()}const g = (k: string) => { const m: ${IX} = { x: 1 }; delete m[k]; return m; };`, any));
R.push(tyRow("d1-key-template", `${K()}const g = (k: string) => { const m: ${IX} = { x: 1 }; return typeof m[\`\${k}\`]; };`, is("number", "undefined")));
R.push(tyRow("d1-key-from-keys", `const g = () => { const a: ${IX} = { toString: 1 }; const b: ${IX} = { x: 2 }; return Object.keys(a).map((k) => typeof b[k]); };`, (v) => JSON.stringify(v) === '["undefined"]'));
R.push(tyRow("d1-key-nullable-receiver", `${K()}const g = (k: string) => { const m: ${IX} | null = { x: 1 }; return m === null ? "null" : typeof m[k]; };`, is("number", "undefined")));
R.push(tyRow("d1-key-string-or-lit", `${K()}const g = (k: string) => { const j: "x" | string = k; const m: ${IX} = { x: 1 }; return typeof m[j]; };`, is("number", "undefined")));
R.push(tyRow("d1-key-param-helper", `const g = () => { const put = (m: Mut<{ [k: string]: number[] }>, k: string) => { m[k] = [1]; }; const m: { [k: string]: number[] } = {}; put(m, "__proto__"); return Object.keys(m).length; };`, is(1)));
R.push(tyRow("d1-ok-key-literal", `const g = () => { const m: ${IX} = { x: 1 }; m["y"] = 2; return [m["x"] ?? 0, m.y ?? 0, "x" in m]; };`, is([1, 2, true])));
R.push(tyRow("d1-ok-key-const-literal", `const g = () => { const k = "x"; const m: ${IX} = { x: 1 }; return m[k] ?? 0; };`, is(1)));
R.push(tyRow("d1-ok-key-literal-union", `const g = () => { const f = (k: "x" | "y") => { const m: ${IX} = { x: 1, y: 2 }; return m[k] ?? 0; }; return [f("x"), f("y")]; };`, is([1, 2])));
// w1 (2026-11-24, Step 2): a literal key named toString is refused now
R.push(tyRow("d1-key-entries-w1", `const g = () => { const m: ${IX} = { x: 1, toString: 2 }; return [Object.keys(m), Object.values(m), Object.entries(m).map(([k, v]) => k + v)]; };`, is([["x", "toString"], [1, 2], ["x1", "toString2"]])));
R.push(tyRow("d1-ok-key-map", `${K()}const g = (k: string) => { const m = new Map<string, number>([["x", 1]]); m.set(k, 2); return [m.get(k) ?? 0, m.has("toString"), m.size]; };`, is([2, true, 2])));
R.push(tyRow("d1-ok-key-from-entries", `${K("__proto__")}const g = (k: string) => { const m: { [k: string]: number } = Object.fromEntries([[k, 1]]); return Object.entries(m).length; };`, is(1)));
R.push({ name: "d1-ctl-key-inherited", ctl: true, show: ["g"], src: `${K()}const g = (k: string) => { const m: ${IX} = { x: 1 }; return typeof m[k]; };`,
  drive: (p: any) => { const v = p.value("g"); return v === "function" ? `DIFF g read an inherited member: ${v}` : `same: ${v}`; } });

// D: delete takes only an optional member or an index-signature entry. g's checked type says a number; undefined is a lie
const num = (v: unknown) => typeof v === "number";
R.push(tyRow("d1-del-required", `const g = () => { const m = { n: 1 }; delete m.n; return m.n; };`, num));
R.push(tyRow("d1-del-required-annotated", `const g = () => { const m: { n: number; b: number } = { n: 1, b: 2 }; delete m.n; return m.n; };`, num));
R.push(tyRow("d1-del-required-mut", `const g = () => { const m: Mut<{ n: number }> = { n: 1 }; delete m.n; return m.n; };`, num));
R.push(tyRow("d1-del-required-param", `const g = () => { const drop = (m: Mut<{ n: number }>) => { delete m.n; }; const m = { n: 1 }; drop(m); return m.n; };`, num));
R.push(tyRow("d1-del-computed-literal", `const g = () => { const m = { n: 1 }; delete m["n"]; return m.n; };`, num));
R.push(tyRow("d1-del-index-and-member", `const g = () => { const m: { [k: string]: number; n: number } = { n: 1 }; delete m.n; return m.n; };`, num));
R.push(tyRow("d1-del-alias", `type T = { n: number };\nconst g = () => { const m: Mut<T> = { n: 1 }; delete m.n; return m.n; };`, num));
R.push(tyRow("d1-del-union-member", `const g = () => { const m: Mut<{ k: 1; n?: number } | { k: 2; n: number }> = { k: 2, n: 1 }; delete m.n; return m.k === 2 ? m.n : 0; };`, num));
R.push(tyRow("d1-del-element", `const g = () => { const xs = [1, 2]; delete xs[0]; return xs[0] ?? -1; };`, num));
R.push(tyRow("d1-del-tuple", `const g = () => { const t: [number, number] = [1, 2]; delete t[0]; return t[0]; };`, num));
R.push(tyRow("d1-del-map-member", `const g = () => { const m = new Map<string, number>(); delete m.size; return m.size; };`, num));
R.push(tyRow("d1-ok-del-optional", `const g = () => { const m: { n?: number; b: number } = { n: 1, b: 2 }; delete m.n; return [m.n ?? -1, m.b]; };`, is([-1, 2])));
R.push(tyRow("d1-ok-del-optional-mut", `const g = () => { const drop = (m: Mut<{ n?: number }>) => { delete m.n; }; const m: { n?: number } = { n: 1 }; drop(m); return m.n ?? -1; };`, is(-1)));
R.push(tyRow("d1-ok-del-index-literal", `const g = () => { const m: { [k: string]: number } = { x: 1, y: 2 }; delete m["x"]; delete m.y; return Object.keys(m).length; };`, is(0)));
R.push(tyRow("d1-ok-del-index-const", `const g = () => { const k = "x"; const m: { [k: string]: number } = { x: 1 }; delete m[k]; return m[k] ?? -1; };`, is(-1)));
R.push(tyRow("d1-ok-del-rest", `const g = () => { const o = { n: 1, b: 2 }; const { n: _, ...rest } = o; return rest; };`, is({ b: 2 })));
R.push({ ...tyRow("d1-ctl-del-required", `const g = () => { const m = { n: 1 }; delete m.n; return typeof m.n; };`, (v) => v === "number"), ctl: true });

// E: a let or parameter that a nested function assigns is never narrowed. g's checked type says a number
const NUL = "let r: { readonly n: number } | null = { n: 1 };";
R.push(tyRow("d1-nar-helper", `const g = () => { ${NUL} const bad = () => { r = null; }; if (r !== null) { bad(); return r.n; } return 0; };`, num));
R.push(tyRow("d1-nar-hoisted-after", `const g = () => { ${NUL} if (r !== null) { bad(); return r.n; } function bad() { r = null; } return 0; };`, num));
R.push(tyRow("d1-nar-hoisted-before", `const g = () => { ${NUL} function bad() { r = null; } if (r !== null) { bad(); return r.n; } return 0; };`, num));
R.push(tyRow("d1-nar-init-only", `const g = () => { ${NUL} const bad = () => { r = null; }; bad(); return r.n; };`, num));
R.push(tyRow("d1-nar-deeper", `const g = () => { ${NUL} const outer = () => { const inner = () => { r = null; }; inner(); }; if (r !== null) { outer(); return r.n; } return 0; };`, num));
R.push(tyRow("d1-nar-arrow-in-init", `const g = () => { ${NUL} const fs = [() => { r = null; }]; if (r !== null) { fs.forEach((f) => f()); return r.n; } return 0; };`, num));
R.push(tyRow("d1-nar-object-method", `const g = () => { ${NUL} const o = { m() { r = null; } }; if (r !== null) { o.m(); return r.n; } return 0; };`, num));
R.push(tyRow("d1-nar-param", `const g = () => { const f = (p: { readonly n: number } | null) => { const bad = () => { p = null; }; if (p !== null) { bad(); return p.n; } return 0; }; return f({ n: 1 }); };`, num));
R.push(tyRow("d1-nar-union-tag", `type U = { readonly ok: true; readonly value: number } | { readonly ok: false };\nconst g = () => { const mk = (b: boolean): U => (b ? { ok: true, value: 1 } : { ok: false }); let r = mk(true); const bad = () => { r = mk(false); }; if (r.ok) { bad(); return r.value; } return 0; };`, num));
R.push(tyRow("d1-nar-typeof", `const g = (): number => { let r: number | string = 1; const bad = () => { r = "s"; }; if (typeof r === "number") { bad(); return r; } return 0; };`, num));
R.push(tyRow("d1-nar-update", `const g = () => { let r: number | null = 1; const bad = () => { r = null; }; const inc = () => { if (r !== null) r++; }; if (r !== null) { bad(); inc(); return r; } return 0; };`, num));
R.push(tyRow("d1-nar-cast", `const g = (): number | string => { let r = cast<number>(1); const bad = () => { r = cast<number>("x"); }; if (r.ok) { bad(); return r.value; } return "R"; };`, (v) => v === "R" || typeof v === "number"));
R.push(tyRow("d1-ok-nar-const-copy", `const g = () => { ${NUL} const bad = () => { r = null; }; const y = r; if (y !== null) { bad(); return y.n; } return 0; };`, is(1)));
R.push(tyRow("d1-ok-nar-no-nested-write", `const g = () => { ${NUL} const read = () => r; if (r !== null) { read(); return r.n; } return 0; };`, is(1)));
R.push(tyRow("d1-ok-nar-inner-own-let", `const g = () => { const f = () => { let r: number | null = 1; if (r !== null) r = r + 1; return r ?? 0; }; return f(); };`, is(2)));
R.push(tyRow("d1-ok-nar-reassign-direct", `const g = () => { let r: number | null = 1; r = 2; return r === null ? 0 : r + 1; };`, is(3)));
R.push({ ...tyRow("d1-ctl-nar-helper", `const g = () => { ${NUL} const bad = () => { r = null; }; if (r !== null) { bad(); return typeof r; } return "R"; };`, (v) => v === "object" || v === "R"), ctl: true, src: `const g = () => { let r: { readonly n: number } | null = { n: 1 }; const bad = () => { r = null; }; if (r !== null) { bad(); return r === null ? "null" : "object"; } return "R"; };` });

// F: a cell named after a prelude name the compiled cell binds (tcPrelude) is reserved-name
R.push(tyRow("d1-name-state", `const state = () => 1;\nconst g = (state: number) => state + 1;`, num));
R.push(tyRow("d1-name-cast", `const cast = () => 1;\nconst g = (cast: number) => cast + 1;`, num));
R.push(tyRow("d1-name-h", `const h = () => 5;\nconst g = (h: number) => h + 1;`, num));
R.push(tyRow("d1-name-h-escape", `const \\u0068 = () => 1;\nconst g = () => 1;`, num));
R.push(tyRow("d1-name-memo", `const memo = () => 1;\nconst g = (memo: number) => memo;`, num));
R.push(tyRow("d1-name-read", `const read = () => 1;\nconst g = (read: number) => read;`, num));
R.push(tyRow("d1-name-on", `const on = () => 1;\nconst g = (on: number) => on + 1;`, num));
R.push(tyRow("d1-name-action", `const action = () => 1;\nconst g = (action: number) => action + 1;`, num));
R.push(tyRow("d1-name-equals", `const equals = () => 1;\nconst g = () => 1;`, num));
R.push(tyRow("d1-name-messageOf", `const messageOf = () => "m";\nconst g = () => 1;`, num));
R.push(tyRow("d1-ok-name-param", `const g = () => { const f = (state: number, h: number) => state + h; return f(1, 2); };`, is(3)));
R.push(tyRow("d1-ok-name-local", `const g = () => { const read = 2; const memo = 3; return read + memo; };`, is(5)));
R.push(tyRow("d1-ok-name-near", `const states = () => 1;\nconst g = (states: number) => states + 1;`, is(2)));

export const attacks: A[] = R;
export const cands = R;
