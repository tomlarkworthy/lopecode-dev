// Unit tests for lite/complete.ts: what completionsAt offers at a cursor, for each kind of name.
// A cell written with `|` marks the cursor; the other cells are the module. Run: bun lite/complete.test.ts
import { completionsAt, annotationOf, addParameter } from "./complete.ts";
import { checkSources } from "./core.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? ": " + detail : ""}`); }
};

const MODULE = [
  `type Ev = { readonly kind: "add"; readonly by: number } | { readonly kind: "undo" };`,
  `function count(): StateCell<number> {\n  return state(0);\n}`,
  `const increment = (count: State<number>) => action(() => count.update((c) => c + 1));`,
  `const doubled = (count: number) => count * 2;`,
  `const plain = (count) => count;`,
  `const xs = () => [1, 2, 3];`,
  `const label = () => "abc";`,
  `const ticks = function* (now: Clock) {\n  for (;;) yield now();\n};`,
  `const tick = (count: State<number>) => action((n: number) => count.set(n));`,
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

// ---- read(s) is offered only inside an action body, where it is legal
{
  const inside = at("const increment = (count: State<number>) => action(() => count.set(re|))", "increment");
  const outside = at("const doubled = (count: number) => re|", "doubled");
  ok("read is offered inside an action body", has(inside, "read") && inside.options.find((o) => o.label === "read")?.detail === "prelude: a state cell's value inside an action", show(inside));
  ok("read is not offered outside an action", lacks(outside, "read") && has(outside, "return"), show(outside));
}

// ---- members after a dot
{
  const r = at("const increment = (count: State<number>) => action(() => count.|)", "increment");
  ok("State<T> parameter: exactly set and update", JSON.stringify(r.labels) === '["set","update"]', show(r));
  ok("State<T> member detail is the member's type", r.options.find((o) => o.label === "set")?.detail === "(v: number) => void", JSON.stringify(r.options));
}
{
  const r = at("const increment = (count: State<number>) => action(() => count.up|)", "increment");
  ok("a half-typed member is filtered by its prefix", JSON.stringify(r.labels) === '["update"]' && r.from === "const increment = (count: State<number>) => action(() => count.".length, show(r));
}
{
  const r = at("const increment = (count: State<number>) => action(() => count.|", "increment");
  ok("an unclosed call still answers", JSON.stringify(r.labels) === '["set","update"]', show(r));
}
{
  const r = at("const doubled = (count: number) => count.|", "doubled");
  ok("value parameter of a state cell: number members", has(r, "toFixed", "toString") && lacks(r, "set", "update"), show(r));
}
{
  const r = at("const plain = (count) => count.|", "plain");
  ok("omitted parameter type comes from the named cell", has(r, "toFixed") && lacks(r, "set"), show(r));
}
{
  const r = at("const hist = () => {\n  const bins = [1, 2];\n  bins.|\n  return bins;\n};");
  ok("Mut<T[]> local offers mutating methods", has(r, "push", "sort", "map", "length"), show(r));
}
{
  const r = at("const ys = (xs: readonly number[]) => xs.|", "");
  ok("a plain array offers no mutating method", has(r, "map", "filter", "length", "slice") && lacks(r, "push", "sort", "splice", "reverse", "fill"), show(r));
}
{
  const r = at("const h = () => {\n  const b = new Float64Array(4);\n  b.|\n  return b;\n};");
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
  const r = at("const f = (count: State<number>) => action(() => {\n  const y = count.|\n})");
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
  const r = at("const f = (count: State<number>) => action(() => co|)");
  ok("a parameter is offered by prefix", has(r, "count") && lacks(r, "doubled"), show(r));
  const q = at("const f = (x: number) => {\n  const local = x + 1;\n  return lo|\n};");
  ok("a local is offered", has(q, "local"), show(q));
  const p = at("const f = (x: number) => r|");
  ok("a keyword is offered, not other cells", has(p, "return") && lacks(p, "requestAnimationFrame"), show(p));
  const s = at("const f = (x: number) => st|");
  ok("the prelude state is offered", has(s, "state"), show(s));
  const g = at("const f = (x: number) => doc|");
  ok("no browser globals", lacks(g, "document"), show(g));
  const m = at("const f = (x: number) => M|");
  ok("allowed intrinsics are offered", has(m, "Math", "Map") && lacks(m, "MutationObserver"), show(m));
  const c = at("const f = (x: number) => dou|");
  ok("another cell is not a name in scope", lacks(c, "doubled"), show(c));
  // S4 (2026-11-22): mut is gone from the prelude; snapshot stays
  const e = at("const f = (x: number) => action(() => { sn| })");
  ok("snapshot from the prelude", has(e, "snapshot"), show(e));
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

// ---- parameter lists: cells in other languages (section 11)
{
  const outside = [{ name: "shop_price", view: true }, { name: "shop_basket" }, { name: "handle" }, { name: "count" }];
  const values: Record<string, unknown> = { shop_price: 3, shop_basket: [{ item: "tea", qty: 2 }, { item: "cake", qty: 1 }], handle: () => 1 };
  const annotate = (n: string) => annotationOf(values[n]);
  const run = (text: string) => {
    const cells = [...MODULE, text.replace("|", "")];
    const r = completionsAt(cells, cells.length - 1, text.indexOf("|"), true, outside, annotate);
    return { ...r, labels: r.options.map((o) => o.label) };
  };
  const r = run("const f = (shop|");
  const price = r.options.find((o) => o.label === "shop_price"), basket = r.options.find((o) => o.label === "shop_basket");
  ok("an other-language cell is offered in a parameter list with its annotation", r.mode === "param" && price?.apply === "shop_price: number" && basket?.apply === "shop_basket: { item: string; qty: number }[]", JSON.stringify(r.options));
  const h = run("const f = (han|");
  ok("a value with no readable type inserts name and colon only", JSON.stringify(h.options.map((o) => o.apply)) === '["handle: "]', JSON.stringify(h.options));
  const c = run("const f = (co|");
  ok("a SoundScript cell of the same name is offered bare, once", JSON.stringify(c.options.filter((o) => o.label === "count").map((o) => o.apply ?? null)) === "[null]", JSON.stringify(c.options));
  const t = run("const f = (shop_price: number, shop|");
  ok("an other-language parameter already there is not offered again", JSON.stringify(t.labels) === '["shop_basket"]', show(t));
  const n = completionsAt([...MODULE, "const f = (shop"], MODULE.length, "const f = (shop".length, true, outside);
  ok("without annotate, an other-language cell inserts name and colon", n.options.find((o) => o.label === "shop_price")?.apply === "shop_price: ", JSON.stringify(n.options));
}
{
  const cases: [unknown, string | null][] = [
    [1.5, "number"], ["a", "string"], [false, "boolean"], [[1, 2], "number[]"], [[["a"], ["b"]], "string[][]"],
    [{ x: 1, y: "b" }, "{ x: number; y: string }"], [[{ x: 1 }, { x: 2 }], "{ x: number }[]"],
    [[], null], [[1, "a"], null], [null, null], [undefined, null], [() => 1, null], [new Map(), null], [new Date(), null],
    [{}, null], [{ "a-b": 1 }, null], [Promise.resolve(1), null], [{ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9 }, null],
  ];
  const wrong = cases.filter(([v, want]) => annotationOf(v) !== want).map(([v, want]) => `${String(v)}: ${annotationOf(v)} want ${want}`);
  ok("annotationOf reads number, string, boolean, arrays and small plain objects only", !wrong.length, wrong.join("; "));
  // every annotation it gives is one the boundary accepts (S11.3)
  const bad = cases.filter(([, want]) => want).map(([, want]) => {
    const r = checkSources({ cells: `const f = (v: ${want}) => 1;`, tsx: true, outside: [{ name: "v" }] });
    return r.cells.every((c) => c.status === "ok") ? null : `${want}: ${JSON.stringify(r.cells.map((c) => c.errors))}`;
  }).filter(Boolean);
  ok("each suggested annotation checks at the boundary", !bad.length, bad.join("; "));
}

// ---- the edit that adds a parameter (the add-as-parameter fix)
{
  const add = (src: string, name: string, ann: string | null = null) => {
    const e = addParameter(src, name, ann);
    return e ? src.slice(0, e.from) + e.insert + src.slice(e.to) : null;
  };
  const cases: [string, string, string | null, string | null][] = [
    ["const f = () => width;", "width", null, "const f = (width) => width;"],
    ["const f = ( ) => width;", "width", null, "const f = (width) => width;"],
    ["const f = (a: number) => a + width;", "width", null, "const f = (a: number, width) => a + width;"],
    ["const f = (a: number) => a + p;", "p", "number", "const f = (a: number, p: number) => a + p;"],
    ["const f = (cb: (n: number) => void) => w;", "w", null, "const f = (cb: (n: number) => void, w) => w;"],
    ["const f = (r: State<number>, s: \"a)\") => w;", "w", null, "const f = (r: State<number>, s: \"a)\", w) => w;"],
    ["const f = (\n  a: number,\n) => w;", "w", null, "const f = (\n  a: number, w\n) => w;"],
    ["function f(a) { return w; }", "w", null, "function f(a, w) { return w; }"],
    ["const g = function* (now: Clock) { yield w; };", "w", null, "const g = function* (now: Clock, w) { yield w; };"],
    ["// note\nexport const f = (o: { a: number }) => w;", "w", null, "// note\nexport const f = (o: { a: number }, w) => w;"],
    ["const f = (w: number) => w;", "w", null, null],
    ["const f = x => x;", "w", null, null],
    ["type T = number;", "w", null, null],
  ];
  const wrong = cases.filter(([src, n, a, want]) => add(src, n, a) !== want).map(([src, n, a, want]) => `${JSON.stringify(src)} + ${n}: ${JSON.stringify(add(src, n, a))} want ${JSON.stringify(want)}`);
  ok("addParameter appends to the cell's own parameter list, or gives null", !wrong.length, wrong.join("; "));
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
  for (let i = 0; i < 20; i++) runs.push(at("const increment = (count: State<number>) => action(() => count.|)", "increment").ms);
  runs.sort((a, b) => a - b);
  console.log(`  completion on a ${MODULE.length}-cell module: median ${runs[10].toFixed(1)} ms, max ${runs[19].toFixed(1)} ms`);
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
