// bun selfhost/freeze-attack10/rt10.ts <set.ts>... [--only s]: each candidate checked by checkSources (with its
// outside cells and home), compiled by compileCell over contextFromCheck, and run in a real Observable Runtime with the
// runtime cells as ss_<name> inputs and the capabilities as ss_now/ss_random/ss_log/ss_fetch, as the notebook runs a
// compiled module (lite/stdlib/runtime.test.ts load()). Settling waits on setImmediate turns, no timer. A control
// (ctl) compiles every cell as accepted. Lines: values of `show`, the drive's line, and CHANGED when a value a cell gave
// reads differently at the end. Loud lines (error, define threw) are listed so class (d) rows are read by hand.
import { Runtime } from "@observablehq/runtime";
import * as T from "../../lite/toolchain/ss-toolchain.ts";
import * as ss from "../../lite/stdlib/runtime.ts";
import * as P from "../../prelude.runtime.ts";
import { checkSources } from "../../lite/core.ts";
import { scheduler } from "../../lite/browser/cells.ts";
import { ser } from "../../lite/infer/attack/observe.ts";
import { input } from "../../../../vendor/observable-stdlib/src/generators/input.js";

export type RCand = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown; ctl?: boolean; fetchBody?: string; home?: string;
  outside?: Record<string, [string[], (...a: any[]) => unknown]>; after?: Record<string, [string[], (...a: any[]) => unknown]> };
const frames: (() => void)[] = [];
scheduler.frame = (f) => void frames.push(f);
const late: string[] = [];
process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
const turn = () => new Promise((r) => setImmediate(r));

export const verdict = (c: RCand) => {
  const outsideList = Object.keys(c.outside ?? {}).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!c.outside?.[`viewof ${n}`] }));
  let r: any;
  try { r = checkSources({ cells: c.src, tsx: true, outside: outsideList, home: c.home ?? null } as any); } catch (x) { return { ok: false, text: `CRASH ${(x as Error).message}`, r: null, outsideList }; }
  const bad = r.cells.filter((x: any) => x.status !== "ok" || x.errors.length || x.unsupported.length);
  const text = bad.length || r.module.length ? `REJECT ${[...r.module.map((m: any) => `module[${m.rule}]`), ...bad.map((x: any) => `${x.name}:${x.status}${x.errors.map((e: any) => `[${e.rule}]`).join("")}${x.unsupported.length ? "{unsup}" : ""}`)].join(" ")}` : "ACCEPT";
  return { ok: !bad.length && !r.module.length && r.cells.length > 0, text, r, outsideList };
};

export async function runReal(c: RCand) {
  const v = verdict(c);
  const lines: string[] = [];
  if (!v.ok && !c.ctl) return { verdict: v.text, ok: false, lines, changed: [] as string[], loud: false };
  const texts = [...T.splitCells(c.src, true)];
  const ctx0 = v.r ? T.contextFromCheck(v.r, c.src, true) : T.contextOf(texts, true, null);
  const ctx = c.ctl ? { ...ctx0, accepted: new Set(texts.map((t) => ss.declaredName(t)!)), why: null } : ctx0;
  const runtime = new Runtime();
  const m = runtime.module();
  for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n], [], () => (ss as any)[n]);
  m.define("Generators", [], () => ({ input }));
  m.define("ss_now", [], () => () => 7);
  m.define("ss_random", [], () => () => 0.5);
  m.define("ss_log", [], () => (...a: unknown[]) => void lines.push(`log ${a.map(String).join(" ")}`));
  m.define("ss_fetch", [], () => async () => new Response(c.fetchBody ?? "body"));
  for (const [n, [ins, f]] of Object.entries(c.outside ?? {})) m.define(n, ins, f);
  const vals = new Map<string, { obj: unknown; s: string }[]>();
  const status = new Map<string, string>();
  const errs = new Map<string, string>();
  let loud = false;
  for (const t of texts) {
    let ds: T.Variable[];
    try { ds = T.compileCell(t, true, ctx, ss.declaredName(t)); } catch (x) { lines.push(`compile threw: ${(x as Error).message.slice(0, 200)}`); loud = true; continue; }
    for (const d of ds) {
      const ob = { pending: () => status.set(d.name, "pending"),
        fulfilled: (x: unknown) => { status.set(d.name, "fulfilled"); let s: string; try { s = ser(x); } catch (e) { s = `ser threw ${(e as Error).message}`; } vals.set(d.name, [...(vals.get(d.name) ?? []), { obj: x, s }]); },
        rejected: (e: unknown) => { status.set(d.name, "rejected"); errs.set(d.name, String((e as Error)?.message ?? e).slice(0, 200)); } };
      try { m.variable(ob).define(d.name, d.inputs, (0, eval)(`(${d.definition})`)); }
      catch (x) { lines.push(`define ${d.name} threw: ${(x as Error).message.slice(0, 200)}`); loud = true; }
    }
  }
  // plain JavaScript variables that read the SoundScript cells (cells of another language in the same module)
  for (const [n, [ins, f]] of Object.entries(c.after ?? {})) {
    m.variable({ pending: () => status.set(n, "pending"), fulfilled: (x: unknown) => { status.set(n, "fulfilled"); vals.set(n, [...(vals.get(n) ?? []), { obj: x, s: ser(x) }]); }, rejected: (e: unknown) => { status.set(n, "rejected"); errs.set(n, String((e as Error)?.message ?? e).slice(0, 200)); } }).define(n, ins, f);
  }
  const rt = runtime as any;
  const settle = async () => {
    let stable = 0;
    for (let i = 0; i < 20000 && stable < 30; i++) {
      await turn();
      for (const f of frames.splice(0)) f();
      const busy = rt._computing || [...status.values()].some((s) => s === "pending") || !P.idle();
      stable = busy ? 0 : stable + 1;
    }
  };
  const p = {
    value: (n: string) => vals.get(n)?.at(-1)?.obj, values: (n: string) => (vals.get(n) ?? []).map((x) => x.obj),
    status: (n: string) => status.get(n), error: (n: string) => errs.get(n), settle, lines,
  };
  try {
    await settle();
    if (c.drive) { try { const d = await c.drive(p); if (d !== undefined) lines.push(`drive -> ${typeof d === "string" ? d : ser(d)}`); } catch (x) { lines.push(`drive threw: ${(x as Error).message}`); } await settle(); }
    const changed: string[] = [];
    for (const [n, xs] of vals) xs.forEach((x, i) => {
      if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) return;
      let now: string; try { now = ser(x.obj); } catch (e) { now = `ser threw ${(e as Error).message}`; }
      if (now !== x.s && status.get(n) !== "rejected") changed.push(`${n} (value #${i + 1}): ${x.s.slice(0, 120)} -> ${now.slice(0, 120)}`);
    });
    for (const n of c.show ?? []) lines.push(`show ${n} = ${status.get(n) === "rejected" ? "ERROR " + errs.get(n) : status.get(n) === undefined ? "UNDEFINED VARIABLE" : ser(p.value(n)).slice(0, 200)}`);
    for (const [n, e] of errs) if (status.get(n) === "rejected") { lines.push(`error ${n}: ${e}`); if (!n.startsWith("ss_")) loud = true; }
    for (const [n, s] of status) if (s === "pending") lines.push(`PENDING ${n}`);
    return { verdict: v.text, ok: true, lines, changed, loud };
  } finally { rt.dispose(); frames.length = 0; }
}

if (import.meta.main) {
  const ONLY = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1]!; })();
  let n = 0, acc = 0, sil = 0, ctl = 0, ctlFired = 0, loudAcc = 0;
  const silent: string[] = [], louds: string[] = [];
  for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
    const { cands } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
    for (const c of cands as RCand[]) {
      if (ONLY && !c.name.includes(ONLY)) continue;
      late.length = 0;
      if (c.ctl) ctl++; else n++;
      let r;
      try { r = await runReal(c); } catch (x) { console.log(`== ${c.name}: runner crash ${(x as Error).message}`); continue; }
      console.log(`== ${f}:${c.name}${c.ctl ? " [ctl]" : ""}: ${r.verdict.slice(0, 300)}`);
      for (const l of r.lines) console.log(`   ${l}`);
      for (const l of r.changed) console.log(`   CHANGED ${l}`);
      if (late.length) console.log(`   late throws: ${late.join(" | ")}`);
      if (!r.ok) continue;
      const fired = r.changed.length > 0 || r.lines.some((l) => l.startsWith("drive -> ") && l.includes("DIFF"));
      if (c.ctl) { if (fired) ctlFired++; console.log(`   CONTROL ${fired ? "FIRED" : "DID NOT FIRE"}`); continue; }
      acc++;
      if (fired) { sil++; silent.push(`${f}:${c.name}`); console.log("   SILENT"); }
      else if (r.loud || late.length) { loudAcc++; louds.push(`${f}:${c.name}`); console.log("   LOUD (read by hand)"); }
    }
  }
  console.log(`-- controls ${ctl}, fired ${ctlFired}`);
  console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil}, accepted-and-loud ${loudAcc}`);
  for (const s of silent) console.log(`SILENT ${s}`);
  for (const s of louds) console.log(`LOUD ${s}`);
  process.exit(0);
}
