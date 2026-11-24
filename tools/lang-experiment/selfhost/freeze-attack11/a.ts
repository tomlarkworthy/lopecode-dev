// freeze-attack11 A: width subtyping past ix-hides. Run: bun lite/infer/attack/drive-run.ts selfhost/freeze-attack11/a.ts
// and bun lite/infer/attack/drive-rt.ts selfhost/freeze-attack11/a.ts. Detectors in the drive:
//  RESP: a listed cell's value holds a Response (walked, promises awaited);
//  STATE: state cell c (initial 0) is not 0 at the end (an action ran with no event: the program has none);
//  TYPE: cell g's value fails the row's check of its checked type.
import { isAction } from "../../prelude.runtime.ts";
const U = `"https://x.test/"`;
const holds = async (v: unknown, d = 0, seen = new Set<unknown>()): Promise<boolean> => {
  if (d > 6 || v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return false;
  seen.add(v);
  if (v instanceof Response) return true;
  if (v instanceof Promise) { try { return await holds(await v, d + 1, seen); } catch { return false; } }
  try {
    if (typeof v === "function") return !isAction(v) && v.length === 0 ? await holds((v as () => unknown)(), d + 1, seen) : false;
    if (v instanceof Map) { for (const [a, b] of v) if (await holds(a, d + 1, seen) || await holds(b, d + 1, seen)) return true; return false; }
    if (v instanceof Set) { for (const a of v) if (await holds(a, d + 1, seen)) return true; return false; }
    for (const k of Object.keys(v)) if (await holds((v as Record<string, unknown>)[k], d + 1, seen)) return true;
  } catch {}
  return false;
};
type C = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown; ctl?: boolean; fetchBody?: string };
const R: C[] = [];
const st = (p: any, n: string) => `${n}:${p.status(n) ?? "-"}${p.error(n) ? "(" + String(p.error(n)).slice(0, 90) + ")" : ""}`;
const js = (v: unknown) => { try { return typeof v === "function" ? "fn" : JSON.stringify(v) ?? String(v); } catch { return String(v); } };
// ok: check of g's value; cells: cells walked for a Response
const row = (name: string, src: string, ok: ((v: unknown) => boolean) | null = null, cells = ["r", "g"], extra: Partial<C> = {}) => R.push({
  name, src, fetchBody: "body", show: ["c", "g", "r"],
  drive: async (p: any) => {
    const out: string[] = [];
    for (const n of cells) if (await holds(p.value(n))) out.push(`RESP ${n} holds a Response`);
    if (p.status("c") === "fulfilled" && p.value("c") !== 0) out.push(`STATE c is ${js(p.value("c"))} with no event`);
    if (ok && p.status("g") === "fulfilled" && !ok(p.value("g"))) out.push(`TYPE g is outside its type: ${typeof p.value("g")} ${js(p.value("g")).slice(0, 80)}`);
    return out.length ? `DIFF ${out.join("; ")}` : `same: ${["c", "g", "r"].map((n) => st(p, n) + "=" + js(p.value(n)).slice(0, 40)).join(" ")}`;
  }, ...extra });
const ctl = (name: string, src: string, ok: ((v: unknown) => boolean) | null = null, cells = ["r", "g"]) => { row(name, src, ok, cells, { ctl: true }); };
const P = (b: string) => `const r = async (fetch: Fetch) => { const res = await fetch(${U}); ${b} };`;
const X = `const x = { n: 1, res }; const o: { readonly n: number } = x;`;
const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
const ACTA = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action((k: unknown, j: unknown) => c.set(7));\n`;
const H = (k: string, v = "a") => `const x = { n: 1, ${k}: ${v} }; const o: { readonly n: number } = x;`;
const str = (v: unknown) => typeof v === "string";
const num = (v: unknown) => typeof v === "number";
const isN = (v: any) => v !== null && typeof v === "object" && typeof v.n === "number";

// A-R: a response hidden as an undeclared member of a record type with a required member (the builder's open hole, with a response)
row("a-r-extra", P(`${X} return o;`));
row("a-r-extra-unknown", P(`${X} const u: unknown = o; return { u };`));
row("a-r-extra-arr", P(`const x = { n: 1, res }; const o: readonly { readonly n: number }[] = [x]; return o;`));
row("a-r-extra-map", P(`${X} return new Map([["k", o]]);`));
row("a-r-extra-set", P(`${X} return new Set([o]);`));
row("a-r-extra-param", P(`const keep = (o: { readonly n: number }) => ({ o }); const x = { n: 1, res }; return keep(x);`));
row("a-r-extra-kept", P(`${X} return () => o;`));
row("a-r-extra-spread", P(`${X} return { ...o };`));
row("a-r-extra-rest", P(`${X} const { n, ...rest } = o; return rest;`));
row("a-r-extra-snapshot", P(`${X} return snapshot(o);`));
row("a-r-extra-promise", P(`${X} return Promise.resolve(o);`));
row("a-r-extra-gen", `const r = async function* (fetch: Fetch) { const res = await fetch(${U}); ${X} yield o; };`);
row("a-r-extra-then", `const r = (fetch: Fetch) => fetch(${U}).then((res) => { ${X} return o; });`);
row("a-r-extra-cast", P(`${X} return cast<{ readonly n: number }>(o);`));
row("a-r-extra-cast-unknown", P(`${X} const u: unknown = o; return cast<{ readonly n: number }>(u);`));
row("a-r-extra-name", P(`const x = { name: "n", res }; const o: { readonly name: string } = x; return o;`));
row("a-r-extra-ok", P(`const x = { ok: res.ok, res }; const o: { readonly ok: boolean } = x; return [o];`));
row("a-r-extra-nested", P(`const x = { n: 1, inner: { res } }; const o: { readonly n: number } = x; return { o };`));
row("a-r-extra-union", P(`${X} const u: { readonly n: number } | null = o; return { u };`));
row("a-r-extra-opt-union", P(`const x = { n: 1, res }; const u: { readonly n: number } | { readonly m: string } = x; return u;`));
row("a-r-extra-generic", P(`const id = <T extends { readonly n: number },>(v: T): T => v; ${X} return id(o);`));
row("a-r-extra-generic-ret", P(`const id = <T extends { readonly n: number },>(v: T): { readonly n: number } => v; const x = { n: 1, res }; return id(x);`));
row("a-r-extra-alias", `type N = { readonly n: number };\n` + P(`const x = { n: 1, res }; const o: N = x; return o;`));
row("a-r-extra-iface", `interface N { readonly n: number }\n` + P(`const x = { n: 1, res }; const o: N = x; return o;`));
row("a-r-extra-ternary", P(`const x = { n: 1, res }; const o: { readonly n: number } = res.ok ? x : { n: 2 }; return o;`));
row("a-r-extra-map-cb", P(`const xs = [1].map((i) => { const x = { n: i, res }; const o: { readonly n: number } = x; return o; }); return xs;`));
row("a-r-extra-state", `const s = () => state<{ readonly n: number }>({ n: 0 });\nconst r = async (fetch: Fetch, s: State<{ readonly n: number }>) => { const res = await fetch(${U}); ${X} s.set(o); return 1; };`, null, ["r", "s"]);
// two SoundScript readers of the hidden response (cells b, d): what they can do with it
row("a-r-two-ss", P(`${X} return o;`) + `\nconst b = (r: { readonly n: number }) => JSON.stringify(r);\nconst d = (r: { readonly n: number }) => equals(r, { n: 1 });`, null, ["r", "b", "d"]);
row("a-r-cast-back", P(`${X} const u: unknown = o; return u;`) + `\nconst g = async (r: { readonly n: number }) => { const u: unknown = r; const v = cast<{ readonly res: { readonly ok: boolean } }>(u); return v.res.ok; };`);
row("a-r-sc", P(`${X} return structuredClone(o);`));
ctl("a-r-ctl-direct", P(`return res;`));

// A-H: protocol members an intrinsic or the runtime calls, hidden by a record type with a required member
row("a-h-tojson-action", ACT + `const g = (a: Action<[]>) => { ${H("toJSON")} return JSON.stringify(o); };`, str);
row("a-h-tostring-template", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return \`\${o}\`; };`, str);
row("a-h-tostring-String", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return String(o); };`, str);
row("a-h-tostring-join", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return [o].join(","); };`, str);
row("a-h-tostring-sort", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return [o, o].toSorted().length; };`, num);
row("a-h-valueof-Number", ACT + `const g = (a: Action<[]>) => { ${H("valueOf")} return Number(o); };`, num);
row("a-h-then-action", ACT + `const g = (a: Action<[]>) => { ${H("then")} return o; };`, isN);
row("a-h-then-action-async", ACT + `const g = async (a: Action<[]>) => { ${H("then")} return o; };`, isN);
row("a-h-then-action-await", ACT + `const g = async (a: Action<[]>) => { ${H("then")} await o; return 1; };`, num);
row("a-h-then-action-resolve", ACT + `const g = (a: Action<[]>) => { ${H("then")} return { p: Promise.resolve(o) }; };`);
row("a-h-then-action-args", ACTA + `const g = (a: Action<[unknown, unknown]>) => { ${H("then")} return o; };`, isN);
row("a-h-then-action-rec", ACT + `const g = (a: Action<[]>) => { ${H("then")} return { o }; };`);
row("a-h-then-fn", `const g = () => { ${H("then", `(r: (v: string) => void) => r("s")`)} return o; };`, isN);
row("a-h-then-fn-async", `const g = async () => { ${H("then", `(r: (v: string) => void) => r("s")`)} return o; };`, isN);
row("a-h-then-fn-await", `const g = async () => { ${H("then", `(r: (v: string) => void) => r("s")`)} const v = await o; return v.n; };`, num);
row("a-h-then-fn-reader", `const k = () => { ${H("then", `(r: (v: string) => void) => r("s")`)} return o; };\nconst g = (k: { readonly n: number }) => k.n + 1;`, num);
row("a-h-then-fn-param", `const g = async () => { const f = async (o: { readonly n: number }) => o; const x = { n: 1, then: (r: (v: string) => void) => r("s") }; return (await f(x)).n; };`, num);
row("a-h-then-gen", `const g = async function* () { ${H("then", `(r: (v: string) => void) => r("s")`)} yield o; };`, isN);
row("a-h-then-number", `const g = () => { const o: { readonly n: number; readonly then: number } = { n: 1, then: 2 }; return o; };`, isN);
row("a-h-then-hidden-num-to-fn", `const g = () => { ${H("then", "2")} return o; };`, isN);
row("a-h-then-state", `const s = () => state<{ readonly n: number }>({ n: 0 });\nconst a = (s: State<{ readonly n: number }>) => action(() => { const x = { n: 1, then: (r: (v: string) => void) => r("s") }; const o: { readonly n: number } = x; s.set(o); });\nconst g = (s: { readonly n: number }) => s.n;`, num);
row("a-h-tojson-undef", `const g = () => { ${H("toJSON", "() => undefined")} return JSON.stringify(o).length; };`, num);
row("a-h-tojson-direct-undef", `const g = () => { const x = { n: 1, toJSON: () => undefined }; return JSON.stringify(x); };`, str);
row("a-h-json-undefined", `const g = () => JSON.stringify(undefined);`, str);
row("a-h-json-fn", `const g = () => JSON.stringify(() => 1);`, str);
row("a-h-json-undef-length", `const g = () => { const u: number | undefined = undefined; return JSON.stringify(u).length; };`, num);
row("a-h-tojson-value", `const g = () => { ${H("toJSON", `() => "z"`)} const back: { readonly n: number } = JSON.parse(JSON.stringify(o)); return back.n + 1; };`, num);
row("a-h-tostring-type", `const g = () => { ${H("toString", "() => 5")} return \`\${o}\`.length; };`, num);
row("a-h-valueof-type", `const g = () => { ${H("valueOf", `() => "x"`)} return Number(o) + 1; };`, num);
row("a-h-tostring-action-arr", ACT + `const g = (a: Action<[]>) => { const xs: readonly { readonly n: number }[] = [{ n: 1, toString: a } as { readonly n: number; readonly toString: Action<[]> }]; return xs.join(); };`, str);
ctl("a-h-ctl-then-action", ACT + `const g = (a: Action<[]>) => { const o = { n: 1, then: a }; return o; };`, isN);

// A-M: Mut values and handles past a one-member record type
row("a-m-extra-state-handle", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => { const x = { s: c, n: 1 }; const o: { readonly n: number } = x; return o; };`);
row("a-m-extra-state-unknown", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => { const x = { s: c, n: 1 }; const o: { readonly n: number } = x; const u: unknown = o; return { u }; };`);
row("a-m-extra-action", ACT + `const g = (a: Action<[]>) => { const x = { go: a, n: 1 }; const o: { readonly n: number } = x; return o; };`);
row("a-m-extra-action-unknown", ACT + `const g = (a: Action<[]>) => { const x = { go: a, n: 1 }; const o: { readonly n: number } = x; const u: unknown = o; return { u }; };`);
row("a-m-extra-mut-arr", `const g = () => { const xs = [1]; const x = { n: 1, xs }; const o: { readonly n: number } = x; xs.push(2); return { o, len: xs.length }; };`, (v: any) => v?.len === 2);
row("a-m-extra-mut-gen", `const g = function* () { const xs = [1]; const x = { n: 1, xs }; const o: { readonly n: number } = x; yield o; xs.push(2); yield o; };`);
row("a-m-extra-u8-gen", `const g = function* () { const t = new Uint8Array(2); const x = { n: 1, t }; const o: { readonly n: number } = x; yield o; t[0] = 9; yield { n: 2 }; };`);
row("a-m-extra-u8-kept", `const g = () => { const t = new Uint8Array(2); const x = { n: 1, t }; const o: { readonly n: number } = x; return { o, f: () => o.n }; };`);
row("a-m-extra-u8-action", `const c = (): StateCell<number> => state(0);\nconst s = () => state<{ readonly n: number }>({ n: 0 });\nconst a = (s: State<{ readonly n: number }>) => action(() => { const t = new Uint8Array(2); const x = { n: 1, t }; const o: { readonly n: number } = x; s.set(o); t[0] = 5; });\nconst g = (s: { readonly n: number }) => s;`);
row("a-m-extra-map", `const g = () => { const m = new Map([[1, 2]]); const x = { n: 1, m }; const o: { readonly n: number } = x; m.set(3, 4); return { o }; };`);
row("a-m-extra-async", `const g = async () => { const xs = [1]; const x = { n: 1, xs }; const o: { readonly n: number } = x; const p = Promise.resolve(o); xs.push(2); return await p; };`);


// A-H2: more callers of a hidden toString / valueOf / then
const ACTU = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.update((v) => v + 1));\n`;
row("a-h2-tostring-loop", ACTU + `const g = (a: Action<[]>, c: number) => { ${H("toString")} return \`\${o}\` + c; };`, str);
row("a-h2-tostring-messageOf", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return messageOf(o); };`, str);
row("a-h2-tostring-throw", ACT + `const g = (a: Action<[]>) => { ${H("toString")} try { throw o; } catch (e) { return messageOf(e); } };`, str);
row("a-h2-tostring-jsx-child", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return <div>{String(o)}</div>; };`);
row("a-h2-tostring-nested-arr", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return [[o]].join(";"); };`, str);
row("a-h2-tostring-other-cell", ACT + `const k = (a: Action<[]>) => { ${H("toString")} return o; };\nconst g = (k: { readonly n: number }) => \`\${k}\`;`, str);
row("a-h2-tostring-other-cell-arr", ACT + `const k = (a: Action<[]>) => { ${H("toString")} return [o]; };\nconst g = (k: readonly { readonly n: number }[]) => k.join("");`, str);
row("a-h2-tostring-kept", ACT + `const k = (a: Action<[]>) => { ${H("toString")} return () => String(o); };\nconst g = (k: () => string) => k();`, str);
row("a-h2-tostring-memo", ACT + `const k = (a: Action<[]>) => { ${H("toString")} return o; };\nconst m = () => memo((o: { readonly n: number }) => String(o));\nconst g = (k: { readonly n: number }, m: (o: { readonly n: number }) => string) => m(k);`, str);
row("a-h2-tostring-action-arg", ACT + `const s = () => state("");\nconst k = (a: Action<[]>) => { ${H("toString")} return o; };\nconst w = (s: State<string>) => action((o: { readonly n: number }) => s.set(String(o)));\nconst g = (k: { readonly n: number }) => k.n;`, num);
row("a-h2-tostring-unknown-String", ACT + `const g = (a: Action<[]>) => { ${H("toString")} const u: unknown = o; return String(u); };`, str);
row("a-h2-valueof-compare", ACT + `const g = (a: Action<[]>) => { ${H("valueOf")} return Number(o) > 0; };`);
row("a-h2-tostring-search", ACT + `const g = (a: Action<[]>) => { ${H("toString")} return new URLSearchParams({ k: String(o) }).toString(); };`, str);
row("a-h2-tojson-nested", ACT + `const g = (a: Action<[]>) => { ${H("toJSON")} return JSON.stringify([o, { o }]); };`, str);
row("a-h2-tojson-map-entries", ACT + `const g = (a: Action<[]>) => { ${H("toJSON")} return JSON.stringify(new Map([["k", o]]).get("k")); };`, str);
row("a-h2-tostring-generic", ACT + `const g = (a: Action<[]>) => { const show = <T extends { readonly n: number },>(v: T): string => String(v); const x = { n: 1, toString: a }; return show(x); };`, str);
row("a-h2-tostring-fn-arg", ACT + `const g = (a: Action<[]>) => { const show = (v: { readonly n: number }) => String(v); const x = { n: 1, toString: a }; return show(x); };`, str);
row("a-h2-tostring-direct", ACT + `const g = (a: Action<[]>) => { const x = { n: 1, toString: a }; return String(x); };`, str);
row("a-h2-tostring-direct-template", ACT + `const g = (a: Action<[]>) => { const x = { n: 1, toString: a }; return \`\${x}\`; };`, str);
row("a-h2-tostring-optional", ACT + `const g = (a: Action<[]>) => { const x = { n: 1, toString: a }; const o: { readonly n?: number } = x; return String(o); };`, str);
row("a-h2-then-promise-all", `const g = async () => { ${H("then", `(r: (v: string) => void) => r("s")`)} const [v] = await Promise.all([o]); return v.n + 1; };`, num);
row("a-h2-then-array-ret", `const g = async () => { ${H("then", `(r: (v: string) => void) => r("s")`)} return [await o][0]; };`, isN);
row("a-h2-then-other-cell", `const k = async () => { ${H("then", `(r: (v: string) => void) => r("s")`)} return o; };\nconst g = (k: { readonly n: number }) => k.n + 1;`, num);
row("a-h2-then-reject", `const g = async () => { ${H("then", `(r: (v: string) => void, j: (e: string) => void) => j("boom")`)} try { return (await o).n; } catch (e) { return -1; } };`, num);
row("a-h2-then-async-kept", `const g = () => { const f = async () => { ${H("then", `(r: (v: string) => void) => r("s")`)} return o; }; return f; };\nconst k = async (g: () => Promise<{ readonly n: number }>) => (await g()).n + 1;`, null);
ctl("a-h2-ctl-action-call", ACT + `const g = (a: Action<[]>) => { a(); return "x"; };`, str);
ctl("a-h2-ctl-then-plain-async", `const g = async () => { const x = { n: 1, then: (r: (v: string) => void) => r("s") }; return x; };`, isN);

// A-G: the shapes the task lists, held or not (verdicts mostly)
row("a-g-partial", P(`const c: Partial<{ readonly ok: boolean }> = res; return c;`));
row("a-g-readonly", P(`const c: Readonly<{ readonly ok: boolean }> = res; return c;`));
row("a-g-pick", P(`const c: Pick<FetchResponse, "ok"> = res; return c;`));
row("a-g-T-extends-empty", P(`const k = <T extends {},>(v: T): T => v; return k(res);`));
row("a-g-T-extends-ok", P(`const k = <T extends { readonly ok: boolean },>(v: T): T => v; return k(res);`));
row("a-g-T-default", P(`const k = <T = {},>(v: T): T => v; return k(res);`));
row("a-g-unknown-arr-extra", P(`const x = { n: 1, res }; const o: { readonly n: number } = x; const xs: readonly unknown[] = [o]; return xs;`));
row("a-g-obj-values", P(`const x = { n: 1, res }; const vs = Object.values(x); return vs.length;`), null);
row("a-g-obj-entries-extra", P(`const x = { n: 1, res }; const o: { readonly n: number } = x; return Object.entries(o).length;`), null);
row("a-g-obj-keys-extra", P(`const x = { n: 1, res }; const o: { readonly n: number } = x; return Object.keys(o);`), null);
row("a-g-json-extra", P(`const x = { n: 1, res }; const o: { readonly n: number } = x; return JSON.stringify(o);`), null);
row("a-g-template-extra", P(`const x = { n: 1, res }; const o: { readonly n: number } = x; return \`\${o}\`;`), null);
row("a-g-fn-param-type", P(`const x = { n: 1, res }; const take = (f: (o: { readonly n: number }) => number) => f(x); return take((o) => o.n);`), null);
row("a-g-index-rec", P(`const x = { n: 1, res }; const o: { readonly [k: string]: unknown } = x; return o;`));
row("a-g-index-num", P(`const x = { n: 1, res }; const o: { readonly n: number; readonly [k: string]: number } = x; return o;`));
row("a-g-intersection", P(`const x = { n: 1, res }; const o: { readonly n: number } & { readonly m?: string } = x; return o;`));
row("a-g-component-prop", `const C = (p: { readonly n: number }) => <div>{p.n}</div>;\n` + P(`const x = { n: 1, res }; return <C {...x} />;`));
row("a-g-component-spread-hidden", `const C = (p: { readonly n: number }) => <div>{p.n}</div>;\n` + P(`${X} return <C {...o} />;`));
row("a-g-action-arg", `const s = () => state<{ readonly n: number }>({ n: 0 });\nconst w = (s: State<{ readonly n: number }>) => action((o: { readonly n: number }) => s.set(o));\n` + P(`${X} return o.n;`));
row("a-g-events-yield", `const r = async function* (fetch: Fetch) { const res = await fetch(${U}); ${X} yield o; };\nconst s = () => state(0);\nconst w = (s: State<number>) => action((o: { readonly n: number }) => s.set(o.n));\nconst l = (r: Events<{ readonly n: number }>, w: Action<[{ readonly n: number }]>) => on(r, w);`);
row("a-g-hidden-events-handle", `const e = function* () { yield 1; };\nconst g = (e: Events<number>) => { const x = { n: 1, e }; const o: { readonly n: number } = x; return o; };`);
row("a-g-hidden-events-unknown", `const e = function* () { yield 1; };\nconst g = (e: Events<number>) => { const x = { n: 1, e }; const o: { readonly n: number } = x; const u: unknown = o; return { u }; };`);

// A-D: an Action declared as the member an implicit conversion calls, with no hiding (which conversions the checker sees)
const D = (k: string, e: string, ok: ((v: unknown) => boolean) | null = null) => row(`a-d-${k}-${e.replace(/[^a-z]+/gi, "_").slice(0, 24)}`, ACT + `const g = (a: Action<[]>) => { const x = { n: 1, ${k}: a }; return ${e}; };`, ok);
D("toString", "`${x}`", str); D("toString", `"" + x`, str); D("toString", "[x].join()", str); D("toString", "String(x)", str);
D("toString", "x < x", null); D("valueOf", "+x", num); D("valueOf", "x > 0", null); D("valueOf", "x == 1", null);
D("toString", "[x].toSorted().length", num); D("toJSON", "JSON.stringify(x)", str); D("toJSON", "JSON.stringify([x])", str);
D("toString", "messageOf(x)", str); D("toString", "`${[x]}`", str); D("valueOf", "Math.max(1, x)", num);
D("toString", "encodeURIComponent(x)", str); D("toString", "parseInt(x)", num); D("toString", "new URL(x)", null);
D("toString", "\"abc\".includes(x)", null); D("toString", "({ [x]: 1 })", null); D("toString", "x in { a: 1 }", null);
D("toString", "new Map([[1, 2]]).has(x)", null); D("toString", "[x].includes(x)", null);
row("a-d-tostring-plain-fn", `const g = () => { const x = { n: 1, toString: () => 5 }; return \`\${x}\`; };`, str);
row("a-d-tostring-returns-obj", `const g = () => { const x = { n: 1, toString: () => ({ m: 1 }) }; return \`\${x}\`.length; };`, num);
row("a-d-valueof-plain-str", `const g = () => { const x = { valueOf: () => "s" }; return +x; };`, num);
// A-O: the hidden response read by two readers in another language of the same module (drive-rt only: the after cells)
const ojs = (get: (r: any) => any) => ({
  o1: [["r"], async (r: any) => { try { return await get(await r).text(); } catch (e) { return "used: " + (e as Error).message; } }],
  o2: [["r"], async (r: any) => { for (let i = 0; i < 600; i++) await null; try { return await get(await r).text(); } catch (e) { return "used: " + (e as Error).message; } }],
});
const rowO = (name: string, src: string, get: (r: any) => any) => R.push({ name, src, fetchBody: "body", show: ["r", "o1", "o2"], after: ojs(get),
  drive: async (p: any) => (typeof p.value("o2") === "string" && /already used/i.test(p.value("o2")) && p.value("o1") === "body" ? `DIFF USED o2 found the body used after o1: ${p.value("o2")}` : `same: o1=${p.value("o1")} o2=${p.value("o2")}`) } as any);
rowO("a-o-extra-direct", P(`${X} return o;`), (r) => r.res);
rowO("a-o-extra-unknown", P(`${X} const u: unknown = o; return { u };`), (r) => r.u.res);
rowO("a-o-extra-spread", P(`${X} return { ...o };`), (r) => r.res);
// a function with a hidden structuredClone / snapshot throw (S2.6 says such a call is [type])
row("a-sc-hidden-fn", `const g = () => { const x = { n: 1, f: () => 1 }; const o: { readonly n: number } = x; return structuredClone(o).n; };`, num);
row("a-snap-hidden-fn", `const g = () => { const x = { n: 1, f: () => 1 }; const o: { readonly n: number } = x; return snapshot(o).n; };`, num);
row("a-sc-direct-fn", `const g = () => { const x = { n: 1, f: () => 1 }; return structuredClone(x).n; };`, num);

export const cands = R;
