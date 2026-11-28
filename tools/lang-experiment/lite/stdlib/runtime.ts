// The SoundScript standard library's runtime half. build.ts makes cells of it (soundscript/ts-cells.ts):
// @tomlarkworthy/soundscript-runtime, and @tomlarkworthy/soundscript-checker for what reaches the parser.
// A compiled cell is its typed function applied to its inputs; a state cell is ss_ref(...), an events cell
// ss_events(...), a listener ss_listen(...), and a state cell's value variable is Observable's Generators.input(handle).
import { isRefHandle, viewHandle } from "../../prelude.runtime.ts";
import { h, type Elem } from "../jsx/h.ts";
import { create, patch, kidOf, drawnOf } from "../jsx/render.ts";
import { keepsNode, deepFreeze } from "../runtime-ss.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { erase } from "../browser/erase.ts";
import { on, events, listen, running, pulling, isEvents, release, sweep, cellsOf, setListenerOrder, listenerOrderChanged } from "../browser/cells.ts";
export { setListenerOrder, listenerOrderChanged, events, listen };
export { cellsOf };
import { island, type IslandSpec } from "../island.ts";
import { runHere, type Pool } from "../browser/workers.ts";
export { isDuplicateKey, compileCell, compileCellText, compileModule, contextOf, contextFromCheck, acceptedOf, cellStates, declaredName, decompileVariable, decompileModule, langOf, cellOfVariable, splitCells, handleName, variableName, keyOfVariable, STATE_VALUE } from "../toolchain/ss-toolchain.ts";
import { declaredName } from "../toolchain/ss-toolchain.ts";
import { parse } from "../parse.ts";
import { checkSources, checkRun, type Outside } from "../core.ts";
import type { MdEntry } from "../infer/md-types.ss.ts";
import { checkKey, lruTouch, standIns, refusedCells, islandKey } from "../checks-ss.ts";
export { cross, crossings } from "../boundary.ts";
// e1 (2026-11-23): the prelude's cast (S9.8); the compiler adds the shape as a second argument
export { cast } from "../boundary.ts";
import { checkShape, type Shape } from "../boundary.ts";
export { checkSources };
export { completionWork } from "../complete.ts";
// checkSources for SoundScript cells, remembered for the last 2 sources. The editor asks about the
// same module source several times per keystroke (lint, the cells an edit would break, the compile
// context); a result is never written to, so one is shared. The key and the recency rule are checks.ss.ts's.
let checks = new Map<string, ReturnType<typeof checkSources>>();
// how many module checks have run (a remembered result, or a source that does not parse, is not one)
let checked = 0;
export const checksRun = () => checked;
// incr2 (D2, D4): the notebook's check path hands a memo: find gives a cell's entry from an earlier check by name,
// keep takes the entries of this check (core.ojs ss_memo keeps them on the cells' definitions). The build and the
// gates give none and check whole. SS_MEASURE_INCR = 0 on the page turns the memo off, for A/B measurement.
export type IncrMemo = { find: (name: string) => MdEntry | null; keep: (entries: Map<string, MdEntry>) => void };
export const incrOn = (): boolean => (globalThis as { SS_MEASURE_INCR?: unknown }).SS_MEASURE_INCR !== 0;
// outside: the module's cells in other languages (core.ts Outside), part of the key; parts: the cells joined to source
export function check(source: string, tsx = true, outside: readonly Outside[] | null = null, memo: IncrMemo | null = null, parts: string[] | null = null): ReturnType<typeof checkSources> {
  const key = checkKey(source, tsx, outside);
  let r = checks.get(key);
  if (!r && memo !== null && incrOn()) { const run = checkRun({ cells: source, tsx, outside }, { memo: memo.find, parts }); memo.keep(run.entries); r = run.result; checked++; }
  if (!r) { r = checkSources({ cells: source, tsx, outside }); checked++; }
  checks = lruTouch(checks, key, r, 2);
  return r;
}

// A module's cells checked together when some of them do not parse: each such cell is checked as a
// stand-in of the same name and line count whose value has no type, so a cell that takes it is blocked,
// and the stand-in text does not depend on what was typed, so a keystroke there reuses the check.
// result.unparsed maps each such cell's name to the parser's message; source is the text checked.
// The stand-ins and their names are standIns's (checks.ss.ts).
export function checkCells(texts: string[], tsx = true, outside: readonly Outside[] | null = null, memo: IncrMemo | null = null): { result: ReturnType<typeof checkSources> & { unparsed?: Map<string, string> }; source: string } {
  const source = texts.join("\n\n");
  try { return { result: check(source, tsx, outside, memo, texts), source }; } catch (whole) {
    const rows = texts.map((t) => {
      let parseError: string | null = null;
      try { parse(t, { jsx: tsx }); } catch (e) { parseError = String((e as Error).message); }
      return { declared: declaredName(t) || null, lines: t.split("\n").length, parseError };
    });
    const stood = standIns(rows);
    if (!stood.unparsed.length) throw whole;
    const unparsed = new Map(stood.unparsed);
    // an empty cell text is dropped as the stand-ins' dropped cells are
    const kept = stood.texts.map((x) => (typeof x === "number" ? texts[x]! : x)).filter((t) => t !== "");
    const checked = kept.join("\n\n");
    // the remembered result is shared, so the parse messages go on a copy
    const base = check(checked, tsx, outside, memo, kept);
    const result = { ...base, ok: false };
    Object.defineProperty(result, "facts", { value: base.facts, enumerable: false });
    Object.defineProperty(result, "unparsed", { value: unparsed, enumerable: false });
    return { result, source: checked };
  }
}
// rejected (the body of a cell the checker did not accept) and compileFor are SoundScript cells
export { rejected, compileFor, out, SsMap, SsSet, SsURL, deepFreeze, closure, methods } from "../runtime-ss.ts";

export { state, action, mut, freeze, borrow, snapshot, equals, messageOf, memo, read, idle, ref, actionNamer } from "../../prelude.runtime.ts";
// The value of a viewof variable as a State<T>: an Observable JavaScript view's element, whose value is
// checked against shape on the way in, or an imported SoundScript state cell's handle; every write is
// checked against shape (boundary.ts)
export function viewRef(el: unknown, shape: Shape, name: string): object {
  const e = el as { value: unknown; dispatchEvent?: unknown; addEventListener?: unknown };
  if (isRefHandle(e)) return viewHandle(e as Parameters<typeof viewHandle>[0], name, (v) => checkShape(v, shape, name));
  if (!e || typeof e !== "object" || typeof e.addEventListener !== "function" || typeof e.dispatchEvent !== "function" || !("value" in e))
    throw new TypeError(`viewof ${name}: expected a view (an element with a value), found ${e === null ? "null" : typeof e}`);
  return viewHandle(e as Parameters<typeof viewHandle>[0], name, (v) => checkShape(v, shape, name));
}
export { h, on, create, patch, running, pulling, isEvents, release, sweep };

// page-wide, so two modules' islands never share a key in one pool
let made = 0;
const ISLANDS = 64;
// A module's source joined from its cells, remembering the cells: compile then checks them one by one
// (checkCells), so a cell elsewhere in the module that does not parse does not stop an island.
let joined = new Map<string, readonly string[]>();
export function joinCells(texts: readonly string[]): string {
  const source = texts.join("\n\n");
  joined = lruTouch(joined, source, [...texts], 16);
  return source;
}
// compile for one module. read() returns that module's SoundScript source; an island runs only when
// the checker accepts it and the calling cell.
export function compiler(read: () => string) {
  const owners = new Map<string, { dead: boolean }>();
  // island text -> key, least recently used first, at most ISLANDS entries. A key is never reused for
  // other text (workers cache compiled islands by key), so an evicted island gets a fresh key.
  let keys = new Map<string, string>();
  const keyFor = (js: string, caller: string) => {
    const k = islandKey(keys.get(js), made, caller);
    made = k.made;
    keys = lruTouch(keys, js, k.key, ISLANDS);
    return k.key;
  };
  return {
    islands: () => keys.size,
    // called each time the calling cell runs: the functions it made before are superseded
    for(caller: string, refs: Record<string, unknown>) {
      owners.get(caller) && (owners.get(caller)!.dead = true);
      const owner = { dead: false };
      owners.set(caller, owner);
      return (spec: IslandSpec & { options?: { runtime?: Pool } }) => {
        const read0 = read();
        const texts = joined.get(read0);
        const { result, source } = texts ? checkCells([...texts]) : { result: check(read0), source: read0 };
        // cell facts and text come from the check's parse
        const byName = new Map([...result.facts!.values()].map((info) => [info.name, { info, text: source.slice(info.span![0], info.span![1]) }] as const));
        const isl = island([...byName.values()].map(({ info }) => ({ name: info.name, params: info.params.map((p) => p.name), refCell: info.returnsRef })), spec);
        if (isl.problems.length) throw new Error(isl.problems.map((p) => p.msg).join("; "));
        const notOk = refusedCells(result.cells.map((c) => ({ name: c.name, ok: c.status === "ok" && !c.errors.length })), caller, isl.order);
        if (notOk.length) throw new Error(`compile refused: ${notOk.join(", ")} not ok by the checker`);
        const js = erase(lowerJsx(isl.order.map((n) => byName.get(n)!.text).join("\n\n")));
        const key = keyFor(js, caller);
        const order = isl.order.map((n) => ({ name: n, params: byName.get(n)!.info.params.map((p) => p.name) }));
        const runtime = spec.options?.runtime;
        return async (args: Record<string, unknown>) => {
          const job = { key, js, names: isl.order, order, values: { ...refs, ...args }, outputs: spec.outputs };
          // an island's results cross the boundary as a cell's value does: deep-frozen (freeze.ts)
          if (runtime && typeof runtime.run === "function") return deepFreeze(await runtime.run(job, owner));
          await null;
          return deepFreeze(runHere(job));
        };
      };
    },
  };
}

// An element value as DOM: patches the node it made last time (pass `this` from an ojs cell).
export function mount(x: unknown, prev: any): Node {
  if (prev && keepsNode(drawnOf(prev), kidOf(x))) {
    patch(prev, x as Elem);
    return prev;
  }
  return create(document, x);
}

