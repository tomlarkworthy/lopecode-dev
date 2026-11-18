// Constructs classify.ts decides by heuristic, checked once against the real checker.
import { checkSources, type Sources } from "../lite/core.ts";
const nb = (cells: string, outside: { name: string; view?: boolean }[] = []): Sources => ({ cells, tsx: true, outside });
const report = (id: string, note: string, src: Sources) => {
  const r = checkSources(src);
  const mod = r.module.map((e: any) => `module [${e.rule}] ${e.msg}`);
  const cells = r.cells.map((x: any) => `${x.name}: ${x.status}${x.errors?.length ? " " + x.errors.map((e: any) => `[${e.rule}] L${e.line} ${e.msg}`).join("; ") : ""}`);
  console.log(`${id} ${note}\n   ${[...mod, ...cells].join("\n   ")}`);
};
report("G1", "a kernel writing into a Mut<Float32Array> parameter (MUTARG with a Mut-typed argument)", nb(`
const fill = () => (out: Mut<Float32Array>, v: number): void => { for (let i = 0; i < out.length; i++) out[i] = v; };
const filled = (fill) => { const buf = mut(new Float32Array(4)); fill(buf, 2); return freeze(buf); };`));
report("G2", "reduce with an accumulator mutated in the callback (MUTARG)", nb(`
const evens = () => (xs: readonly number[]): number[] => xs.reduce((acc: number[], x: number) => { if (x % 2 === 0) acc.push(x); return acc; }, []);`));
report("G2b", "the same as filter", nb(`
const evens = () => (xs: readonly number[]): readonly number[] => xs.filter((x) => x % 2 === 0);`));
report("G3", "new Date(t).toISOString() (DATE)", nb(`
const stamp = () => (t: number): string => new Date(t).toISOString();`));
report("G4", "an htl view inside the JSX vocabulary, with a click handler (Y by tag scan)", nb(`
const count = () => state(0);
const inc = (count: State<number>) => action(() => count.update((n) => n + 1));
const view = (count, inc) => <div class="row"><span>{count}</span><button onClick={inc}>+</button></div>;`));
report("G5", "an htl view with <a href> and <table> (JSX by tag scan)", nb(`
const view = () => <div><a href="#x">x</a><table></table></div>;`));
report("G6", "width taken as an outside number (BUILTIN: whether the runtime resolves it is not a checker question)", nb(`
const half = (width: number) => width / 2;`, [{ name: "width" }]));
report("G7", "Object.assign onto a fresh literal, and .catch on a promise (unsupported-method list)", nb(`
const merged = () => (a: { x: number }) => Object.assign({}, a);
const safe = (fetch: Fetch) => fetch("https://example.com").then((r) => r.status).catch(() => 0);`));
report("G8", "for..of over an array of records, === between records (strict-eq-object, which classify.ts cannot see)", nb(`
const findIndex = () => (xs: readonly { readonly id: string }[], y: { readonly id: string }): number => xs.findIndex((x) => x === y);`));
