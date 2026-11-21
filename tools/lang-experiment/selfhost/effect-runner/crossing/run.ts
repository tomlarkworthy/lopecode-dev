// The checked drain (accepted.ss.ts) compiled by the toolchain and run with performers from another language, each
// crossing through lite/boundary.ts as S11.3 to S11.6 specify. Prints what a performer receives and what the cell
// receives back, for the values events and the store put in effects. Run: bun crossing/run.ts
import { readFileSync } from "node:fs";
import { splitCells, compileCell, contextFromCheck } from "../../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../../lite/stdlib/runtime.ts";
import { cross } from "../../../lite/boundary.ts";
import { mut } from "../../../lite/runtime-ss.ts";

const texts = splitCells(readFileSync(new URL("./accepted.ss.ts", import.meta.url).pathname, "utf8"), false);
const outside = [{ name: "performNote" }, { name: "performThen" }];
const { result } = checkCells(texts, false, outside);
const ctx = contextFromCheck(result);
const shapes = new Map<string, unknown>();
const given: Record<string, unknown> = {
  ss_mut: mut,
  ss_cross: (v: unknown, shape: any, path: string, module: string | null) => { shapes.set(path, shape); return cross(v, shape, path, module); },
};
const seen: unknown[] = [];
let calls = 0;
const raw: Record<string, unknown> = {
  // effectful on purpose: it records, and it answers differently for equal arguments (S11.11 trusts neither)
  performNote: (e: { n: number; value: unknown }) => void seen.push(e),
  performThen: (ev: { t: string; n: number }) => (++calls % 2 ? ev : undefined),
};
const values = new Map<string, unknown>();
for (const t of texts) for (const d of compileCell(t, false, ctx)) {
  const f = (0, eval)(`(${d.definition})`);
  const args = d.inputs.map((i) => (values.has(i) ? values.get(i) : Object.hasOwn(given, i) ? given[i] : raw[i]));
  values.set(d.name, f(...args));
}
const drain = values.get("drain") as (s: number, ev: unknown) => { state: number };
const r = drain(0, { t: "tick", n: 3 });
console.log(`drain(0, tick 3) -> state ${r.state}; performNote called ${seen.length} times, performThen ${calls} times (alternately undefined: accepted, S11.11 trusts it)`);
console.log(`performNote's argument frozen: ${Object.isFrozen(seen[0])}, its value frozen: ${Object.isFrozen((seen[0] as { value: unknown }).value)}`);

// the crossing alone, with the shape the compiled cell used: what an events or store effect would put in value
const shape = shapes.get("drain.performNote") as any;
const via = cross((e: { value: unknown }) => void seen.push(e.value), shape, "drain.performNote") as (e: unknown) => void;
const probe = (what: string, value: unknown) => {
  seen.length = 0;
  try { via({ n: 1, value }); const got = seen[0]; console.log(`${what}: performer got ${got === value ? "the same object" : `a copy (${Object.prototype.toString.call(got)}, frozen ${Object.isFrozen(got)})`}`); }
  catch (e) { console.log(`${what}: ${(e as Error).constructor.name}: ${(e as Error).message}`); }
};
probe("a yielded plain object", { a: [1, 2] });
probe("a yielded Uint8Array", new Uint8Array([1, 2]));
probe("a thrown Error (events fail.error)", new Error("boom"));
probe("a store handle (an EventTarget)", new EventTarget());
probe("a listener's action (a function)", () => 1);
probe("a Map in a yielded value", { m: new Map([[1, 2]]) });
const loud = cross(() => { throw new Error("placeOf threw"); }, shape, "drain.performNote") as (e: unknown) => void;
try { loud({ n: 1, value: 0 }); } catch (e) { console.log(`a performer's throw reaches the cell as ${(e as Error).constructor.name}: ${(e as Error).message}`); }
