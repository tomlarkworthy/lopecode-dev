#!/usr/bin/env bun
// Save-to-report times of live.ts on a copy of the sources: each edit is written, then `check` is asked; 10 per kind,
// alternating edit and revert. Then the fresh alternatives: bun-verify alone, and build + bun-verify.
//   bun tools/lang-experiment/bun-live/latency.ts [--reps n]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ask } from "./ask.ts";
import { edits } from "./edits.ts";
import { compiler } from "../../spec-notebook.ts";
import { liteOf, makeRoot, SCRATCH } from "./root.ts";

const argv = process.argv.slice(2);
const reps = argv.includes("--reps") ? Number(argv[argv.indexOf("--reps") + 1]) : 10;
const DIR = join(SCRATCH, "latency");
mkdirSync(DIR, { recursive: true });
const ROOT = makeRoot(join(SCRATCH, "roots/latency"));
const L = liteOf(ROOT);
const LIVE = join(import.meta.dir, "live.ts");
const SOCK = join(DIR, "live.sock");
const say = (s: string) => process.stdout.write(s + "\n");
const sh = (cmd: string[]) => Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" }).stdout.toString().trim();
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

const base = join(DIR, "base.html");
const t = performance.now();
const b = Bun.spawnSync(["bun", join(L, "soundscript/build.ts"), "--force", "--out", base], { stdout: "pipe", stderr: "pipe", cwd: ROOT });
if (b.exitCode !== 0) throw new Error("build failed");
const buildMs = performance.now() - t;
const proc = Bun.spawn(["bun", LIVE, "--root", ROOT, "--notebook", base, "--serve", "--socket", SOCK, "--no-watch", "--no-initial"], { stdout: "pipe", stderr: "ignore" });
{
  const reader = proc.stdout.getReader();
  let text = "";
  while (!text.includes("ready\n")) { const { value, done } = await reader.read(); if (done) throw new Error(text); text += new TextDecoder().decode(value); }
  reader.releaseLock();
}
const E = await edits(ROOT);
const { compile, dispose } = await compiler();
const kinds = [
  { name: "(a) leaf runtime cell: render.ss.ts drawnTag", file: join(L, "render.ss.ts"), edit: (f: string) => E.comment(f, "drawnTag", "x") },
  { name: "(b) checker cell in inference: infer/ix-expr.ss.ts ixNamedMember", file: join(L, "infer/ix-expr.ss.ts"), edit: (f: string) => E.comment(f, "ixNamedMember", "x") },
  { name: "(c) spec test source: spec.ojs test_spec_S1_5", file: join(L, "soundscript/spec.ojs"), edit: (f: string) => E.ojsAppend(f, compile, "test_spec_S1_5", "\n// x") },
];
const rows: string[] = [];
say(`${sh(["pmset", "-g", "batt"]).split("\n")[0]}; ${sh(["uptime"])}`);
for (const k of kinds) {
  const original = readFileSync(k.file, "utf8");
  // a first edit and revert, not counted: it maps a rewritten .ojs file's separators
  k.edit(k.file); await ask("check", SOCK); writeFileSync(k.file, original); await ask("check", SOCK);
  const ms: number[] = [];
  const tiers = new Set<string>();
  for (let i = 0; i < reps; i++) {
    if (i % 2 === 0) k.edit(k.file); else writeFileSync(k.file, original);
    const t0 = performance.now();
    const r = await ask("check", SOCK);
    ms.push(performance.now() - t0);
    const last = r.lines.find((l) => /^(fast|slow|none)/.test(l)) ?? r.lines.at(-2) ?? "";
    tiers.add(last.split(";")[0]);
    const tests = /(\d+) tests recomputed/.exec(last)?.[1];
    if (i === 0) say(`${k.name}: ${last}`);
    if (i === 0) say(`  ${r.lines.find((l) => l.startsWith("phases")) ?? ""}`);
    if (tests === undefined) say(`  rep ${i}: ${r.lines.slice(-3).join(" | ")}`);
  }
  writeFileSync(k.file, original);
  await ask("check", SOCK);
  rows.push(`| ${k.name} | ${[...tiers].join(", ")} | ${median(ms).toFixed(0)} | ${Math.min(...ms).toFixed(0)}-${Math.max(...ms).toFixed(0)} |`);
  say(rows.at(-1)!);
}
await ask("quit", SOCK);
dispose();
const verify = (): number => { const t0 = performance.now(); Bun.spawnSync(["bun", join(import.meta.dir, "../bun-verify/run.ts"), base], { stdout: "pipe", stderr: "pipe" }); return performance.now() - t0; };
const v: number[] = [], bv: number[] = [];
for (let i = 0; i < 3; i++) v.push(verify());
for (let i = 0; i < 3; i++) {
  const t0 = performance.now();
  Bun.spawnSync(["bun", join(L, "soundscript/build.ts"), "--force", "--out", base], { stdout: "pipe", stderr: "pipe", cwd: ROOT });
  verify();
  bv.push(performance.now() - t0);
}
rows.push(`| bun-verify full run (fresh boot, all 168 tests) | - | ${median(v).toFixed(0)} | ${Math.min(...v).toFixed(0)}-${Math.max(...v).toFixed(0)} |`);
rows.push(`| build + bun-verify | - | ${median(bv).toFixed(0)} | ${Math.min(...bv).toFixed(0)}-${Math.max(...bv).toFixed(0)} |`);
say(`\nfirst build ${buildMs.toFixed(0)} ms; ${sh(["uptime"])}\n\n| edit | tier | median ms (n=${reps}) | range |\n|---|---|---|---|\n${rows.join("\n")}`);
writeFileSync(join(DIR, "latency.md"), rows.join("\n") + "\n");
process.exit(0);
