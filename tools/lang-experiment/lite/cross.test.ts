// Unit tests for the cells of cross.ss.ts, called with plain shapes and descriptions; each control links a mutant of one
// cell and must fail at least one of the same checks. Run: bun lite/cross.test.ts
import * as rtCells from "./runtime.ss.ts";
import * as crossCells from "./cross.ss.ts";
import type { Shape } from "./runtime.ss.ts";
import { link } from "./link.ts";

const linkCross = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...rtCells, ...crossCells, ...over } as typeof rtCells & typeof crossCells, { mut: rtCells.mut(), freeze: rtCells.freeze() });
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);
const rec = (...ps: [string, Shape, boolean?][]): Shape => ({ k: "rec", props: ps.map(([n, s, o]) => [n, s, !!o]) });
const lit = (v: string | number | boolean): Shape => ({ k: "lit", v });
const NUM: Shape = { k: "num" }, STR: Shape = { k: "str" };

function checks(S: ReturnType<typeof linkCross>): [string, boolean][] {
  const out: [string, boolean][] = [];
  const ok = (name: string, cond: boolean) => out.push([name, cond]);
  ok("describeSeen: a long string is cut at 40 characters", S.describeSeen({ t: "string", s: "x".repeat(50) }) === `string "${"x".repeat(40)}…"`);
  ok("describeSeen: -0, a bigint, an array", S.describeSeen({ t: "-0" }) === "number -0" && S.describeSeen({ t: "bigint", text: "3" }) === "bigint 3" && S.describeSeen({ t: "array", length: 2 }) === "an array of 2");
  ok("describeSeen: a plain object, a class instance, an object with no constructor name",
    S.describeSeen({ t: "object", plain: true, ctor: null }) === "an object" && S.describeSeen({ t: "object", plain: false, ctor: "K" }) === "a K object" && S.describeSeen({ t: "object", plain: false, ctor: null }) === "a non-plain object");
  ok("mismatchText: expected the shape's wording, or the bare text with no shape",
    S.mismatchText("p.a", { k: "union", ts: [NUM, { k: "null" }] }, "string \"s\"") === "p.a: expected number or null, found string \"s\"" && S.mismatchText("p", null, "a cycle") === "p: a cycle");
  const long = "p" + ".x".repeat(200);
  ok("trimPath: a path over 300 characters keeps 80 and 160 under a recursive shape only", S.trimPath(long, true) === `${long.slice(0, 80)}…${long.slice(-160)}` && S.trimPath(long, false) === long && S.trimPath("p.x", true) === "p.x");
  const tagged: Shape & { k: "union" } = { k: "union", ts: [rec(["type", lit("a")], ["x", NUM]), rec(["type", lit("b")])] };
  const d = S.tagDispatch(tagged, null);
  ok("tagDispatch: records each with their own literal at one key", d !== null && d.key === "type" && d.by.get("a") === tagged.ts[0] && d.by.get("b") === tagged.ts[1]);
  ok("tagDispatch: a literal two members share is no tag", S.tagDispatch({ k: "union", ts: [rec(["type", lit("a")]), rec(["type", lit("a")])] }, null) === null);
  ok("tagDispatch: an optional tag is no tag", S.tagDispatch({ k: "union", ts: [rec(["type", lit("a"), true]), rec(["type", lit("b")])] }, null) === null);
  ok("tagDispatch: a member that is not a record: no tag", S.tagDispatch({ k: "union", ts: [rec(["type", lit("a")]), { k: "null" }] }, null) === null);
  const defs = new Map<string, Shape>([["B", rec(["type", lit("b")])]]);
  ok("tagDispatch: a ref member is looked up in defs", S.tagDispatch({ k: "union", ts: [rec(["type", lit("a")]), { k: "ref", n: "B" }] }, defs)?.by.get("b") === defs.get("B"));
  const mixed: Shape & { k: "union" } = { k: "union", ts: [NUM, rec(["a", NUM]), { k: "arr", el: NUM }, { k: "fn", ps: [], ret: NUM, async: false }] };
  ok("memberTakes: per member, the kinds it could take (a function shape takes every kind)", eq(S.memberTakes(mixed, null), [4, 1, 2, 7]));
  ok("soleMembers: the one member for a record, an array, a primitive", eq(S.soleMembers(mixed, null), [1, 2, -1]));
  ok("soleMembers: a ref with no definition takes nothing", eq(S.soleMembers({ k: "union", ts: [{ k: "ref", n: "Z" }, STR] }, null), [-1, -1, 1]));
  ok("isSoleMiss: below the union's place, from the sole member or a tagged one", S.isSoleMiss("p.a", "p", false, 0, 0) && S.isSoleMiss("p.a", "p", true, -1, 0) && !S.isSoleMiss("p", "p", true, 0, 0) && !S.isSoleMiss("p.a", "p", false, 1, 0));
  ok("fnPlan: argument paths count from 1", eq(S.fnPlan("f", { k: "fn", ps: [NUM, STR], ret: NUM, async: false }), { args: [{ shape: NUM, path: "f argument 1" }, { shape: STR, path: "f argument 2" }], result: "f(...)" }));
  ok("thrownText", S.thrownText("f", " threw", "boom") === "f(...) threw: boom");
  ok("primFits: a literal by Object.is (-0 is not 0), NaN fits NaN", S.primFits(lit(0), -0) === false && S.primFits(lit(Number.NaN), Number.NaN) === true && S.primFits(NUM, "1") === false && S.primFits(rec(), 1) === null);
  ok("propStep: optional absent or undefined is skipped; required absent is missing; required undefined is checked",
    S.propStep(false, true, true) === "skip" && S.propStep(true, true, true) === "skip" && S.propStep(false, true, false) === "missing" && S.propStep(true, true, false) === "check" && S.propStep(true, false, true) === "check");
  ok("elemShape: an array's element, a tuple's i-th, unknown's own", eq(S.elemShape({ k: "arr", el: STR }, 3), STR) && eq(S.elemShape({ k: "tup", els: [NUM, STR] }, 1), STR) && eq(S.elemShape({ k: "unknown" }, 0), { k: "unknown" }));
  ok("triesMember: on a primitive only a member that could take one", S.triesMember([4, 1], 0) && !S.triesMember([4, 1], 1) && S.triesMember(null, 1));
  ok("unionMiss: the sole member's mismatch, then a cycle under a recursive shape, else the union's", S.unionMiss(true, true, true) === "sole" && S.unionMiss(false, true, true) === "cycle" && S.unionMiss(false, false, true) === "union");
  return out;
}

let fail = 0;
const real = checks(linkCross());
for (const [name, cond] of real) { console.log(`${cond ? "pass" : "FAIL"} ${name}`); if (!cond) fail++; }
const mutants: [string, Record<string, (...inputs: never[]) => unknown>][] = [
  ["tagTable accepts a shared literal", { tagTable: () => (ms: readonly Shape[], key: string) => new Map(ms.map((m) => [(m as any).props.find((q: any) => q[0] === key)?.[1].v, m])) }],
  ["memberKinds: a function shape takes primitives only", { memberKinds: () => (s: Shape) => (s.k === "rec" ? 1 : s.k === "arr" || s.k === "tup" ? 2 : s.k === "unknown" ? 7 : 4) }],
  ["primFits compares a literal with ===", { primFits: () => (s: any, v: unknown) => (s.k === "lit" ? v === s.v : s.k === "num" ? typeof v === "number" : null) }],
];
for (const [name, over] of mutants) {
  const failed = checks(linkCross(over)).filter(([, c]) => !c).length;
  console.log(`${failed ? "pass" : "FAIL"} control (${name}): ${failed} of ${real.length} checks fail`);
  if (!failed) fail++;
}
console.log(`${real.length + mutants.length - fail} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
