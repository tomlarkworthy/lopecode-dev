// freeze-attack12 target 1 follow-ups: sweep.ts rows the checker accepted, each given a use. A one-shot value (an
// iterator, a generator object, a response) forgotten by a type leaves its cell; the drive is a reader in another
// language that reads it twice (twiceDrive). Where the cell holds an array instead, both readings agree (controls)
import { ACT, sRow, tyRow, twiceDrive, type Cand } from "./lib12.ts";
const R: Cand[] = [];
// the one-shot inside g's value v, found by the path the row gives
const at = (path: (string | number)[]) => (v: any) => path.reduce((x, k) => x?.[k], v);
// a value at the path that is not the one-shot (the runtime ran a generator as the cell's generator, or cast made a
// copy) reads "not one-shot", the same both times
const notOne = (x: unknown) => `not one-shot: ${typeof x} ${JSON.stringify(x) ?? ""}`;
const iterRead = (path: (string | number)[]) => (v: any) => { const it = at(path)(v); return typeof it?.next !== "function" ? notOne(it) : JSON.stringify([...{ [Symbol.iterator]: () => it }]); };
const genRead = (path: (string | number)[]) => (v: any) => { const it = at(path)(v); return typeof it?.next !== "function" ? notOne(it) : JSON.stringify(it.next()); };
const respRead = (path: (string | number)[]) => async (v: any) => { const r = at(path)(v); return typeof r?.text !== "function" ? notOne(r) : await r.text(); };
type Site = { s: string; body: (x: string) => string; path: (string | number)[] };
// where the one-shot X goes: each site gives it a type that does not say what it is, then g returns that value
const SITES: Site[] = [
  { s: "unknown", body: (x) => `const u: unknown = ${x}; return u;`, path: [] },
  { s: "object", body: (x) => `const u: object = ${x}; return u;`, path: [] },
  { s: "rec-unknown", body: (x) => `const u: { readonly z: unknown } = { z: ${x} }; return u;`, path: ["z"] },
  { s: "rec-object", body: (x) => `const u: { readonly z: object } = { z: ${x} }; return u;`, path: ["z"] },
  { s: "rec-opt-unknown", body: (x) => `const u: { readonly n: number; readonly z?: unknown } = { n: 1, z: ${x} }; return u;`, path: ["z"] },
  { s: "arr-unknown", body: (x) => `const u: readonly unknown[] = [${x}]; return u;`, path: [0] },
  { s: "tuple-unknown", body: (x) => `const u: readonly [number, unknown] = [1, ${x}]; return u;`, path: [1] },
  { s: "index-unknown-width", body: (x) => `const o = { n: 1, z: ${x} }; const u: { readonly [k: string]: unknown } = o; return u;`, path: ["z"] },
  { s: "record-unknown-width", body: (x) => `const o = { n: 1, z: ${x} }; const u: Record<string, unknown> = o; return u;`, path: ["z"] },
  { s: "index-plus-width", body: (x) => `const o = { n: 1, z: ${x} }; const u: { readonly n: number; readonly [k: string]: unknown } = o; return u;`, path: ["z"] },
  { s: "map-unknown", body: (x) => `const u = new Map<string, unknown>([["k", ${x}]]); return u;`, path: [] },
  { s: "generic-unknown", body: (x) => `const id = <T,>(y: T): T => y; const u = id<unknown>(${x}); return u;`, path: [] },
  { s: "entries", body: (x) => `const u = Object.entries({ n: 1, z: ${x} }); return u;`, path: [1, 1] },
  { s: "values", body: (x) => `const u: readonly unknown[] = Object.values({ n: 1, z: ${x} }); return u;`, path: [1] },
  { s: "fromEntries", body: (x) => `const u = Object.fromEntries([["z", ${x}]]); return u;`, path: ["z"] },
  { s: "catch", body: (x) => `try { throw ${x}; } catch (e) { return e; } return 0;`, path: [] },
  { s: "void-param", body: (x) => `const f: (y: XT) => void = (y) => y; const u: unknown = f(${x}); return u;`, path: [] },
  { s: "cast-unknown", body: (x) => `const r = cast<unknown>(${x}); return r.ok ? r.value : 0;`, path: [] },
  { s: "union-num-unknown", body: (x) => `const u: number | unknown = ${x}; return u;`, path: [] },
];
const KINDS: { k: string; pre: string; x: string; xt: string; read: (p: (string | number)[]) => (v: any) => unknown; async?: string; ctlX: string }[] = [
  { k: "iter", pre: "", x: "[1, 2].values()", xt: "Iterable<number>", read: iterRead, ctlX: "[1, 2]" },
  { k: "map-iter", pre: "", x: "new Map([[1, 2]]).keys()", xt: "Iterable<number>", read: iterRead, ctlX: "[1]" },
  { k: "gen", pre: "function* mk() { yield 1; yield 2; } ", x: "mk()", xt: "Generator<number>", read: genRead, ctlX: "[1, 2]" },
  { k: "resp", pre: `const res = await fetch("https://x.test/"); `, x: "res", xt: "Mut<FetchResponse>", read: respRead, async: "fetch: Fetch", ctlX: `"body"` },
];
for (const K of KINDS) for (const S of SITES) {
  const body = S.body(K.x).replace("XT", K.xt);
  const src = K.async ? `const g = async (${K.async}) => { ${K.pre}${body} };` : `const g = () => { ${K.pre}${body} };`;
  R.push({ name: `f-${K.k}-${S.s}`, src, fetchBody: "body", show: ["g"], drive: twiceDrive(K.read(S.path)) });
}
// controls: the checker skipped, a one-shot returned under its own type (the checker refuses it: [iterator-cell])
R.push({ name: "f-ctl-iter-own-type", ctl: true, src: `const g = () => [1, 2].values();`, show: ["g"], drive: twiceDrive(iterRead([])) });
R.push({ name: "f-ctl-resp-own-type", ctl: true, src: `const g = async (fetch: Fetch) => await fetch("https://x.test/");`, fetchBody: "body", show: ["g"], drive: twiceDrive(respRead([])) });
R.push({ name: "f-ctl-gen-own-type", ctl: true, src: `const g = () => { function* mk() { yield 1; yield 2; } return mk(); };`, show: ["g"], drive: twiceDrive(genRead([])) });
// plain controls (accepted, must read the same twice): an array where the iterator was
R.push({ name: "f-plain-array-unknown", src: `const g = () => { const u: unknown = [1, 2]; return u; };`, show: ["g"], drive: twiceDrive((v) => JSON.stringify(v)) });
// a hidden Action or State handle (sweep: accepted through a () => void return, cast<unknown> and fromEntries): no reader
// in SoundScript can call it; a reader in another language may (S6.13: a top-level call)
R.push(sRow("f-action-void-leaves", ACT + `const g = (a: Action<[]>) => { const f: () => void = () => a; const u: unknown = f(); return u; };`));
R.push(sRow("f-action-cast-leaves", ACT + `const g = (a: Action<[]>) => { const r = cast<unknown>(a); return r.ok ? r.value : 0; };`));
R.push(sRow("f-action-void-record", ACT + `const g = (a: Action<[]>) => { const f: () => void = () => ({ n: 1, go: a }); const u: unknown = f(); return { u }; };`));
R.push(sRow("f-state-void-leaves", ACT + `const g = (c: State<number>) => { const f: () => void = () => c; const u: unknown = f(); return u; };`));
// a Mut forgotten as unknown and written after: the published copy is frozen (S4.6)
R.push(tyRow("f-mut-unknown-write-after", `const g = async () => { const xs = [1]; const u: unknown = xs; await null; xs.push(2); return u; };`, () => true));
R.push(tyRow("f-mut-void-write-after", `const g = () => { const xs = [1]; const f: (y: Mut<number[]>) => void = (y) => y; const u: unknown = f(xs); xs.push(2); return { u, n: xs.length }; };`, () => true));
export const cands = R;
