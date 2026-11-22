// bun lite/infer/attack/run-sets.ts [--off] [--force] [--sets a,b] [--only s]: every attack program through the live
// checker (lite/core.ts), an accepted one run by observe.ts (runCells: the compiled cells' own text, events pumped).
// Sets: freeze (selfhost/freeze-attack b1-b7, 315), attack2 (252), attack1 (8), oldspec (49), oldvariants (239),
// runtime (98), new (b-attacks.ts, 70), h6 (h6-attacks.ts). The folders they come from are read, not edited.
// --off drops the static capture rules' diagnostics in this runner only (the checker is unchanged).
import { checkSources } from "../../core.ts";
import { rewriteSS } from "./strip-calls.ts";
import { observeProgram, type Prog } from "./observe.ts";
import { RUNTIME_FREEZE } from "./variants.ts";
import { readdirSync, readFileSync } from "node:fs";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]!; };
const OFF = process.argv.includes("--off"), FORCE = process.argv.includes("--force"), ONLY = arg("--only");
const SETS = (arg("--sets") ?? "freeze,attack2,attack1,oldspec,oldvariants,runtime,new,h6").split(",");
export const OFF_RULES = new Set(["mut-capture", "let-capture", "mut-yield", "mut-cell", "member-write", "mutating-method", "regexp-state", "iterator-capture"]);
type P = Prog & { set: string; name: string; foreign?: string | null };
const progs: P[] = [];
const SELF = new URL("../../../selfhost/", import.meta.url).pathname, H5 = new URL("../../soundscript/.scratch/holes5/", import.meta.url).pathname;
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

export const verdictOf = (src: string, foreign: string | null, off: boolean): { ok: boolean; text: string; dropped: string[] } => {
  try {
    const r = checkSources({ cells: src, tsx: true, outside: [], foreign } as any);
    const keep = (es: any[]) => es.filter((e) => !(off && OFF_RULES.has(e.rule)));
    const okName = new Set<string>();
    for (const c of r.cells) if (!keep(c.errors).length && !c.unsupported.length && (c.status === "ok" || (off && c.status !== "unsupported"))) okName.add(c.name);
    const bad = r.cells.filter((c: any) => !okName.has(c.name) || (c.status === "blocked" && (c.blockedBy ?? []).some((b: string) => !okName.has(b))));
    const mod = keep(r.module);
    const dropped = off ? [...new Set([...r.module, ...r.cells.flatMap((c: any) => c.errors)].filter((e: any) => OFF_RULES.has(e.rule)).map((e: any) => e.rule))] : [];
    const text = bad.length || mod.length ? `REJECT ${[...mod.map((m: any) => `module[${m.rule}]`), ...bad.map((c: any) => `${c.name}:${c.status}${keep(c.errors).map((e: any) => `[${e.rule}]`).join("")}`)].join(" ")}` : "ACCEPT";
    return { ok: !bad.length && !mod.length && r.cells.length > 0, text, dropped };
  } catch (x) { return { ok: false, text: `CRASH ${(x as Error).message}`, dropped: [] }; }
};

if (import.meta.main) {
  const tally: Record<string, { n: number; acc: number; silent: number; threw: number }> = {};
  const silentList: string[] = [];
  for (const p of progs) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    const src = rewriteSS(p.src, true, p.name)?.out ?? p.src;
    const t = (tally[p.set] ??= { n: 0, acc: 0, silent: 0, threw: 0 });
    t.n++;
    const v = verdictOf(src, p.foreign ?? null, OFF);
    if (v.ok) t.acc++;
    let lines: string[] = [];
    if ((v.ok || FORCE) && !p.foreign) {
      try {
        const r = await observeProgram({ ...p, src });
        lines = r.lines;
        if (r.silent.length && v.ok) { t.silent++; silentList.push(`${p.set} ${p.name}${v.dropped.length ? ` (dropped ${v.dropped.join(", ")})` : ""}`); }
        if (r.threw && v.ok) t.threw++;
      } catch (x) { lines.push(`run crash: ${(x as Error).message}`); }
    }
    console.log(`== ${p.set} ${p.name}: ${v.text.slice(0, 200)}${v.dropped.length ? ` (dropped ${v.dropped.join(", ")})` : ""}`);
    for (const l of lines) console.log(`   ${l}`);
  }
  console.log(`-- mode rules ${OFF ? `OFF (${[...OFF_RULES].join(", ")} dropped)` : "ON"}${FORCE ? ", forced" : ""}`);
  let n = 0, s = 0;
  for (const [k, t] of Object.entries(tally)) { n += t.n; s += t.silent; console.log(`-- ${k}: ${t.n} programs, accepted ${t.acc}, silent ${t.silent}, with a cell in error ${t.threw}`); }
  console.log(`-- all: ${n} programs, silent ${s}`);
  for (const x of silentList) console.log(`SILENT ${x}`);
  process.exit(0);
}
