// Prototype (2026-11-21): the smaller decisions left in the unchecked runtime files, as SoundScript cells. Checked
// with runtime.ss.ts. Each cell names the file and function it comes from.
export type Outside = { readonly name: string; readonly view?: boolean };
export type CellText = { readonly declared: string | null; readonly lines: number; readonly parseError: string | null };
export type StoodIn = { readonly texts: readonly (number | string)[]; readonly unparsed: readonly (readonly [string, string])[] };
export type CellVerdict = { readonly name: string; readonly ok: boolean };

// stdlib/runtime.ts check: the key a check is remembered by
export const checkKey = () => (source: string, tsx: boolean, outside: readonly Outside[] | null): string =>
  (tsx ? "x" : "s") + (outside !== null && outside.length ? JSON.stringify(outside) : "") + "\u0000" + source;
// stdlib/runtime.ts check, joinCells, compiler keyFor: key set to v and moved to the end (most recently used), the
// oldest evicted past limit
export const lruTouch = () => <V,>(m: Map<string, V>, key: string, v: V, limit: number): Map<string, V> => {
  const out: Mut<Map<string, V>> = mut(new Map([...m].filter(([k]) => k !== key)));
  out.set(key, v);
  // rewrite: out.keys().next() is [unsupported] intrinsic member Iterable.next (attempts/small.v1.ss.ts)
  const first = [...out.keys()][0];
  if (out.size > limit && first !== undefined) out.delete(first);
  return freeze(out);
};
// stdlib/runtime.ts checkCells: each cell text kept (its index) or a stand-in of the same name and line count for one
// that does not parse; the k-th declaration of a name is "<name> (k)" (core.ts distinctNames)
export const standIns = () => (cells: readonly CellText[]): StoodIn => {
  const seen: Mut<Map<string, number>> = mut(new Map());
  const texts: Mut<(number | string)[]> = mut([]);
  const unparsed: Mut<(readonly [string, string])[]> = mut([]);
  for (const [i, c] of cells.entries()) {
    const name = c.declared;
    const n = name !== null ? (seen.get(name) ?? 0) + 1 : 0;
    if (name !== null) seen.set(name, n);
    if (c.parseError === null) { texts.push(i); continue; }
    if (name === null) continue;
    unparsed.push([n > 1 ? `${name} (${n})` : name, c.parseError]);
    texts.push(`const ${name} = () => $ss$unparsed;` + "\n".repeat(c.lines - 1));
  }
  return { texts: freeze(texts), unparsed: freeze(unparsed) };
};
// stdlib/runtime.ts compiler: the caller and island cells the checker did not accept (the last verdict of a name)
export const refusedCells = () => (verdicts: readonly CellVerdict[], caller: string, order: readonly string[]): readonly string[] => {
  const ok = new Map(verdicts.map((v) => [v.name, v.ok]));
  return [caller, ...order].filter((n) => ok.get(n) !== true);
};
// stdlib/runtime.ts compiler: an island's key, new unless the text has one
export const islandKey = () => (known: string | undefined, made: number, caller: string): { readonly key: string; readonly made: number } =>
  known !== undefined ? { key: known, made } : { key: `island${made + 1}:${caller}`, made: made + 1 };
// workers.ts pagePool: one worker fewer than the cores, 1 to 8
export const poolSize = () => (cores: number | undefined): number => Math.max(1, Math.min(8, (cores ?? 2) - 1));
// Math.imul: rewrite, Math has no imul in the checker's intrinsics (attempts/small.v1.ss.ts): the low 32 bits of
// a * b from 16-bit halves, so no product exceeds 2^53
export const imul = () => (a: number, b: number): number => {
  const lo = (a & 0xffff) * (b | 0);
  const hi = (((a >>> 16) & 0xffff) * (b | 0)) & 0xffff;
  return (lo + (hi << 16)) | 0;
};
// prelude.runtime.ts hash (FNV-1a)
export const hash = (imul) => (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
// prelude.runtime.ts makeRandom: one step of the generator, its state passed in and out (the shell keeps it)
export const randomStep = (imul) => (a0: number): { readonly a: number; readonly value: number } => {
  const a = (a0 + 0x6d2b79f5) | 0;
  let t = imul(a ^ (a >>> 15), 1 | a);
  t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
};
// jsx/render.ts asText: a value that is not an element, as text; an object's own toString is not called
export const asText = () => (x: unknown): string =>
  typeof x === "function" ? "[object Function]" : typeof x === "object" && x !== null ? (Array.isArray(x) ? "[object Array]" : "[object Object]") : String(x);
// jsx/render.ts keyOf: a key the checker did not type is taken as its text
export const keyOf = (asText) => (k: unknown): string | number | undefined => (k === undefined || typeof k === "string" || typeof k === "number" ? k : asText(k));
// jsx/h.ts h: the element record (the shell freezes it deeply and marks it as made by h). Rewrite: { ...props } of an
// index record is [unsupported] object spread (attempts/small.v1.ss.ts); a copy through entries
export const elemRecord = (flat) => (tag: string | null, props: { readonly [k: string]: unknown } | null, children: readonly unknown[]): { readonly tag: string; readonly props: { readonly [k: string]: unknown }; readonly children: readonly unknown[] } =>
  tag === null ? { tag: "", props: {}, children: flat(children) } : { tag, props: Object.fromEntries(Object.entries(props ?? {})), children: flat(children) };
// boundary.ts describe, the part over primitives and arrays: null when the value is an object or a function
export const describeData = () => (v: unknown): string | null => {
  if (v === null) return "null";
  if (typeof v === "string") return `string ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + "…" : v)}`;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return `${typeof v} ${String(v)}`;
  if (typeof v === "function") return "a function";
  if (Array.isArray(v)) return `an array of ${v.length}`;
  return typeof v === "object" ? null : typeof v;
};
