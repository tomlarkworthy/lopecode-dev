// open part 6 (2026-11-25): attack 14's rows that the owner put out of scope (spec, Not specified). JW: JavaScript in
// the page writes a published typed array, ArrayBuffer, or a Map, Set or URL through the base class (jsw.ts, min-rt.ts).
// JS callers: JavaScript calls an action with arguments of other types (jsc.ts). These rows are recorded, not silent:
// live.test.ts runs each file under drive-rt.ts and asserts that its SILENT rows are exactly the ones listed here.
export const OUT_OF_SCOPE: Record<string, string[]> = {
  "selfhost/freeze-attack14/jsw.ts": ["j-typed-index", "j-typed-in-rec", "j-typed-in-arr", "j-typed-fill", "j-buffer", "j-map-proto-set", "j-set-proto-add", "j-url-setter", "j-state-typed"],
  "selfhost/freeze-attack14/jsc.ts": ["jc-action-str", "jc-action-missing", "jc-action-rec"],
  "selfhost/freeze-attack14/min-rt.ts": ["min-jw"],
};
