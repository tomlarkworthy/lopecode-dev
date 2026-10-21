#!/usr/bin/env bun
// The personas set of brain-x-loop, from the role files of a cloud-brain-dev checkout (plan/cloud-brain-agentic-redesign.md
// §3.8). A persona is a file roles/<name>.md whose `accepts` block parses (accept.ts of that checkout, the parser drain.ts
// uses); its label is needs-<name>, and the loop starts the machine for an open flow issue with that label ("A flow issue"
// of brain-x-loop). The drain calls loop.personas with the same list at its boot, from its clone of main; this tool is the
// other writer, run by the prek pre-push hook of cloud-brain-dev, so a persona added on a laptop is startable before the
// machine next boots.
//
//   bun tools/cloud-brain/personas.ts [--dev DIR]                         prints one line a persona: name, step, label
//   bun tools/cloud-brain/personas.ts --set [--as NAME] [--soft] [--dev DIR]
//
// --dev    the cloud-brain-dev checkout (default: the submodule beside this file's lopecode-dev)
// --set    sends loop.personas { list } with the token NAME (default loop-personas), through brain.ts curl --as, and
//          prints the answer's list. The owner makes the token once:
//          BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-personas loop.personas
// --soft   a call that fails (no token kept, a refusal, no answer) is one line on stderr and exit 0: the hook's, so a push
//          is not held by the Brain. Without it such a call is exit 2.
// Exit 1: a role file whose accepts block does not parse, named with why; nothing is sent.
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, basename } from "node:path";

const args = process.argv.slice(2), flag = (f: string) => args.includes(f), opt = (f: string, d: string) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const root = resolve(import.meta.dir, "../.."), dev = resolve(opt("--dev", join(root, "cloud-brain-dev"))), token = opt("--as", "loop-personas");
const { roleFiles, accepts } = await import(join(dev, "accept.ts"));

const found = roleFiles(join(dev, "roles")).map((f: string) => ({ name: basename(f, ".md"), a: accepts(f) }));
const bad = found.filter((p: any) => "why" in p.a);
if (bad.length) {
  for (const p of bad) console.error(`roles/${p.name}.md: ${p.a.why}`);
  process.exit(1);
}
for (const p of found) console.log(`${p.name} ${p.a.step} needs-${p.name}`);
if (!flag("--set")) process.exit(0);

const fail = (why: string) => {
  console.error(`loop.personas not sent (${why})`);
  process.exit(flag("--soft") ? 0 : 2);
};
const line = (...a: string[]) => { const r = spawnSync("git", ["-C", root, ...a], { encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : ""; };
// The main checkout's state, also from a worktree (as knowledge-docs.ts finds it).
const common = line("rev-parse", "--path-format=absolute", "--git-common-dir");
const state = process.env.BRAIN_STATE_DIR || (common ? join(dirname(common), "tools/cloud-brain/.emitted") : "");
const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", "/xrpc/com.lopecode.brain.loop.personas", "--as", token, "-sS", "-m", "20",
  "-X", "POST", "-H", "content-type: application/json", "--data-binary", JSON.stringify({ list: found.map((p: any) => p.name) })],
  { encoding: "utf8", env: { ...process.env, ...(state ? { BRAIN_STATE_DIR: state } : {}) } });
const st = /\[(\d+)\]\s*$/.exec(r.stderr || ""), text = (r.stdout || "").trim();
if (text.startsWith(`no token "${token}" is kept`)) fail(`no token "${token}" is kept. The owner makes it once: BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token ${token} loop.personas`);
if (!st || st[1] !== "200") fail(st ? st[1] + " " + text.slice(0, 200) : (r.stderr || "no answer").trim().slice(0, 200));
console.log("loop.personas: " + JSON.parse(text).personas.list.join(", "));
