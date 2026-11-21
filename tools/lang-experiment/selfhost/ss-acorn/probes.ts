// Adversarial probes of FN CROSSING (rule/), each a module checked, compiled and run in a real Observable Runtime
// (rt.ts). Prints each probe's verdicts and values. Run: bun probes.ts > out/probes.txt
import { load, verdicts } from "./rt.ts";
const COPY = process.env.SSA_COPY ?? "rule";
const { fnCalls } = await import(`./${COPY}/lite/boundary.ts`);
console.log(`copy: ${COPY}`);
const show = (r: any) => r.ok ? `value ${typeof r.v === "function" ? "a function" : JSON.stringify(r.v)}` : `error ${r.e?.constructor?.name}: ${r.e?.message ?? JSON.stringify(r.e)}`;
const head = (s: string) => console.log(`\n## ${s}`);
const R = `type R = { n: number; tag: string };\n`;

head("1. a different value each call");
{
  let k = 0;
  const L = await load(COPY, R + `export const a = (f: (s: string) => R) => f("x");
export const b = (f: (s: string) => R) => f("x");
export const both = (f: (s: string) => R) => [f("x").n, f("x").n];
export const same = (a: R, b: R) => equals(a, b);
export const keep = (a: R) => state(a.n);`, { f: [[], () => (s: string) => ({ n: ++k, tag: s })] });
  console.log(verdicts(L.checked).join("\n"));
  for (const n of ["a", "b", "both", "same", "keep"]) console.log(n, show(await L.value(n)));
  console.log("a again (no input changed, the runtime does not run it again):", show(await L.value("a")));
}

head("2. mutates its argument");
{
  let seen: any;
  const L = await load(COPY, `type Box = { xs: number[] };
export const box = (): Box => ({ xs: [1, 2] });
export const r = (f: (b: Box) => number, box: Box) => { let m = "none"; try { f(box); } catch (e) { m = typeof e === "object" && e !== null && "message" in e ? String(e.message) : "?"; } return m; };
export const after = (box: Box, r: string) => box.xs.length;`, { f: [[], () => (b: any) => { seen = b; b.xs.push(9); return 1; }] });
  console.log(verdicts(L.checked).join("\n"));
  console.log("r", show(await L.value("r")), "| after", show(await L.value("after")));
  console.log("argument frozen:", Object.isFrozen(seen), Object.isFrozen(seen.xs), "| argument is the checked value:", seen === (await L.value("box")).v);
}

head("3. throws");
{
  const throwers: Record<string, () => never> = {
    "an Error": () => { throw new Error("boom"); },
    "a string": () => { throw "plain string"; },
    "a function": () => { throw () => 1; },
    "a Proxy whose message getter throws": () => { throw new Proxy(new Error("x"), { get: () => { throw new Error("trap"); } }); },
    "a live object": () => { throw { message: "live", later: 1 }; },
  };
  for (const [what, t] of Object.entries(throwers)) {
    let caught: unknown = null;
    const L = await load(COPY, `export const r = (f: (s: string) => number) => { try { return String(f("x")); } catch (e) { return typeof e === "object" && e !== null && "message" in e ? String(e.message) : typeof e; } };
export const raw = (f: (s: string) => number) => f("x");`, { f: [[], () => (s: string) => t()] });
    const rr = await L.value("raw");
    caught = rr.ok ? null : rr.e;
    console.log(`${what}: checked catch sees ${show(await L.value("r"))}; uncaught: ${show(rr)}; is a TypeError the boundary made: ${caught instanceof TypeError}`);
  }
}

head("4. returns a function, a cyclic value, a wrong shape, a Promise");
{
  const cyc: any = { n: 1, tag: "c" }; cyc.self = cyc;
  const cyc2: any = { n: 1, tag: "c", kids: [] }; cyc2.kids.push(cyc2);
  const cases: Record<string, unknown> = {
    "a function": () => 1, "a cyclic value (cycle under an undeclared key)": cyc, "a wrong shape": { n: "1", tag: "t" }, "a Promise": Promise.resolve({ n: 1, tag: "p" }),
    "a class instance": new (class P { n = 1; tag = "k"; })(), "extra keys": { n: 1, tag: "t", extra: [1] },
  };
  for (const [what, v] of Object.entries(cases)) {
    const L = await load(COPY, R + `export const r = (f: (s: string) => R) => f("x");`, { f: [[], () => () => v] });
    console.log(`${what}: ${show(await L.value("r"))}`);
  }
  const T = `type T = { n: number; kids: T[] };\nexport const r = (f: (s: string) => T) => f("x").kids.length;`;
  const L = await load(COPY, T, { f: [[], () => () => cyc2] });
  console.log(`a cyclic value of a recursive type: ${show(await L.value("r"))}`);
}

head("5. keeps its argument and changes it later");
{
  let kept: any = null;
  const L = await load(COPY, `type Q = { q: number[] };
export const arg = (): Q => ({ q: [1] });
export const first = (f: (x: Q) => number, arg: Q) => f(arg);
export const later = (arg: Q, first: number) => arg.q.length;`, { f: [[], () => (x: any) => { kept = x; return x.q.length; }] });
  console.log(verdicts(L.checked).join("\n"));
  console.log("first", show(await L.value("first")));
  let m = "no error"; try { kept.q.push(2); } catch (e: any) { m = `${e.constructor.name}: ${e.message}`; }
  console.log("the kept argument changed later:", m, "| later", show(await L.value("later")));
}

head("6. async");
{
  const src = R + `export const r = async (f: (s: string) => Promise<R>) => { const x = await f("x"); return x.n; };`;
  const cases: Record<string, () => unknown> = {
    "resolves to R": async () => ({ n: 7, tag: "a" }),
    "resolves to a wrong shape": async () => ({ n: "7" }),
    "rejects": async () => { throw new Error("later boom"); },
    "returns R without a promise": () => ({ n: 8, tag: "s" }),
    "a thenable whose then throws": () => ({ then() { throw new Error("then threw"); } }),
  };
  for (const [what, f] of Object.entries(cases)) {
    const L = await load(COPY, src, { f: [[], () => f] });
    console.log(`${what}: ${verdicts(L.checked).join(" ")} -> ${show(await L.value("r"))}`);
  }
  const L0 = await load("base", src, { f: [[], () => async () => ({ n: 1, tag: "a" })] });
  console.log(`base: ${verdicts(L0.checked).join(" ")}`);
}

head("7. re-entrancy");
{
  // the shell function calls a checked function it took from another cell, and itself through the wrapper
  let wrapper: any = null, depth = 0;
  const L = await load(COPY, `export const dbl = () => (n: number): number => n * 2;
export const exposed = (f: (n: number) => number) => f;
export const r = (f: (n: number) => number) => f(3);`, {
    dbl2: [["dbl"], (dbl: any) => dbl],
    f: [["dbl2"], (dbl: any) => (n: number) => { depth++; const x = depth < 3 && wrapper ? wrapper(n) : dbl(n); depth--; return x; }],
  });
  const e = await L.value("exposed");
  wrapper = e.ok ? e.v : null;
  console.log(verdicts(L.checked).join("\n"));
  console.log("exposed is the raw function:", e.ok && e.v === (await L.m.value("f")), "| frozen:", Object.isFrozen(wrapper));
  console.log("r (calls dbl, a checked function)", show(await L.value("r")));
  console.log("the wrapper called from outside, recursing through itself twice:", wrapper(5));
}
{
  // the shell function calls an Action while a checked cell is being computed
  let calls = 0, done: () => void = () => {};
  const stop = new Promise<void>((r) => (done = r));
  const L = await load(COPY, `export const count = () => state(0);
export const bump = (count: State<number>) => action(() => count.update((c) => c + 1));
export const use = (f: (s: string) => number, count: number) => f("a") + count;`, {
    f: [["bump"], (bump: any) => (s: string) => { calls++; if (calls < 20) bump(); else done(); return 0; }],
  });
  console.log(verdicts(L.checked).join("\n"));
  const u = await L.value("use");
  if (!u.ok) console.log("use", show(u)); else await stop;
  console.log(`use ran ${calls} times by its own call; use = ${show(await L.value("use"))}`);
}

head("8. purity, action capture and the checker");
{
  const L = await load(COPY, R + `export const parse = (f: (s: string) => R) => (s: string): R => f(s);
export const box = () => state(0);
export const act1 = (f: (s: string) => R, box: State<number>) => action(() => box.set(f("x").n));
export const act2 = (parse: (s: string) => R, box: State<number>) => action(() => box.set(parse("x").n));
export const nested = (g: { run: (s: string) => R }) => 1;
export const st = (h: State<(s: string) => R>) => 1;
export const gen = (k: <T>(x: T) => T) => 1;
export const rest = (k: (...xs: string[]) => number) => 1;
export const fnArg = (k: (cb: (s: string) => number) => number) => 1;
export const fnRet = (k: (s: string) => () => number) => 1;
export const opt = (k: (s: string, n?: number) => number) => k("a");`, {
    f: [[], () => (s: string) => ({ n: 1, tag: s })], g: [[], () => ({ run: () => 1 })], "viewof h": [[], () => ({ value: 1 })], h: [[], () => 1],
    k: [[], () => (s: string, n?: number) => (n === undefined ? -1 : n)], gen: [[], () => 1], rest: [[], () => 1], fnArg: [[], () => 1], fnRet: [[], () => 1],
  });
  console.log(verdicts(L.checked).join("\n"));
  console.log("opt", show(await L.value("opt")));
}

head("9. the same function delivered again, and a new one");
{
  const fixed = (s: string) => ({ n: s.length, tag: s });
  let fresh = false;
  const L = await load(COPY, R + `export const w = (f: (s: string) => R) => f;
export const kept = (w: (s: string) => R) => state(w("ab").n);`, { tick: [[], () => 0], f: [["tick"], () => (fresh ? (s: string) => ({ n: 99, tag: s }) : fixed)] });
  const w1 = (await L.value("w")).v;
  L.redefine("tick", [], () => 1);
  const w2 = (await L.value("w")).v;
  fresh = true; L.redefine("tick", [], () => 2);
  const w3 = (await L.value("w")).v;
  console.log(`same raw function again: same wrapper ${w1 === w2}; a new raw function: same wrapper ${w1 === w3}; kept = ${show(await L.value("kept"))}`);
}
console.log(`\nwrapper calls in all probes: ${fnCalls.calls}`);
process.exit(0);
