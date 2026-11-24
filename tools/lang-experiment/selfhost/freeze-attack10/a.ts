// A: a response (one-shot body) reaching two readers. Run: bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/a.ts
// (and drive-run for the rows with no outside/after). Detectors, in the drive:
//  - RESP: a value some cell gave holds a Response (walked to depth 6, promises awaited): the rule's own invariant.
//  - USED: reader c (run after b) found the body used.
//  - o1/o2: two plain JavaScript variables (cells of another language) read the body of the SoundScript cell's value.
const U = `"https://x.test/"`;
const W = "for (let i = 0; i < 300; i++) await null; ";
const holds = async (v: unknown, d = 0, seen = new Set<unknown>()): Promise<boolean> => {
  if (d > 6 || v === null || typeof v !== "object" || seen.has(v)) return false;
  seen.add(v);
  if (v instanceof Response) return true;
  if (v instanceof Promise) { try { return await holds(await v, d + 1, seen); } catch { return false; } }
  try {
    if (v instanceof Map) { for (const [a, b] of v) if (await holds(a, d + 1, seen) || await holds(b, d + 1, seen)) return true; return false; }
    if (v instanceof Set) { for (const a of v) if (await holds(a, d + 1, seen)) return true; return false; }
    for (const k of Object.keys(v)) if (await holds((v as any)[k], d + 1, seen)) return true;
    if (v instanceof Error && await holds((v as any).cause, d + 1, seen)) return true;
  } catch {}
  return false;
};
const drive = (cells: string[]) => async (p: any) => {
  const out: string[] = [];
  for (const n of cells) if (await holds(p.value(n))) out.push(`RESP ${n} holds a Response`);
  const c = p.value("c");
  if (typeof c === "string" && c.startsWith("used") && /already used/i.test(c)) out.push(`USED c read the body after b: ${c}`);
  for (const o of ["o2"]) { const v = p.value(o); if (typeof v === "string" && /already used/i.test(v) && p.value("o1") === "body") out.push(`USED ${o}: ${v}`); }
  return out.length ? `DIFF ${out.join("; ")}` : `same: b=${JSON.stringify(p.value("b"))} c=${JSON.stringify(p.value("c"))} st=${["r", "k", "b", "c"].map((n) => `${n}:${p.status(n) ?? "-"}${p.error(n) ? "(" + p.error(n).slice(0, 80) + ")" : ""}`).join(",")}`;
};
// OJS readers of the SoundScript cell r: get(r) is the response inside r's value
const ojs = (get: (r: any) => any, cell = "r") => ({
  o1: [[cell], async (r: any) => { try { return await get(await r).text(); } catch (e) { return "used: " + (e as Error).message; } }] as [string[], (...a: any[]) => unknown],
  o2: [[cell], async (r: any) => { for (let i = 0; i < 600; i++) await null; try { return await get(await r).text(); } catch (e) { return "used: " + (e as Error).message; } }] as [string[], (...a: any[]) => unknown],
});
type C = { name: string; src: string; show?: string[]; drive?: any; ctl?: boolean; fetchBody?: string; outside?: any; after?: any };
const R: C[] = [];
const row = (name: string, src: string, extra: Partial<C> = {}) => R.push({ name, src, fetchBody: "body", show: ["r", "k", "b", "c", "o1", "o2"], drive: drive(["r", "k", "b", "c"]), ...extra });
const P = (b: string) => `const r = async (fetch: Fetch) => { const res = await fetch(${U}); ${b} };`;
// two SoundScript readers b and c of r's value, through the read expression x (r is the parameter)
const two = (T: string, x: string) => `\nconst b = async (r: ${T}) => await ${x};\nconst c = async (r: ${T}) => { ${W}${W}try { return await ${x}; } catch (e) { return "used: " + messageOf(e); } };`;
// two readers that call a kept function k
const twoK = (T: string, x: string) => `\nconst b = async (k: ${T}) => await ${x};\nconst c = async (k: ${T}) => { ${W}${W}try { return await ${x}; } catch (e) { return "used: " + messageOf(e); } };`;

// read-only views of the response
row("a-empty-rec", P(`const c: {} = res; return { c };`), { after: ojs((r) => r.c) });
row("a-empty-direct", P(`const c: {} = res; return c;`), { after: ojs((r) => r) });
row("a-empty-arr", P(`const c: {} = res; return [c];`), { after: ojs((r) => r[0]) });
row("a-empty-then", `const r = (fetch: Fetch) => fetch(${U}).then((x) => { const c: {} = x; return { c }; });`, { after: ojs((r) => r.c) });
row("a-empty-cond", P(`const c: {} | null = res.ok ? res : null; return { c };`), { after: ojs((r) => r.c) });
row("a-empty-kept", `const k = async (fetch: Fetch) => { const res = await fetch(${U}); const c: {} = res; return () => c; };`, { after: ojs((k) => k(), "k") });
row("a-empty-map", P(`const c: {} = res; return new Map([["c", c]]);`), { after: ojs((r) => r.get("c")) });
row("a-empty-set", P(`const c: {} = res; return new Set([c]);`), { after: ojs((r) => [...r][0]) });
row("a-empty-tuple", P(`const c: {} = res; const t: [{}, number] = [c, 1]; return t;`), { after: ojs((r) => r[0]) });
row("a-empty-nested", P(`const c: {} = res; return { a: { b: [c] } };`), { after: ojs((r) => r.a.b[0]) });
row("a-empty-promise", P(`const c: {} = res; return { p: Promise.resolve(c) };`));
row("a-empty-generator", `const r = async function* (fetch: Fetch) { const res = await fetch(${U}); const c: {} = res; yield { c }; };`, { after: ojs((r) => r.c) });
row("a-empty-param-fn", P(`const hide = (x: {}) => ({ x }); return hide(res);`), { after: ojs((r) => r.x) });
row("a-empty-ternary", P(`const c: {} = res.ok ? res : {}; return { c };`), { after: ojs((r) => r.c) });
row("a-empty-or", P(`const c: {} = res || {}; return { c };`));
row("a-empty-optional", P(`const o: { readonly c?: {} } = { c: res }; return o;`), { after: ojs((r) => r.c) });
row("a-empty-state", `const s = () => state<{ readonly c: {} } | null>(null);\nconst a = async (fetch: Fetch, s: State<{ readonly c: {} } | null>) => { const res = await fetch(${U}); const c: {} = res; s.set({ c }); return 1; };`);
row("a-empty-state-action", `const s = () => state<{ readonly c: {} } | null>(null);\nconst a = async (fetch: Fetch, s: State<{ readonly c: {} } | null>) => { const res = await fetch(${U}); const c: {} = res; return { go: action(() => s.set({ c })) }; };\nconst g = (s: { readonly c: {} } | null) => s;`, { show: ["g"], drive: async (p: any) => { const a = p.value("a"); if (a && typeof a.go === "function") { a.go(); await p.settle(); } return (await holds(p.value("g"))) ? "DIFF RESP g (state content) holds a Response" : `same: g=${p.status("g")}`; } });
row("a-empty-undef", P(`const c: {} | undefined = res; return { c };`));
row("a-empty-arr-type", P(`const xs: {}[] = [res]; return xs;`));
row("a-empty-generic", P(`const hide = <T extends {},>(x: T): {} => x; return { c: hide(res) };`));
row("a-empty-fn-return", P(`const f = (): {} => res; return { c: f() };`));
row("a-empty-record-type", P(`const o: { readonly c: {} } = { c: res }; return o;`));
row("a-empty-index", P(`const o: { readonly [k: string]: {} } = { c: res }; return o;`));
row("a-empty-two-ss", P(`const c: {} = res; return { c };`) + `\nconst b = (r: { readonly c: {} }) => typeof r.c;\nconst c = (r: { readonly c: {} }) => JSON.stringify(r.c);`);
row("a-empty-object-type", P(`const c: Object = res; return { c };`));
// cast keeps the object: a response typed as plain data
row("a-cast-ok", P(`const v = cast<{ readonly ok: boolean }>(res); return v.ok ? { v: v.value } : null;`), { after: ojs((r) => r.v) });
row("a-cast-empty", P(`const v = cast<{}>(res); return v.ok ? { v: v.value } : null;`), { after: ojs((r) => r.v) });
row("a-cast-status", P(`const v = cast<{ readonly status: number }>(res); return v.ok ? [v.value] : [];`), { after: ojs((r) => r[0]) });
row("a-cast-whole", P(`return cast<{ readonly ok: boolean }>(res);`), { after: ojs((r) => r.value) });
row("a-cast-kept", `const k = async (fetch: Fetch) => { const res = await fetch(${U}); const v = cast<{ readonly ok: boolean }>(res); return () => v; };`);
// unbound methods
row("a-unbound-text", P(`return { t: res.text };`) + twoK("{ readonly t: () => Promise<string> }", "k.t()").replaceAll("(k:", "(r:").replaceAll("k.t()", "r.t()"));
row("a-unbound-json", P(`return { j: res.json };`));
row("a-unbound-local", P(`const t = res.text; return { t };`) + `\nconst b = async (r: { readonly t: () => Promise<string> }) => { const f = r.t; try { return await f(); } catch (e) { return "threw: " + messageOf(e); } };`);
// structural supertypes and generics (expected rejected)
row("a-struct-ok", P(`const c: { readonly ok: boolean } = res; return c;`));
row("a-struct-method", P(`const c: { text(): Promise<string> } = res; return c;`) + two("{ text(): Promise<string> }", "r.text()"));
row("a-generic-id", P(`const id = <T,>(x: T): T => x; return id(res);`) + two("FetchResponse", "r.text()"));
row("a-generic-keep", P(`const keep = <T,>(x: T) => () => x; return keep(res);`));
row("a-generic-extends", P(`const id = <T extends FetchResponse,>(x: T): T => x; return { v: id(res) };`));
row("a-then-id", `const r = (fetch: Fetch) => fetch(${U}).then((x) => x);` + two("FetchResponse", "r.text()"));
row("a-then-rec", `const r = (fetch: Fetch) => fetch(${U}).then((x) => ({ x }));`);
row("a-then-fn", `const k = (fetch: Fetch) => fetch(${U}).then((x) => () => x.text());`);
row("a-then-ok", `const r = (fetch: Fetch) => fetch(${U}).then((x) => x.ok);`);
row("a-all", `const r = (fetch: Fetch) => Promise.all([fetch(${U})]);`);
row("a-all-destructure", `const r = async (fetch: Fetch) => { const [a] = await Promise.all([fetch(${U})]); return { a }; };`);
row("a-map", P(`return new Map([["r", res]]);`));
row("a-set", P(`return new Set([res]);`));
row("a-tuple", P(`const t: [FetchResponse, number] = [res, 1]; return t;`));
row("a-arr-map", P(`return [res].map((x) => x);`));
row("a-arr-filter", P(`return [res].filter((x) => x.ok).length;`));
row("a-arr-at", P(`const xs = [res]; return { x: xs[0] };`));
row("a-destructure", `const r = async (fetch: Fetch) => { const { ok, status } = await fetch(${U}); return { ok, status }; };`);
row("a-destructure-arr", P(`const [x] = [res]; return { x };`));
row("a-ternary", P(`return res.ok ? { x: res } : { x: res };`));
row("a-nullish", P(`return { x: res ?? null };`));
row("a-comma", P(`return { x: (0, res) };`));
row("a-unawaited-arr", `const r = (fetch: Fetch) => [fetch(${U})];`);
row("a-unawaited-kept", `const k = (fetch: Fetch) => { const p = fetch(${U}); return () => p.then((x) => x.ok); };`);
row("a-json-unawaited", P(`return { j: res.json() };`) + `\nconst b = async (r: { readonly j: Promise<unknown> }) => await r.j;\nconst c = async (r: { readonly j: Promise<unknown> }) => { ${W}${W}try { return await r.j; } catch (e) { return "used: " + messageOf(e); } };`, { fetchBody: "[1]" });
row("a-async-gen-yield", `const r = async function* (fetch: Fetch) { const res = await fetch(${U}); yield [res]; };`);
row("a-gen-fn-value", P(`return function* () { yield res.ok; };`));
row("a-snapshot", P(`return snapshot(res);`));
row("a-sc", P(`return structuredClone(res);`));
row("a-memo-fetch", `const k = (fetch: Fetch) => memo(async (u: string) => await fetch(u));`);
row("a-memo-sync", `const k = (fetch: Fetch) => memo((u: string) => fetch(u));`);
row("a-action-arg", `const s = () => state(0);\nconst a = (s: State<number>) => action((x: FetchResponse) => s.set(x.status));`);
row("a-component-prop", P(`const C = (p: { readonly x: FetchResponse }) => <div>{p.x.ok ? "y" : "n"}</div>; return <div><C x={res} /></div>;`));
row("a-component-empty", P(`const c: {} = res; const C = (p: { readonly x: {} }) => <div>{typeof p.x}</div>; return <div><C x={c} /></div>;`));
row("a-component-keep-prop", P(`const C = (p: { readonly x: FetchResponse }) => <div title={p.x.ok ? "a" : "b"}>{p.x.status}</div>; return <C x={res} />;`));
row("a-component-key", P(`const C = (p: { readonly n: number }) => <div>{p.n}</div>; return <div><C key={res.status} n={1} /></div>;`));
row("a-intrinsic-prop", P(`return <div title={res.ok ? "a" : "b"} />;`));
row("a-action-param-state", `const s = () => state<{ readonly c: {} } | null>(null);\nconst a = (s: State<{ readonly c: {} } | null>) => action((x: FetchResponse) => { const c: {} = x; s.set({ c }); });`);
row("a-object-method", P(`return { m() { return res.ok; } };`));
row("a-mut-local", P(`const o: Mut<{ x: FetchResponse | null }> = { x: null }; o.x = res; return o.x === null ? 0 : 1;`));
row("a-mut-local-expose", P(`const o: Mut<{ x: FetchResponse | null }> = { x: null }; o.x = res; return o;`));
row("a-let-cell", P(`let x: FetchResponse | null = null; x = res; return { x };`));
row("a-helper-returns", `const r = async (fetch: Fetch) => { const get = async () => await fetch(${U}); return { x: await get() }; };`);
row("a-nested-async-return", `const k = (fetch: Fetch) => async () => await fetch(${U});` + twoK("() => Promise<FetchResponse>", "(await k()).text()"));
row("a-nested-async-shared", `const k = async (fetch: Fetch) => { const p = fetch(${U}); return async () => await p; };`);
row("a-outside-resp", `const b = async (o: FetchResponse) => await o.text();\nconst c = async (o: FetchResponse) => { ${W}${W}try { return await o.text(); } catch (e) { return "used: " + messageOf(e); } };`,
  { outside: { o: [[], () => new Response("body")] } });
row("a-outside-resp-empty", `const b = (o: {}) => typeof o;`, { outside: { o: [[], () => new Response("body")] } });
row("a-outside-resp-rec", `const b = async (o: { readonly r: FetchResponse }) => await o.r.text();`, { outside: { o: [[], () => ({ r: new Response("body") })] } });
row("a-outside-unknown", `const b = (o: unknown) => ({ o });`, { outside: { o: [[], () => new Response("body")] }, after: ojs((r) => r.o, "b") });
// controls: the checker skipped
R.push({ name: "a-ctl-two-readers", ctl: true, fetchBody: "body", show: ["b", "c"], drive: drive(["r"]), src: `const r = async (fetch: Fetch) => await fetch(${U});` + two("FetchResponse", "r.text()") });
R.push({ name: "a-ctl-ojs-readers", ctl: true, fetchBody: "body", show: ["o1", "o2"], drive: drive(["r"]), src: P(`return { c: res };`), after: ojs((r) => r.c) });
export const cands = R;
