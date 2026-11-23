// b2 (e1, 2026-11-23): since e1 a mutating method or member write on a receiver made in the same expression ([...xs].sort())
// is accepted (S4.1). These rows try receivers that look fresh but are, or may be, another name for a value that something
// else reads. Vehicle Y: cell g holds a Mut xs and a read-only name c for it, reads c[0], writes through the receiver
// expression, and returns what c[0] was and is. A receiver that is another name for c changes c[0], and driveG says DIFF;
// nothing freezes xs here, so only the checker can stop it (no timer: g runs once and is read). Vehicle I: the same over
// a cell input c (frozen at run time, so an accepted write throws and g is in error). Vehicle M: Y over a Map. Rows named
// b2-ok-* are fresh and must be accepted (live.test.ts asserts it); every other row must be rejected or say "same".
// Controls (ctl, run without the checker) write through c itself, so the vehicle shows a write it can see.
type A = { name: string; src: string; ctl?: boolean; drive?: (p: any) => unknown };
const Y = (e: string) => `const g = () => { const xs = [3, 1, 2]; const c: readonly number[] = xs; const before = c[0] ?? -1; ${e}; return { before, after: c[0] ?? -1 }; };`;
const I = (e: string) => `const c = () => [3, 1, 2];\nconst g = (c: readonly number[]) => { const before = c[0] ?? -1; ${e}; return { before, after: c[0] ?? -1 }; };`;
const M = (e: string) => `const g = () => { const ms = new Map<string, number>([["a", 1]]); const c: Map<string, number> = ms; const before = c.get("a") ?? -1; ${e}; return { before, after: c.get("a") ?? -1 }; };`;
// Vehicle T: Y over a Float64Array, which no freeze protects (a typed array cannot be frozen), so a write that reaches
// its buffer is seen in every mode
const T = (e: string) => `const g = () => { const b = new Float64Array([3, 1, 2]); const c: Float64Array = b; const before = c[0] ?? -1; ${e}; return { before, after: c[0] ?? -1 }; };`;
const driveG = async (p: any) => {
  const g = p.value("g");
  if (!g || typeof g !== "object") return `same: g not a value (${p.status("g")} ${String(p.error?.("g") ?? "").slice(0, 100)})`;
  return `${g.before !== g.after ? "DIFF" : "same"} c read ${g.before} before the write and ${g.after} after`;
};
export const ALIAS: [string, string][] = [
  ["index-of-literal", "[c][0]?.sort()"],
  ["cond-left", "(c.length > 0 ? c : [...c]).sort()"],
  ["cond-right", "(c.length < 0 ? [...c] : c).sort()"],
  ["helper-identity", "((x: readonly number[]) => x)(c).sort()"],
  ["spread-of-literal-index", "[...[c]][0]?.sort()"],
  ["record-field", "({ v: c }).v.sort()"],
  ["array-of", "Array.of(c)[0]?.sort()"],
  ["map-identity", "[c].map((x) => x)[0]?.sort()"],
  ["nullish", "(c ?? [1]).sort()"],
  ["or", "(c || [1]).sort()"],
  ["at", "[c].at(0)?.sort()"],
  ["map-get", "new Map([[1, c]]).get(1)?.sort()"],
  ["pop", "[c].pop()?.sort()"],
  ["find", "[c].find(() => true)?.sort()"],
  ["reverse-index", "[c].reverse()[0]?.sort()"],
  ["splice-index", "[c].splice(0, 1)[0]?.sort()"],
  ["object-assign", "Object.assign(c, []).sort()"],
  ["values-next", "[c].values().next().value?.sort()"],
  ["own-slice-method", "({ slice: () => c }).slice().sort()"],
  ["sequence", "(0, c).sort()"],
  ["parens", "((c)).sort()"],
  ["fill-index", "[c].fill(c)[0]?.sort()"],
  ["concat-index", "[[...c]].concat([c])[1]?.sort()"],
  ["flat-index", "[[c]].flat()[0]?.sort()"],
  ["sort-result-index", "[c].sort()[0]?.sort()"],
  ["member-write-index", "[c][0][0] = 9"],
  ["member-write-record", "({ v: c }).v[0] = 9"],
  ["entries-index", "[...[c].entries()][0]?.[1].sort()"],
  ["typed-from-literal", "[new Float64Array(c)][0]?.sort()"],
  ["generic-identity", "(<T,>(x: T): T => x)(c).sort()"],
  // sort returns its receiver, which the checker does not take as fresh: rejected, though here it is a fresh array
  ["chained-fresh", "[...c].sort().reverse()"],
];
export const FRESH: [string, string][] = [
  ["spread", "[...c].sort()"],
  ["spread-reverse", "[...c].reverse()"],
  ["slice", "c.slice().sort()"],
  ["array-from", "Array.from(c).sort()"],
  ["map-result", "c.map((x) => x * 2).sort()"],
  ["snapshot", "snapshot(c).sort()"],
  ["literal-push", "[1, ...c].push(4)"],
  ["literal-member", "[...c][0] = 9"],
];
export const MAPS: [string, string][] = [
  ["cond-map", "(c.size > 0 ? c : new Map<string, number>()).clear()"],
  ["map-in-literal", "[c][0]?.clear()"],
];
export const MAPS_FRESH: [string, string][] = [["new-map-set", "new Map(c).set(\"a\", 9)"]];
const row = (name: string, src: string, ctl = false): A => ({ name, src, ctl, drive: driveG });
export const TYPED: [string, string][] = [
  ["buffer-sort", "new Float64Array(c.buffer).sort()"],
  ["buffer-u8-write", "new Uint8Array(c.buffer)[0] = 9"],
  ["buffer-fill", "new Float64Array(c.buffer).fill(0)"],
  ["subarray-sort", "c.subarray(0).sort()"],
  ["buffer-local", "const v = new Float64Array(c.buffer); v.sort()"],
  ["buffer-offset", "new Float64Array(c.buffer, 0, 1).fill(9)"],
];
export const TYPED_FRESH: [string, string][] = [["slice-sort", "c.slice().sort()"], ["from-copy-sort", "new Float64Array(c).sort()"], ["with", "c.with(0, 9).fill(1)"]];
export const attacks: A[] = [
  ...ALIAS.flatMap(([id, e]): A[] => [row(`b2-Y-${id}`, Y(e)), row(`b2-I-${id}`, I(e))]),
  ...MAPS.map(([id, e]): A => row(`b2-M-${id}`, M(e))),
  ...FRESH.flatMap(([id, e]): A[] => [row(`b2-ok-Y-${id}`, Y(e)), row(`b2-ok-I-${id}`, I(e))]),
  ...MAPS_FRESH.map(([id, e]): A => row(`b2-ok-M-${id}`, M(e))),
  ...TYPED.map(([id, e]): A => row(`b2-T-${id}`, T(e))),
  ...TYPED_FRESH.map(([id, e]): A => row(`b2-ok-T-${id}`, T(e))),
  row("b2-ctl-T-buffer", T("new Float64Array(c.buffer).sort()"), true),
  row("b2-ctl-Y-direct", Y("xs.sort()"), true),
  row("b2-ctl-Y-alias", Y("(c as number[]).sort()"), true),
  row("b2-ctl-M-alias", M("ms.clear()"), true),
];
