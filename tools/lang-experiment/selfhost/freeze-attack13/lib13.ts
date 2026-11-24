// freeze-attack13 vehicles. tyRow (attack 9): cell g's value read by ok; DIFF when outside the checked type.
// sRow (attack 12): ACT's state c must stay 0 with no event. callRow: the drive calls the action `act` as another
// language would (a top-level call), lets the program settle, then reads cell `cell` with ok.
export { tyRow, type Cand } from "../freeze-attack9/lib9.ts";
export { ACT, sRow, stateDrive, twiceDrive } from "../freeze-attack12/lib12.ts";
import type { Cand } from "../freeze-attack9/lib9.ts";
const show = (v: unknown) => { try { return (typeof v === "function" ? "fn" : JSON.stringify(v) ?? String(v)).slice(0, 120); } catch { return String(v).slice(0, 120); } };
export const settleOf = async (p: any) => { await p.settle(); };
export const callRow = (name: string, src: string, act: string, args: unknown[], ok: (v: unknown) => boolean, cell = "g", ctl = false): Cand => ({
  name, src, ctl, show: [cell],
  drive: async (p: any) => {
    const a = p.value(act);
    if (typeof a !== "function") return `same: ${act} not a function (${p.status(act)} ${String(p.error(act) ?? "").slice(0, 100)})`;
    let thrown = "";
    try { a(...args); } catch (e) { thrown = ` (call threw: ${(e as Error).message.slice(0, 100)})`; }
    await settleOf(p);
    if (p.status(cell) !== "fulfilled") return `same: ${cell} ${p.status(cell)} ${String(p.error(cell) ?? "").slice(0, 120)}${thrown}`;
    const v = p.value(cell);
    return ok(v) ? `same: ${show(v)}${thrown}` : `DIFF ${cell} is outside its type: ${typeof v} ${show(v)}${thrown}`;
  },
});
export const isNum = (v: unknown) => typeof v === "number";
export const isStr = (v: unknown) => typeof v === "string";
export const strs = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
export const nums = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "number");
