// a1: a function published in the middle of an action's body (state set, update, action argument), then the action
// writes, after the publish, a Mut local that a read-only const the function captures names. lg records what the
// function gave when it was published; v is a consumer cell holding the function from the state cell.
import { C } from "../freeze-attack3/harness.ts";
import { act } from "./t0.ts";
type H = { id: string; setup: string; read: string; writes: [string, string][] };
const H: H[] = [
  { id: "arr", setup: "const xs = [0, 1]; const c: readonly number[] = xs;", read: "c.length * 100 + c.reduce((p, q) => p * 3 + q, 0)",
    writes: [["push", "xs.push(1);"], ["index", "xs[0] = 5;"], ["pop", "xs.pop();"], ["splice", "xs.splice(0, 1);"], ["unshift", "xs.unshift(3);"], ["fill", "xs.fill(4);"], ["reverse", "xs.reverse();"], ["sort", "xs.sort((p, q) => q - p);"], ["shift", "xs.shift();"], ["copyWithin", "xs.copyWithin(0, 1);"], ["length0", "xs.length = 0;"], ["compound", "xs[1] += 7;"], ["incr", "xs[0]++;"]] },
  { id: "map", setup: "const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m;", read: "c.size * 10 + (c.get('a') ?? 0)",
    writes: [["set", "m.set('k', 1);"], ["set-a", "m.set('a', 5);"], ["delete", "m.delete('a');"], ["clear", "m.clear();"]] },
  { id: "set", setup: "const st = new Set<number>([1]); const c: Set<number> = st;", read: "c.size",
    writes: [["add", "st.add(2);"], ["delete", "st.delete(1);"], ["clear", "st.clear();"]] },
  { id: "rec", setup: "const o = { n: 1 }; const c: { readonly n: number } = o;", read: "c.n",
    writes: [["assign", "o.n = 5;"], ["incr", "o.n++;"], ["compound", "o.n += 2;"]] },
  { id: "opt", setup: "const o: { n?: number } = { n: 1 }; const c: { readonly n?: number } = o;", read: "c.n ?? -1",
    writes: [["delete", "delete o.n;"], ["assign", "o.n = 9;"]] },
  { id: "err", setup: "const e = new Error('x'); const c: Error = e;", read: "c.message.length", writes: [["message", "e.message = 'longer';"]] },
  { id: "nest", setup: "const xs = [0]; const r = { t: xs }; const c: { readonly t: readonly number[] } = r;", read: "c.t.length", writes: [["push", "xs.push(1);"]] },
  { id: "tuple", setup: "const xs = [0]; const t = [xs, 1] as const; const c: readonly [readonly number[], 1] = t;", read: "c[0].length", writes: [["push", "xs.push(1);"]] },
  { id: "recmap", setup: "const m = new Map<string, number>(); const c: { readonly m: Map<string, number> } = { m };", read: "c.m.size", writes: [["set", "m.set('k', 1);"]] },
  { id: "arrrec", setup: "const o = { n: 1 }; const c: readonly { readonly n: number }[] = [o];", read: "c[0]?.n ?? -1", writes: [["assign", "o.n = 4;"]] },
  { id: "spreadless", setup: "const xs = [0]; const c: readonly number[] = xs; const d: readonly number[] = c;", read: "d.length", writes: [["push", "xs.push(1);"]] },
];
const ST = (t: string, init: string) => `const s = () => state<${t}>(${init});\nconst lg = () => state(-1);\nconst v = (s: ${t}) => s;\nconst w = (lg: number) => lg;\n`;
const FN = "() => number";
const cell = (body: string, t = FN) => `const put = (s: State<${t}>, lg: State<number>) => ({ go: action(() => { ${body} }) });`;
const out: ReturnType<typeof C>[] = [];
// C1: s.set(f) then the write, every holder x every write
for (const h of H) for (const [wn, w] of h.writes)
  out.push(C(`a1-set-${h.id}-${wn}`, ST(FN, "() => -1") + cell(`${h.setup} const f = () => ${h.read}; s.set(f); lg.set(f()); ${w}`), act()));
// channels for three holder-writes
const pick: [H, string][] = [[H[0]!, "xs.push(1);"], [H[1]!, "m.set('k', 1);"], [H[3]!, "o.n = 5;"], [H[5]!, "e.message = 'longer';"]];
for (const [h, w] of pick) {
  const id = h.id, f = `() => ${h.read}`;
  out.push(C(`a1-update-${id}`, ST(FN, "() => -1") + cell(`${h.setup} const f = ${f}; s.update(() => f); lg.set(f()); ${w}`), act()));
  out.push(C(`a1-rec-${id}`, ST("{ readonly f: () => number }", "{ f: () => -1 }") + cell(`${h.setup} const f = ${f}; s.set({ f }); lg.set(f()); ${w}`, "{ readonly f: () => number }"), act()));
  out.push(C(`a1-method-${id}`, ST("{ readonly f: () => number }", "{ f: () => -1 }") + cell(`${h.setup} const o2 = { f() { return ${h.read}; } }; s.set(o2); lg.set(o2.f()); ${w}`, "{ readonly f: () => number }"), act()));
  out.push(C(`a1-arr-${id}`, ST("readonly (() => number)[]", "[]") + cell(`${h.setup} const f = ${f}; s.set([f]); lg.set(f()); ${w}`, "readonly (() => number)[]"), act()));
  out.push(C(`a1-decl-${id}`, ST(FN, "() => -1") + cell(`${h.setup} function f() { return ${h.read}; } s.set(f); lg.set(f()); ${w}`), act()));
  out.push(C(`a1-wrap-${id}`, ST(FN, "() => -1") + cell(`${h.setup} const f = ${f}; const g = () => f() + 0; s.set(g); lg.set(g()); ${w}`), act()));
  out.push(C(`a1-width-${id}`, ST("{ readonly n: number }", "{ n: 0 }") + cell(`${h.setup} const f = ${f}; const r = { n: 0, f }; s.set(r); lg.set(f()); ${w}`, "{ readonly n: number }"), act("put", "go", "v", "w", (x: any) => x.f())));
  out.push(C(`a1-mapholder-${id}`, ST("Map<string, () => number>", "new Map()") + cell(`${h.setup} const f = ${f}; s.set(new Map([['k', f]])); lg.set(f()); ${w}`, "Map<string, () => number>"), act("put", "go", "v", "w", (x: any) => x.get("k")())));
  out.push(C(`a1-helper-write-${id}`, ST(FN, "() => -1") + cell(`${h.setup} const wr = () => { ${w} }; const f = ${f}; s.set(f); lg.set(f()); wr();`), act()));
  out.push(C(`a1-foreach-write-${id}`, ST(FN, "() => -1") + cell(`${h.setup} const f = ${f}; s.set(f); lg.set(f()); [1].forEach(() => { ${w} });`), act()));
  out.push(C(`a1-loop-${id}`, ST(FN, "() => -1") + cell(`${h.setup} const f = ${f}; for (let i = 0; i < 2; i++) { if (i === 0) { s.set(f); lg.set(f()); } else { ${w} } }`), act()));
  out.push(C(`a1-nested-fn-${id}`, ST(FN, "() => -1") + cell(`const mk = () => { ${h.setup} const f = ${f}; s.set(f); lg.set(f()); ${w} }; mk();`), act()));
  // an inner action takes the function as its argument and stores it
  out.push(C(`a1-actarg-${id}`, ST(FN, "() => -1") + `const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { ${h.setup} const f = ${f}; put0(f); lg.set(f()); ${w} }) });`, act()));
  // read(s) inside the same call sees the change: the action records both
  out.push(C(`a1-readback-${id}`, `const s = () => state<() => number>(() => -1);\nconst lg = () => state<readonly number[]>([]);\nconst w = (lg: readonly number[]) => lg;\nconst put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { ${h.setup} const f = ${f}; s.set(f); const before = f(); ${w} lg.set([before, read(s)()]); }) });`,
    { drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; } await p.settle(400); const l = p.value("w"); return `${l[0] !== l[1] ? "DIFF" : "same"} set-time ${l[0]} read(s)() ${l[1]}`; } }));
  // a Mut parameter of a helper inside the action
  out.push(C(`a1-mutparam-${id}`, ST(FN, "() => -1") + cell(`const mk = (xs: Mut<number[]>) => { const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }; mk([0]);`), act()));
}
// a listener delivers the value; the action publishes then writes
out.push(C("a1-listener", "const tick = function* () { yield 1; };\n" + ST(FN, "() => -1") + "const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { const xs = [k]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(k); });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);",
  { drive: async (p: any) => { await p.settle(400); const f = p.value("v"), w = p.value("w"); return `${f() !== w ? "DIFF" : "same"} given ${w} holds ${f()}`; } }));
// data, not a function: freezing the array in place makes the later write throw (both modes)
out.push(C("a1-data-set-push", "const s = () => state<readonly number[]>([]);\nconst lg = () => state(-1);\nconst v = (s: readonly number[]) => s;\nconst w = (lg: number) => lg;\nconst put = (s: State<readonly number[]>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; s.set(c); lg.set(c.length); xs.push(1); }) });", act("put", "go", "v", "w", (x: any) => x.length)));
// controls (checker skipped): a let the function captures, written after the publish; fires in both modes
out.push(C("a1-ctl-let", ST(FN, "() => -1") + cell("let n = 1; const f = () => n; s.set(f); lg.set(f()); n = 2;"), { ...act(), ctl: true }));
out.push(C("a1-ctl-mut-capture", ST(FN, "() => -1") + cell("const xs = [0]; const f = () => xs.length; s.set(f); lg.set(f()); xs.push(1);"), { ...act(), ctl: true }));
export const cands = out;
