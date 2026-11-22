// The decisions of stdlib/runtime.ts's check, checkCells, joinCells and compiler: the key a check is remembered by, the
// recency rule of their caches, the stand-ins for cells that do not parse, an island's key and which cells refuse it.
export type CheckOutside = { readonly name: string; readonly view?: boolean };
export type CellText = { readonly declared: string | null; readonly lines: number; readonly parseError: string | null };
export type StoodIn = { readonly texts: readonly (number | string)[]; readonly unparsed: readonly (readonly [string, string])[] };
export type CellVerdict = { readonly name: string; readonly ok: boolean };

// the key a check is remembered by
export const checkKey = () => (source: string, tsx: boolean, outside: readonly CheckOutside[] | null): string =>
  (tsx ? "x" : "s") + (outside !== null && outside.length ? JSON.stringify(outside) : "") + "\u0000" + source;
// key set to v and moved to the end (most recently used), the oldest dropped past limit
export const lruTouch = () => <V,>(m: Map<string, V>, key: string, v: V, limit: number): Map<string, V> => {
  const out: Mut<Map<string, V>> = new Map([...m].filter(([k]) => k !== key));
  out.set(key, v);
  const first = [...out.keys()][0];
  if (out.size > limit && first !== undefined) out.delete(first);
  return out;
};
// each cell text kept (its index) or a stand-in of the same name and line count for one that does not parse; the k-th
// declaration of a name is "<name> (k)" (core.ts distinctNames)
export const standIns = () => (cells: readonly CellText[]): StoodIn => {
  const seen: Mut<Map<string, number>> = new Map();
  const texts: Mut<(number | string)[]> = [];
  const unparsed: Mut<(readonly [string, string])[]> = [];
  for (const [i, c] of cells.entries()) {
    const name = c.declared;
    const n = name !== null ? (seen.get(name) ?? 0) + 1 : 0;
    if (name !== null) seen.set(name, n);
    if (c.parseError === null) { texts.push(i); continue; }
    if (name === null) continue;
    unparsed.push([n > 1 ? `${name} (${n})` : name, c.parseError]);
    texts.push(`const ${name} = () => $ss$unparsed;` + "\n".repeat(c.lines - 1));
  }
  return { texts: texts, unparsed: unparsed };
};
// the caller and island cells the checker did not accept (the last verdict of a name)
export const refusedCells = () => (verdicts: readonly CellVerdict[], caller: string, order: readonly string[]): readonly string[] => {
  const ok = new Map(verdicts.map((v) => [v.name, v.ok]));
  return [caller, ...order].filter((n) => ok.get(n) !== true);
};
// an island's key, new unless its text has one; a key is never reused for other text
export const islandKey = () => (known: string | undefined, made: number, caller: string): { readonly key: string; readonly made: number } =>
  known !== undefined ? { key: known, made } : { key: `island${made + 1}:${caller}`, made: made + 1 };
