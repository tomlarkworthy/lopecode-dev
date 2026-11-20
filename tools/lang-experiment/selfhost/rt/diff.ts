// Differential test: the TypeScript originals (runtime.orig.ts) against the linked SoundScript cells
// (lite/runtime-ss.ts) on seeded random inputs. Prints one line per function; exit 1 on a difference that is not
// listed as known. Run: bun selfhost/rt/diff.ts [n]
import * as O from "./runtime.orig.ts";
import * as P from "../../lite/runtime-ss.ts";
import type { Shape } from "../../lite/runtime-ss.ts";

const N = Number(process.argv[2] ?? 3000);
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
const int = (n: number) => Math.floor(rnd() * n);
const str = () => pick(["", "a", "b", "key", "x y", "é"]);

const shape = (d: number): Shape => {
  const leaf: Shape[] = [{ k: "num" }, { k: "str" }, { k: "bool" }, { k: "null" }, { k: "undef" }, { k: "unknown" }, { k: "lit", v: pick([1, "s", true, false, 0, -0]) }];
  if (d <= 0 || rnd() < 0.4) return pick(leaf);
  const kids = () => Array.from({ length: int(4) }, () => shape(d - 1));
  return pick<() => Shape>([() => ({ k: "arr", el: shape(d - 1) }), () => ({ k: "tup", els: kids() }), () => ({ k: "union", ts: kids() }), () => ({ k: "rec", props: kids().map((s) => [str(), s, rnd() < 0.5] as [string, Shape, boolean]) })])();
};
const shared = [{}, [], { a: 1 }];
const value = (d: number): unknown => {
  const leaf = [null, undefined, true, false, 0, -0, NaN, 1, "", "s", pick(shared)];
  if (d <= 0 || rnd() < 0.5) return pick(leaf);
  return rnd() < 0.7 ? Array.from({ length: int(4) }, () => value(d - 1)) : { tag: str(), x: value(d - 1) };
};
const ptrIn = () => Object.fromEntries(["offsetX", "clientX", "offsetY", "clientY", "timeStamp", "pointerId", "buttons"].filter(() => rnd() < 0.6).map((k) => [k, pick([0, 1, -3, 2.5, undefined, null])]));

// a value's JSON with undefined, -0 and NaN told apart, and whether each object is frozen
const show = (v: unknown): string => JSON.stringify(v, (_k, x) => (x === undefined ? "<undef>" : Object.is(x, -0) ? "<-0>" : Number.isNaN(x) ? "<NaN>" : x && typeof x === "object" && !Array.isArray(x) && Object.isFrozen(x) && Object.keys(x).length ? { "<frozen>": true, ...x } : x));
const outcome = (f: () => unknown) => { try { return "ok " + show(f()); } catch (e) { return `throw ${(e as Error).constructor.name}: ${(e as Error).message}`; } };

const rows: { fn: string; cases: number; diffs: number; known?: string; first?: string }[] = [];
const run = (fn: string, cases: number, gen: () => [() => unknown, () => unknown, string], known?: string) => {
  const r = { fn, cases, diffs: 0, known, first: undefined as string | undefined };
  for (let i = 0; i < cases; i++) {
    const [a, b, input] = gen();
    const x = outcome(a), y = outcome(b);
    if (x !== y) { r.diffs++; r.first ??= `${input}: orig ${x} | port ${y}`; }
  }
  rows.push(r);
};

run("newStore", N, () => { const n = str(), v = value(2); return [() => O.newStore(n, v), () => P.newStore(n, v), `${n} ${show(v)}`]; });
run("thenable", N, () => {
  const v = pick<() => unknown>([() => value(2), () => Promise.resolve(1), () => ({ then: 1 }), () => ({ then() {} }), () => Object.assign(() => 0, { then: () => 0 }), () => () => 0, () => Object.create({ then() {} })])();
  return [() => O.thenable(v), () => P.thenable(v), typeof v];
});
for (const k of ["mut", "freeze", "borrow"] as const) run(k, N, () => { const v = value(3); return [() => O[k](v) === v, () => P[k](v) === v, show(v)]; });
// render.ts freezes an event's data at the call site; through that, ptr's value is frozen as before
const frozen = (x: unknown) => (x && typeof x === "object" ? Object.freeze(x) : x);
run("ptr through render's call site", N, () => { const e = ptrIn(); return [() => O.ptr(e), () => frozen(P.ptr(e)), show(e)]; });
run("want", N, () => { const s = shape(4); return [() => O.want(s), () => P.want(s), show(s)]; });
run("flat", N, () => { const xs = value(4); const a = Array.isArray(xs) ? xs : [xs]; return [() => O.flat(a), () => P.flat(a), show(a)]; });
// ptr: the original Object.freezes its value, SoundScript has no Object.freeze (the field values are equal)
run("ptr", N, () => { const e = ptrIn(); return [() => O.ptr(e), () => P.ptr(e), show(e)]; }, "the cell's value is not frozen");
run("ptr (fields)", N, () => { const e = ptrIn(); return [() => ({ ...O.ptr(e) }), () => ({ ...P.ptr(e) }), show(e)]; });
run("DOM_EVENTS", N, () => {
  const k = pick(Object.keys(O.DOM_EVENTS)), e = ptrIn(), node = { value: value(1) };
  return [() => [O.DOM_EVENTS[k]![0], O.DOM_EVENTS[k]![1](e, node).map((x) => (x && typeof x === "object" ? { ...x } : x))], () => [P.DOM_EVENTS[k]![0], P.DOM_EVENTS[k]![1](e, node).map((x) => (x && typeof x === "object" ? { ...x } : x))], `${k} ${show(e)}`];
});
run("DOM_EVENTS keys", 1, () => [() => Object.keys(O.DOM_EVENTS), () => Object.keys(P.DOM_EVENTS), ""]);
run("PROPS", 1, () => [() => [...O.PROPS], () => [...P.PROPS], ""]);
run("isElem", N, () => { const v = value(2); return [() => O.isElem(v), () => P.isElem(v), show(v)]; });
run("same", N, () => {
  const a = Array.from({ length: int(4) }, () => value(1));
  const b = rnd() < 0.5 ? [...a] : Array.from({ length: int(4) }, () => value(1));
  return [() => O.same(a, b), () => P.same(a, b), `${show(a)} ${show(b)}`];
});
run("orderOf/orderKeyed", N, () => {
  const list = Array.from({ length: int(6) }, (_, i) => ({ id: i }));
  const mods = ["m", "n", "o"];
  const place = () => (rnd() < 0.2 ? null : ([pick(mods), int(5)] as const));
  const places = [place(), ...list.map(place)].slice(0, rnd() < 0.1 ? int(list.length + 1) : undefined);
  const placeOf = rnd() < 0.1 ? null : () => places;
  const orig = () => { const ordered = new Set<unknown>(); const st = { order: null as { id: number }[] | null, listeners: new Set(list) }; const out = O.orderOf(st, "h", placeOf, ordered); return [out.map((x) => x.id), st.order !== null, ordered.size]; };
  // cells.ts orderOf after the port: the same guards, the sort from orderKeyed
  const port = () => {
    if (!placeOf || list.length < 2) return [list.map((x) => x.id), false, 0];
    const { out, complete } = P.orderKeyed(list, placeOf());
    return [out.map((x) => x.id), complete, complete ? 1 : 0];
  };
  return [orig, port, show(places)];
});
run("rejected", N, () => { const n = str(), why = Array.from({ length: int(3) }, str); return [() => O.rejected(n, why), () => P.rejected(n, why), `${n} ${show(why)}`]; });
run("compileFor", N, () => {
  const c = pick([null, undefined, 0, {}, { for: 1 }, { for: (a: string, r: object) => [a, Object.keys(r)] }]);
  const refs = { a: 1 };
  return [() => O.compileFor(c, "cell", refs), () => P.compileFor(c as never, "cell", refs), show(c)];
});

let bad = 0;
for (const r of rows) {
  console.log(`${r.fn}: ${r.cases} cases, ${r.diffs} differences${r.diffs && r.known ? ` (known: ${r.known})` : ""}${r.first ? `\n    first: ${r.first}` : ""}`);
  if (r.diffs && !r.known) bad++;
}
process.exit(bad ? 1 : 0);
