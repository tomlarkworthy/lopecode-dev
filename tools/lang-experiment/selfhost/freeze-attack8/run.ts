// bun run.ts <set.ts>... [--only s]: each program of each set (exports `cands`, freeze-attack3 harness Cand plus
// base?: a source whose verdict is also recorded, skip?: false to skip the checker-skipped run, chkOnly?: true) run
//   chk : the checker's verdict (rules on, run-sets verdictOf); when accepted, a run with the checker's verdicts
//   skip: a run with the checker skipped (every cell compiled and run as accepted; freeze-attack3 runCand ctl)
// Mode (registration on/off, S4.12 on/off) is the process environment (SS_MEASURE_REG, SS_MEASURE_BODYFN), set by runall.sh.
// Silent: a harness CHANGED line, a drive line containing DIFF, or a publishTap TAP line (as drive-run.ts).
// Each run's outcome is also classed by the first throw message it shows (S4.12, frozen write, dead zone, other).
import { runCand } from "../freeze-attack3/harness.ts";
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
import { tapStart } from "../../lite/infer/attack/observe.ts";
const late: string[] = [];
process.on("unhandledRejection", (e: any) => { late.push(String(e?.message ?? e).slice(0, 140)); });
process.on("uncaughtException", (e: any) => { late.push("uncaught " + String(e?.message ?? e).slice(0, 140)); });
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1]!; })();
const MODE = `REG=${process.env.SS_MEASURE_REG ?? "1"} BODYFN=${process.env.SS_MEASURE_BODYFN ?? "on"}`;
export const klass = (lines: string[]): string => {
  const t = lines.join("\n");
  if (/no finished cell has published|\(S4\.12\)/.test(t)) return "S4.12";
  if (/before a binding it captures is initialised/.test(t)) return "dead-zone";
  if (/readonly property|frozen|not extensible|read-only|Cannot assign|Cannot add property|object is not extensible/i.test(t)) return "frozen-write";
  if (/threw|error |throws/.test(t)) return "other-throw";
  return "none";
};
const runOne = async (p: any, ctl: boolean) => {
  late.length = 0;
  const stop = tapStart();
  let r: any, tap: string[] = [];
  try { r = await runCand({ ...p, ctl }); } catch (x) { return { crash: (x as Error).message, lines: [] as string[], silent: false, cls: "crash" }; } finally { tap = stop(); }
  const lines = [...r.lines, ...tap.map((l) => `TAP ${l}`), ...(late.length ? [`late throws: ${late.join(" | ")}`] : [])];
  const silent = r.ok && (r.silent.length > 0 || r.lines.some((l: string) => l.startsWith("drive -> ") && l.includes("DIFF")) || tap.length > 0);
  return { crash: null, lines, silent, cls: klass(lines), ok: r.ok };
};
const rows: any[] = [];
for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
  const { cands } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
  for (const p of cands) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    const v = verdictOf(p.src, null, false);
    const bv = p.base ? verdictOf(p.base, null, false) : null;
    console.log(`== ${f}:${p.name}${p.ctl ? " [ctl]" : ""} [${MODE}]`);
    console.log(`   verdict: ${v.text.slice(0, 260)}`);
    if (bv) console.log(`   base verdict: ${bv.text.slice(0, 200)}`);
    const row: any = { set: f.replace(/\.ts$/, ""), name: p.name, ctl: !!p.ctl, acc: v.ok, base: bv ? bv.ok : null, chk: null, skip: null };
    if (v.ok && !p.ctl) {
      const o = await runOne(p, false);
      row.chk = { silent: o.silent, cls: o.cls, crash: o.crash };
      for (const l of o.lines) console.log(`   chk  ${l}`);
      if (o.crash) console.log(`   chk  HARNESS CRASH ${o.crash}`);
      console.log(`   chk  => ${o.silent ? "SILENT" : "not silent"} (${o.cls})`);
    }
    if (p.skip !== false && !p.chkOnly) {
      const o = await runOne(p, true);
      row.skip = { silent: o.silent, cls: o.cls, crash: o.crash };
      for (const l of o.lines) console.log(`   skip ${l}`);
      if (o.crash) console.log(`   skip HARNESS CRASH ${o.crash}`);
      console.log(`   skip => ${o.silent ? "SILENT" : "not silent"} (${o.cls})`);
    }
    rows.push(row);
  }
}
for (const r of rows) console.log(`ROW ${JSON.stringify(r)}`);
process.exit(0);
