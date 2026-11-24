// freeze-attack12 vehicles. ACT: a state cell c (0) and an Action a that sets it to 1. stateDrive: DIFF when c is not 0
// after the program settled with no event (an action ran while a cell computed, or the runtime ran it). tyRow (attack 9):
// cell g's value read by ok. twiceDrive: the drive is a reader in another language that reads g's value twice through
// read; DIFF when the two readings differ (a one-shot value left the cell)
export { tyRow, type Cand } from "../freeze-attack9/lib9.ts";
export const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
export const stateDrive = (p: any) => (p.status("c") === "fulfilled" && p.value("c") !== 0
  ? `DIFF STATE c is ${p.value("c")} with no event; g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 80)}`
  : `same: c=${p.value("c")} g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 100)}`);
export const sRow = (name: string, src: string, ctl = false) => ({ name, src, ctl, show: ["c", "g"], drive: stateDrive });
export const twiceDrive = (read: (v: any) => Promise<string> | string, cell = "g") => async (p: any) => {
  if (p.status(cell) !== "fulfilled") return `same: ${cell} ${p.status(cell)} ${String(p.error(cell) ?? "").slice(0, 120)}`;
  const v = p.value(cell);
  let r1: string, r2: string;
  try { r1 = await read(v); } catch (e) { r1 = `threw ${(e as Error).message}`; }
  try { r2 = await read(v); } catch (e) { r2 = `threw ${(e as Error).message}`; }
  return r1 !== r2 ? `DIFF one-shot: first read ${r1}, second read ${r2}` : `same: ${r1} / ${r2}`;
};
