// 3. fr- FetchResponse fixed to pass [type]; lp- loops with annotated accumulators; is- the known root inside a
// compile(...) island and a pool; pr- promise-held values; w- writers R admits (an async cell's own body).
import { C, W } from "../freeze-attack3/harness.ts";
const R = "const r: { readonly t: Mut<number[]> } = { t: [0] }; ";
const GO = (outs: string, ins = "x") => `\nconst go = async (compile: Compile) => { const f = compile({ inputs: [${ins.split(",").filter(Boolean).map((s) => JSON.stringify(s)).join(", ")}], refs: [], outputs: [${outs.split(",").map((s) => JSON.stringify(s)).join(", ")}] }); const res = await f({ x: 3 }); return res.y; };`;
export const cands = [
  C("fr-two-readers", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => await r.text();\nconst c2 = async (r: FetchResponse) => { " + W + W + "try { return await r.text(); } catch (e) { return \"used: \" + messageOf(e); } };", { fetchBody: "body", show: ["b", "c2"] }),
  C("fr-held-fn", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst g = (r: FetchResponse) => async (): Promise<string> => { try { return await r.text(); } catch (e) { return \"used\"; } };\nconst hh = async (g: () => Promise<string>) => { const a1 = await g(); const a2 = await g(); return [a1, a2]; };", { fetchBody: "body", show: ["hh"] }),
  C("fr-in-record", "const r = async (fetch: Fetch) => ({ res: await fetch(\"https://x.test/\") });\nconst b = async (r: { res: FetchResponse }) => await r.res.text();\nconst c3 = async (r: { res: FetchResponse }) => { " + W + W + "try { return await r.res.text(); } catch (e) { return \"used\"; } };", { fetchBody: "body", show: ["b", "c3"] }),
  C("fr-json", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => await r.json();\nconst c3 = async (r: FetchResponse) => { " + W + W + "try { return await r.json(); } catch (e) { return \"used\"; } };", { fetchBody: "[1]", show: ["b", "c3"] }),
  C("fr-ab", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => (await r.arrayBuffer()).byteLength;\nconst c3 = async (r: FetchResponse) => { " + W + W + "try { return (await r.arrayBuffer()).byteLength; } catch (e) { return -1; } };", { fetchBody: "abcd", show: ["b", "c3"] }),
  C("fr-gen-twice", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => await r.text();\nconst c4 = async function* (r: FetchResponse) { yield [r.ok]; " + W + W + "let s = \"fresh\"; try { await r.text(); } catch (e) { s = \"used\"; } yield [r.ok, s]; };", { fetchBody: "body", show: ["c4"] }),
  C("fr-same-cell-twice", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst b = async (r: FetchResponse) => { const t1 = await r.text(); let t2 = \"\"; try { t2 = await r.text(); } catch (e) { t2 = \"used\"; } return [t1, t2]; };", { fetchBody: "body", show: ["b"] }),
  C("fr-kept-reader", "const r = async (fetch: Fetch) => await fetch(\"https://x.test/\");\nconst g = (r: FetchResponse) => () => r.ok;\nconst b = async (r: FetchResponse) => await r.text();", { fetchBody: "body" }),
  // lp-: loops with annotated accumulators
  C("lp-let-i", "const a = () => { const fs: (() => number)[] = []; for (let i = 0; i < 2; i++) fs.push(() => i); return fs; };"),
  C("lp-const-of", "const a = () => { const fs: (() => number)[] = []; for (const x of [1, 2]) fs.push(() => x); return fs; };"),
  C("lp-const-copy", "const a = () => { const fs: (() => number)[] = []; for (let i = 0; i < 2; i++) { const j = i; fs.push(() => j); } return fs; };"),
  C("lp-mut-elem", "const a = () => { const rows = [[0], [1]]; const fs: (() => number)[] = []; for (const row of rows) fs.push(() => row.length); return fs; };"),
  C("lp-nested-mut-elem", "const a = () => { const rows: Mut<number[]>[] = [[0], [1]]; const fs: (() => Mut<number[]>)[] = []; for (const row of rows) fs.push(() => row); return fs; };\nconst c = (a: (() => Mut<number[]>)[]) => { const f = a[0]; if (f) f().push(1); return 0; };"),
  C("lp-map-index", "const a = () => [0, 1].map((i) => () => i);"),
  C("lp-for-in", "const a = () => { const fs: (() => string)[] = []; for (const k in { p: 1, q: 2 }) fs.push(() => k); return fs; };"),
  // is-: the known root inside a compile island, and through a pool
  C("is-known-root", "const x = () => 1;\nconst y = (x: number) => { " + R + "return { m: (): Mut<number[]> => r.t }; };" + GO("y") + "\nconst c = (go: { m: () => Mut<number[]> }) => { go.m().push(1); return 0; };"),
  C("is-self-writer", "const x = () => 1;\nconst y = (x: number) => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: x } }; return () => { r.b.n++; return r.b.n; }; };" + GO("y")),
  C("is-plain", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; const c0: readonly number[] = xs; return () => c0.length; };" + GO("y")),
  // pr-: values held through promises
  C("pr-kept-promise-plain", "const a = () => { const p = Promise.resolve([0]); return { p }; };"),
  C("pr-kept-fn-promise", "const a = () => { const mk = async (): Promise<readonly number[]> => [0]; const p = mk(); return () => p; };"),
  C("pr-then-chain", "const a = () => Promise.resolve([0]).then((xs) => [...xs, 1]);"),
  C("pr-all", "const a = async () => { const ps = [Promise.resolve([0])]; return await Promise.all(ps); };"),
  // w-: an async cell's own body uses a Mut across an await (S5.7 allows it); what escapes before the end
  C("w-async-own-body", "const a = async () => { const xs = [0]; await null; xs.push(1); const c0: readonly number[] = xs; return () => c0.length; };"),
  C("w-async-input-fn-before", "const mk = () => (x: readonly number[]) => () => x.length;\nconst a = async (mk: (x: readonly number[]) => () => number) => { const xs = [0]; const f = mk(xs); await null; xs.push(1); return { f }; };"),
  C("w-async-promise-before", "const mk = () => async (x: readonly number[]): Promise<number> => { await null; return x.length; };\nconst a = async (mk: (x: readonly number[]) => Promise<number>) => { const xs = [0]; const p = mk(xs); xs.push(1); await null; xs.push(2); return { p }; };"),
  C("w-async-log-before", "const a = async (log: Log) => { const xs = [0]; log(xs); await null; xs.push(1); return xs.length; };"),
  C("w-async-input-rec", "const mk = () => (x: readonly number[]) => ({ x });\nconst a = async (mk: (x: readonly number[]) => { x: readonly number[] }) => { const xs = [0]; const o = mk(xs); await null; xs.push(1); return { o, n: xs.length }; };"),
];
// the original fr-held-fn named its reader cell `h`: accepted by the checker, the run crashed (JSX factory name)
cands.push(C("nm-cell-named-h", "const h = () => 1;"));
