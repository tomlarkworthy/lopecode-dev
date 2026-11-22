// 2/3. later-called and generator boundaries carrying the two shapes found in b4/b5 (a rejection reason; a native Map
// behind a promise a published function captures), and plain re-yield / handler shapes
import { C, L, W } from "./harness.ts";
const callW = (p: any) => { p.value("w")(); };
const MKE = "const e = new Error(\"x\"); const mk = async (x: Error): Promise<number> => { throw x; }; ";
const OBSP = (ty: string, get: string) => `\nconst obs = async function* (${ty}) { try { await ${get}; yield "none"; } catch (x) { yield messageOf(x); ${W}${W}yield messageOf(x); } };`;
export const cands = [
  // state initial and state.set
  C("st-init-rej", "const s = () => { " + MKE + L("e.message = \"y\";") + "return state({ p: mk(e) }); };" + OBSP("s: { p: Promise<number> }", "s.p"), { twice: ["obs"] }),
  C("st-set-rej", "const s = () => state({ p: Promise.resolve(0) });\nconst w = (s: State<{ p: Promise<number> }>) => action(() => { " + MKE + "s.set({ p: mk(e) }); " + L("e.message = \"y\";") + "});" + OBSP("s: { p: Promise<number> }", "s.p"), { twice: ["obs"], drive: callW }),
  C("st-set-nmap-fn", "const s = () => state({ g: (): Promise<number> => Promise.resolve(0) });\nconst w = (s: State<{ g: () => Promise<number> }>) => action(() => { const m = structuredClone(new Map<string, number>()); const mk = async (x: Map<string, number>) => x; const p = mk(m); s.set({ g: async () => (await p).size }); " + L("m.set(\"k\", 1);") + "});\nconst obs = async function* (s: { g: () => Promise<number> }) { yield [await s.g()]; " + W + W + "yield [await s.g()]; };", { twice: ["obs"], drive: callW }),
  // events yield, listener action
  C("ev-yield-rej", "const g = async function* () { " + MKE + "yield { p: mk(e) }; " + W + "e.message = \"y\"; " + W + "yield { p: mk(e) }; };\nconst s = () => state([\"-\"]);\nconst add = (s: State<string[]>) => action((v: { p: Promise<number> }) => { v.p.then(() => 0, (x) => { s.update((a) => [...a, messageOf(x)]); }); });\nconst l = (g: Events<{ p: Promise<number> }>, add: Action<[{ p: Promise<number> }]>) => on(g, add);", { show: ["s"] }),
  C("gen-yield-rej", "const a = function* () { " + MKE + "yield { p: mk(e) }; e.message = \"y\"; yield 1; };" + OBSP("a: { p: Promise<number> } | number", "(typeof a === \"number\" ? Promise.resolve(0) : a.p)"), { twice: ["obs"] }),
  C("gen-return-rej", "const a = function* () { " + MKE + "yield 0; return { p: mk(e) }; };"),
  C("async-gen-yield-nmap-fn", "const a = async function* () { const m = structuredClone(new Map<string, number>()); const mk = async (x: Map<string, number>) => x; const p = mk(m); yield { g: async () => (await p).size }; " + W + "m.set(\"k\", 1); " + W + "yield 1; };"),
  // action argument (deep-frozen) carrying a rejecting promise
  C("act-arg-rej", "const s = () => state([\"-\"]);\nconst add = (s: State<string[]>) => action((v: { p: Promise<number> }) => { v.p.then(() => 0, (x) => { s.update((a) => [...a, messageOf(x)]); }); });\nconst w = (add: Action<[{ p: Promise<number> }]>) => action(() => { " + MKE + "add({ p: mk(e) }); " + L("e.message = \"y\";") + "});", { show: ["s"], drive: callW }),
  // JSX: a rejecting promise in a handler's capture... handlers are actions; prop holding a function returning a promise
  C("jsx-fn-prop-rej", "const a = () => { " + MKE + "const p = mk(e); " + L("e.message = \"y\";") + "return <button onClick={action(() => { p.then(() => 0, () => 0); })}>x</button>; };"),
  // re-yield / re-publish controls
  C("gen-reyield-written", "const a = function* () { const xs = [0]; yield xs; xs.push(1); yield xs; };"),
  C("gen-reyield-copy-path", "const a = function* () { const t = new Uint8Array(2); const o = { t, n: [0] }; yield o; t[0] = 1; yield o; };"),
  C("gen-reyield-copy-path-inner", "const a = function* () { const t = new Uint8Array(2); const n = [0]; const o = { t, n }; yield o; n.push(1); yield o; };"),
  C("gen-yield-fn-then-write", "const a = function* () { const xs = [0]; yield () => xs.length; xs.push(1); yield 0; };"),
  C("invalidation-write", "const a = (invalidation: Invalidation) => { const xs = [0]; invalidation.then(() => { xs.push(1); }); return xs; };"),
  C("handler-arg-host", "const s = () => state(0);\nconst a = (s: State<number>) => <input onInput={action((v: string) => { s.set(v.length); })} />;"),
];
