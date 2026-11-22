// The repro programs of the holes left to the owner (not fixed tonight); live.test.ts prints each verdict on the
// shipped checker, it asserts none. B3: one Mut given twice. B6: foreign declarations typed Mut (steps 1 and 2 closed
// the result and the input forms; a foreign function that keeps a Mut argument stays open). A string held as
// { readonly length: number } by a foreign declaration. A foreign RegExp (step 4 covers the regexps cells make). Events<T> assignable to {} and read after narrowing.
// Found tonight, not fixed: ?? and || under an expected type do not check the left operand (ixCheckLogical).
import type { Program } from "./variants.ts";

const EV = "const e = function* () { yield 1; };\n";
export const OWNER: Program[] = [
  { name: "B3 f(m, m): a push through q changes p", hole: "owner-B3", src: "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: Mut<number[]>) => {\n    const n = p.length;\n    q.push(2);\n    return [n, p.length];\n  };\n  return f(m, m);\n};" },
  { name: "B3 a helper that captures m, given m", hole: "owner-B3", src: "const a = () => {\n  const m = mut([1]);\n  const h = (p: Mut<number[]>) => {\n    const n = p.length;\n    m.push(2);\n    return [n, p.length];\n  };\n  return h(m);\n};" },
  { name: "B6 foreign function keeps a Mut argument (open)", hole: "owner-B6", foreign: "/** pure */\ndeclare function keep(m: Mut<number[]>): void;", src: "const a = (keep) => {\n  const m = mut([1]);\n  keep(m);\n  return freeze(m);\n};" },
  { name: "B6 foreign const typed Mut (closed by step 2, [mut-cell])", hole: "owner-B6", foreign: "/** pure */\ndeclare const lib: Mut<number[]>;", src: "const a = (lib) => {\n  lib.push(1);\n  return lib.length;\n};" },
  { name: "B6 foreign function returning Mut (closed by step 1, [mut-source])", hole: "owner-B6", foreign: "/** pure */\ndeclare function grab(): Mut<number[]>;", src: "const a = (grab) => {\n  const m = grab();\n  m.push(1);\n  return 1;\n};" },
  { name: "B6 foreign generic id<T>(v: T): Mut<T> (closed by step 1, [mut-source])", hole: "owner-B6", foreign: "/** pure */\ndeclare function id<T>(v: T): Mut<T>;", src: "const x = () => [1];\nconst a = (id, x: number[]) => {\n  id(x).push(1);\n  return 0;\n};" },
  { name: "a string held as { readonly length: number }, narrowed by typeof !== string", hole: "owner-foreign-length", foreign: "/** pure */\ndeclare const s: { readonly length: number };", src: "const k = (s) => {\n  const y: { readonly length: number } | \"a\" = s;\n  return typeof y !== \"string\" ? y.length + 1 : 0;\n};" },
  { name: "Events<T> to {}, to unknown, narrowed, name read", hole: "owner-events-handle", src: EV + "const P = (e: Events<number>) => {\n  const x: {} = e;\n  const y: unknown = x;\n  if (typeof y === \"object\" && y !== null && \"name\" in y) return y.name;\n  return null;\n};" },
  { name: "Events<T> to { a?: number }, then x.a", hole: "owner-events-handle", src: EV + "const P = (e: Events<number>) => {\n  const x: { a?: number } = e;\n  return x.a;\n};" },
  { name: "a foreign RegExp (a g one at run time) tested twice (S9.3 trusts the declaration)", hole: "owner-foreign-regexp", foreign: "/** pure */\ndeclare const re: RegExp;", src: "const a = (re) => [re.test(\"aa\"), re.test(\"aa\")];" },
  { name: "found tonight: ?? with an expected type checks only its right side (r is \"a\")", hole: "found-logical-left", src: "const k = () => {\n  const r: number = [\"a\"][0] ?? 1;\n  return r;\n};" },
  { name: "found tonight: || with an expected type checks only its right side", hole: "found-logical-left", src: "const k = () => {\n  const r: number = [\"a\"][0] || 1;\n  return r;\n};" },
  { name: "step 6, not closed: r[k] with k: string naming an inherited member (k = \"constructor\" gives Object)", hole: "open-index-key", src: "const r = (): { [k: string]: number } => ({ a: 1 });\nconst k = () => \"constructor\";\nconst a = (r: { [k: string]: number }, k: string) => (r[k] ?? 0) + 1;" },
  { name: "step 7, not closed: a Set of records dedupes by identity", hole: "open-identity-key", src: "const a = () => new Set([{ x: 1 }, { x: 1 }]).size;" },
  { name: "step 7, not closed: a Map keyed by a record misses an equal key", hole: "open-identity-key", src: "const a = () => new Map([[[1], 2]]).get([1]);" },
  { name: "step 7, not closed: Object.is on two records", hole: "open-identity-key", src: "const a = () => Object.is({ x: 1 }, { x: 1 });" },
];
