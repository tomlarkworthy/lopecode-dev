import { A, W, D, B } from "./common.ts";
// thenables: Observable's runtime adopts a value with a then method; out() deep-freezes only a real Promise's value
const R = (t: string) => `(r: (v: ${t}) => void)`;
const HOLD = "\nconst c = (a: unknown) => () => a;";
export const attacks = [
  A("th-arr-async", "const a = () => ({ then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } });" + HOLD, ["a"]),
  A("th-typed-async", "const a = () => ({ then: " + R("Uint8Array") + " => { const t = new Uint8Array(2); const h = async () => { " + W + "t[0] = 1; }; h(); r(t); } });" + HOLD, ["a"]),
  A("th-rec-async", "const a = () => ({ then: " + R("{ n: number }") + " => { const o = { n: 0 }; const h = async () => { " + W + "o.n = 5; }; h(); r(o); } });" + HOLD, ["a"]),
  A("th-map-async", "const a = () => ({ then: " + R("Map<string, number>") + " => { const m = new Map<string, number>(); const h = async () => { " + W + "m.set(\"k\", 1); }; h(); r(m); } });" + HOLD, ["a"]),
  A("th-set-async", "const a = () => ({ then: " + R("Set<number>") + " => { const s = new Set<number>(); const h = async () => { " + W + "s.add(1); }; h(); r(s); } });" + HOLD, ["a"]),
  A("th-url-async", "const a = () => ({ then: " + R("URL") + " => { const u = new URL(\"https://x.test/a\"); const h = async () => { " + W + "u.pathname = \"/b\"; }; h(); r(u); } });" + HOLD, ["a"]),
  A("th-err-async", "const a = () => ({ then: " + R("Error") + " => { const e = new Error(\"x\"); const h = async () => { " + W + "e.message = \"y\"; }; h(); r(e); } });" + HOLD, ["a"]),
  A("th-arr-then-cb", "const a = () => ({ then: " + R("number[]") + " => { " + D + "const xs = [0]; D().then(() => { xs.push(1); }); r(xs); } });" + HOLD, ["a"]),
  A("th-arr-typed-rec", "const a = () => ({ then: " + R("{ xs: number[] }") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r({ xs }); }, xs: [9] });\nconst c = (a: { xs: number[] }) => () => a.xs;", ["a"]),
  A("th-method-async", "const a = () => ({ then(r: (v: number[]) => void) { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } });" + HOLD, ["a"]),
  A("th-gen", "const a = function* () { yield { then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } }; };" + HOLD, ["a"]),
  A("th-async-gen", "const a = async function* () { yield { then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } }; };" + HOLD, ["a"]),
  A("th-state", "const s = () => state({ then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } });\nconst c = (s: unknown) => () => s;", ["s"]),
  A("th-async-cell", "const a = async () => ({ then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } });" + HOLD, ["a"]),
  A("th-promise-resolve", "const a = () => Promise.resolve({ then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } });" + HOLD, ["a"]),
  A("th-fn-value", "const a = () => ({ then: " + R("() => number") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(() => xs.length); } });" + HOLD, ["a"]),
  // the then body called again by each consumer that awaits the cell's value: the record is frozen, its result is not
  A("th-await-consumer", "const a = () => ({ then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } });\nconst c = async (a: { then: (r: (v: number[]) => void) => void }) => { const v = await a; return () => v; };", ["c"]),
  A("th-await-inner", "const c = async () => { const t = { then: " + R("number[]") + " => { const xs = [0]; const h = async () => { " + W + "xs.push(1); }; h(); r(xs); } }; const v = await t; return () => v; };", ["c"]),
  // the resolved value itself, no write: type confusion only
  A("th-confuse-type", "const a = () => ({ then: " + R("number") + " => { r(7); }, xs: [1] });\nconst b = (a: { xs: number[] }) => a.xs.length;", ["a", "b"]),
];
