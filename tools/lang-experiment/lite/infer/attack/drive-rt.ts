// bun lite/infer/attack/drive-rt.ts <set.ts>... [--only s] (t1, 2026-11-24): drive-run.ts's candidates, lines and silent
// rule, run as the main notebook runs a SoundScript module: each cell compiled by the toolchain (compileCell over
// contextFromCheck) and defined in a real Observable Runtime, the runtime cells as ss_<name> inputs (selfhost/
// freeze-attack10/rt10.ts, lite/stdlib/runtime.test.ts load()). observeCompiled is observe.ts observeProgram's
// counterpart (the same readings, tap, drive and twice rules); run-sets.ts --rt runs every set through it.
// Capabilities as the notebook defines them (core.ojs, stdlib/build.ts): ss_now performance.now, ss_random Math.random,
// ss_log (collected in logs), ss_fetch (a Response of fetchBody, or the global), ss_compile stdlib compiler() over the
// program's source, ss_pool browser/workers.ts pagePool (bun's Worker); actions named after their cell (core.ojs actionNamer).
// Definitions are evaluated in strict mode, as realize() (runtime-sdk) evaluates them in a module script. Not provided: the editor, the page's own
// module (a variable of another notebook module), Observable's stdlib beyond Generators.input.
// Settling waits on setImmediate turns (the Runtime's own frame under bun), no timer; frames are pumped as observe.ts does.
import { Runtime } from "@observablehq/runtime";
import * as T from "../../toolchain/ss-toolchain.ts";
import * as ss from "../../stdlib/runtime.ts";
import * as P from "../../../prelude.runtime.ts";
import { scheduler } from "../../browser/cells.ts";
import { pagePool } from "../../browser/workers.ts";
import { checkSources } from "../../core.ts";
import { ser, follow, promiseChanges, tapStart, type Prog, type Observed } from "./observe.ts";
import type { Rec, Verdicts } from "../../browser/run.ts";
import { input } from "../../../../../vendor/observable-stdlib/src/generators/input.js";

type Defs = Record<string, [string[], (...a: any[]) => unknown]>;
export type RtProg = Prog & { ctl?: boolean; outside?: Defs; after?: Defs; home?: string };
const frames: (() => void)[] = [];
const toFrames = (f: () => void) => void frames.push(f);
let programs = 0;
const turn = () => new Promise<void>((r) => setImmediate(r));
// a state cell's handle is `viewof x` here and `x$ref` in runCells: one name in every line
const shown = (n: string) => (n.startsWith("viewof ") ? `${n.slice(7)}$ref` : n);

export async function observeCompiled(p: RtProg & { checked?: Verdicts }, nFrames = 12): Promise<Observed> {
  frames.length = 0;
  scheduler.frame = toFrames;
  const texts = [...T.splitCells(p.src, true)];
  const ctx0 = p.checked && (p.checked as { facts?: unknown }).facts ? T.contextFromCheck(p.checked as never) : T.contextOf(texts, true, null);
  // a module name per program: events and listener handles are kept per module and cell name (browser/cells.ts)
  const ctx = { ...ctx0, module: `drive-rt-${++programs}` };
  const runtime = new Runtime();
  const m = runtime.module();
  const logs: string[] = [];
  for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n]!, [], () => (ss as any)[n]);
  m.define("Generators", [], () => ({ input }));
  m.define("ss_now", [], () => () => performance.now());
  m.define("ss_random", [], () => Math.random);
  m.define("ss_log", [], () => (...a: unknown[]) => void logs.push(a.map(String).join(" ")));
  const fv = p.fetchValue;
  const fetchCap = fv !== undefined ? async () => ({ ok: true, status: 200, json: async () => fv(), text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) })
    : p.fetchBody === undefined ? globalThis.fetch.bind(globalThis) : async () => new Response(p.fetchBody);
  m.define("ss_fetch", [], () => fetchCap);
  m.define("ss_compile", [], () => ss.compiler(() => p.src));
  m.define("ss_pool", [], () => pagePool());
  for (const [n, [ins, f]] of Object.entries(p.outside ?? {})) m.define(n, ins, f);
  const first = new Map<string, { obj: unknown; s: string; run: number }[]>();
  const recs = new Map<string, Rec>();
  const lines: string[] = [];
  const observer = (name: string) => {
    const n = shown(name);
    const rec: Rec = { name: n, status: "pending", evals: 0 };
    if (!name.startsWith("viewof ")) recs.set(n, rec);
    return {
      pending() { rec.status = "pending"; rec.evals++; },
      fulfilled(v: unknown) { rec.status = "fulfilled"; rec.value = v; rec.error = undefined; follow(v); first.set(n, [...(first.get(n) ?? []), { obj: v, s: ser(v), run: rec.evals }]); },
      rejected(e: unknown) { rec.status = "rejected"; rec.error = e; rec.value = undefined; },
    };
  };
  // an action is named after the cell whose value it is, as core.ojs sets soundscript.actionNamer.of from the runtime
  P.actionNamer.of = (a) => { for (const r of recs.values()) if (r.value === a) return r.name; return null; };
  let tapStop: (() => string[]) | null = tapStart();
  const rt = runtime as unknown as { _computing: Promise<void> | null; dispose(): void };
  const settle = async () => {
    let stable = 0;
    for (let i = 0; i < 20000 && stable < 30; i++) {
      await turn();
      const busy = rt._computing || [...recs.values()].some((r) => r.status === "pending") || !P.idle();
      stable = busy ? 0 : stable + 1;
    }
  };
  const pump = async () => { for (let i = 0; i < nFrames && frames.length; i++) { for (const f of frames.splice(0)) f(); await settle(); } };
  try {
    for (const t of texts) {
      let ds: T.Variable[];
      try { ds = T.compileCell(t, true, ctx, ss.declaredName(t)); } catch (x) { lines.push(`compile threw: ${String((x as Error)?.message ?? x).slice(0, 160)}`); continue; }
      for (const d of ds) {
        try { m.variable(observer(d.name)).define(d.name, d.inputs, (0, eval)(`"use strict"; (${d.definition})`)); }
        catch (x) { lines.push(`define ${d.name} threw: ${String((x as Error)?.message ?? x).slice(0, 160)}`); }
      }
    }
    // plain JavaScript variables that read the SoundScript cells (cells of another language in the same module)
    for (const [n, [ins, f]] of Object.entries(p.after ?? {})) m.variable(observer(n)).define(n, ins, f);
    const prog = {
      recs, logs, settle, lines,
      value: (n: string) => recs.get(n)?.value, values: (n: string) => (first.get(n) ?? []).map((x) => x.obj),
      status: (n: string) => recs.get(n)?.status,
      error: (n: string) => { const e = recs.get(n)?.error; return e === undefined ? undefined : String((e as Error)?.message ?? e); },
      evals: (n: string) => recs.get(n)?.evals ?? 0,
      dispose: () => {},
    };
    await settle();
    await pump();
    if (p.drive) { try { const d = await p.drive(prog); if (d !== undefined) lines.push(`drive -> ${typeof d === "string" ? d : ser(d)}`); } catch (x) { lines.push(`drive threw: ${(x as Error).message}`); } await settle(); await pump(); }
    const errored = new Set([...recs.values()].filter((r) => r.status === "rejected").map((r) => r.name));
    const silent: string[] = [], changed: string[] = [];
    const note = (n: string, line: string) => {
      changed.push(line);
      if (!errored.has(n)) silent.push(line);
      lines.push(`CHANGED ${line}${errored.has(n) ? " (cell in error)" : ""}`);
    };
    for (const [n, vs] of first) if (!(p.lent ?? []).includes(n)) vs.forEach((x, i) => {
      if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) return;
      let now: string; try { now = ser(x.obj); } catch (e) { now = `ser threw ${(e as Error).message}`; }
      const pc = promiseChanges(x.obj);
      if (now !== x.s || pc.length) note(n, `${n} (value #${i + 1} of ${vs.length}): ${x.s} -> ${now}${pc.length ? ` ${pc.join(" ")}` : ""}`);
    });
    for (const n of p.twice ?? []) {
      const runs = new Map<number, string[]>();
      for (const x of first.get(n) ?? []) runs.set(x.run, [...(runs.get(x.run) ?? []), x.s]);
      for (const [k, vs] of runs) if (new Set(vs).size > 1) note(n, `twice ${n} run ${k}: ${vs.join(" , ")}`);
    }
    for (const l of lines) if (l.startsWith("drive -> ") && l.includes("DIFF")) { silent.push(l); lines.push(`CHANGED ${l}`); break; }
    for (const l of tapStop()) { silent.push(`published ${l}`); lines.push(`CHANGED published ${l}`); }
    tapStop = null;
    for (const n of p.show ?? []) lines.push(`show ${n} = ${prog.status(n) === "rejected" ? "ERROR " + prog.error(n) : ser(prog.value(n))}`);
    for (const r of recs.values()) if (r.status === "rejected") lines.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error).slice(0, 160)}`);
    for (const r of recs.values()) if (r.status === "pending") lines.push(`PENDING ${r.name}`);
    return { silent, changed, threw: errored.size > 0, lines };
  } finally { if (tapStop !== null) tapStop(); P.actionNamer.of = null; rt.dispose(); frames.length = 0; }
}

// what the differential compares (t1 1b): the silent verdict, the show and drive lines, which cells are in error, and
// (apart) the error messages; each difference named
export const differences = (a: Observed, b: Observed): { what: string[]; msgOnly: boolean } => {
  const pick = (o: Observed, pre: string) => o.lines.filter((l) => l.startsWith(pre)).sort().join("\n");
  const errCells = (o: Observed) => o.lines.filter((l) => l.startsWith("error ")).map((l) => l.slice(6, l.indexOf(":"))).sort().join(",");
  const what: string[] = [];
  if ((a.silent.length > 0) !== (b.silent.length > 0)) what.push(`silent ${a.silent.length > 0} vs ${b.silent.length > 0}`);
  if (pick(a, "show ") !== pick(b, "show ")) what.push("show");
  if (pick(a, "drive -> ") !== pick(b, "drive -> ")) what.push("drive");
  if (errCells(a) !== errCells(b)) what.push(`cells in error [${errCells(a)}] vs [${errCells(b)}]`);
  if (pick(a, "PENDING ") !== pick(b, "PENDING ")) what.push("pending");
  if (pick(a, "run crash") !== pick(b, "run crash")) what.push("run crash");
  if (pick(a, "compile threw") + pick(a, "define ") !== pick(b, "compile threw") + pick(b, "define ")) what.push("compile or define threw");
  const msg = pick(a, "error ") !== pick(b, "error ");
  return { what: what.length || !msg ? what : ["error message"], msgOnly: !what.length && msg };
};

// the verdict as run-sets.ts verdictOf gives it, with the candidate's outside cells and home (rt10)
export const verdictRt = (c: RtProg & { name?: string }) => {
  const outside = Object.keys(c.outside ?? {}).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!c.outside?.[`viewof ${n}`] }));
  let r: any;
  try { r = checkSources({ cells: c.src, tsx: true, outside, foreign: null, home: c.home ?? null } as never); } catch (x) { return { ok: false, text: `CRASH ${(x as Error).message}`, checked: undefined }; }
  const bad = r.cells.filter((x: any) => x.status !== "ok" || x.errors.length || x.unsupported.length);
  const text = bad.length || r.module.length ? `REJECT ${[...r.module.map((e: any) => `module[${e.rule}]`), ...bad.map((x: any) => `${x.name}:${x.status}${x.errors.map((e: any) => `[${e.rule}]`).join("")}`)].join(" ")}` : "ACCEPT";
  const checked = { cells: r.cells.map((x: any) => ({ name: x.name, status: c.ctl ? "ok" : x.status, errors: c.ctl ? [] : x.errors })), facts: r.facts };
  if (c.ctl) return { ok: r.cells.length > 0, text: "CONTROL (checker skipped)", checked };
  return { ok: !bad.length && !r.module.length && r.cells.length > 0, text, checked };
};

if (import.meta.main) {
  const late: string[] = [];
  process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
  process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
  const ONLY = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1]!; })();
  // --both: each accepted candidate also run by runCells (observe.ts), and a DIFFER line where the two differ
  const BOTH = process.argv.includes("--both");
  const { observeProgram } = BOTH ? await import("./observe.ts") : { observeProgram: null };
  let differ = 0;
  let n = 0, acc = 0, sil = 0, ctl = 0, ctlFired = 0, ctlAcc = 0, crash = 0;
  const silent: string[] = [];
  for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
    const mod = await import(new URL(f, `file://${process.cwd()}/`).pathname);
    for (const c of (mod.cands ?? mod.attacks) as (RtProg & { name: string })[]) {
      if (ONLY && !c.name.includes(ONLY)) continue;
      late.length = 0;
      if (c.ctl) ctl++; else n++;
      const v = verdictRt(c);
      let r: Observed | null = null;
      // --both: every cell's value is shown by both runners, so a value that differs with no error is a difference
      const show = BOTH ? [...new Set([...(c.show ?? []), ...(v.checked?.cells ?? []).map((x: { name: string }) => x.name), ...Object.keys(c.after ?? {})])] : c.show;
      const crashed = (x: unknown) => ({ silent: [], changed: [], threw: true, lines: [`run crash: ${(x as Error)?.message ?? x}`] });
      const rtRun = async () => { try { return await observeCompiled({ ...c, show, checked: v.checked }); } catch (x) { if (!BOTH) throw x; return crashed(x); } };
      if (v.ok) { try { r = await rtRun(); } catch (x) { crash++; console.log(`== ${f}:${c.name}: harness crash ${(x as Error).message}`); continue; } }
      console.log(`== ${f}:${c.name}${c.ctl ? " [ctl]" : ""}: ${v.text.slice(0, 300)}`);
      for (const l of r?.lines ?? []) console.log(`   ${l}`);
      if (late.length) console.log(`   late throws: ${late.join(" | ")}`);
      if (!r) continue;
      if (BOTH && observeProgram) {
        const q = async () => { try { return await observeProgram({ ...c, show, checked: v.checked }); } catch (x) { return crashed(x); } };
        const a = await q(), d = differences(a, r);
        if (d.what.length) {
          const nd = differences(a, await q()).what.length > 0 ? "runCells" : differences(r, await rtRun()).what.length > 0 ? "compiled" : null;
          differ++;
          console.log(`   DIFFER ${d.what.join("; ")}${nd ? ` (${nd} differs from itself: not deterministic)` : ""}`);
          for (const l of a.lines) console.log(`   runCells| ${l}`);
        }
      }
      const fired = r.silent.length > 0;
      if (c.ctl) { ctlAcc++; if (fired) ctlFired++; console.log(`   CONTROL ${fired ? "FIRED" : "DID NOT FIRE"}`); continue; }
      acc++;
      if (fired) { sil++; silent.push(`${f}:${c.name}`); console.log("   SILENT"); }
    }
  }
  console.log(`-- controls ${ctl}, ran ${ctlAcc}, fired ${ctlFired}`);
  console.log(`-- harness crashes ${crash}`);
  if (BOTH) console.log(`-- differ ${differ}`);
  console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil}`);
  for (const s of silent) console.log(`SILENT ${s}`);
  process.exit(0);
}
