// freeze-attack11 target 5: 40 accepted, deterministic programs for the runner differential. Run
// bun lite/infer/attack/drive-rt.ts selfhost/freeze-attack11/x.ts --both (each cell's value shown by both runners; DIFFER
// marks a difference) and bun lite/infer/attack/drive-run.ts selfhost/freeze-attack11/x.ts. A drive may call an action
// value from outside (as an event handler does) and settle; it then reports the named cells.
type C = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown; fetchBody?: string };
const R: C[] = [];
const js = (v: unknown) => { try { return JSON.stringify(v, (_k, x) => (typeof x === "function" ? "fn" : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x)); } catch { return String(v); } };
const after = (act: string, args: unknown[][], cells: string[]) => async (p: any) => {
  const out: string[] = [];
  for (const a of args) { try { p.value(act)(...a); } catch (x) { out.push(`threw ${(x as Error).message.slice(0, 60)}`); } await p.settle?.(400); }
  return `${out.join(";")} ${cells.map((c) => `${c}=${p.status(c)}:${js(p.value(c))?.slice(0, 80)}`).join(" ")}`;
};
const X = (name: string, src: string, drive?: C["drive"], extra: Partial<C> = {}) => R.push({ name, src, drive, ...extra });
X("x-events-sum", `const e = function* () { yield 1; yield 2; yield 3; };\nconst s = () => state(0);\nconst add = (s: State<number>) => action((k: number) => s.update((v) => v + k));\nconst l = (e: Events<number>, add: Action<[number]>) => on(e, add);\nconst g = (s: number) => s * 10;`);
X("x-events-record", `const e = function* () { yield { k: "a", n: 1 }; yield { k: "b", n: 2 }; };\nconst s = () => state<readonly string[]>([]);\nconst add = (s: State<readonly string[]>) => action((x: { readonly k: string; readonly n: number }) => s.update((v) => [...v, x.k + x.n]));\nconst l = (e: Events<{ readonly k: string; readonly n: number }>, add: Action<[{ readonly k: string; readonly n: number }]>) => on(e, add);\nconst g = (s: readonly string[]) => s.join(",");`);
X("x-two-listeners", `const e = function* () { yield 2; yield 3; };\nconst s = () => state(1);\nconst t = () => state(0);\nconst mul = (s: State<number>) => action((k: number) => s.update((v) => v * k));\nconst add = (t: State<number>) => action((k: number) => t.update((v) => v + k));\nconst l1 = (e: Events<number>, mul: Action<[number]>) => on(e, mul);\nconst l2 = (e: Events<number>, add: Action<[number]>) => on(e, add);\nconst g = (s: number, t: number) => [s, t];`);
X("x-action-args", `const s = () => state("");\nconst put = (s: State<string>) => action((a: string, b: number) => s.set(a + b));\nconst g = (s: string) => s.length;`, after("put", [["x", 1], ["yy", 22]], ["s", "g"]));
X("x-action-nested", `const s = () => state(0);\nconst inc = (s: State<number>) => action(() => s.update((v) => v + 1));\nconst twice = (inc: Action<[]>) => action(() => { inc(); inc(); });\nconst g = (s: number) => s;`, after("twice", [[], []], ["s", "g"]));
X("x-action-throw-rollback", `const s = () => state(0);\nconst bad = (s: State<number>) => action(() => { s.set(5); throw new Error("no"); });\nconst g = (s: number) => s;`, after("bad", [[]], ["s", "g"]));
X("x-action-read", `const s = () => state(3);\nconst dbl = (s: State<number>) => action(() => { const v = read(s); s.set(v * 2); });\nconst g = (s: number) => s;`, after("dbl", [[], []], ["s", "g"]));
X("x-action-record-arg", `const s = () => state<{ readonly n: number }>({ n: 0 });\nconst put = (s: State<{ readonly n: number }>) => action((o: { readonly n: number }) => s.set(o));\nconst g = (s: { readonly n: number }) => s.n + 1;`, after("put", [[{ n: 4 }]], ["s", "g"]));
X("x-memo-fib", `const fib = () => { const f = memo((n: number): number => (n < 2 ? n : f(n - 1) + f(n - 2))); return f; };\nconst g = (fib: (n: number) => number) => fib(20);`);
X("x-memo-args", `const m = () => memo((a: number, b: string) => b.repeat(a));\nconst g = (m: (a: number, b: string) => string) => [m(2, "x"), m(2, "x"), m(3, "y")];`);
X("x-memo-record", `const m = () => memo((o: { readonly n: number }) => o.n * 2);\nconst g = (m: (o: { readonly n: number }) => number) => { const o = { n: 3 }; return m(o) + m(o); };`);
X("x-cast-ok", `const g = () => { const u: unknown = JSON.parse('{"a":1,"b":["x"]}'); const v = cast<{ readonly a: number; readonly b: readonly string[] }>(u); return v.ok ? v.value.a + v.value.b.length : -1; };`);
X("x-cast-fail", `const g = () => { const u: unknown = JSON.parse('{"a":"1"}'); const v = cast<{ readonly a: number }>(u); return v.ok ? "ok" : "fail"; };`);
X("x-cast-union", `const g = () => { const u: unknown = JSON.parse('[1,"a",null]'); const v = cast<readonly (number | string | null)[]>(u); return v.ok ? v.value.length : -1; };`);
X("x-cast-optional", `const g = () => { const u: unknown = JSON.parse('{}'); const v = cast<{ readonly a?: number }>(u); return v.ok ? (v.value.a ?? 9) : -1; };`);
X("x-jsx-children", `const g = () => { const C = (p: { readonly label: string; readonly children: Child }) => <div><strong>{p.label}</strong>{p.children}</div>; return <C label="t"><span>x</span><p>y</p></C>; };`);
X("x-jsx-list", `const g = () => { const xs = ["a", "b", "c"]; return <div>{xs.map((x) => <span key={x}>{x}</span>)}</div>; };`);
X("x-jsx-action-prop", `const s = () => state(0);\nconst inc = (s: State<number>) => action(() => s.update((v) => v + 1));\nconst g = (s: number, inc: Action<[]>) => <button onClick={inc}>{s}</button>;`, after("inc", [[]], ["s", "g"]));
X("x-jsx-fragment", `const g = () => <><span>1</span>{2}{"three"}{null}{false}</>;`);
X("x-jsx-nested-comp", `const g = () => { const A = (p: { readonly n: number }) => <span>{p.n}</span>; const B = (p: { readonly n: number }) => <p><A n={p.n + 1} /></p>; return <B n={1} />; };`);
X("x-async-chain", `const a = async () => 2;\nconst b = async (a: number) => { await null; return a * 3; };\nconst g = (b: number) => b + 1;`);
X("x-async-all", `const g = async () => { const xs = await Promise.all([1, 2, 3].map(async (x) => x * x)); return xs.reduce((s, x) => s + x, 0); };`);
X("x-async-reject", `const a = async () => { throw new Error("boom"); };\nconst g = (a: number) => a + 1;`);
X("x-async-try", `const g = async () => { try { const f = async (): Promise<number> => { throw new Error("e1"); }; await f(); return "no"; } catch (e) { return messageOf(e); } };`);
X("x-fetch-json", `const g = async (fetch: Fetch) => { const r = await fetch("https://x.test/"); const u: unknown = await r.json(); const v = cast<{ readonly n: number }>(u); return v.ok ? v.value.n : -1; };`, undefined, { fetchBody: `{"n":5}` });
X("x-fetch-text", `const g = async (fetch: Fetch) => { const r = await fetch("https://x.test/"); return (await r.text()).toUpperCase() + r.status; };`, undefined, { fetchBody: "hi" });
X("x-gen-values", `const g = function* () { yield 1; yield 2; };\nconst h2 = (g: number) => g * 100;`);
X("x-gen-async", `const g = async function* () { yield "a"; await null; yield "b"; };\nconst k = (g: string) => g + "!";`);
X("x-gen-record", `const g = function* () { for (let i = 0; i < 3; i++) yield { i, sq: i * i }; };\nconst k = (g: { readonly i: number; readonly sq: number }) => g.sq;`);
X("x-state-record", `const s = () => state({ a: 1, b: [1, 2] });\nconst g = (s: { readonly a: number; readonly b: readonly number[] }) => s.a + s.b.length;`);
X("x-state-from-cell", `const n = () => 4;\nconst s = (n: number) => state(n * 2);\nconst g = (s: number) => s;`);
X("x-kept-fn", `const k = () => { const base = [1, 2, 3]; const c: readonly number[] = base; return (i: number) => c[i] ?? -1; };\nconst g = (k: (i: number) => number) => [k(0), k(2), k(5)];`);
X("x-methods", `const o = () => ({ n: 2, dbl(x: number) { return x * 2; } });\nconst g = (o: { readonly n: number; readonly dbl: (x: number) => number }) => o.dbl(o.n);`);
X("x-map-set", `const g = () => { const m = new Map([["a", 1]]); m.set("b", 2); const s = new Set([1, 2, 2]); return { m, s, n: m.size + s.size }; };\nconst k = (g: { readonly m: Map<string, number>; readonly n: number }) => g.m.get("b") ?? 0;`);
X("x-url", `const g = () => { const u = new URL("https://a.b/c?x=1"); u.searchParams; return u.pathname + new URLSearchParams("p=2").get("p"); };`);
X("x-regexp", `const g = () => { return "a1b22".replace(/\\d+/g, "#"); };`);
X("x-json-roundtrip", `const g = () => { const s = JSON.stringify({ a: [1, { b: 2 }] }); const u: unknown = JSON.parse(s); return typeof u === "object" ? s.length : 0; };`);
X("x-snapshot", `const g = () => { const xs = [1, 2]; const c = snapshot(xs); xs.push(3); return [c.length, xs.length]; };`);
X("x-equals", `const g = () => [equals({ a: [1] }, { a: [1] }), equals([1, 2], [2, 1]), equals(new Map([[1, 2]]), new Map([[1, 2]]))];`);
X("x-compile", `const x = () => [1, 2];\nconst y = (x: readonly number[]) => x.length;\nconst go = (compile: Compile) => compile({ inputs: ["x"], refs: [], outputs: ["y"] });\nconst g = async (go: (a: { readonly x: readonly number[] }) => Promise<{ readonly y: number }>) => (await go({ x: [1, 2, 3, 4] })).y;`);
X("x-typed-arrays", `const g = () => { const t = new Float64Array([1.5, 2.5]); const u = new Uint8Array(t.length); u[0] = 7; return [t[0] ?? 0, u[0] ?? 0, u.length]; };`);
X("x-bigint", `const g = () => { const b = BigInt(10); return String(b * b); };`);
X("x-string-methods", `const g = () => ["abc".padStart(5, "-"), "a,b".split(","), "x".repeat(3), " t ".trim(), "Ab".toLowerCase()];`);
X("x-error-cause", `const g = () => { try { throw new TypeError("bad"); } catch (e) { return messageOf(e); } };`);
export const cands = R;
