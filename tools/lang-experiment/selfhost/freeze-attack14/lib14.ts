// freeze-attack14 vehicles. tyRow (attack 9): cell g's value read by ok, DIFF when outside g's checked type. callRow
// (attack 13): the drive calls an action as another language would, then reads a cell. Detectors below encode types.
export { tyRow, callRow, isNum, isStr, strs, nums, type Cand } from "../freeze-attack13/lib13.ts";
export { ACT, sRow, stateDrive, twiceDrive } from "../freeze-attack12/lib12.ts";
// every index from 0 to length - 1 (holes included) holds a value that p accepts
export const allIdx = (p: (x: unknown) => boolean) => (v: unknown) => { if (!Array.isArray(v)) return false; for (let i = 0; i < v.length; i++) if (!p(v[i])) return false; return true; };
export const isArrOf = (p: (x: unknown) => boolean) => allIdx(p);
export const numArr = allIdx((x) => typeof x === "number");
export const strArr = allIdx((x) => typeof x === "string");
export const isLit = (l: unknown) => (v: unknown) => v === l;
export const isRec = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);
// a detector read from g's written return type, for rows written to probe the checker (verdict rows): number, string,
// boolean, a number literal, or (else) any value
export const byRet = (src: string): ((v: unknown) => boolean) => {
  const m = /const g = (?:async )?\([^)]*\): (?:Promise<)?([^=>{]+?)>? =>/.exec(src);
  const t = m?.[1]?.trim() ?? "";
  if (t === "number") return (v) => typeof v === "number";
  if (t === "string") return (v) => typeof v === "string";
  if (t === "boolean") return (v) => typeof v === "boolean";
  if (/^-?\d+$/.test(t)) return (v) => v === Number(t);
  if (t === "number[]" || t === "readonly number[]") return (v) => Array.isArray(v) && [...v.keys()].every((i) => typeof v[i] === "number");
  return () => true;
};
// S6.9 detector: an action b writes k from a value of its cell; c is a state cell that a writes 1. b is called with c = 0,
// then a, then the latest b: DIFF when the two values of k differ (b's write depends on state)
export const actDrive = async (p: any) => {
  const call = async (n: string) => { const f = p.value(n); if (typeof f !== "function") return `${n} not a function (${p.status(n)} ${String(p.error(n) ?? "").slice(0, 80)})`; try { f(); } catch (e) { return `${n} threw ${(e as Error).message.slice(0, 80)}`; } await p.settle(); return null; };
  const e0 = await call("b"); if (e0) return `same: ${e0}`;
  const k0 = p.value("k");
  const e1 = await call("a"); if (e1) return `same: ${e1}`;
  const e2 = await call("b"); if (e2) return `same: ${e2}`;
  const k1 = p.value("k");
  return k0 !== k1 ? `DIFF b wrote k = ${k0} with c = 0 and k = ${k1} with c = 1` : `same: k = ${k0} both times`;
};
