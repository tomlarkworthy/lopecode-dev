// freeze-attack3 harness. Each candidate goes through the live checker (run-sets.ts verdictOf, rules ON) and, when
// accepted, through lite/browser/run.ts runCells (compiled cell text with closure registrations), as observe.ts does,
// plus: the checker's verdicts are passed as `checked` so compile(...) islands run; promise values are snapshotted
// when they resolve and read again at the end; a cell listed in `twice` must yield the same observation every time.
// A control (ctl: true) skips the checker: it proves the detector fires on a path the freeze does not cover.
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
import { ser } from "../../lite/infer/attack/observe.ts";
import { runCells } from "../../lite/browser/run.ts";
import { scheduler } from "../../lite/browser/cells.ts";
import { checkSources } from "../../lite/core.ts";

export type Cand = { name: string; src: string; show?: string[]; twice?: string[]; ctl?: boolean; drive?: (p: any) => unknown; fetchBody?: string };
export const W = "for (let i = 0; i < 300; i++) await null; ";
export const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
export const B = (t: string) => `\nconst b = (a: ${t}) => ({ v: a });`;
export const C = (name: string, src: string, extra: Partial<Cand> = {}): Cand => ({ name, src, ...extra });

const frames: (() => void)[] = [];
scheduler.frame = (f) => void frames.push(f);

// promise contents: each promise met while serialising is followed; its value is serialised when it resolves
const pv = new WeakMap<object, { v: unknown; s: string; err: boolean }>();
const follow = (v: unknown, seen = new Set<unknown>(), depth = 0): void => {
  if (depth > 6 || v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return;
  seen.add(v);
  if (v instanceof Promise) {
    if (!pv.has(v)) v.then((x) => { pv.set(v, { v: x, s: sser(x), err: false }); follow(x, new Set(), depth + 1); }, (e) => pv.set(v, { v: e, s: "REJ " + sser(e), err: true }));
    return;
  }
  try {
    if (typeof v === "function") { follow((v as () => unknown)(), seen, depth + 1); return; }
    if (v instanceof Map) { for (const [a, b] of v) { follow(a, seen, depth + 1); follow(b, seen, depth + 1); } return; }
    if (v instanceof Set) { for (const a of v) follow(a, seen, depth + 1); return; }
    for (const k of Object.keys(v)) follow((v as any)[k], seen, depth + 1);
  } catch {}
};
// ser with an Error's message and a promise's resolved value
export const sser = (v: unknown): string => {
  const base = ser(v);
  return base;
};
const promiseLines = (v: unknown, seen = new Set<unknown>(), depth = 0, out: string[] = []): string[] => {
  if (depth > 6 || v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return out;
  seen.add(v);
  if (v instanceof Promise) { const r = pv.get(v); if (r) { out.push(r.s); promiseLines(r.v, new Set(), depth + 1, out); } return out; }
  try {
    if (typeof v === "function") { promiseLines((v as () => unknown)(), seen, depth + 1, out); return out; }
    if (v instanceof Map) { for (const [a, b] of v) { promiseLines(a, seen, depth + 1, out); promiseLines(b, seen, depth + 1, out); } return out; }
    if (v instanceof Set) { for (const a of v) promiseLines(a, seen, depth + 1, out); return out; }
    for (const k of Object.keys(v)) promiseLines((v as any)[k], seen, depth + 1, out);
  } catch {}
  return out;
};
const errMsgs = (v: unknown, seen = new Set<unknown>(), depth = 0, out: string[] = []): string[] => {
  if (depth > 6 || v === null || typeof v !== "object" || seen.has(v)) return out;
  seen.add(v);
  if (v instanceof Error) out.push(`${v.name}:${v.message}`);
  try { for (const k of Object.keys(v)) errMsgs((v as any)[k], seen, depth + 1, out); } catch {}
  return out;
};
const full = (v: unknown) => { try { return `${ser(v)} | E[${errMsgs(v).join(";")}]`; } catch (x) { return `ser threw ${(x as Error).message}`; } };

export type Result = { verdict: string; ok: boolean; silent: string[]; lines: string[] };
export async function runCand(p: Cand): Promise<Result> {
  const v = p.ctl ? { ok: true, text: "CONTROL (checker skipped)" } : verdictOf(p.src, null, false);
  if (!v.ok) return { verdict: v.text, ok: false, silent: [], lines: [] };
  let checked: any;
  try { checked = checkSources({ cells: p.src, tsx: true, outside: [], foreign: null } as any); } catch {}
  if (p.ctl && checked) checked = { cells: checked.cells.map((c: any) => ({ ...c, status: "ok", errors: [] })) };
  const first = new Map<string, { obj: unknown; s: string; run: number }[]>();
  frames.length = 0;
  const fetchBody = p.fetchBody;
  const caps = fetchBody === undefined ? {} : { fetch: (async () => new Response(fetchBody)) as any };
  const lines: string[] = [];
  let prog: any;
  try {
    prog = runCells(p.src, { tsx: true, checked, caps, onChange: (r) => { if (r.status === "fulfilled") { follow(r.value); first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: full(r.value), run: r.evals }]); } } });
  } catch (x) { return { verdict: v.text, ok: true, silent: [], lines: [`run crash: ${(x as Error).message}`] }; }
  const pump = async () => { for (let i = 0; i < 12 && frames.length; i++) { for (const f of frames.splice(0)) f(); await prog.settle(400); } };
  const silent: string[] = [];
  try {
    await prog.settle(800);
    await pump();
    if (p.drive) { try { const d = await p.drive(prog); if (d !== undefined) lines.push(`drive -> ${typeof d === "string" ? d : ser(d)}`); } catch (x) { lines.push(`drive threw: ${(x as Error).message}`); } await prog.settle(800); await pump(); }
    // second baseline taken after promises resolved: a promise's snapshot at resolution vs. now
    const errored = new Set([...prog.recs.values()].filter((r: any) => r.status === "rejected").map((r: any) => r.name));
    for (const [n, vs] of first) vs.forEach((x, i) => {
      if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) return;
      const now = full(x.obj);
      // promise snapshots: what each followed promise resolved to, serialised again now
      const pl = promiseLines(x.obj);
      const pnow: string[] = [];
      const again = (v: unknown, seen = new Set<unknown>(), d = 0) => {
        if (d > 6 || v === null || (typeof v !== "object" && typeof v !== "function") || seen.has(v)) return; seen.add(v);
        if (v instanceof Promise) { const r = pv.get(v); if (r) { const s2 = r.err ? "REJ " + sser(r.v) : sser(r.v); if (s2 !== r.s) pnow.push(`promise ${r.s} -> ${s2}`); again(r.v, new Set(), d + 1); } return; }
        try { if (typeof v === "function") { again((v as () => unknown)(), seen, d + 1); return; } if (v instanceof Map) { for (const [a, b] of v) { again(a, seen, d + 1); again(b, seen, d + 1); } return; } if (v instanceof Set) { for (const a of v) again(a, seen, d + 1); return; } for (const k of Object.keys(v)) again((v as any)[k], seen, d + 1); } catch {}
      };
      again(x.obj);
      void pl;
      if (now === x.s && !pnow.length) return;
      const line = `${n} (value #${i + 1} of ${vs.length}): ${x.s} -> ${now}${pnow.length ? " " + pnow.join(" ") : ""}`;
      if (!errored.has(n)) silent.push(line);
      lines.push(`CHANGED ${line}${errored.has(n) ? " (cell in error)" : ""}`);
    });
    for (const n of p.twice ?? []) {
      // only values yielded by one run of the generator are compared (a rerun on a new input may differ)
      const all = first.get(n) ?? [];
      lines.push(`twice ${n}: ${all.map((x) => `#${x.run} ${x.s}`).join(" , ")}`);
      const runs = new Map<number, string[]>();
      for (const x of all) runs.set(x.run, [...(runs.get(x.run) ?? []), x.s]);
      for (const [k, vs] of runs) if (new Set(vs).size > 1 && !errored.has(n)) silent.push(`twice ${n} run ${k}: ${vs.join(" , ")}`);
    }
    for (const n of p.show ?? []) lines.push(`show ${n} = ${prog.status(n) === "rejected" ? "ERROR " + prog.error(n) : full(prog.value(n))}`);
    for (const r of prog.recs.values()) if (r.status === "pending") lines.push(`PENDING ${r.name}`);
    for (const r of prog.recs.values()) if (r.status === "rejected") lines.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error).slice(0, 200)}`);
  } finally { prog.dispose(); frames.length = 0; }
  return { verdict: v.text, ok: true, silent, lines };
}
