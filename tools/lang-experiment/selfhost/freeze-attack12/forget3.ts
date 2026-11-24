// freeze-attack12 target 1: the q8.ts probes the checker accepted, run. void results reaching state, an action's
// argument, an events yield, JSX props and a memo result; a promise or a generator given object at a cell's top; a
// record type with a call signature (takesRecord returns before its checks) declaring an inherited member of a function
import { ACT, tyRow, twiceDrive, type Cand } from "./lib12.ts";
const R: Cand[] = [];
const iterTwice = (get: (p: any) => any) => async (p: any) => {
  let it: any; try { it = get(p); } catch (e) { return `same: no value (${(e as Error).message})`; }
  if (!it || typeof it.next !== "function") return `same: not an iterator (${JSON.stringify(it)}) ${p.status("s") ?? ""} ${String(p.error("s") ?? p.error("g") ?? "").slice(0, 100)}`;
  const r1 = JSON.stringify([...{ [Symbol.iterator]: () => it }]), r2 = JSON.stringify([...{ [Symbol.iterator]: () => it }]);
  return r1 !== r2 ? `DIFF one-shot: ${r1} then ${r2}` : `same: ${r1} ${r2}`;
};
const isObj = (v: unknown) => (typeof v === "object" && v !== null) || typeof v === "function";
// a void result held by a state cell, an action's argument, an events value, a JSX prop, a memo result
R.push({ name: "f3-state-void-iter", src: `const s = () => { const f: () => void = () => [1, 2].values(); return state({ v: f() }); };`, show: ["s"], drive: iterTwice((p) => p.value("s").v) });
R.push({ name: "f3-update-void-iter", src: `const s = () => state<{ readonly v: void }>({ v: undefined });\nconst w = (s: State<{ readonly v: void }>) => action(() => { const f: () => void = () => [1, 2].values(); s.set({ v: f() }); });`, show: ["s"],
  drive: async (p: any) => { try { p.value("w")(); } catch (e) { return `same: w threw ${(e as Error).message}`; } await p.settle?.(); return iterTwice((q) => q.value("s").v)(p); } });
R.push({ name: "f3-action-arg-void-iter", src: `const s = () => state<number>(0);\nconst w = (s: State<number>) => action((r: void) => s.set(1));\nconst x = (w: Action<[void]>) => action(() => { const f: () => void = () => [1, 2].values(); w(f()); });`, show: ["s"],
  drive: async (p: any) => { try { p.value("x")(); return `same: x ran, s=${p.value("s")}`; } catch (e) { return `same: x threw ${(e as Error).message}`; } } });
R.push({ name: "f3-events-yield-void-iter", src: `function* t(): Generator<void> { const f: () => void = () => [1, 2].values(); yield f(); }\nconst k3 = (t: void) => 1;`, show: ["t", "k3"], drive: iterTwice((p) => p.value("t")) });
R.push({ name: "f3-memo-void-iter", src: `const g = () => { const m = memo((k: number): void => [k, k].values()); const u: unknown = m(1); return 1; };`, show: ["g"], drive: (p: any) => `same: g ${p.status("g")} ${String(p.error("g") ?? "")}` });
R.push({ name: "f3-jsx-prop-void-iter", src: `const g = () => { const B = (p: { readonly v: () => void }) => { const u: unknown = p.v(); return <span>x</span>; }; return <B v={() => [1].values()} />; };`, show: ["g"], drive: (p: any) => `same: g ${p.status("g")} ${String(p.error("g") ?? "")}` });
// a cell whose declared result is void: what leaves it
R.push({ name: "f3-void-cell-iter", src: `const g = (): void => [1, 2].values();`, show: ["g"], drive: iterTwice((p) => p.value("g")) });
R.push(tyRow("f3-void-cell-number", `const g = (): void => 1;`, (v) => v === undefined));
// a promise given object at the top of a cell: the runtime takes what it resolves to as the cell's value
R.push(tyRow("f3-promise-object", `const g = () => { const u: object = Promise.resolve(1); return u; };`, isObj));
R.push(tyRow("f3-promise-object-ret", `const g = (): object => Promise.resolve("s");`, isObj));
R.push(tyRow("f3-promise-object-consumer", `const g = (): object => Promise.resolve("s");\nconst k2 = (g: object) => typeof g;`, (v) => v === "object" || v === "function", false, "k2"));
R.push(tyRow("f3-promise-object-union", `const g = (): object | number => Promise.resolve("s");`, (v) => typeof v === "number" || isObj(v)));
R.push(tyRow("f3-fn-object-ret", `const g = (): object => (x: number) => x;`, isObj));
// a record type with a call signature takes a function without the forgetting rule's checks (takesRecord returns
// true first), and its optional member names what every function has: name, length, call, bind
R.push(tyRow("f3-callsig-name", `interface F { (x: number): number; readonly name?: number }\nconst g = () => { const f: F = (x: number) => x; return f.name ?? 0; };`, (v) => typeof v === "number"));
R.push(tyRow("f3-callsig-length", `interface F { (x: number): number; readonly length?: string }\nconst g = () => { const f: F = (x: number) => x; return f.length ?? "none"; };`, (v) => typeof v === "string"));
R.push(tyRow("f3-callsig-call", `interface F { (): number; readonly call?: (t: number) => string }\nconst g = () => { const f: F = () => 5; const c = f.call; return c === undefined ? "none" : c(0); };`, (v) => typeof v === "string"));
R.push(tyRow("f3-callsig-bind", `interface F { (): number; readonly bind?: number }\nconst g = () => { const f: F = () => 5; return (f.bind ?? 0) + 1; };`, (v) => typeof v === "number"));
R.push(tyRow("f3-callsig-alias", `type F = { (x: number): number; readonly name?: number };\nconst g = () => { const f: F = (x: number) => x; return f.name ?? 0; };`, (v) => typeof v === "number"));
R.push(tyRow("f3-callsig-param", `interface F { (x: number): number; readonly name?: number }\nconst g = () => { const h = (f: F) => f.name ?? 0; return h((x: number) => x); };`, (v) => typeof v === "number"));
R.push(tyRow("f3-callsig-kept", `interface F { (x: number): number; readonly name?: number }\nconst k = (): F => (x: number) => x;\nconst g = (k: F) => k.name ?? 0;`, (v) => typeof v === "number"));
R.push(tyRow("f3-callsig-action", ACT + `interface F { (): void; readonly name?: number }\nconst g = (a: Action<[]>) => { const f: F = a; return f.name ?? 0; };`, (v) => typeof v === "number"));
R.push(tyRow("f3-callsig-width-fnrec", `interface F { (x: number): number; readonly n: number }\ninterface G2 { (x: number): number; readonly n: number; readonly s: string }\nconst g = () => 1;`, (v) => v === 1));
R.push({ ...tyRow("f3-ctl-callsig-name", `const g = () => { const f = (x: number) => x; return f.name; };`, (v) => typeof v === "number"), ctl: true });
export const cands = R;
