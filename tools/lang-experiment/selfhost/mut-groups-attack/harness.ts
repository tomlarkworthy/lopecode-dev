// bun harness.ts <attacks.ts> [--only name]: each attack's source through the base, proto and refac checkers, then,
// when any tree accepts every cell, run in base/lite/browser/run.ts runCells (the Observable Runtime with the prelude's
// mut/freeze). A cell's value is serialised when the runtime first fulfils it and again after settle; a difference
// is a value a checked cell produced that changed (lent: generator cells that yield borrow(...), whose value is
// meant to change). An attack may also name cells whose value is its own evidence.
import { runCells } from "../mut-groups/base/lite/browser/run.ts";
import { writeFileSync } from "node:fs";

const trees = ["base", "proto", "refac"] as const;
const checkers = Object.fromEntries(await Promise.all(trees.map(async (t) => [t, (await import(`../mut-groups/${t}/lite/core.ts`)).checkSources])));

export type Attack = { name: string; family: string; src: string; show?: string[]; lent?: string[]; drive?: (p: any) => Promise<void> | void };

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
    if (v instanceof EventTarget) return "EventTarget";
    return `{${Object.keys(v).map((k) => `${k}:${ser((v as any)[k], seen)}`).join(",")}}`;
  } finally { seen.delete(v); }
};

export async function runAttack(a: Attack) {
  const verdicts: Record<string, string> = {};
  for (const t of trees) {
    try {
      const r = checkers[t]({ cells: a.src, tsx: true, outside: [] });
      const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length);
      const mod = r.module.map((m: any) => `module[${m.rule}]`);
      verdicts[t] = bad.length || mod.length || !r.cells.length
        ? `REJECT ${[...mod, ...bad.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}]`).join("")}${c.unsupported.map((e: any) => `{${e.msg}}`).join("")}`)].join(" ")}`
        : "ACCEPT";
    } catch (x) { verdicts[t] = `CRASH ${(x as Error).message}`; }
  }
  const out: string[] = [];
  let broke = false;
  if (Object.values(verdicts).some((v) => v === "ACCEPT")) {
    // per cell: every value object the runtime fulfilled it with, and its serialisation at that moment
    const first = new Map<string, { obj: unknown; s: string }[]>();
    let p: any;
    try {
      p = runCells(a.src, { tsx: true, onChange: (r) => { if (r.status === "fulfilled") first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: ser(r.value) }]); } });
      await p.settle(1500);
      if (a.drive) { await a.drive(p); await p.settle(1500); }
      // the same object, serialised again: a change is a value a checked cell produced that changed after it was produced
      for (const [n, vs] of first) if (!(a.lent ?? []).includes(n)) vs.forEach((v, i) => {
        if (v.obj === null || typeof v.obj !== "object") return;
        const now = ser(v.obj);
        if (now !== v.s) { broke = true; out.push(`CHANGED ${n} (value #${i + 1} of ${vs.length}, same object): ${v.s}  ->  ${now}`); }
      });
      for (const n of a.show ?? []) out.push(`show ${n} = ${p.status(n) === "rejected" ? "ERROR " + p.error(n) : ser(p.value(n))}`);
      for (const r of p.recs.values()) if (r.status === "rejected") out.push(`error ${r.name}: ${String((r.error as Error)?.message ?? r.error)}`);
    } catch (x) { out.push(`run crash: ${(x as Error).message}`); }
    finally { try { p?.dispose(); } catch {} }
  }
  return { name: a.name, family: a.family, verdicts, out, broke };
}

if (import.meta.main) {
  const file = process.argv[2]!;
  const only = process.argv.indexOf("--only") >= 0 ? process.argv[process.argv.indexOf("--only") + 1] : null;
  const { attacks } = (await import(file)) as { attacks: Attack[] };
  const res = [];
  for (const a of attacks) {
    if (only && !a.name.includes(only)) continue;
    const r = await runAttack(a);
    res.push(r);
    console.log(`== ${r.name} [${r.family}]`);
    for (const t of trees) console.log(`   ${t}: ${r.verdicts[t]}`);
    for (const l of r.out) console.log(`   ${l}`);
  }
  const base = file.replace(/\.ts$/, "");
  writeFileSync(`${base}.out.json`, JSON.stringify(res, null, 1));
  process.exit(0);
}
