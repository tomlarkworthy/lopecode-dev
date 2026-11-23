// bun lite/infer/attack/run-sets.ts [--off] [--force] [--sets a,b] [--only s]: every attack program through the live
// checker (lite/core.ts), an accepted one run by observe.ts (runCells: the compiled cells' own text, events pumped).
// Sets: freeze (selfhost/freeze-attack b1-b7, 315), attack2 (252), attack1 (8), oldspec (49), oldvariants (239),
// runtime (98), new (b-attacks.ts, 70), h6 (h6-attacks.ts), freeze2 (selfhost/freeze-attack2 b0-b11, 309), h7
// (h7-attacks.ts), freeze3 (selfhost/freeze-attack3 b1-b11, 360; its c0 controls run without the checker and are counted
// apart: each must fire), h8 (h8-attacks.ts), h9 (h9-attacks.ts, attacks on rule set R), m1 (m1-attacks.ts: memo, [mut-nested], R-M; its m1-ctl controls are
// counted apart and must fire; a `memo` program is also compared with its memoStrip variant). The folders they come from are read, not edited.
// --off drops the static capture rules' diagnostics in this runner only (the checker is unchanged).
import { checkSources } from "../../core.ts";
import { rewriteSS } from "./strip-calls.ts";
import { observeProgram, type Prog } from "./observe.ts";
import type { Verdicts } from "../../browser/run.ts";
import { RUNTIME_FREEZE } from "./variants.ts";
import { readdirSync, readFileSync } from "node:fs";
import * as M1 from "./m1-attacks.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]!; };
const OFF = process.argv.includes("--off"), FORCE = process.argv.includes("--force"), ONLY = arg("--only");
const SETS = (arg("--sets") ?? "freeze,attack2,attack1,oldspec,oldvariants,runtime,new,h6,freeze2,h7,freeze3,h8,h9,m1").split(",");
export const OFF_RULES = new Set(["mut-capture", "let-capture", "mut-yield", "mut-await", "mut-cell", "member-write", "mutating-method", "regexp-state", "iterator-capture"]);
type P = Prog & { set: string; name: string; foreign?: string | null; ctl?: boolean };
const progs: P[] = [];
const SELF = new URL("../../../selfhost/", import.meta.url).pathname, H5 = new URL("../../soundscript/.scratch/holes5/", import.meta.url).pathname;
// the sets are loaded only when this file runs: freeze-attack3's harness imports verdictOf from here, and its batches
// import that harness, so loading them on import would be a cycle through top-level await
if (import.meta.main) {
if (SETS.includes("freeze")) for (const f of ["b1", "b2", "b3", "b4", "b5", "b6", "b7"])
  for (const a of (await import(`${SELF}freeze-attack/${f}.ts`)).attacks) progs.push({ set: "freeze", ...a, name: `${f}:${a.name}` });
if (SETS.includes("attack2")) for (const f of readdirSync(SELF + "mut-groups-attack2/").filter((f) => /^(b\d+|breaks)\.ts$/.test(f)))
  for (const a of (await import(`${SELF}mut-groups-attack2/${f}`)).attacks) progs.push({ set: "attack2", ...a, name: `${f}:${a.name}` });
if (SETS.includes("attack1")) for (const a of (await import(`${SELF}mut-groups-attack/breaks.ts`)).attacks) progs.push({ set: "attack1", ...a, name: `breaks:${a.name}` });
if (SETS.includes("oldspec")) {
  const ojs = readFileSync(H5 + "pre/old/lite/soundscript/spec.ojs", "utf8");
  const rows = ojs.split(/^\/\/ %%$/m).map((b) => b.trim()).filter((b) => /^spec_rejects_[45] = /.test(b)).flatMap((c) => new Function(`return (${c.slice(c.indexOf("=") + 1)});`)());
  rows.forEach((c: any, i: number) => { if (c && !c.shell) progs.push({ set: "oldspec", name: `${c.statement}#${i}[${c.rule}]`, src: c.source }); });
}
if (SETS.includes("oldvariants")) for (const v of (await import(H5 + "pre/variants.ts")).VARIANTS) if (!v.foreign) progs.push({ set: "oldvariants", name: `${v.name}[${v.rule}]`, src: v.src });
if (SETS.includes("runtime")) for (const v of RUNTIME_FREEZE) progs.push({ set: "runtime", name: v.name, src: v.src, show: v.show });
if (SETS.includes("new")) for (const a of (await import("./b-attacks.ts")).attacks) progs.push({ set: "new", ...a });
if (SETS.includes("h6")) for (const a of (await import("./h6-attacks.ts")).attacks) progs.push({ set: "h6", ...a });
if (SETS.includes("freeze2")) for (let i = 0; i <= 11; i++)
  for (const a of (await import(`${SELF}freeze-attack2/b${i}.ts`)).attacks) progs.push({ set: "freeze2", ...a, name: `b${i}:${a.name}` });
if (SETS.includes("h7")) for (const a of (await import("./h7-attacks.ts")).attacks) progs.push({ set: "h7", ...a });
if (SETS.includes("freeze3")) for (const f of ["c0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11"])
  for (const a of (await import(`${SELF}freeze-attack3/${f}.ts`)).cands) progs.push({ set: a.ctl ? "freeze3-controls" : "freeze3", ...a, name: `${f}:${a.name}` });
if (SETS.includes("h8")) for (const a of (await import("./h8-attacks.ts")).attacks) progs.push({ set: "h8", ...a });
if (SETS.includes("h9")) for (const a of (await import("./h9-attacks.ts")).attacks) progs.push({ set: "h9", ...a });
if (SETS.includes("m1")) for (const a of M1.attacks) progs.push({ set: a.ctl ? "m1-controls" : "m1", ...a });
}

// checked: the verdicts as runCells takes them (compile runs an island only on ok cells); under --off, a cell whose only
// errors are dropped rules counts as ok
export const verdictOf = (src: string, foreign: string | null, off: boolean, ctl = false): { ok: boolean; text: string; dropped: string[]; checked?: Verdicts } => {
  try {
    const r = checkSources({ cells: src, tsx: true, outside: [], foreign } as any);
    // --off also drops holes7's thenable [type] (md-value.ss.ts mdThenable), so the run-time ban is what is measured
    const offRule = (e: any) => OFF_RULES.has(e.rule) || (e.rule === "type" && /callable then/.test(e.msg ?? e.message ?? ""));
    const keep = (es: any[]) => es.filter((e) => !(off && offRule(e)));
    const okName = new Set<string>();
    for (const c of r.cells) if (!keep(c.errors).length && !c.unsupported.length && (c.status === "ok" || (off && c.status !== "unsupported"))) okName.add(c.name);
    const bad = r.cells.filter((c: any) => !okName.has(c.name) || (c.status === "blocked" && (c.blockedBy ?? []).some((b: string) => !okName.has(b))));
    const mod = keep(r.module);
    const dropped = off ? [...new Set([...r.module, ...r.cells.flatMap((c: any) => c.errors)].filter(offRule).map((e: any) => e.rule))] : [];
    const text = bad.length || mod.length ? `REJECT ${[...mod.map((m: any) => `module[${m.rule}]`), ...bad.map((c: any) => `${c.name}:${c.status}${keep(c.errors).map((e: any) => `[${e.rule}]`).join("")}`)].join(" ")}` : "ACCEPT";
    const checked = { cells: r.cells.map((c: any) => ({ name: c.name, status: ctl || okName.has(c.name) ? "ok" : c.status, errors: ctl || okName.has(c.name) ? [] : c.errors })) };
    if (ctl) return { ok: r.cells.length > 0, text: "CONTROL (checker skipped)", dropped: [], checked };
    return { ok: !bad.length && !mod.length && r.cells.length > 0, text, dropped, checked };
  } catch (x) { return { ok: false, text: `CRASH ${(x as Error).message}`, dropped: [] }; }
};

if (import.meta.main) {
  const tally: Record<string, { n: number; acc: number; silent: number; threw: number }> = {};
  const silentList: string[] = [];
  for (const p of progs) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    // a source too deep for the TypeScript parser (freeze3 deep-2000) is run as written
    let src = p.src;
    try { src = rewriteSS(p.src, true, p.name)?.out ?? p.src; } catch {}
    const t = (tally[p.set] ??= { n: 0, acc: 0, silent: 0, threw: 0 });
    t.n++;
    const v = verdictOf(src, p.foreign ?? null, OFF, !!p.ctl);
    if (v.ok) t.acc++;
    let lines: string[] = [];
    if ((v.ok || FORCE) && !p.foreign) {
      try {
        const r = await observeProgram({ ...p, src, checked: v.checked });
        lines = r.lines;
        // memo against memoStrip: the same cells read the same, unless a cell is in error in either run
        if (p.memo && v.ok && !r.threw) {
          const bare = M1.memoStrip(src), vb = verdictOf(bare, null, OFF, true), names = (v.checked?.cells ?? []).map((c) => c.name);
          const [x, y] = [await observeProgram({ src, checked: v.checked, show: names }), await observeProgram({ src: bare, checked: vb.checked, show: names })];
          const sh = (o: typeof x) => o.lines.filter((l) => l.startsWith("show "));
          if (!x.threw && !y.threw && sh(x).join("\n") !== sh(y).join("\n")) r.silent.push(`MEMO-DIFF ${sh(x).join(" ")} vs stripped ${sh(y).join(" ")}`);
          lines.push(...sh(x), ...sh(y).map((l) => `stripped ${l}`));
        }
        if (r.silent.length && v.ok) { t.silent++; silentList.push(`${p.set} ${p.name}${v.dropped.length ? ` (dropped ${v.dropped.join(", ")})` : ""}`); }
        if (r.threw && v.ok) t.threw++;
      } catch (x) { lines.push(`run crash: ${(x as Error).message}`); }
    }
    console.log(`== ${p.set} ${p.name}: ${v.text.slice(0, 200)}${v.dropped.length ? ` (dropped ${v.dropped.join(", ")})` : ""}`);
    for (const l of lines) console.log(`   ${l}`);
  }
  console.log(`-- mode rules ${OFF ? `OFF (${[...OFF_RULES].join(", ")} dropped)` : "ON"}${FORCE ? ", forced" : ""}`);
  let n = 0, s = 0;
  // a control is meant to change silently: it is counted as fired, not as silent
  for (const [k, t] of Object.entries(tally)) { if (k.endsWith("-controls")) { console.log(`-- ${k}: ${t.n}, fired ${t.silent}`); continue; } n += t.n; s += t.silent; console.log(`-- ${k}: ${t.n} programs, accepted ${t.acc}, silent ${t.silent}, with a cell in error ${t.threw}`); }
  console.log(`-- all: ${n} programs, silent ${s}`);
  for (const x of silentList) if (!x.includes("-controls ")) console.log(`SILENT ${x}`);
  process.exit(0);
}
