// freeze-attack9 vehicles. tyRow: cell g's value read by `ok` (what g's checked type allows); a value outside it is a
// type break and the drive says DIFF. Y: g holds a Mut xs and a read-only name c; DIFF when c[0] changed.
export type Cand = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown; ctl?: boolean; twice?: string[]; fetchValue?: () => unknown; fetchBody?: string };
export const tyRow = (name: string, src: string, ok: (v: unknown) => boolean, ctl = false, cell = "g"): Cand => ({
  name, src, ctl, show: [cell],
  drive: (p: any) => {
    if (p.status(cell) !== "fulfilled") return `same: ${cell} ${p.status(cell)} ${String(p.error?.(cell) ?? "").slice(0, 140)}`;
    const v = p.value(cell);
    let s: string; try { s = JSON.stringify(v) ?? String(v); } catch { s = String(v); }
    return ok(v) ? `same: ${s?.slice(0, 120)}` : `DIFF ${cell} is outside its type: ${typeof v} ${s?.slice(0, 120)}`;
  },
});
export const Y = (e: string) => `const g = () => { const xs = [3, 1, 2]; const c: readonly number[] = xs; const before = c[0] ?? -1; ${e}; return { before, after: c[0] ?? -1 }; };`;
export const driveY = async (p: any) => {
  const g = p.value("g");
  if (!g || typeof g !== "object") return `same: g not a value (${p.status("g")} ${String(p.error?.("g") ?? "").slice(0, 120)})`;
  return `${g.before !== g.after ? "DIFF" : "same"} c read ${g.before} before the write and ${g.after} after`;
};
export const yRow = (name: string, e: string, ctl = false): Cand => ({ name, src: Y(e), ctl, drive: driveY });
export const isStr = (v: unknown) => typeof v === "string";
export const isNum = (v: unknown) => typeof v === "number";
