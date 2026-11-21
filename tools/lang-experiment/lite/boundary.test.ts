// Unit tests for cross() on unions (boundary.ts): a union of records tagged by a literal property takes the member its
// tag names; the result and the message are those of trying the members in order. Run: bun lite/boundary.test.ts
import { cross } from "./boundary.ts";
import type { Shape } from "./runtime-ss.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail: unknown = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}: ${JSON.stringify(detail)}`); }
};
let k = 0;
const res = (v: unknown, s: Shape): string => { try { return "ok " + JSON.stringify(cross(v, s, `t${k++}.p`)); } catch (e) { return `${(e as Error).constructor.name}: ${(e as Error).message}`; } };
const lit = (v: string | number | boolean): Shape => ({ k: "lit", v });
const rec = (...props: [string, Shape, boolean?][]): Shape => ({ k: "rec", props: props.map(([n, s, o]) => [n, s, !!o]) });

// 100 records tagged by type, each with one field of its own
const many: Shape = { k: "union", ts: Array.from({ length: 100 }, (_, i) => rec(["type", lit(`T${i}`)], [`f${i}`, { k: "num" }])) };
{
  let reads = 0;
  const v = new Proxy({ type: "T99", f99: 1 }, { get: (o, p, r) => { reads++; return Reflect.get(o, p, r); } });
  const r = res(v, many);
  ok(`the last of 100 tagged members: ${reads} property reads (at most 4)`, r === 'ok {"type":"T99","f99":1}' && reads <= 4, { r, reads });
}
const two: Shape = { k: "union", ts: [rec(["type", lit("a")], ["x", { k: "num" }]), rec(["type", lit("b")], ["y", { k: "str" }])] };
const failed = "TypeError: p: expected an object or an object, found";
const cases: [string, unknown, string][] = [
  ["the member the tag names", { type: "b", y: "s", z: 1 }, 'ok {"type":"b","y":"s"}'],
  ["an unknown tag: the union's message", { type: "c" }, `${failed} an object`],
  ["a missing tag", { x: 1 }, `${failed} an object`],
  ["the right tag and a wrong field: the union's message, not the member's", { type: "b", y: 1 }, `${failed} an object`],
  ["a tag inherited from a prototype", Object.create({ type: "a", x: 1 }), `${failed} a Object object`],
  ["a number", 3, `${failed} number 3`],
  ["an array", ["a"], `${failed} an array of 1`],
  ["null", null, `${failed} null`],
];
for (const [label, v, want] of cases) { const r = res(v, two); ok(label, r === want, r); }
{
  const zeros: Shape = { k: "union", ts: [rec(["t", lit(0)]), rec(["t", lit(1)], ["y", { k: "str" }])] };
  ok("a tag -0 is not the literal 0", res({ t: -0 }, zeros).startsWith("TypeError: p: expected"), res({ t: -0 }, zeros));
  const shared: Shape = { k: "union", ts: [rec(["type", lit("a")], ["x", { k: "num" }]), rec(["type", lit("a")], ["y", { k: "str" }])] };
  ok("two members with one tag: tried in order", res({ type: "a", x: 1 }, shared) === 'ok {"type":"a","x":1}' && res({ type: "a", y: "s" }, shared) === 'ok {"type":"a","y":"s"}');
  const mixed: Shape = { k: "union", ts: [...(two as { ts: Shape[] }).ts, { k: "null" }, { k: "num" }, { k: "arr", el: { k: "str" } }] };
  ok("a union with null, a number and an array: tried in order", [null, 3, ["s"], { type: "b", y: "s" }].map((v) => res(v, mixed)).join(" | ") === 'ok null | ok 3 | ok ["s"] | ok {"type":"b","y":"s"}');
}
{
  // the tag is read to choose the member and again by its check, so a tag that changes is refused, never copied as another member
  let n = 0;
  const v = { get type() { return n++ ? "b" : "a"; }, x: 1 };
  ok("a tag that changes between reads is refused", res(v, two) === `${failed} an object`, res(v, two));
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
