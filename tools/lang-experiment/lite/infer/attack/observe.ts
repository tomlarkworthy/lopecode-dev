// An accepted program run in runCells, every value a cell was fulfilled with read again after the run: a value that
// reads differently changed after a cell exposed it. A function is read by calling it with no arguments.
// Events run: cells.ts scheduler.frame is replaced by a queue the run pumps (no timer, no requestAnimationFrame).
// From selfhost/freeze-attack3/harness.ts (2026-11-22, holes8): the checker's verdicts go in as `checked`, so compile
// islands run; each promise a value reaches is followed and its value (or rejection reason) read when it settles and
// again at the end; a cell named in `twice` must give one reading per run of it.
import { runCells, type Verdicts } from "../../browser/run.ts";
import { scheduler } from "../../browser/cells.ts";
import { checkSources } from "../../core.ts";
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
    // an array's own properties that are not elements too (a match array's index, input, groups, indices)
    if (Array.isArray(v)) { const ex = Object.keys(v).filter((k) => String(Number(k) >>> 0) !== k); return `[${v.map((x) => ser(x, seen)).join(",")}${ex.map((k) => `,${k}:${ser((v as unknown as Record<string, unknown>)[k], seen)}`).join("")}]`; }
    return `{${Object.keys(v).map((k) => `${k}:${ser((v as Record<string, unknown>)[k], seen)}`).join(",")}}`;
  } finally { seen.delete(v); }
};
// each value v reaches (functions called, actions not), to depth 6; f sees every promise met
const reach = (v: unknown, f: (p: Promise<unknown>) => void, seen = new Set<unknown>(), d = 0): void => {
  if (d > 6 || v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return;
  seen.add(v);
  if (v instanceof Promise) return f(v);
  try {
    if (typeof v === "function") { if (!isAction(v)) reach((v as () => unknown)(), f, seen, d + 1); return; }
    if (v instanceof Map) { for (const [a, b] of v) { reach(a, f, seen, d + 1); reach(b, f, seen, d + 1); } return; }
    if (v instanceof Set) { for (const a of v) reach(a, f, seen, d + 1); return; }
    for (const k of Object.keys(v)) reach((v as Record<string, unknown>)[k], f, seen, d + 1);
  } catch {}
};
// a promise's settled value (or reason) and its reading then
const settled = new WeakMap<Promise<unknown>, { v: unknown; s: string }>();
const follow = (v: unknown): void => reach(v, (p) => {
  if (!settled.has(p)) p.then((x) => { settled.set(p, { v: x, s: ser(x) }); follow(x); }, (e) => { settled.set(p, { v: e, s: `REJ ${ser(e)}` }); follow(e); });
});
// the promises v reaches whose value now reads differently from when it settled
const promiseChanges = (v: unknown, out: string[] = [], seen = new Set<unknown>()): string[] => {
  reach(v, (p) => {
    const r = settled.get(p);
    if (!r || seen.has(p)) return;
    seen.add(p);
    const now = `${r.s.startsWith("REJ ") ? "REJ " : ""}${ser(r.v)}`;
    if (now !== r.s) out.push(`promise ${r.s} -> ${now}`);
    promiseChanges(r.v, out, seen);
  });
  return out;
};
// the frames events cells wait for, run by pump (set again per run: a harness loaded later may have replaced it)
const frames: (() => void)[] = [];
const toFrames = (f: () => void) => void frames.push(f);
export type Prog = { src: string; lent?: readonly string[]; show?: readonly string[]; drive?: (p: any) => unknown; twice?: readonly string[]; checked?: Verdicts; fetchBody?: string };
export type Observed = { silent: string[]; changed: string[]; threw: boolean; lines: string[] };
// the program run, nFrames frames pumped after it settles (and again after drive), every fulfilled value read again
export async function observeProgram(p: Prog, nFrames = 12): Promise<Observed> {
  const first = new Map<string, { obj: unknown; s: string; run: number }[]>();
  frames.length = 0;
  scheduler.frame = toFrames;
  const caps = p.fetchBody === undefined ? {} : { fetch: (async () => new Response(p.fetchBody)) as unknown as typeof fetch };
  const prog = runCells(p.src, { tsx: true, checked: p.checked, caps, onChange: (r) => {
    if (r.status !== "fulfilled") return;
    follow(r.value);
    first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: ser(r.value), run: r.evals }]);
  } });
  const lines: string[] = [];
  const pump = async () => { for (let i = 0; i < nFrames && frames.length; i++) { for (const f of frames.splice(0)) f(); await prog.settle(400); } };
  try {
    await prog.settle(800);
    await pump();
    if (p.drive) { try { const d = await p.drive(prog); if (d !== undefined) lines.push(`drive -> ${typeof d === "string" ? d : ser(d)}`); } catch (x) { lines.push(`drive threw: ${(x as Error).message}`); } await prog.settle(800); await pump(); }
    const errored = new Set([...prog.recs.values()].filter((r) => r.status === "rejected").map((r) => r.name));
    const silent: string[] = [], changed: string[] = [];
    const note = (n: string, line: string) => {
      changed.push(line);
      if (!errored.has(n)) silent.push(line);
      lines.push(`CHANGED ${line}${errored.has(n) ? " (cell in error)" : ""}`);
    };
    for (const [n, vs] of first) if (!(p.lent ?? []).includes(n)) vs.forEach((x, i) => {
      if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) return;
      const now = ser(x.obj), pc = promiseChanges(x.obj);
      if (now !== x.s || pc.length) note(n, `${n} (value #${i + 1} of ${vs.length}): ${x.s} -> ${now}${pc.length ? ` ${pc.join(" ")}` : ""}`);
    });
    // a consumer reading one input twice in one run: the readings of one run must agree
    for (const n of p.twice ?? []) {
      const runs = new Map<number, string[]>();
      for (const x of first.get(n) ?? []) runs.set(x.run, [...(runs.get(x.run) ?? []), x.s]);
      for (const [k, vs] of runs) if (new Set(vs).size > 1) note(n, `twice ${n} run ${k}: ${vs.join(" , ")}`);
    }
    for (const n of p.show ?? []) lines.push(`show ${n} = ${prog.status(n) === "rejected" ? "ERROR " + prog.error(n) : ser(prog.value(n))}`);
    for (const r of prog.recs.values()) if (r.status === "rejected") lines.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error).slice(0, 160)}`);
    return { silent, changed, threw: errored.size > 0, lines };
  } finally { prog.dispose(); frames.length = 0; }
}
// silent: a cell whose value changed and that is not in error; threw: some cell is in error
export async function observe(src: string, lent: readonly string[] = []): Promise<{ silent: string[]; threw: boolean }> {
  let checked: Verdicts | undefined;
  try { checked = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as never) as unknown as Verdicts; } catch {}
  const r = await observeProgram({ src, lent, checked });
  return { silent: r.silent.map((l) => l.replace(/ \(value #\d+ of \d+\)/, "")), threw: r.threw };
}
