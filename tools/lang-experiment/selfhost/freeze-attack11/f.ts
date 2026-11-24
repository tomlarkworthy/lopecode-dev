// freeze-attack11 F: names the checker accepts as a cell name (names.ts, names-out.txt), each as a cell read by another
// cell, beside the machinery a compiled cell takes from the runtime module (a kept closure, methods, JSX, state, an
// action, events and a listener, a cast). Run both runners (and drive-rt --both). DIFF: g is not 6, or the listener's
// state q is not 1, or k's kept function does not give 1.
type C = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown; ctl?: boolean };
const R: C[] = [];
const MACH = `const k = () => { const xs = [1]; const c: readonly number[] = xs; const o = { m() { return c.length; } }; return { f: () => c.length, o, e: <div>{c.length}</div> }; };
const s = () => state(0);
const a = (s: State<number>) => action((n: number) => s.set(n));
const e = function* () { yield 1; };
const l = (e: Events<number>, a: Action<[number]>) => on(e, a);
const q = (s: number) => s;
const z = () => { const u: unknown = JSON.parse("[1]"); const v = cast<readonly number[]>(u); return v.ok ? v.value.length : 0; };`;
const drive = (p: any) => {
  const out: string[] = [];
  const g = p.value("g"), q = p.value("q"), k = p.value("k"), z = p.value("z");
  if (g !== 6) out.push(`g=${JSON.stringify(g)} (${p.status("g")} ${String(p.error("g") ?? "").slice(0, 80)})`);
  if (q !== 1) out.push(`q=${JSON.stringify(q)} (${p.status("q")} ${String(p.error("q") ?? "").slice(0, 80)})`);
  try { if (k?.f?.() !== 1 || k?.o?.m?.() !== 1) out.push(`k=${typeof k} ${p.status("k")} ${String(p.error("k") ?? "").slice(0, 80)}`); } catch (x) { out.push(`k threw ${(x as Error).message}`); }
  if (z !== 1) out.push(`z=${JSON.stringify(z)} (${p.status("z")} ${String(p.error("z") ?? "").slice(0, 80)})`);
  return out.length ? `DIFF ${out.join("; ")}` : "same: g=6 q=1 k ok z=1";
};
const NAMES = ("closure methods out ref events listen cross viewRef compileFor rejected release SsMap SsSet SsURL " +
  "md html svg width Inputs Plot d3 require FileAttachment Promises DOM Files Mutable visibility htl tex " +
  "Date Reflect Proxy WeakMap WeakSet globalThis window self document console Function setTimeout queueMicrotask performance " +
  "Iterator AggregateError SyntaxError ReferenceError EvalError URIError WeakRef Float16Array BigInt64Array escape unescape _ L aq vl").split(" ");
for (const n of NAMES) R.push({ name: `f-name-${n}`, src: `const ${n} = () => 5;\nconst g = (${n}: number) => ${n} + 1;\n${MACH}`, show: ["g", "q", "z"], drive });
// a cell named after a runtime cell, read by a cell that also uses that runtime function
R.push({ name: "f-closure-used", src: `const closure = () => 5;\nconst g = (closure: number) => { const xs = [1]; const c: readonly number[] = xs; const f = () => c.length + closure; return f(); };\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-out-used", src: `const out = () => 5;\nconst g = (out: number) => out + 1;\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-SsMap-used", src: `const SsMap = () => 5;\nconst g = (SsMap: number) => new Map([[1, SsMap]]).size + SsMap;\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-events-used", src: `const events = () => 5;\nconst g = (events: number) => events + 1;\n${MACH}`, show: ["g", "q"], drive });
R.push({ name: "f-listen-used", src: `const listen = () => 5;\nconst g = (listen: number) => listen + 1;\n${MACH}`, show: ["g", "q"], drive });
R.push({ name: "f-ref-state", src: `const ref = () => 5;\nconst g = (ref: number, s: number) => ref + 1 + s * 0;\n${MACH}`, show: ["g", "q"], drive });
R.push({ name: "f-rejected-with-bad", src: `const rejected = () => 5;\nconst g = (rejected: number) => rejected + 1;\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-this", src: `const this = () => 5;\nconst g = () => 6;\n${MACH}`, show: ["g"], drive });
// locals and parameters named after builtins, globals and runtime cells
for (const n of ["md", "width", "Date", "globalThis", "closure", "out", "ref", "events", "SsMap", "Generators", "invalidation", "Promise", "Object", "JSON", "Map", "structuredClone", "URLSearchParams", "now", "fetch", "undefined", "NaN"]) {
  R.push({ name: `f-local-${n}`, src: `const g = () => { const ${n} = 5; return ${n} + 1; };\n${MACH}`, show: ["g"], drive });
  R.push({ name: `f-param-${n}`, src: `const g = () => { const f = (${n}: number) => ${n} + 1; return f(5); };\n${MACH}`, show: ["g"], drive });
}
// a local named after a global the compiler passes as an input, in a cell that also uses the global
R.push({ name: "f-local-sc-and-use", src: `const g = () => { const f = () => structuredClone([1, 2, 3]).length; const structuredClone = 3; return f() + structuredClone; };\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-local-Map-and-new", src: `const g = () => { const m = new Map([[1, 2]]); const k2 = () => { const Map = 5; return Map; }; return m.size + k2(); };\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-local-usp-and-use", src: `const g = () => { const n = new URLSearchParams("a=1&b=2").size; const k2 = (URLSearchParams: number) => URLSearchParams; return n + k2(4); };\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-ctl-Map-cell", src: `const Map = () => 5;\nconst g = (Map: number) => Map + 1;\n${MACH}`, show: ["g"], drive, ctl: true });
// TypeScript contextual keywords accepted as cell names (p5.ts)
for (const n of "async of get set type declare namespace module abstract readonly keyof infer is asserts unique never unknown any symbol object string number boolean bigint".split(" "))
  R.push({ name: `f-kw-${n}`, src: `const ${n} = () => 5;\nconst g = (${n}: number) => ${n} + 1;\n${MACH}`, show: ["g", "q", "z"], drive });
// a this parameter: the checker types this, the call passes none
R.push({ name: "f-this-param-fn", src: `const g = () => { const f = function (this: number) { return this + 1; }; return f() + 5; };\n${MACH}`, show: ["g"], drive });
R.push({ name: "f-this-param-str", src: `const g = () => { const f = function (this: string) { return this.length; }; return f() + 5; };\n${MACH}`, show: ["g"], drive });
export const cands = R;
