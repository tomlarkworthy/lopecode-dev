#!/usr/bin/env bun
// The personas set of brain-x-loop, from the role files of a cloud-brain-dev checkout (plan/cloud-brain-agentic-redesign.md
// §3.8). A persona is a file roles/<name>.md or flow/<name>.md whose `accepts` block parses (accept.ts of that checkout,
// the parser drain.ts uses). Both directories are read when present: the drain of branch redesign-drain keeps its briefs
// (flow/worker.md, flow/reviewer.md) in flow/ until the cutover moves them into roles/. A name in both is one persona,
// the file of roles/ read. Its label is needs-<name>, and the loop starts the machine for an open flow issue with that label ("A flow issue"
// of brain-x-loop). The prek pre-push hook of cloud-brain-dev runs it with --ref main, so a persona landed on main from a
// laptop is startable before the machine next boots. The drain is to send the same list at its boot (step 3 of the plan;
// drain.ts does not yet).
//
//   bun tools/cloud-brain/personas.ts [--dev DIR] [--ref REF]                prints one line a persona: name, step, label
//   bun tools/cloud-brain/personas.ts --set [--as NAME] [--soft] [--dev DIR] [--ref REF]
//
// --dev    the cloud-brain-dev checkout (default: the submodule beside this file's lopecode-dev)
// --ref    read roles/*.md and flow/*.md at that commit of --dev (git ls-tree, git show), not the files on disk: the hook's main, which
//          the machine's drain runs, so a branch pushed with a role of its own does not change the set
// --set    sends loop.personas { list } with the token NAME (default loop-personas), through brain.ts curl --as, and
//          prints the answer's list. The owner makes the token once:
//          BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts token loop-personas loop.personas
// --soft   a call that fails (no token kept, a refusal, no answer) is one line on stderr and exit 0: the hook's, so a push
//          is not held by the Brain. Without it such a call is exit 2.
// Exit 1: a role file whose accepts block does not parse, named with why, or a --ref git cannot read (exit 0 with
// --soft: a clone with no local main); nothing is sent.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";

const args = process.argv.slice(2), flag = (f: string) => args.includes(f), opt = (f: string, d: string) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const root = resolve(import.meta.dir, "../.."), dev = resolve(opt("--dev", join(root, "cloud-brain-dev"))), token = opt("--as", "loop-personas");
const { roleFiles, accepts, parseAccepts } = await import(join(dev, "accept.ts"));
const ref = opt("--ref", "");
const at = (...a: string[]) => { const r = spawnSync("git", ["-C", dev, ...a], { encoding: "utf8" }); if (r.status !== 0) { console.error(`git ${a.join(" ")}: ${(r.stderr || "").trim()}`); process.exit(flag("--soft") ? 0 : 1); } return r.stdout; };
const parsed = (text: string) => { try { return parseAccepts(text); } catch (e) { return { why: (e as Error).message }; } };
const read = (d: string) =>
  ref
    ? at("ls-tree", "--name-only", ref, d + "/").split("\n").filter((f) => f.endsWith(".md")).map((f) => ({ name: basename(f, ".md"), file: f, a: parsed(at("show", `${ref}:${f}`)) }))
    : existsSync(join(dev, d)) ? roleFiles(join(dev, d)).map((f: string) => ({ name: basename(f, ".md"), file: `${d}/${basename(f)}`, a: accepts(f) })) : [];
const byName = new Map<string, any>();
for (const p of [...read("flow"), ...read("roles")]) byName.set(p.name, p);
const found = [...byName.values()].sort((x, y) => (x.name < y.name ? -1 : 1));
const bad = found.filter((p: any) => "why" in p.a);
if (bad.length) {
  for (const p of bad) console.error(`${p.file}: ${p.a.why}`);
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
