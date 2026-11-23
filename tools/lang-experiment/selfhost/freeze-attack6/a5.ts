// a5: actions, listeners, state cells, events, JSX, islands. P rows publish mid-body and write after; the others are
// the shapes named in the brief (a function in state, an Action in state, an action's arguments, events across
// yield, a listener's action closing over cell values, island/pool arguments)
import { C } from "../freeze-attack3/harness.ts";
import { act } from "./t0.ts";
const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
const out: ReturnType<typeof C>[] = [];
const add = (n: string, s: string, x: any = {}) => out.push(C(`a5-${n}`, s, x));
const callGo = (cell: string, k = "go") => ({ drive: async (p: any) => { try { const a = p.value(cell); (typeof a === "function" ? a : a[k])(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; } return "called"; } });
// P through listeners: an events cell, a listener, the action publishes then writes
add("P-listener-rec", "const tick = function* () { yield { k: 1 }; };\n" + ST + `const put = (s: State<() => number>, lg: State<number>) => action((e: { readonly k: number }) => { ${SP} s.set(f); lg.set(f()); xs.push(e.k); });\nconst l = (tick: Events<{ readonly k: number }>, put: Action<[{ readonly k: number }]>) => on(tick, put);`,
  { drive: async (p: any) => { await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; } });
add("P-listener-two-values", "const tick = function* () { yield 1; yield 2; };\n" + ST + `const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { const xs = [k]; const c: readonly number[] = xs; const f = () => c.length * 10 + k; s.set(f); lg.set(f()); xs.push(k); });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);`,
  { drive: async (p: any) => { await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; } });
// P through JSX: an element whose onClick action publishes then writes; the drive clicks it
add("P-jsx-onclick", ST + `const el = (s: State<() => number>, lg: State<number>) => <button onClick={action(() => { ${SP} s.set(f); lg.set(f()); xs.push(1); })}>x</button>;`,
  { drive: async (p: any) => { try { p.value("el").props.onClick(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; } });
// P: the published value is an element holding the function
add("P-elem-in-state", "const s = () => state<Elem>(<i></i>);\nconst lg = () => state(-1);\nconst v = (s: Elem) => s;\nconst w = (lg: number) => lg;\n" + `const put = (s: State<Elem>, lg: State<number>) => ({ go: action(() => { ${SP} const g = action(() => { lg.set(f()); }); s.set(<b onClick={g}>{c.length}</b>); xs.push(1); }) });`,
  callGo("put"));
// P: the published value is an Action that reads the captured const; calling it later records what it sees
add("P-action-in-state", "const s = () => state<Action<[]> | null>(null);\nconst lg = () => state(-1);\nconst w = (lg: number) => lg;\n" + `const put = (s: State<Action<[]> | null>, lg: State<number>) => ({ go: action(() => { ${SP} s.set(action(() => { lg.set(f()); })); xs.push(1); }) });\nconst fire = (s: Action<[]> | null) => ({ go: action(() => { if (s) s(); }) });`,
  { drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } await p.settle(400); try { p.value("fire").go(); } catch (e) { return `fire threw ${(e as Error).message}`; } await p.settle(400); const w = p.value("w"); return `${w !== 1 ? "DIFF" : "same"} the stored action was made when c.length was 1; it records ${w}`; } });
// P: update's function returns the function; a second update in the same call reads it back
add("P-update-chain", "const s = () => state<() => number>(() => -1);\nconst lg = () => state<readonly number[]>([]);\nconst w = (lg: readonly number[]) => lg;\n" + `const put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { ${SP} s.update(() => f); const b = read(s)(); xs.push(1); s.update((g) => { lg.set([b, g()]); return g; }); }) });`,
  { drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message}`; } await p.settle(400); const l = p.value("w"); return `${l[0] !== l[1] ? "DIFF" : "same"} ${JSON.stringify(l)}`; } });
// P: an inner action is called with a record holding the function; the outer writes after
add("P-actarg-rec", ST + "const put0 = (s: State<() => number>) => action((r: { readonly f: () => number }) => { s.set(r.f); });\n" + `const put = (put0: Action<[{ readonly f: () => number }]>, lg: State<number>) => ({ go: action(() => { ${SP} put0({ f }); lg.set(f()); xs.push(1); }) });`, act());
// P: two top-level calls; the second writes nothing of the first (no shared Mut): not expected to change
add("two-calls", ST + `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { ${SP} s.set(f); lg.set(f()); }), go2: action(() => { const ys = [0, 0, 0]; ys.push(1); lg.set(ys.length); }) });`,
  { drive: async (p: any) => { p.value("put").go(); await p.settle(400); const a = p.value("v")(); p.value("put").go2(); await p.settle(400); const b = p.value("v")(); return `${a !== b ? "DIFF" : "same"} ${a} then ${b}`; } });
// data published by an action argument and written after: frozen in place, the write throws
add("actarg-data", "const s = () => state<readonly number[]>([]);\nconst put0 = (s: State<readonly number[]>) => action((d: readonly number[]) => { s.set(d); });\nconst put = (put0: Action<[readonly number[]]>) => ({ go: action(() => { const xs = [0]; put0(xs); xs.push(1); }) });", callGo("put"));
// an action's argument record holding a Mut-param writer; the action writes its own fresh local
add("actarg-writer", "const s = () => state(0);\nconst put0 = (s: State<number>) => action((r: { readonly w: (x: Mut<number[]>) => void }) => { const m = [0]; r.w(m); s.set(m.length); });\nconst put = (put0: Action<[{ readonly w: (x: Mut<number[]>) => void }]>) => ({ go: action(() => { put0({ w: (x) => { x.push(1); } }); }) });", callGo("put"));
// a state holding a function that takes a Mut; two actions call it with their own locals
add("state-mutparam-fn", "const s = () => state<(x: Mut<number[]>) => number>((x) => { x.push(1); return x.length; });\nconst t = () => state(0);\nconst go = (s: (x: Mut<number[]>) => number, t: State<number>) => ({ go: action(() => { const m = [0]; t.set(s(m)); }) });", callGo("go"));
// a listener's action closing over a cell input
add("listener-closes-input", "const d = () => [1, 2];\nconst tick = function* () { yield 1; };\nconst s = () => state(0);\nconst put = (s: State<number>, d: readonly number[]) => action((k: number) => { s.set(d.length + k); });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);");
add("listener-closes-alias", "const tick = function* () { yield 1; };\nconst s = () => state(0);\nconst put = (s: State<number>) => { const xs = [0]; const c: readonly number[] = xs; xs.push(5); return action((k: number) => { s.set(c.length + k); }); };\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);");
// events: a generator yielding functions whose captures are per-iteration
add("events-yield-fn", "const tick = function* () { for (let k = 0; k < 2; k++) { const xs = [k]; const c: readonly number[] = xs; yield () => c.length; } };\nconst s = () => state<() => number>(() => -1);\nconst put = (s: State<() => number>) => action((f: () => number) => { s.set(f); });\nconst l = (tick: Events<() => number>, put: Action<[() => number]>) => on(tick, put);\nconst v = (s: () => number) => s;");
add("events-yield-fn-after", "const tick = function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; xs.push(1); };");
// a state cell whose initial value is a function over a read-only alias written before the return
add("state-init-alias", "const s = () => { const xs = [0]; const c: readonly number[] = xs; xs.push(1); return state<() => number>(() => c.length); };");
// islands and pools: arguments cross by copy
add("island-data", "const x = () => [1];\nconst y = (x: readonly number[]) => x.length;\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });");
add("island-fn-in", "const x = () => () => 1;\nconst y = (x: () => number) => x();\nconst go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });");
// set/update taken as a value
add("set-as-value", ST + `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { ${SP} const st = s.set; st(f); lg.set(f()); xs.push(1); }) });`, act());
// read() of a function-valued state inside an action, kept
// (a first version chained on the previous call's state and read as DIFF in both modes: the harness also calls go)
add("read-kept", ST + `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const g = read(s); s.set(g); lg.set(g()); }) });`, act());
// controls (checker skipped)
add("ctl-P-direct-mut", ST + "const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const f = () => xs.length; s.set(f); lg.set(f()); xs.push(1); }) });", { ...act(), ctl: true });
add("ctl-listener-let", "const tick = function* () { yield 1; };\n" + ST + "const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { let n = k; const f = () => n; s.set(f); lg.set(f()); n = 9; });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);",
  { ctl: true, drive: async (p: any) => { await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; } });
export const cands = out;
