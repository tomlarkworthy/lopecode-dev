// bun selfhost/late-code/attacks.ts: item 6. The attack programs of lite/infer/attack/run-sets.ts (its loader copied:
// progs is built under import.meta.main and not exported; each source through rewriteSS as run-sets does; freeze3's c0
// controls left out) and selfhost/convert-freeze/attack1/progs.ts, through the hooked checker. Per set: programs,
// accepted today, accepted that R rejects, and accepted-not-R-rejected that hold a kept function, a generator with a
// yield, or an async function with an await.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rewriteSS } from "../../lite/infer/attack/strip-calls.ts";
import { RUNTIME_FREEZE } from "../../lite/infer/attack/variants.ts";
import { analyzeSource, type CellRep } from "./analyze.ts";
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";

type P = { set: string; name: string; src: string; foreign?: string | null; ctl?: boolean };
const progs: P[] = [];
const SELF = new URL("../", import.meta.url).pathname, ATK = new URL("../../lite/infer/attack/", import.meta.url).pathname;
const H5 = new URL("../../lite/soundscript/.scratch/holes5/", import.meta.url).pathname;
for (const f of ["b1", "b2", "b3", "b4", "b5", "b6", "b7"]) for (const a of (await import(`${SELF}freeze-attack/${f}.ts`)).attacks) progs.push({ set: "freeze", ...a, name: `${f}:${a.name}` });
for (const f of readdirSync(SELF + "mut-groups-attack2/").filter((f) => /^(b\d+|breaks)\.ts$/.test(f))) for (const a of (await import(`${SELF}mut-groups-attack2/${f}`)).attacks) progs.push({ set: "attack2", ...a, name: `${f}:${a.name}` });
for (const a of (await import(`${SELF}mut-groups-attack/breaks.ts`)).attacks) progs.push({ set: "attack1", ...a, name: `breaks:${a.name}` });
try {
  const ojs = readFileSync(H5 + "pre/old/lite/soundscript/spec.ojs", "utf8");
  const rows = ojs.split(/^\/\/ %%$/m).map((b) => b.trim()).filter((b) => /^spec_rejects_[45] = /.test(b)).flatMap((c) => new Function(`return (${c.slice(c.indexOf("=") + 1)});`)());
  rows.forEach((c: any, i: number) => { if (c && !c.shell) progs.push({ set: "oldspec", name: `${c.statement}#${i}[${c.rule}]`, src: c.source }); });
  for (const v of (await import(H5 + "pre/variants.ts")).VARIANTS) if (!v.foreign) progs.push({ set: "oldvariants", name: `${v.name}[${v.rule}]`, src: v.src });
} catch (x) { console.log(`oldspec/oldvariants not loaded: ${(x as Error).message}`); }
for (const v of RUNTIME_FREEZE) progs.push({ set: "runtime", name: v.name, src: v.src });
for (const a of (await import(ATK + "b-attacks.ts")).attacks) progs.push({ set: "new", ...a });
for (const a of (await import(ATK + "h6-attacks.ts")).attacks) progs.push({ set: "h6", ...a });
for (let i = 0; i <= 11; i++) for (const a of (await import(`${SELF}freeze-attack2/b${i}.ts`)).attacks) progs.push({ set: "freeze2", ...a, name: `b${i}:${a.name}` });
for (const a of (await import(ATK + "h7-attacks.ts")).attacks) progs.push({ set: "h7", ...a });
for (const f of ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11"]) for (const a of (await import(`${SELF}freeze-attack3/${f}.ts`)).cands) if (!a.ctl) progs.push({ set: "freeze3", ...a, name: `${f}:${a.name}` });
for (const a of (await import(ATK + "h8-attacks.ts")).attacks) progs.push({ set: "h8", ...a });
for (const a of (await import(`${SELF}convert-freeze/attack1/progs.ts`)).progs) progs.push({ set: "convert-freeze/attack1", name: a.name, src: a.src });

const rUses = (c: CellRep) => [
  ...c.ya.filter((h) => h.uses.some((u) => !u.fresh) && (h.kind === "Y" || h.visible)).map((h) => `${h.kind}:${h.name}`),
  ...c.k.map((h) => `K:${h.name}`),
];
type T = { n: number; crash: number; acc: number; rRej: number; rRejNoPrim: number; late: number; lateK: number; lateY: number; lateA: number };
const tally = new Map<string, T>();
const rows: any[] = [], disagree: string[] = [];
for (const p of progs) {
  const t = tally.get(p.set) ?? { n: 0, crash: 0, acc: 0, rRej: 0, rRejNoPrim: 0, late: 0, lateK: 0, lateY: 0, lateA: 0 };
  tally.set(p.set, t);
  t.n++;
  let src = p.src;
  try { src = rewriteSS(p.src, true, p.name)?.out ?? p.src; } catch {}
  let rep;
  try { rep = analyzeSource({ cells: src, tsx: true, outside: [], foreign: p.foreign ?? null } as any); } catch (x) { t.crash++; continue; }
  const ok = rep.ok && rep.cells.length > 0;
  if (verdictOf(src, p.foreign ?? null, false).ok !== ok) disagree.push(`${p.set} ${p.name}`);
  if (!ok) continue;
  t.acc++;
  const r = rep.cells.flatMap(rUses);
  const rNoPrim = rep.cells.flatMap((c) => [...c.ya.filter((h) => !h.prim && h.uses.some((u) => !u.fresh) && (h.kind === "Y" || h.visible)), ...c.k.filter((h) => !h.prim)]);
  if (r.length) t.rRej++;
  if (rNoPrim.length) t.rRejNoPrim++;
  const K = rep.cells.some((c) => c.keptFns > 0), Y = rep.cells.some((c) => c.fns.some((f) => f.kind !== "async" && f.points > 0)), A = rep.cells.some((c) => c.fns.some((f) => f.kind !== "gen" && f.points > 0));
  if (!r.length && (K || Y || A)) { t.late++; if (K) t.lateK++; if (Y) t.lateY++; if (A) t.lateA++; }
  rows.push({ set: p.set, name: p.name, r, K, Y, A });
}
writeFileSync(join(import.meta.dir, "out/attacks.json"), JSON.stringify(rows, null, 1));
console.log("| set | programs | threw | accepted today | accepted, R rejects | ... R without primitive lets | accepted, not R-rejected, with late code | with K | with Y | with A |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
const sum: T = { n: 0, crash: 0, acc: 0, rRej: 0, rRejNoPrim: 0, late: 0, lateK: 0, lateY: 0, lateA: 0 };
for (const [k, t] of tally) { console.log(`| ${k} | ${t.n} | ${t.crash} | ${t.acc} | ${t.rRej} | ${t.rRejNoPrim} | ${t.late} | ${t.lateK} | ${t.lateY} | ${t.lateA} |`); for (const x in sum) (sum as any)[x] += (t as any)[x]; }
console.log(`| all | ${sum.n} | ${sum.crash} | ${sum.acc} | ${sum.rRej} | ${sum.rRejNoPrim} | ${sum.late} | ${sum.lateK} | ${sum.lateY} | ${sum.lateA} |`);
console.log(`accepted-today verdicts that differ from run-sets verdictOf: ${disagree.length}${disagree.length ? ": " + disagree.slice(0, 5).join("; ") : ""}`);
