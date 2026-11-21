// Unit tests for the cells of checks.ss.ts, called with plain values; each control links a mutant of one cell and must
// fail at least one of the same checks. Run: bun lite/checks.test.ts
import * as cells from "./checks.ss.ts";
import { link } from "./link.ts";
import * as prelude from "../prelude.runtime.ts";

const linkChecks = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...cells, ...over } as typeof cells, prelude);
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);

function checks(S: ReturnType<typeof linkChecks>): [string, boolean][] {
  const out: [string, boolean][] = [];
  const ok = (name: string, cond: boolean) => out.push([name, cond]);
  ok("checkKey: tsx, then the outside cells when there are any, then the source", S.checkKey("a", true, null) === "x\u0000a" && S.checkKey("a", false, []) === "s\u0000a" && S.checkKey("a", true, [{ name: "o" }]) === 'x[{"name":"o"}]\u0000a');
  const m = new Map([["a", 1], ["b", 2]]);
  ok("lruTouch: a touched key moves to the end", eq([...S.lruTouch(m, "a", 1, 4)], [["b", 2], ["a", 1]]));
  ok("lruTouch: past the limit the oldest is dropped", eq([...S.lruTouch(m, "c", 3, 2)], [["b", 2], ["c", 3]]));
  ok("lruTouch: the map given is not changed", eq([...m], [["a", 1], ["b", 2]]));
  const row = (declared: string | null, parseError: string | null, lines = 1) => ({ declared, lines, parseError });
  const s = S.standIns([row("a", null), row("b", "bad", 3), row(null, "junk"), row("b", "worse")]);
  ok("standIns: a cell that parses is kept by its index", s.texts[0] === 0);
  ok("standIns: a stand-in keeps the name and the line count", s.texts[1] === "const b = () => $ss$unparsed;\n\n");
  ok("standIns: a cell with no name that does not parse is dropped", s.texts.length === 3);
  ok("standIns: the second b is \"b (2)\"", eq(s.unparsed, [["b", "bad"], ["b (2)", "worse"]]));
  ok("refusedCells: the caller and the cells not ok, by the last verdict of a name", eq(S.refusedCells([{ name: "c", ok: true }, { name: "x", ok: true }, { name: "x", ok: false }], "c", ["x", "y"]), ["x", "y"]));
  ok("islandKey: a known text keeps its key", eq(S.islandKey("k", 4, "c"), { key: "k", made: 4 }));
  ok("islandKey: a new text gets the next number and its caller", eq(S.islandKey(undefined, 4, "c"), { key: "island5:c", made: 5 }));
  return out;
}

let fail = 0;
const real = checks(linkChecks());
for (const [name, cond] of real) { console.log(`${cond ? "pass" : "FAIL"} ${name}`); if (!cond) fail++; }
const mutants: [string, Record<string, (...inputs: never[]) => unknown>][] = [
  ["lruTouch does not move a touched key", { lruTouch: () => (m: Map<string, unknown>, key: string, v: unknown, limit: number) => { const out = new Map(m); out.set(key, v); if (out.size > limit) out.delete([...out.keys()][0]!); return out; } }],
  ["standIns numbers every declaration", { standIns: () => (cs: readonly { declared: string | null; parseError: string | null; lines: number }[]) => ({ texts: cs.map((c, i) => (c.parseError === null ? i : `const ${c.declared} = () => $ss$unparsed;`)), unparsed: cs.filter((c) => c.parseError !== null).map((c, i) => [`${c.declared} (${i + 1})`, c.parseError]) }) }],
  ["islandKey reuses the number", { islandKey: () => (known: string | undefined, made: number, caller: string) => ({ key: known ?? `island${made}:${caller}`, made }) }],
];
for (const [name, over] of mutants) {
  const failed = checks(linkChecks(over)).filter(([, c]) => !c).length;
  console.log(`${failed ? "pass" : "FAIL"} control (${name}): ${failed} of ${real.length} checks fail`);
  if (!failed) fail++;
}
console.log(`${real.length + mutants.length - fail} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
