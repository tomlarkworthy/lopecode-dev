// Prototype (2026-11-21): the stdlib/runtime.ts functions whose decisions small.ss.ts takes (check's key and LRU,
// checkCells' stand-ins, joinCells, compiler's keyFor and refusal), rewritten as shells over those cells, to count
// the lines each side holds. Only checkCellsProto is run (small.test.ts); the others are for the count.
import { check, type checkSources } from "../../lite/stdlib/runtime.ts";
import { checkSources as checkSourcesReal, type Outside } from "../../lite/core.ts";
import { declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { parse } from "../../lite/parse.ts";
import type * as smallCells from "./small.ss.ts";
import type { Linked } from "../../lite/link.ts";
type S = Linked<typeof smallCells>;

export function checkCellsProto(texts: string[], S: S, tsx = true, outside: readonly Outside[] | null = null) {
  const source = texts.join("\n\n");
  try { return { result: check(source, tsx, outside), source }; } catch (whole) {
    const rows = texts.map((t) => {
      let parseError: string | null = null;
      try { parse(t, { jsx: tsx }); } catch (e) { parseError = String((e as Error).message); }
      return { declared: declaredName(t), lines: t.split("\n").length, parseError };
    });
    const s = S.standIns(rows);
    if (!s.unparsed.length) throw whole;
    const checked = s.texts.map((x) => (typeof x === "number" ? texts[x] : x)).join("\n\n");
    const base = check(checked, tsx, outside);
    const result = { ...base, ok: false };
    Object.defineProperty(result, "facts", { value: base.facts, enumerable: false });
    Object.defineProperty(result, "unparsed", { value: new Map(s.unparsed), enumerable: false });
    return { result, source: checked };
  }
}

// for the count only: check and joinCells over checkKey and lruTouch, keyFor over islandKey and lruTouch
export function makeCheck(S: S) {
  let checks = new Map<string, ReturnType<typeof checkSources>>(), checked = 0;
  return (source: string, tsx = true, outside: readonly Outside[] | null = null) => {
    const key = S.checkKey(source, tsx, outside);
    const r = checks.get(key) ?? (checked++, checkSourcesReal({ cells: source, tsx, outside }));
    checks = S.lruTouch(checks, key, r, 16);
    return r;
  };
}
export function makeKeyFor(S: S) {
  let keys = new Map<string, string>(), made = 0;
  return (js: string, caller: string) => {
    const k = S.islandKey(keys.get(js), made, caller);
    made = k.made;
    keys = S.lruTouch(keys, js, k.key, 64);
    return k.key;
  };
}
