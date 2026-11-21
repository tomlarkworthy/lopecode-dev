#!/usr/bin/env bun
// Equivalence of live redefinition with a fresh boot. On a copy of the sources (root.ts), each scripted edit is applied,
// the live process is asked to `check`, and its tests, cell states and variable definitions are compared with a fresh
// boot of a notebook built from the same edited copy. Prints SAME or DIFFERENT per step.
//   bun tools/lang-experiment/bun-live/equiv.ts [--only name,...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ask } from "./ask.ts";
import { edits } from "./edits.ts";
import { compiler } from "../../spec-notebook.ts";
import { liteOf, makeRoot, SCRATCH } from "./root.ts";

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null;
const DIR = join(SCRATCH, "equiv");
mkdirSync(DIR, { recursive: true });
const ROOT = makeRoot(join(SCRATCH, "roots/equiv"));
const L = liteOf(ROOT);
const LIVE = join(import.meta.dir, "live.ts");
const SOCK = join(DIR, "live.sock");
const say = (s: string) => process.stdout.write(s + "\n");
const log: string[] = [];
const note = (s: string) => { log.push(s); say(s); };

const build = (out: string) => {
  const p = Bun.spawnSync(["bun", join(L, "soundscript/build.ts"), "--force", "--out", out], { stdout: "pipe", stderr: "pipe", cwd: ROOT });
  const err = p.stderr.toString().split("\n").find((l) => /^(error|REFUSED)\b|Error:/.test(l.trim()));
  return p.exitCode === 0 ? null : (err ?? p.stderr.toString().slice(-400)).trim();
};
const fresh = (html: string, out: string) => {
  const p = Bun.spawnSync(["bun", LIVE, "--root", ROOT, "--notebook", html, "--dump", out, "--no-watch", "--no-initial"], { stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) throw new Error(`fresh dump failed: ${p.stderr.toString().slice(-600)}`);
  return JSON.parse(readFileSync(out, "utf8"));
};

const base = join(DIR, "base.html");
const be = build(base);
if (be) throw new Error(`the unedited copy does not build: ${be}`);
const proc = Bun.spawn(["bun", LIVE, "--root", ROOT, "--notebook", base, "--serve", "--socket", SOCK, "--no-watch", "--no-initial"], { stdout: "pipe", stderr: "ignore" });
{
  const reader = proc.stdout.getReader();
  let text = "";
  while (!text.includes("ready\n")) { const { value, done } = await reader.read(); if (done) throw new Error(`live.ts exited: ${text}`); text += new TextDecoder().decode(value); }
  reader.releaseLock();
}
const E = await edits(ROOT);
const { compile, dispose } = await compiler();
const F = {
  render: join(L, "render.ss.ts"), store: join(L, "store.ss.ts"), expr: join(L, "infer/ix-expr.ss.ts"),
  spec2: join(L, "soundscript/spec-2.ts"), specOjs: join(L, "soundscript/spec.ojs"),
};
const original = new Map(Object.values(F).map((f) => [f, readFileSync(f, "utf8")]));
const restore = (...fs: string[]) => { for (const f of fs) writeFileSync(f, original.get(f)!); };

type Step = { name: string; edit: () => void };
const steps: Step[] = [
  { name: "0 no edit", edit: () => {} },
  { name: "1 runtime cell body (drawnTag span->div)", edit: () => E.literal(F.render, "drawnTag", "span", "div") },
  { name: "1b revert", edit: () => restore(F.render) },
  { name: "2 checker cell body (ixNamedMember banned-member rule id)", edit: () => E.literal(F.expr, "ixNamedMember", "banned-member", "banned-member-x") },
  { name: "2b revert", edit: () => restore(F.expr) },
  { name: "3 add a cell (render.ss.ts liveAdded)", edit: () => E.append(F.render, "export const liveAdded = () => (n: number): number => n + 1;") },
  { name: "3b delete that cell", edit: () => restore(F.render) },
  { name: "4 delete a spec cell (s2_shadow)", edit: () => E.remove(F.spec2, "s2_shadow") },
  { name: "4b restore", edit: () => restore(F.spec2) },
  { name: "5 rename a spec cell (s2_base -> s2_base_x)", edit: () => E.rename(F.spec2, "s2_base", "s2_base_x") },
  { name: "5b fix its dependent (s2_answer takes s2_base_x)", edit: () => E.renameParam(F.spec2, "s2_answer", "s2_base", "s2_base_x") },
  { name: "5c restore", edit: () => restore(F.spec2) },
  { name: "6 checker error in a runtime cell (drawnTag tag: 1)", edit: () => E.literal(F.render, "drawnTag", "span", 1 as any) },
  { name: "6b fix", edit: () => restore(F.render) },
  { name: "7 a cell that does not parse (spec-2.ts s2_double)", edit: () => E.comment(F.spec2, "s2_double", "*/ ( /*") },
  { name: "7b repair", edit: () => restore(F.spec2) },
  { name: "8 two files at once (render.ss.ts, spec.ojs)", edit: () => { E.literal(F.render, "drawnTag", "span", "div"); E.ojsAppend(F.specOjs, compile, "test_spec_S1_5", "\n// edited"); } },
  { name: "8b revert both", edit: () => restore(F.render, F.specOjs) },
  { name: "9 type-only cell (render.ss.ts adds type KeyWide)", edit: () => E.append(F.render, "export type KeyWide = Key | bigint;") },
  { name: "9b a type changed in place (Key adds bigint)", edit: () => { restore(F.render); E.typeUnion(F.render, "Key", "bigint"); } },
  { name: "9c revert", edit: () => restore(F.render) },
];

const diff = (a: Record<string, string>, b: Record<string, string>) => {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) out.push(`${k}: live ${JSON.stringify(a[k])?.slice(0, 160)} / fresh ${JSON.stringify(b[k])?.slice(0, 160)}`);
  return out;
};
const rows: string[] = [];
let n = 0;
for (const s of steps) {
  if (only && !only.some((o) => s.name.startsWith(o))) { s.edit(); await ask("check", SOCK); continue; }
  s.edit();
  const t = performance.now();
  const r = await ask("check", SOCK);
  const ms = performance.now() - t;
  const liveDump = JSON.parse((await ask("dump", SOCK)).lines.join("\n"));
  const html = join(DIR, `fresh-${n}.html`);
  const err = build(html);
  note(`## ${s.name}`);
  for (const l of r.lines) if (!l.startsWith("PASS ")) note(`  live: ${l.slice(0, 400)}`);
  if (err) {
    note(`  fresh: build failed: ${err.slice(0, 400)}`);
    rows.push(`| ${s.name} | fresh build fails | live exit ${r.code} | ${ms.toFixed(0)} |`);
    n++;
    continue;
  }
  const fd = fresh(html, join(DIR, `fresh-${n}.json`));
  const dt = diff(liveDump.tests, fd.tests), dv = diff(liveDump.verdicts, fd.verdicts), dd = diff(liveDump.defs, fd.defs);
  const same = !dt.length && !dv.length && !dd.length;
  const failing = Object.values(liveDump.tests as Record<string, string>).filter((x) => !x.startsWith("passed")).length;
  note(`  ${same ? "SAME" : "DIFFERENT"}: tests ${Object.keys(fd.tests).length} (${dt.length} differ), cell states ${Object.keys(fd.verdicts).length} (${dv.length} differ), definitions ${Object.keys(fd.defs).length} (${dd.length} differ); ${failing} not passing`);
  for (const x of [...dt, ...dv, ...dd].slice(0, 12)) note(`    ${x}`);
  rows.push(`| ${s.name} | ${same ? "SAME" : "DIFFERENT"} | tests ${dt.length}, states ${dv.length}, defs ${dd.length} differ; ${failing} not passing; live exit ${r.code} | ${ms.toFixed(0)} |`);
  n++;
}
note("\n| step | result | detail | live check ms |\n|---|---|---|---|\n" + rows.join("\n"));
writeFileSync(join(DIR, "equiv.log"), log.join("\n") + "\n");
await ask("quit", SOCK);
dispose();
process.exit(0);
