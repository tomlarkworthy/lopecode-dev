#!/usr/bin/env bun
// token-file.ts: writes the token file of the loop's worker machine on Fly.io, from four tokens this checkout keeps.
// plan/cloud-brain-worker-machine-on-fly.md, "What the orchestrator makes"; issue fly-4-loop-files.
//
//   bun tools/cloud-brain/fly/token-file.ts [--out FILE] [--base64]
//
// The briefs and the tools read three names literally: `loop-agents` (brain.ts agent-token), `loop-knowledge` (a
// writer's search) and `loop-docs` (knowledge-docs.ts). So the machine's cb4-tokens.json has those three names over
// the values of `fly-agents`, `fly-knowledge` and `fly-docs`, and `fly-status` under its own name (run.sh, and the
// driver's read of fly.status). The values of the laptop's own `loop-…` tokens are not read and do not leave it.
//
// It reads <state>/cb4-tokens.json, where <state> is BRAIN_STATE_DIR or the main checkout's tools/cloud-brain/.emitted,
// and writes FILE with mode 600: <state>/fly-machine-tokens.json with no --out. With --base64 the file is the base64
// of that JSON on one line, which is what the app's secret BRAIN_TOKENS holds: the machine's `files` writes the
// decoding to /root/cb4-tokens.json (tools/cloud-brain/fly/machine.json; the record of fly-1-by-hand).
// It prints the path and the four names, and never a value. Exit 0: written. 1: a token of the four is not kept, or
// the file was not read; nothing is written. 2: the arguments.
import { existsSync, readFileSync, writeFileSync, chmodSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// The name on the machine, and the name the laptop keeps the value under.
export const NAMES: [string, string][] = [["loop-agents", "fly-agents"], ["loop-knowledge", "fly-knowledge"], ["loop-docs", "fly-docs"], ["fly-status", "fly-status"]];
// The machine's file from the laptop's: { file }, or { missing }, the names not kept as a text that is not empty.
export function machineTokens(kept: any): { file?: Record<string, string>; missing: string[] } {
  const has = (n: string) => !!kept && typeof kept === "object" && Object.hasOwn(kept, n) && typeof kept[n] === "string" && kept[n] !== "";
  const missing = NAMES.map(([, from]) => from).filter((n) => !has(n));
  return missing.length ? { missing } : { missing, file: Object.fromEntries(NAMES.map(([to, from]) => [to, kept[from]])) };
}

if (import.meta.main) {
  const args = process.argv.slice(2), oi = args.indexOf("--out"), base64 = args.includes("--base64");
  const stop = (code: number, text: string): never => { console.error("token-file.ts: " + text); process.exit(code); };
  if (args.some((a, i) => a !== "--base64" && i !== oi && (oi < 0 || i !== oi + 1)) || (oi >= 0 && !args[oi + 1])) stop(2, "token-file.ts [--out FILE] [--base64]");
  const state = process.env.BRAIN_STATE_DIR ? resolve(process.env.BRAIN_STATE_DIR)
    : join(dirname(spawnSync("git", ["-C", import.meta.dir, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).stdout.trim()), "tools/cloud-brain/.emitted");
  const from = join(state, "cb4-tokens.json"), out = oi >= 0 ? resolve(args[oi + 1]) : join(state, "fly-machine-tokens.json");
  if (!existsSync(from)) stop(1, `no ${from}. Nothing was written`);
  let kept: any = null;
  try { kept = JSON.parse(readFileSync(from, "utf8")); } catch { stop(1, `${from} is not JSON. Nothing was written`); }
  const m = machineTokens(kept);
  if (!m.file) stop(1, `not kept in ${from}: ${m.missing.join(", ")}. Each is made with the owner's session, as "What the orchestrator makes" of plan/cloud-brain-worker-machine-on-fly.md has it. Nothing was written`);
  const json = JSON.stringify(m.file, null, 1);
  writeFileSync(out + ".tmp", base64 ? Buffer.from(json).toString("base64") + "\n" : json, { mode: 0o600 });
  chmodSync(out + ".tmp", 0o600);
  renameSync(out + ".tmp", out);
  console.log(`wrote ${out} (mode 600${base64 ? ", base64 on one line: the value of the app's secret BRAIN_TOKENS" : ""}): ${NAMES.map(([to, from]) => (to === from ? to : `${to} from ${from}`)).join(", ")}`);
}
