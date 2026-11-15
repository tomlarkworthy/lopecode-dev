// Unit tests for lite/complete.ts: what completionsAt offers at a cursor, for each kind of name.
// A cell written with `|` marks the cursor; the other cells are the module. Run: bun lite/complete.test.ts
import { completionsAt } from "./complete.ts";
import { checkSources } from "./core.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? ": " + detail : ""}`); }
};

const MODULE = [
  `type Ev = { readonly kind: "add"; readonly by: number } | { readonly kind: "undo" };`,
  `function count(): RefCell<number> {\n  return ref(0);\n}`,
  `const increment = (count: Ref<number>) => action(() => count.update((c) => c + 1));`,
  `const doubled = (count: number) => count * 2;`,
  `const plain = (count) => count;`,
  `const xs = () => [1, 2, 3];`,
  `const label = () => "abc";`,
  `const ticks = function* (now: Clock) {\n  for (;;) yield now();\n};`,
  `const tick = (count: Ref<number>) => action((n: number) => count.set(n));`,
  `const onTick = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);`,
  `const step = () => (e: Ev): number => {\n  if (e.kind === "add") return e.by;\n  return 0;\n};`,
  `const app = (count: number, increment: Action<[]>) => <div><button onClick={increment}>add</button>{count}</div>;`,
];
// sanity: the module checks
const base = checkSources({ cells: MODULE.join("\n\n"), tsx: true });
ok("the test module checks", base.cells.every((c) => c.status === "ok"), JSON.stringify(base.cells.filter((c) => c.status !== "ok")));

// replaces the cell named like `name` (or adds one) with text holding `|`
function at(text: string, replace?: string) {
  const offset = text.indexOf("|");
  const src = text.replace("|", "");
  const cells = [...MODULE];
  let i = replace ? cells.findIndex((c) => new RegExp(`^(?:export )?(const|function) ${replace}\\b`).test(c)) : -1;
  if (i < 0) { cells.push(src); i = cells.length - 1; } else cells[i] = src;
  const t0 = performance.now();
  const r = completionsAt(cells, i, offset, true);
  return { ...r, labels: r.options.map((o) => o.label), ms: performance.now() - t0 };
}
const has = (r: { labels: string[] }, ...ls: string[]) => ls.every((l) => r.labels.includes(l));
const lacks = (r: { labels: string[] }, ...ls: string[]) => ls.every((l) => !r.labels.includes(l));
const show = (r: { labels: string[]; mode: string }) => `${r.mode} ${JSON.stringify(r.labels)}`;

// ---- read(ref) is offered only inside an action body, where it is legal
{
  const inside = at("const increment = (count: Ref<number>) => action(() => count.set(re|))", "increment");
  const outside = at("const doubled = (count: number) => re|", "doubled");
  ok("read is offered inside an action body", has(inside, "read") && inside.options.find((o) => o.label === "read")?.detail === "prelude: a ref's value inside an action", show(inside));
  ok("read is not offered outside an action", lacks(outside, "read") && has(outside, "ref"), show(outside));
}

// ---- members after a dot
{
  const r = at("const increment = (count: Ref<number>) => action(() => count.|)", "increment");
  ok("Ref<T> parameter: exactly set and update", JSON.stringify(r.labels) === '["set","update"]', show(r));
  ok("Ref<T> member detail is the member's type", r.options.find((o) => o.label === "set")?.detail === "(v: number) => void", JSON.stringify(r.options));
}
{
  const r = at("const increment = (count: Ref<number>) => action(() => count.up|)", "increment");
  ok("a half-typed member is filtered by its prefix", JSON.stringify(r.labels) === '["update"]' && r.from === "const increment = (count: Ref<number>) => action(() => count.".length, show(r));
}
{
  const r = at("const increment = (count: Ref<number>) => action(() => count.|", "increment");
  ok("an unclosed call still answers", JSON.stringify(r.labels) === '["set","update"]', show(r));
}
{
  const r = at("const doubled = (count: number) => count.|", "doubled");
  ok("value parameter of a ref cell: number members", has(r, "toFixed", "toString") && lacks(r, "set", "update"), show(r));
}
{
  const r = at("const plain = (count) => count.|", "plain");
  ok("omitted parameter type comes from the named cell", has(r, "toFixed") && lacks(r, "set"), show(r));
}
{
  const r = at("const hist = () => {\n  const bins = mut([1, 2]);\n  bins.|\n  return freeze(bins);\n};");
  ok("Mut<T[]> local offers mutating methods", has(r, "push", "sort", "map", "length"), show(r));
}
{
  const r = at("const ys = (xs: readonly number[]) => xs.|", "");
  ok("a plain array offers no mutating method", has(r, "map", "filter", "length", "slice") && lacks(r, "push", "sort", "splice", "reverse", "fill"), show(r));
}
{
  const r = at("const h = () => {\n  const b = mut(new Float64Array(4));\n  b.|\n  return freeze(b);\n};");
  ok("Mut typed array offers set and fill", has(r, "set", "fill", "length"), show(r));
  const q = at("const h = (b: Float64Array) => b.|");
  ok("a plain typed array offers no set or fill", has(q, "length", "subarray") && lacks(q, "set", "fill"), show(q));
}
{
  const r = at("const n = (label: string) => label.|");
  ok("string members", has(r, "length", "slice", "toUpperCase") && lacks(r, "toFixed"), show(r));
}
{
  const r = at("const step = () => (e: Ev): number => {\n  if (e.kind === \"add\") return e.|;\n  return 0;\n};", "step");
  ok("a union of records narrowed by kind offers the narrowed members", JSON.stringify(r.labels) === '["by","kind"]', show(r));
  const q = at("const step = () => (e: Ev): number => {\n  e.|\n  return 0;\n};", "step");
  ok("an unnarrowed union offers the common members", JSON.stringify(q.labels) === '["kind"]', show(q));
}
{
  const r = at("const f = (r: { readonly a: number; readonly b: string }) => r.|");
  ok("record members with their types", JSON.stringify(r.labels) === '["a","b"]' && r.options[1].detail === "string", JSON.stringify(r.options));
}
{
  const r = at("const f = (increment: Action<[]>) => increment.|");
  ok("Action offers nothing", r.labels.length === 0 && r.mode === "member", show(r));
  const q = at("const f = (ticks: Events<number>) => ticks.|");
  ok("Events offers nothing", q.labels.length === 0 && q.mode === "member", show(q));
  const l = at("const f = (onTick: Listener) => onTick.|");
  ok("Listener offers nothing", l.labels.length === 0 && l.mode === "member", show(l));
}
{
  const r = at("const f = (x: number) => Math.|");
  ok("Math offers the allowed intrinsics, not random", has(r, "floor", "min", "PI") && lacks(r, "random"), show(r));
  const o = at("const f = (x: number) => Object.|");
  ok("Object offers allowed statics, not defineProperty", has(o, "keys", "entries") && lacks(o, "defineProperty"), show(o));
  const j = at("const f = (x: number) => JSON.|");
  ok("JSON offers parse and stringify", has(j, "parse", "stringify"), show(j));
}
{
  const r = at("const f = (count: Ref<number>) => action(() => {\n  const y = count.|\n})");
  ok("member in an unfinished block body", JSON.stringify(r.labels) === '["set","update"]', show(r));
}

{
  const r = at("const f = (r: { readonly text: string }) => r.|text");
  ok("a cursor before an existing member name", JSON.stringify(r.labels) === '["text"]', show(r));
}

{
  const r = at("const f = (b: { readonly x: number }, box: (x: number) => string) => <div key={`${b.x}`} style={box(b.|)} />;");
  ok("after a closed template literal", JSON.stringify(r.labels) === '["x"]', show(r));
}

// ---- JSX attribute names
{
  const r = at("const app = (count: number, increment: Action<[]>) => <div><button on|>add</button>{count}</div>;", "app");
  ok("<button on| offers onClick", JSON.stringify(r.labels) === '["onClick"]' && r.mode === "jsx", show(r));
  const q = at("const app = (count: number) => <input |/>;", "app");
  ok("<input | offers its declared props", has(q, "value", "onInput", "type", "min") && lacks(q, "children", "onPointerDown"), show(q));
}

// ---- names, no dot
{
  const r = at("const f = (count: Ref<number>) => action(() => co|)");
  ok("a parameter is offered by prefix", has(r, "count") && lacks(r, "doubled"), show(r));
  const q = at("const f = (x: number) => {\n  const local = x + 1;\n  return lo|\n};");
  ok("a local is offered", has(q, "local"), show(q));
  const p = at("const f = (x: number) => r|");
  ok("the prelude ref is offered, not other cells", has(p, "ref", "return") && lacks(p, "requestAnimationFrame"), show(p));
  const g = at("const f = (x: number) => doc|");
  ok("no browser globals", lacks(g, "document"), show(g));
  const m = at("const f = (x: number) => M|");
  ok("allowed intrinsics are offered", has(m, "Math", "Map") && lacks(m, "MutationObserver"), show(m));
  const c = at("const f = (x: number) => dou|");
  ok("another cell is not a name in scope", lacks(c, "doubled"), show(c));
  const e = at("const f = (x: number) => action(() => { mu| })");
  ok("mut from the prelude", has(e, "mut"), show(e));
}

// ---- parameter lists
{
  const r = at("const f = (|");
  ok("in a parameter list: cells and capabilities", has(r, "count", "doubled", "xs", "now", "random", "fetch") && r.mode === "param", show(r));
  const q = at("const f = (count: number, d|");
  ok("by prefix, without the parameters already there", JSON.stringify(q.labels) === '["doubled"]', show(q));
  const s = at("const doubled = (|) => 1", "doubled");
  ok("not the cell itself", lacks(s, "doubled") && has(s, "count"), show(s));
  const t = at("const f = (count: R|");
  ok("a type position is not a parameter name", t.mode !== "param", show(t));
}

// ---- incomplete or quoted text
{
  const r = at('const f = (x: number) => "abc.|"');
  ok("inside a string: nothing", r.labels.length === 0, show(r));
  const q = at("const f = (x: number) => x // x.|");
  ok("inside a comment: nothing", q.labels.length === 0, show(q));
  const u = at("const f = (x: number) => ((x.|");
  ok("two unclosed parens", has(u, "toFixed"), show(u));
  const w = at("const f = (x: number) => { if (x.|");
  ok("an unclosed if test", has(w, "toFixed"), show(w));
  const z = at("const f = (x: numb|");
  ok("unparseable text answers with no runtime names", lacks(z, "document", "window"), show(z));
}

// ---- the listener vocabulary
{
  const n = at("const g = (ticks: Events<number>, tick: Action<[number]>) => o|");
  ok("a name offers on", has(n, "on"), show(n));
  const t = at("const g = (ticks: Ev|");
  ok("a parameter type offers Events", has(t, "Events") && t.mode === "type", show(t));
  const r = at("const g = (ticks: Events<number>): Lis|");
  ok("a return type offers Listener", has(r, "Listener") && r.mode === "type", show(r));
  const u = at("const g = (ticks: Events<nu|");
  ok("a type argument offers number", has(u, "number") && lacks(u, "document"), show(u));
  const o = at("const g = (ticks: Sour|");
  ok("the old name Source is not offered", o.labels.length === 0, show(o));
}

// ---- speed: completion on the tutorial-sized module
{
  const runs: number[] = [];
  for (let i = 0; i < 20; i++) runs.push(at("const increment = (count: Ref<number>) => action(() => count.|)", "increment").ms);
  runs.sort((a, b) => a - b);
  console.log(`  completion on a ${MODULE.length}-cell module: median ${runs[10].toFixed(1)} ms, max ${runs[19].toFixed(1)} ms`);
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
