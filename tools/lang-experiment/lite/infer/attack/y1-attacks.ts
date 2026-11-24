// y1 (2026-11-24): the run time as the guarantee for the capability class. A row named y1-ok-* is a legal program (A4)
// that must be accepted and run with no cell in error under both runners, so a false refusal at hand-over shows here
// (the census cannot show one). Every other row that is not a control must not be silent: rejected, or accepted and
// loud at run time. y1-a1-* are attack 13's VA rows (an Action's call gives back undefined, prelude.runtime.ts action);
// y1-a13-* its U and T rows and the rest of its candidates, y1-g-* its guard rows (A3). A row with ctl runs with the
// checker skipped (counted apart as y1-controls): with SS_MEASURE_HANDOVER=0 it must fire, and with the hand-over
// refusal on it must not (loud). live.test.ts asserts all of this; run-sets.ts --sets y1 [--rt].
import { tyRow, callRow, twiceDrive, isNum, type Cand } from "../../../selfhost/freeze-attack13/lib13.ts";
import { cands as MIN } from "../../../selfhost/freeze-attack13/min.ts";
import { cands as VOID } from "../../../selfhost/freeze-attack13/void.ts";
import { cands as UNK } from "../../../selfhost/freeze-attack13/unk.ts";
import { cands as UNK2 } from "../../../selfhost/freeze-attack13/unk2.ts";
import { cands as GUARD } from "../../../selfhost/freeze-attack13/guard.ts";
import { cands as GUARD2 } from "../../../selfhost/freeze-attack13/guard2.ts";
type A = Cand & { fetchBody?: string };
const R: A[] = [];
const isObj = (v: unknown) => typeof v === "object" && v !== null;
const G = (body: string) => `const g = () => { ${body} };`;
// attack 13's rows by name; open: the rows a compile rule must stop (Part B), left out until it does
// left out: min-e-extra-arg (callback arity, out of the brief's scope), x-equals-* (equals answers wrongly for values it
// cannot see into; no value is outside its type); min-l-arraylike is restated with its honest type (y1-l-*)
const OPEN = new Set(["min-l-arraylike", "min-e-extra-arg", "x-equals-promises", "x-equals-resps"]);
const from13 = (prefix: string, cs: A[], keep: (c: A) => boolean = () => true) => {
  for (const c of cs) if (!c.ctl && !OPEN.has(c.name) && keep(c)) R.push({ ...c, name: `${prefix}-${c.name}` });
};

// A1: VA, an Action's call gives back undefined, nested or not. v-act-launder-action-state's drive expects the laundered
// function in s; with undefined given back, the body's own () => 1 is written, which S4.12 refuses (the call throws, loud)
const LAUNDER = VOID.find((c) => c.name === "v-act-launder-action-state")!;
from13("y1-a1", VOID.filter((c) => (c.name.startsWith("v-act") || c.name.startsWith("min-va")) && c !== LAUNDER));
R.push(callRow("y1-a1-v-act-launder-action-state", LAUNDER.src, "b", [], (v) => v === 0));
from13("y1-a1", MIN.filter((c) => c.name.startsWith("min-va")));
// A2: U and T, a response, promise or generator object given unknown or object on the way, refused at hand-over
from13("y1-a13", MIN.filter((c) => /^min-[ut]-/.test(c.name)));
from13("y1-a13", UNK);
from13("y1-a13", UNK2);
from13("y1-a13", VOID.filter((c) => !c.name.startsWith("v-act") && !c.name.startsWith("min-va")));
// A3: the guard, an Action laundered then called while a cell computes, and the interleavings that must not be refused
from13("y1-g", GUARD);
from13("y1-g", GUARD2);

// B3, L: Array.from of a { length } record types its elements unknown (intrinsics.ts), which the numeric keys a record
// type left out are; the mapper's v is unknown too
R.push(tyRow("y1-l-arraylike-unknown", `const g = () => { const o = { length: 1, 0: "s" }; const xs = Array.from(o); return xs.map((x) => (typeof x === "string" ? x.length : -1)); };`, (v) => Array.isArray(v) && v[0] === 1));
R.push(tyRow("y1-l-arraylike-mapper", `const g = () => { const o = { length: 1, 0: "s" }; return Array.from(o, (v, i) => (typeof v === "number" ? v : i + 5)); };`, (v) => Array.isArray(v) && v.every((x) => typeof x === "number")));
R.push(tyRow("y1-ok-arrayfrom-length", `const g = () => Array.from({ length: 3 }, (_, i) => i * 2);`, (v) => Array.isArray(v) && v[2] === 4));
// B: a promise in a record a type left out (accepted since y1, S4.12's prom): written to state, the write throws
R.push({ name: "y1-rm-width-promise-state", src: "const ps = () => state<{ readonly n: number }>({ n: 0 });\nconst putp = (ps: State<{ readonly n: number }>) => ({ go: action(() => {\n  const st = ps.set;\n  const r = { n: 1, p: Promise.resolve(2) };\n  st(r);\n}) });\nconst pn = (ps: { readonly n: number }) => ps.n;", show: ["pn"],
  drive: async (p: any) => {
    let thrown = "";
    try { p.value("putp").go(); } catch (e) { thrown = ` (call threw: ${(e as Error).message.slice(0, 100)})`; }
    await p.settle();
    const v = p.value("pn");
    return v === 0 && thrown ? `same: ${v}${thrown}` : `DIFF pn is ${v}, the write did not throw${thrown}`;
  } });

// A4: legal values that cross a hand-over and must keep working
R.push(tyRow("y1-ok-kept-fn", `const g = () => ({ f: (x: number) => x + 1, n: 1 });`, (v: any) => typeof v?.f === "function" && v.f(1) === 2 && v.n === 1));
R.push(tyRow("y1-ok-fn-array", `const g = () => [(x: number) => x * 2];`, (v: any) => Array.isArray(v) && v[0](2) === 4));
R.push(tyRow("y1-ok-kept-async-fn", `const g = () => ({ f: async (x: number) => x + 1 });`, (v: any) => typeof v?.f === "function"));
R.push(tyRow("y1-ok-action-cell", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => action(() => c.set(1));`, (v) => typeof v === "function"));
R.push(tyRow("y1-ok-action-in-record", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => ({ inc: action(() => c.update((n) => n + 1)), k: 1 });`, (v: any) => typeof v?.inc === "function" && v.k === 1));
R.push(tyRow("y1-ok-state-handle-in-record", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => ({ h: c, n: 1 });`, (v: any) => isObj(v?.h) && v.n === 1));
R.push(tyRow("y1-ok-handle-array", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => [c];`, (v: any) => Array.isArray(v) && isObj(v[0])));
R.push(tyRow("y1-ok-events-handle-in-record", `const e = function* () { yield 1; };\nconst g = (e: Events<number>) => ({ e, n: 1 });`, (v: any) => isObj(v?.e) && v.n === 1));
R.push(tyRow("y1-ok-map", `const g = () => new Map([["a", 1]]);`, (v: any) => v instanceof Map && v.get("a") === 1));
R.push(tyRow("y1-ok-set-in-record", `const g = () => ({ s: new Set([1, 2]) });`, (v: any) => v?.s instanceof Set && v.s.size === 2));
R.push(tyRow("y1-ok-typed-array-in-record", `const g = () => ({ a: new Float64Array([1, 2]) });`, (v: any) => v?.a instanceof Float64Array && v.a[1] === 2));
R.push(tyRow("y1-ok-typed-array", `const g = () => new Uint8Array([1, 2, 3]);`, (v: any) => v instanceof Uint8Array && v.length === 3));
R.push(tyRow("y1-ok-url-error", `const g = () => ({ u: new URL("https://x.test/a"), e: new Error("x") });`, (v: any) => v?.u?.pathname === "/a" && v.e?.message === "x"));
R.push(tyRow("y1-ok-async-cell", `const g = async () => 5;`, (v) => v === 5));
R.push(tyRow("y1-ok-async-record", `const g = async () => ({ n: await Promise.resolve(2), f: (x: number) => x });`, (v: any) => v?.n === 2 && typeof v.f === "function"));
R.push(tyRow("y1-ok-sync-promise", `const g = () => Promise.resolve(5);`, (v) => v === 5));
R.push(tyRow("y1-ok-declared-promise-member", `const g = (): { readonly p: Promise<number> } => ({ p: Promise.resolve(1) });`, (v: any) => v?.p instanceof Promise));
R.push(tyRow("y1-ok-promise-array", `const g = () => [Promise.resolve(1), Promise.resolve(2)];`, (v: any) => Array.isArray(v) && v[0] instanceof Promise));
R.push(tyRow("y1-ok-record-of-promise-in-array", `const g = () => [{ p: Promise.resolve(1) }];`, (v: any) => Array.isArray(v) && v[0]?.p instanceof Promise));
R.push(tyRow("y1-ok-async-promise-member", `const g = async () => ({ p: Promise.resolve(1) });`, (v: any) => v?.p instanceof Promise));
R.push(tyRow("y1-ok-state-holds-promise", `const c = (): StateCell<Promise<number>> => state(Promise.resolve(1));\nconst g = (c: number) => c + 1;`, (v) => v === 2));
R.push(tyRow("y1-ok-generator-cell", `const g = function* () { yield 1; yield 2; };`, isNum));
R.push(tyRow("y1-ok-generator-yields-record", `const g = function* () { yield { n: 1, f: (x: number) => x }; };`, (v: any) => v?.n === 1 && typeof v.f === "function"));
R.push(tyRow("y1-ok-generator-yields-promise", `const g = function* (): Generator<Promise<number>> { yield Promise.resolve(3); };`, (v) => v === 3));
R.push(tyRow("y1-ok-async-generator-cell", `const g = async function* () { yield 1; yield 2; };`, isNum));
R.push(tyRow("y1-ok-memo", `const g = () => memo((x: number) => x * 2);`, (v: any) => typeof v === "function" && v(2) === 4));
R.push(tyRow("y1-ok-memo-in-record", `const g = () => ({ m: memo((x: number) => x + 1) });`, (v: any) => typeof v?.m === "function" && v.m(1) === 2));
R.push(tyRow("y1-ok-jsx", `const g = () => <div>hi</div>;`, isObj));
R.push(tyRow("y1-ok-jsx-in-record", `const g = () => ({ el: <span>{1}</span>, n: 1 });`, (v: any) => isObj(v?.el) && v.n === 1));
R.push({ ...tyRow("y1-ok-fetch-json", `const g = async (fetch: Fetch) => (await fetch("https://x.test/")).json();`, (v: any) => v?.n === 1), fetchBody: `{"n":1}` });
R.push(callRow("y1-ok-nested-call-gives-undefined", `const c = (): StateCell<number> => state(0);\nconst a = () => action(() => 5);\nconst b = (a: Action<[]>, c: State<number>) => action(() => { a(); c.set(1); });\nconst g = (c: number) => c;`, "b", [], (v) => v === 1));
R.push(callRow("y1-ok-action-stores-function-input", `const c = (): StateCell<readonly ((x: number) => number)[]> => state([]);\nconst f = () => (x: number) => x + 1;\nconst b = (f: (x: number) => number, c: State<readonly ((x: number) => number)[]>) => action(() => { c.set([f]); });\nconst g = (c: readonly ((x: number) => number)[]) => c.length;`, "b", [], (v) => v === 1));
// the other hand-over sites: an action's arguments, a value written to a state cell, a generator's yields. A value read by
// another language's cell is the cell's value (out.cell), the drive here
const MF = "{ readonly m: Map<string, number>; readonly f: (x: number) => number } | null";
R.push(callRow("y1-ok-arg-map-typed-array", `const s = (): StateCell<number> => state(0);\nconst a = (s: State<number>) => action((m: Map<number, number>, t: Float64Array) => s.set((m.get(1) ?? 0) + (t[0] ?? 0)));\nconst g = (s: number) => s;`, "a", [new Map([[1, 2]]), new Float64Array([3])], (v) => v === 5));
R.push(callRow("y1-ok-arg-action", `const c = (): StateCell<number> => state(0);\nconst inc = (c: State<number>) => action(() => c.update((n) => n + 1));\nconst run = () => action((a: Action<[]>) => a());\nconst b = (run: Action<[Action<[]>]>, inc: Action<[]>) => action(() => run(inc));\nconst g = (c: number) => c;`, "b", [], (v) => v === 1));
R.push(callRow("y1-ok-write-map-and-function", `const f = () => (x: number) => x + 1;\nconst s = (): StateCell<${MF}> => state(null);\nconst a = (f: (x: number) => number, s: State<${MF}>) => action(() => s.set({ m: new Map([["a", 1]]), f }));\nconst g = (s: ${MF}) => s === null ? 0 : (s.m.get("a") ?? 0) + s.f(1);`, "a", [], (v) => v === 3));
R.push(callRow("y1-ok-write-set", `const s = (): StateCell<Set<number>> => state(new Set([1]));\nconst a = (s: State<Set<number>>) => action(() => s.set(new Set([1, 2, 3])));\nconst g = (s: Set<number>) => s.size;`, "a", [], (v) => v === 3));
R.push(tyRow("y1-ok-yield-declared-promise", `const g = function* (): Generator<{ readonly p: Promise<number> }> { yield { p: Promise.resolve(1) }; };`, (v: any) => v?.p instanceof Promise));

// A2 controls, checker skipped: each hands a value over that its type does not name, directly
const ctl = (a: A): A => ({ ...a, ctl: true });
R.push(ctl(tyRow("y1-ctl-promise-object", `const g = (): object => Promise.resolve("s");`, isObj)));
R.push(ctl(tyRow("y1-ctl-promise-in-record", `const g = (): { readonly o: object } => ({ o: Promise.resolve("s") });`, (v: any) => !(v?.o instanceof Promise))));
R.push(ctl(tyRow("y1-ctl-generator-object", G(`function* mk() { yield 1; } const o: object = mk(); return o;`), isObj)));
R.push(ctl(tyRow("y1-ctl-async-generator-nested", G(`async function* mk() { yield 1; } const o: object = mk(); return { o };`), (v: any) => !(typeof v?.o?.next === "function"))));
R.push(ctl(tyRow("y1-ctl-frozen-container-promise", `const g = (): { readonly o: object } => { const r = freeze({ p: Promise.resolve("s") }); const o: object = r; return { o }; };`, (v: any) => !(v?.o?.p instanceof Promise))));
R.push(ctl({ name: "y1-ctl-resp-top", src: `const g = async (fetch: Fetch) => fetch("https://x.test/");`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v.text()) }));
R.push(ctl({ name: "y1-ctl-resp-nested", src: `const g = async (fetch: Fetch) => { const r = await fetch("https://x.test/"); return { r }; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v.r.text()) }));
R.push(ctl(callRow("y1-ctl-arg-response", `const s = (): StateCell<number> => state(0);\nconst a = (s: State<number>) => action((x: object) => s.set(1));\nconst g = (s: number) => s;`, "a", [new Response("x")], (v) => v === 0)));
R.push(ctl(callRow("y1-ctl-write-async-generator", `const s = (): StateCell<object> => state({});\nconst a = (s: State<object>) => action(() => { async function* mk() { yield 1; } s.set({ o: mk() }); });\nconst g = (s: object) => s;`, "a", [], (v: any) => typeof v?.o?.next !== "function")));
R.push(ctl({ name: "y1-ctl-yield-response", src: `const g = async function* (fetch: Fetch) { const r = await fetch("https://x.test/"); yield { r }; };`, fetchBody: "body", show: ["g"], drive: twiceDrive(async (v: any) => await v.r.text()) }));
// y1 B: the programs a removed check (x1's unknown/object non-plain test, w1's record-width non-plain test) rejected
// that run loud with the checker skipped (a5-after-a.txt, sole or candidate-only rows, loud under both runners): each
// must stay not silent, and live.test.ts asserts each is accepted-and-loud or still rejected by another rule
import { cands as RM0 } from "../../../selfhost/freeze-attack4/b2.ts";
import { cands as RM1 } from "../../../selfhost/freeze-attack6/a2.ts";
import { cands as RM2 } from "../../../selfhost/freeze-attack6/a6.ts";
import { cands as RM3 } from "../../../selfhost/freeze-attack6/m0.ts";
import { cands as RM4 } from "../../../selfhost/freeze-attack7/b2.ts";
import { cands as RM5 } from "../../../selfhost/freeze-attack11/a.ts";
import { cands as RM6 } from "../../../selfhost/freeze-attack11/min.ts";
import { cands as RM7 } from "../../../selfhost/freeze-attack12/forget.ts";
import { cands as RM8 } from "../../../selfhost/freeze-attack12/forget2.ts";
import { cands as RM9 } from "../../../selfhost/freeze-attack12/forget3.ts";
import { cands as RM10 } from "../../../selfhost/freeze-attack12/min.ts";
import { cands as RM11 } from "../../../selfhost/freeze-attack12/sweep.ts";
import { cands as RM12 } from "../../../selfhost/freeze-attack13/unk.ts";
const RM: [Cand[], string, string[]][] = [
  [RM0, "fa4-b2", ["er-rethrow"]],
  [RM1, "fa6-a2", ["a2-prog-arr", "a2-wrap-arr", "a2-local-arr", "a2-prog-map", "a2-wrap-map", "a2-local-map", "a2-prog-set", "a2-wrap-set", "a2-local-set", "a2-prog-rec", "a2-wrap-rec", "a2-local-rec", "a2-prog-err", "a2-wrap-err", "a2-local-err"]],
  [RM2, "fa6-a6", ["a6-async-memo-width"]],
  [RM3, "fa6-m0", ["m0-P-memo"]],
  [RM4, "fa7-b2", ["b2-url", "b2-url-alias"]],
  [RM5, "fa11-a", ["a-r-extra", "a-r-extra-unknown", "a-r-extra-arr", "a-r-extra-map", "a-r-extra-set", "a-r-extra-param", "a-r-extra-kept", "a-r-extra-spread", "a-r-extra-rest", "a-r-extra-snapshot", "a-r-extra-promise", "a-r-extra-gen", "a-r-extra-then", "a-r-extra-name", "a-r-extra-ok", "a-r-extra-nested", "a-r-extra-union", "a-r-extra-alias", "a-r-extra-iface", "a-r-extra-ternary", "a-r-two-ss", "a-r-sc", "a-h-tojson-action", "a-h-tostring-template", "a-h-tostring-String", "a-h-tostring-join", "a-h-tostring-sort", "a-h-valueof-Number", "a-h-then-action", "a-h-then-action-async", "a-h-then-action-await", "a-h-then-action-args", "a-h-then-action-rec", "a-h-then-fn", "a-h-then-fn-reader", "a-h-tojson-undef", "a-m-extra-u8-kept", "a-h2-tostring-loop", "a-h2-tostring-jsx-child", "a-h2-tostring-nested-arr", "a-h2-tostring-other-cell", "a-h2-tostring-other-cell-arr", "a-h2-tostring-memo", "a-h2-tostring-unknown-String", "a-h2-valueof-compare", "a-h2-tostring-search", "a-h2-tojson-nested", "a-h2-tojson-map-entries", "a-h2-tostring-fn-arg", "a-h2-tostring-optional", "a-g-unknown-arr-extra", "a-o-extra-direct", "a-o-extra-unknown", "a-o-extra-spread", "a-sc-hidden-fn", "a-snap-hidden-fn"]],
  [RM6, "fa11-min", ["min-action-hidden-json", "min-resp-race"]],
  [RM7, "fa12-forget", ["f-iter-unknown", "f-iter-object", "f-iter-rec-unknown", "f-iter-rec-object", "f-iter-rec-opt-unknown", "f-iter-arr-unknown", "f-iter-tuple-unknown", "f-iter-index-unknown-width", "f-iter-record-unknown-width", "f-iter-index-plus-width", "f-iter-map-unknown", "f-iter-generic-unknown", "f-iter-values", "f-iter-catch", "f-iter-union-num-unknown", "f-map-iter-unknown", "f-map-iter-object", "f-map-iter-rec-unknown", "f-map-iter-rec-object", "f-map-iter-rec-opt-unknown", "f-map-iter-arr-unknown", "f-map-iter-tuple-unknown", "f-map-iter-index-unknown-width", "f-map-iter-record-unknown-width", "f-map-iter-index-plus-width", "f-map-iter-map-unknown", "f-map-iter-generic-unknown", "f-map-iter-values", "f-map-iter-catch", "f-map-iter-union-num-unknown", "f-gen-unknown", "f-gen-object", "f-gen-rec-unknown", "f-gen-rec-object", "f-gen-rec-opt-unknown", "f-gen-arr-unknown", "f-gen-tuple-unknown", "f-gen-index-unknown-width", "f-gen-record-unknown-width", "f-gen-index-plus-width", "f-gen-map-unknown", "f-gen-generic-unknown", "f-gen-values", "f-gen-catch", "f-gen-union-num-unknown"]],
  [RM8, "fa12-forget2", ["gobj-object", "gobj-object-async", "gobj-object-union", "gobj-object-ret", "gobj-consumer-typeof", "gobj-consumer-keys", "gobj-catch", "gobj-iter-object", "gobj-mapiter-object"]],
  [RM9, "fa12-forget3", ["f3-promise-object", "f3-promise-object-ret", "f3-promise-object-consumer", "f3-promise-object-union"]],
  [RM10, "fa12-min", ["min-object-promise", "min-object-generator"]],
  [RM11, "fa12-sweep", ["sw-fn-snapshot", "sw-action-snapshot", "sw-state-snapshot", "sw-promise-snapshot", "sw-iter-memo-arg", "sw-iter-snapshot", "sw-gen-memo-arg", "sw-gen-snapshot", "sw-resp-memo-arg", "sw-resp-snapshot"]],
  [RM12, "fa13-unk", ["t-narrow-fn-promise"]],
];
for (const [cs, tag, names] of RM) for (const n of names) {
  const c = cs.find((x) => x.name === n);
  if (c === undefined) throw new Error(`y1: no candidate ${tag} ${n}`);
  R.push({ ...c, name: `y1-rm-${tag}-${n}` });
}
export const attacks = R;
