// The SoundScript standard library's runtime half. build.ts makes cells of it (soundscript/ts-cells.ts):
// @tomlarkworthy/soundscript-runtime, and @tomlarkworthy/soundscript-checker for what reaches the parser.
// A compiled cell is its typed function applied to its inputs; a state cell is ss.ref(...), an events cell
// ss.events(...), a listener ss.listen(...), and a state cell's value variable is Observable's Generators.input(handle).
import { isRefHandle, viewHandle } from "../../prelude.runtime.ts";
import { h } from "../jsx/h.ts";
import { create, patch } from "../jsx/render.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { erase } from "../browser/erase.ts";
import { on, events, listen, running, pulling, isEvents, release, sweep, cellsOf, setListenerOrder, listenerOrderChanged } from "../browser/cells.ts";
export { setListenerOrder, listenerOrderChanged, events, listen };
export { cellsOf };
import { island, type IslandSpec } from "../island.ts";
import { pagePool, runHere, type Pool } from "../browser/workers.ts";
export { isDuplicateKey, compileCell, compileCellText, compileModule, contextOf, contextFromCheck, acceptedOf, cellStates, declaredName, decompileVariable, decompileModule, langOf, cellOfVariable, splitCells, handleName, variableName, keyOfVariable, STATE_VALUE } from "../toolchain/ss-toolchain.ts";
import { declaredName } from "../toolchain/ss-toolchain.ts";
import { parse } from "../parse.ts";
import { checkSources, type Outside } from "../core.ts";
export { cross, crossings } from "../boundary.ts";
import { checkShape, type Shape } from "../boundary.ts";
export { checkSources };
export { completionWork } from "../complete.ts";
// checkSources for SoundScript cells, remembered for the last 16 sources. The editor asks about the
// same module source several times per keystroke (lint, the cells an edit would break, the compile
// context); a result is never written to, so one is shared.
const checks = new Map<string, ReturnType<typeof checkSources>>();
// how many module checks have run (a remembered result, or a source that does not parse, is not one)
let checked = 0;
export const checksRun = () => checked;
// outside: the module's cells in other languages (core.ts Outside), part of the key
export function check(source: string, tsx = true, outside: readonly Outside[] | null = null): ReturnType<typeof checkSources> {
  const key = (tsx ? "x" : "s") + (outside?.length ? JSON.stringify(outside) : "") + "\u0000" + source;
  let r = checks.get(key);
  if (r) { checks.delete(key); checks.set(key, r); return r; }
  r = checkSources({ cells: source, tsx, outside });
  checked++;
  checks.set(key, r);
  if (checks.size > 16) checks.delete(checks.keys().next().value!);
  return r;
}

// A module's cells checked together when some of them do not parse: each such cell is checked as a
// stand-in of the same name and line count whose value has no type, so a cell that takes it is blocked,
// and the stand-in text does not depend on what was typed, so a keystroke there reuses the check.
// result.unparsed maps each such cell's name to the parser's message; source is the text checked.
export function checkCells(texts: string[], tsx = true, outside: readonly Outside[] | null = null): { result: ReturnType<typeof checkSources> & { unparsed?: Map<string, string> }; source: string } {
  const source = texts.join("\n\n");
  try { return { result: check(source, tsx, outside), source }; } catch (whole) {
    const unparsed = new Map<string, string>();
    // the k-th declaration of a name is the checker's "<name> (k)" (core.ts distinctNames)
    const seen = new Map<string, number>();
    const stood = texts.map((t) => {
      const declared = declaredName(t);
      const n = declared ? (seen.get(declared) ?? 0) + 1 : 0;
      if (declared) seen.set(declared, n);
      try { parse(t, { jsx: tsx }); return t; } catch (e) {
        const name = declared;
        if (!name) return "";
        unparsed.set(n > 1 ? `${name} (${n})` : name, String((e as Error).message));
        return `const ${name} = () => $ss$unparsed;` + "\n".repeat(t.split("\n").length - 1);
      }
    }).filter((t) => t !== "");
    if (!unparsed.size) throw whole;
    const checked = stood.join("\n\n");
    // the remembered result is shared, so the parse messages go on a copy
    const base = check(checked, tsx, outside);
    const result = { ...base, ok: false };
    Object.defineProperty(result, "facts", { value: base.facts, enumerable: false });
    Object.defineProperty(result, "unparsed", { value: unparsed, enumerable: false });
    return { result, source: checked };
  }
}
// The body of a cell the checker did not accept: it raises the checker's messages and runs nothing else.
export function rejected(name: string, why: string[]): never {
  throw new Error(`${name} does not check: ${why.join("; ")}`);
}

export { state, action, mut, freeze, borrow, snapshot, equals, read, entry, idle, actionQueue, ref, actionNamer } from "../../prelude.runtime.ts";
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
export { h, on, create, patch, pagePool, running, pulling, isEvents, release, sweep };

// page-wide, so two modules' islands never share a key in one pool
let made = 0;
const ISLANDS = 64;
// A module's source joined from its cells, remembering the cells: compile then checks them one by one
// (checkCells), so a cell elsewhere in the module that does not parse does not stop an island.
const joined = new Map<string, readonly string[]>();
export function joinCells(texts: readonly string[]): string {
  const source = texts.join("\n\n");
  joined.delete(source);
  joined.set(source, [...texts]);
  if (joined.size > 16) joined.delete(joined.keys().next().value!);
  return source;
}
// compile for one module. read() returns that module's SoundScript source; an island runs only when
// the checker accepts it and the calling cell.
export function compiler(read: () => string) {
  const owners = new Map<string, { dead: boolean }>();
  // island text -> key, least recently used first, at most ISLANDS entries. A key is never reused for
  // other text (workers cache compiled islands by key), so an evicted island gets a fresh key.
  const keys = new Map<string, string>();
  const keyFor = (js: string, caller: string) => {
    let key = keys.get(js);
    if (key) keys.delete(js);
    else key = `island${++made}:${caller}`;
    keys.set(js, key);
    if (keys.size > ISLANDS) keys.delete(keys.keys().next().value!);
    return key;
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
        const verdict = new Map(result.cells.map((c) => [c.name, c.status === "ok" && !c.errors.length]));
        const notOk = [caller, ...isl.order].filter((n) => !verdict.get(n));
        if (notOk.length) throw new Error(`compile refused: ${notOk.join(", ")} not ok by the checker`);
        const js = erase(lowerJsx(isl.order.map((n) => byName.get(n)!.text).join("\n\n")));
        const key = keyFor(js, caller);
        const order = isl.order.map((n) => ({ name: n, params: byName.get(n)!.info.params.map((p) => p.name) }));
        const runtime = spec.options?.runtime;
        return async (args: Record<string, unknown>) => {
          const job = { key, js, names: isl.order, order, values: { ...refs, ...args }, outputs: spec.outputs };
          if (runtime && typeof runtime.run === "function") return runtime.run(job, owner);
          await null;
          return runHere(job);
        };
      };
    },
  };
}
export const compileFor = (c: ReturnType<typeof compiler>, caller: string, refs: Record<string, unknown>) => {
  if (!c || typeof c.for !== "function") throw new Error(`${caller} takes compile, and this module defines no ss_compile = ss.compiler(...)`);
  return c.for(caller, refs);
};

// An element value as DOM: patches the node it made last time (pass `this` from an ojs cell).
export function mount(x: unknown, prev: any): Node {
  if (prev && prev.__elem && x && typeof x === "object" && prev.__elem.tag === (x as any).tag) {
    patch(prev, x as any);
    return prev;
  }
  return create(document, x);
}

// The page's worker pool, made on first use, so a notebook that never compiles starts no workers.
export function lazyPool(): Pool {
  let p: Pool | null = null;
  const get = () => (p ??= pagePool());
  return { get size() { return get().size; }, get answered() { return p ? p.answered : []; }, run: (job, owner) => get().run(job, owner) };
}
