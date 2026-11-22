// An accepted program run in runCells, every value a cell was fulfilled with read again after the run: a value that
// reads differently changed after a cell exposed it. A function is read by calling it with no arguments.
// Events run: cells.ts scheduler.frame is replaced by a queue the run pumps (no timer, no requestAnimationFrame).
import { runCells } from "../../browser/run.ts";
import { scheduler } from "../../browser/cells.ts";
import { isAction } from "../../../prelude.runtime.ts";

export const ser = (v: unknown, seen = new Set<unknown>()): string => {
  // an action is not read by calling it: a call is a write
  if (typeof v === "function" && isAction(v)) return "action";
  if (typeof v === "function") { if (seen.has(v)) return "fn"; seen.add(v); try { return `fn(${ser((v as () => unknown)(), seen)})`; } catch (x) { return `fn(throws ${String((x as Error)?.message).slice(0, 40)})`; } finally { seen.delete(v); } }
  if (v === undefined) return "undefined";
  if (typeof v === "bigint") return `${v}n`;
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (seen.has(v)) return "<cycle>";
  seen.add(v);
  try {
    if (v instanceof URL) return `URL(${v.href})`;
    if (v instanceof URLSearchParams) return `USP(${v.toString()})`;
    if (v instanceof Date) return `Date(${v.getTime()})`;
    if (v instanceof RegExp) return `RegExp(${v.source}/${v.flags} li=${v.lastIndex})`;
    if (v instanceof Error) return `Error(${v.name}:${v.message}${Object.keys(v).map((k) => `,${k}=${ser((v as unknown as Record<string, unknown>)[k], seen)}`).join("")}${"cause" in v ? `,cause=${ser(v.cause, seen)}` : ""})`;
    if (v instanceof ArrayBuffer) return `AB[${[...new Uint8Array(v)].join(",")}]`;
    if (v instanceof DataView) return `DV[${[...new Uint8Array(v.buffer)].join(",")}]`;
    if (v instanceof Promise) return "Promise";
    if (v instanceof Map) return `Map{${[...v].map(([k, x]) => `${ser(k, seen)}=>${ser(x, seen)}`).join(",")}}`;
    if (v instanceof Set) return `Set{${[...v].map((x) => ser(x, seen)).join(",")}}`;
    if (ArrayBuffer.isView(v)) return `${v.constructor.name}[${[...(v as unknown as ArrayLike<number>) as number[]].join(",")}]`;
    if (Array.isArray(v)) return `[${v.map((x) => ser(x, seen)).join(",")}]`;
    return `{${Object.keys(v).map((k) => `${k}:${ser((v as Record<string, unknown>)[k], seen)}`).join(",")}}`;
  } finally { seen.delete(v); }
};
// the frames events cells wait for, run by pump
const frames: (() => void)[] = [];
scheduler.frame = (f) => void frames.push(f);
export type Prog = { src: string; lent?: readonly string[]; show?: readonly string[]; drive?: (p: any) => unknown };
export type Observed = { silent: string[]; changed: string[]; threw: boolean; lines: string[] };
// the program run, nFrames frames pumped after it settles (and again after drive), every fulfilled value read again
export async function observeProgram(p: Prog, nFrames = 12): Promise<Observed> {
  const first = new Map<string, { obj: unknown; s: string }[]>();
  frames.length = 0;
  const prog = runCells(p.src, { tsx: true, onChange: (r) => { if (r.status === "fulfilled") first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: ser(r.value) }]); } });
  const lines: string[] = [];
  const pump = async () => { for (let i = 0; i < nFrames && frames.length; i++) { for (const f of frames.splice(0)) f(); await prog.settle(400); } };
  try {
    await prog.settle(800);
    await pump();
    if (p.drive) { try { const d = await p.drive(prog); if (d !== undefined) lines.push(`drive -> ${typeof d === "string" ? d : ser(d)}`); } catch (x) { lines.push(`drive threw: ${(x as Error).message}`); } await prog.settle(800); await pump(); }
    const errored = new Set([...prog.recs.values()].filter((r) => r.status === "rejected").map((r) => r.name));
    const silent: string[] = [], changed: string[] = [];
    for (const [n, vs] of first) if (!(p.lent ?? []).includes(n)) vs.forEach((x, i) => {
      if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) return;
      const now = ser(x.obj);
      if (now === x.s) return;
      const line = `${n} (value #${i + 1} of ${vs.length}): ${x.s} -> ${now}`;
      changed.push(line);
      if (!errored.has(n)) silent.push(line);
      lines.push(`CHANGED ${line}${errored.has(n) ? " (cell in error)" : ""}`);
    });
    for (const n of p.show ?? []) lines.push(`show ${n} = ${prog.status(n) === "rejected" ? "ERROR " + prog.error(n) : ser(prog.value(n))}`);
    for (const r of prog.recs.values()) if (r.status === "rejected") lines.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error).slice(0, 160)}`);
    return { silent, changed, threw: errored.size > 0, lines };
  } finally { prog.dispose(); frames.length = 0; }
}
// silent: a cell whose value changed and that is not in error; threw: some cell is in error
export async function observe(src: string, lent: readonly string[] = []): Promise<{ silent: string[]; threw: boolean }> {
  const r = await observeProgram({ src, lent });
  return { silent: r.silent.map((l) => l.replace(/ \(value #\d+ of \d+\)/, "")), threw: r.threw };
}
