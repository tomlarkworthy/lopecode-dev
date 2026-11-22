// bun harness.ts <batch.ts> [--only name] [--why]: each candidate through the LIVE checker (../../lite/core.ts
// checkSources, as lite/infer/attack/live.test.ts calls it); an accepted one is run in ../../lite/browser/run.ts
// runCells (Observable Runtime + prelude.runtime.ts). A cell value serialised when fulfilled and again after settle;
// a difference on the same object is printed CHANGED. `show` cells print their final value.
import { checkSources } from "../../lite/core.ts";
import { runCells } from "../../lite/browser/run.ts";
import { writeFileSync } from "node:fs";

export type Attack = { name: string; src: string; show?: string[]; lent?: string[]; foreign?: string };

const ser = (v: unknown, seen = new Set<unknown>()): string => {
  if (typeof v === "function") return "fn";
  if (v === undefined) return "undefined";
  if (typeof v === "bigint") return `${v}n`;
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (seen.has(v)) return "<cycle>";
  seen.add(v);
  try {
    if (v instanceof Map) return `Map{${[...v].map(([k, x]) => `${ser(k, seen)}=>${ser(x, seen)}`).join(",")}}`;
    if (v instanceof Set) return `Set{${[...v].map((x) => ser(x, seen)).join(",")}}`;
    if (ArrayBuffer.isView(v)) return `${v.constructor.name}[${[...(v as any)].join(",")}]`;
    if (Array.isArray(v)) return `[${v.map((x) => ser(x, seen)).join(",")}]`;
    return `{${Object.keys(v).map((k) => `${k}:${ser((v as any)[k], seen)}`).join(",")}}`;
  } finally { seen.delete(v); }
};

export const check = (src: string, foreign: string | null = null, why = false) => {
  try {
    const r = checkSources({ cells: src, tsx: true, outside: [], foreign } as any);
    const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length);
    if (!bad.length && !r.module.length && r.cells.length) return "ACCEPT";
    return `REJECT ${[...r.module.map((m: any) => `module[${m.rule}]${why ? m.msg ?? "" : ""}`), ...bad.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}]${why ? " " + e.msg : ""}`).join("")}${c.unsupported.map((e: any) => `{${e.msg}}`).join("")}`)].join(" ")}`;
  } catch (x) { return `CRASH ${(x as Error).message}`; }
};

export async function runAttack(a: Attack, why = false) {
  const v = check(a.src, a.foreign ?? null, why);
  const out: string[] = [];
  let broke = false;
  if (v === "ACCEPT" && !a.foreign) {
    const first = new Map<string, { obj: unknown; s: string }[]>();
    let p: any;
    try {
      p = runCells(a.src, { tsx: true, onChange: (r) => { if (r.status === "fulfilled") first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: ser(r.value) }]); } });
      await p.settle(800);
      for (const [n, vs] of first) if (!(a.lent ?? []).includes(n)) vs.forEach((x, i) => {
        if (x.obj === null || typeof x.obj !== "object") return;
        const now = ser(x.obj);
        if (now !== x.s) { broke = true; out.push(`CHANGED ${n} (value #${i + 1} of ${vs.length}): ${x.s} -> ${now}`); }
      });
      for (const n of a.show ?? []) out.push(`show ${n} = ${p.status(n) === "rejected" ? "ERROR " + p.error(n) : ser(p.value(n))}`);
      for (const r of p.recs.values()) if (r.status === "rejected") out.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error)}`);
    } catch (x) { out.push(`run crash: ${(x as Error).message}`); }
    finally { try { p?.dispose(); } catch {} }
  }
  return { name: a.name, verdict: v, out, broke };
}

if (import.meta.main) {
  const file = process.argv[2]!;
  const oi = process.argv.indexOf("--only");
  const only = oi >= 0 ? process.argv[oi + 1] : null;
  const why = process.argv.includes("--why");
  const { attacks } = (await import(file)) as { attacks: Attack[] };
  const res = [];
  let acc = 0;
  for (const a of attacks) {
    if (only && !a.name.includes(only)) continue;
    const r = await runAttack(a, why);
    res.push(r);
    if (r.verdict === "ACCEPT") acc++;
    console.log(`== ${r.name}: ${r.verdict.slice(0, why ? 2000 : 220)}`);
    for (const l of r.out) console.log(`   ${l}`);
  }
  console.log(`-- ${res.length} candidates, ${acc} accepted`);
  writeFileSync(file.replace(/\.ts$/, "") + ".out.json", JSON.stringify(res, null, 1));
  process.exit(0);
}
