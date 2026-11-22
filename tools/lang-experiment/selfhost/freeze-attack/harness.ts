// bun harness.ts <batch.ts> [--only s] [--why] [--all]: each candidate through the LIVE checker (lite/core.ts
// checkSources, as live.test.ts calls it); an accepted one is run in run-skip.ts runCellsSkip (runCells with the
// tc-build quick path: a plain sync cell with no async/generator function publishes out(v, 1)). Mode = SS_FREEZE_ALL
// in the environment (unset: skip mode). Every value a cell was fulfilled with is serialised then and after settle
// (and after drive); a function is read by calling it with no arguments. CHANGED on a cell not in error = SILENT.
import { checkSources } from "../../lite/core.ts";
import { runCellsSkip } from "./run-skip.ts";
import { writeFileSync } from "node:fs";
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
// the cells tc-build compiles to out(v, 1): the real quick set
export const quickSet = (src: string): Set<string> | undefined => {
  try { return new Set(compileModule(src, true).filter((v) => /\), 1\)/.test(v.definition)).map((v) => v.name)); } catch { return undefined; }
};

export type Attack = { name: string; src: string; show?: string[]; lent?: string[]; drive?: (p: any) => unknown };

export const ser = (v: unknown, seen = new Set<unknown>()): string => {
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
    if (v instanceof Error) return `Error(${v.name}:${v.message}${Object.keys(v).map((k) => `,${k}=${ser((v as any)[k], seen)}`).join("")})`;
    if (v instanceof ArrayBuffer) return `AB[${[...new Uint8Array(v)].join(",")}]`;
    if (v instanceof DataView) return `DV[${[...new Uint8Array(v.buffer)].join(",")}]`;
    if (v instanceof Promise) return "Promise";
    if (v instanceof Map) return `Map{${[...v].map(([k, x]) => `${ser(k, seen)}=>${ser(x, seen)}`).join(",")}}`;
    if (v instanceof Set) return `Set{${[...v].map((x) => ser(x, seen)).join(",")}}`;
    if (ArrayBuffer.isView(v)) return `${v.constructor.name}[${[...(v as any)].join(",")}]`;
    if (Array.isArray(v)) return `[${v.map((x) => ser(x, seen)).join(",")}]`;
    return `{${Object.keys(v).map((k) => `${k}:${ser((v as any)[k], seen)}`).join(",")}}`;
  } finally { seen.delete(v); }
};

export const check = (src: string, why = false) => {
  try {
    const r = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as any);
    const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length);
    if (!bad.length && !r.module.length && r.cells.length) return "ACCEPT";
    return `REJECT ${[...r.module.map((m: any) => `module[${m.rule}]${why ? m.msg ?? "" : ""}`), ...bad.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}]${why ? " " + e.msg : ""}`).join("")}${(c.unsupported ?? []).map((e: any) => `{${e.msg}}`).join("")}`)].join(" ")}`;
  } catch (x) { return `CRASH ${(x as Error).message}`; }
};

export async function runAttack(a: Attack, why = false, force = false) {
  const v = check(a.src, why);
  const out: string[] = [];
  let silent = false, threw = false;
  if (v === "ACCEPT" || force) {
    const first = new Map<string, { obj: unknown; s: string }[]>();
    let p: any;
    try {
      const q = quickSet(a.src); if (!q) out.push("(quick set: compile failed, text approximation used)"); else out.push(`quick: ${[...q].join(",")}`);
      p = runCellsSkip(a.src, { quick: q, tsx: true, onChange: (r) => { if (r.status === "fulfilled") first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: ser(r.value) }]); } });
      await p.settle(800);
      if (a.drive) { try { const d = await a.drive(p); if (d !== undefined) out.push(`drive -> ${typeof d === "string" ? d : ser(d)}`); } catch (x) { out.push(`drive threw: ${(x as Error).message}`); } await p.settle(800); }
      await new Promise((r) => setTimeout(r, 30));
      const errored = new Set([...p.recs.values()].filter((r: any) => r.status === "rejected").map((r: any) => r.name));
      threw = errored.size > 0;
      for (const [n, vs] of first) if (!(a.lent ?? []).includes(n)) vs.forEach((x, i) => {
        if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) return;
        const now = ser(x.obj);
        if (now !== x.s) { if (!errored.has(n)) silent = true; out.push(`CHANGED ${n} (value #${i + 1} of ${vs.length}): ${x.s} -> ${now}${errored.has(n) ? " (cell in error)" : ""}`); }
      });
      for (const n of a.show ?? []) out.push(`show ${n} = ${p.status(n) === "rejected" ? "ERROR " + p.error(n) : ser(p.value(n))}`);
      for (const r of p.recs.values()) if (r.status === "rejected") out.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error).slice(0, 160)}`);
    } catch (x) { out.push(`run crash: ${(x as Error).message}`); }
    finally { try { p?.dispose(); } catch {} }
  }
  return { name: a.name, verdict: v, out, silent: silent && v === "ACCEPT", threw };
}

if (import.meta.main) {
  const files = process.argv.slice(2).filter((x) => x.endsWith(".ts"));
  const oi = process.argv.indexOf("--only");
  const only = oi >= 0 ? process.argv[oi + 1] : null;
  const why = process.argv.includes("--why"), force = process.argv.includes("--force");
  const mode = process.env.SS_FREEZE_ALL === "1" ? "all" : "skip";
  let n = 0, acc = 0, sil = 0;
  const silentNames: string[] = [];
  for (const file of files) {
    const { attacks } = (await import(new URL(file, `file://${process.cwd()}/`).pathname)) as { attacks: Attack[] };
    const res = [];
    for (const a of attacks) {
      if (only && !a.name.includes(only)) continue;
      const r = await runAttack(a, why, force);
      res.push(r); n++;
      if (r.verdict === "ACCEPT") acc++;
      if (r.silent) { sil++; silentNames.push(`${file}:${r.name}`); }
      console.log(`== ${r.name}: ${r.verdict.slice(0, why ? 2000 : 240)}`);
      for (const l of r.out) console.log(`   ${l}`);
    }
    writeFileSync(file.replace(/\.ts$/, "") + `.${mode}.out.json`, JSON.stringify(res, null, 1));
  }
  console.log(`-- mode ${mode}: ${n} candidates, ${acc} accepted, ${sil} silent`);
  for (const s of silentNames) console.log(`SILENT ${s}`);
  process.exit(0);
}
