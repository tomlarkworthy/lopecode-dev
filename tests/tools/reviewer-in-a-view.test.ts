// A reviewer is started in a view: a detached worktree at the submitted commit, made by the orchestrator. SKILL.md
// step 4 makes it and starts agent.sh from its clone; the reviewer's brief makes and removes no worktree, writes
// nothing in the main checkout, and gives brain.ts the main checkout's state. Issue wt-4-reviewer-in-a-view, task 4 of
// plan/cloud-brain-worktree-per-topic.md (part 4).
//
//   bun test ./tests/tools/reviewer-in-a-view.test.ts
// The brief is a file of the Brain. Its tests read the copy kept beside them (reviewer-brief.ts, which has why):
// BRIEF=<file> reads a file in its place, BRAIN=<address> what that Brain serves now. SKILL=<file> reads another
// SKILL.md. The last test starts nothing: DRY=1.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import { testNeeding } from "./needs.ts";
import { briefOf } from "./reviewer-brief.ts";

const root = resolve(import.meta.dir, "../..");
const agentSh = join(process.env.CLOUD_BRAIN_DEV || join(root, "cloud-brain-dev"), "agent.sh");
const brief = () => briefOf();
const skill = readFileSync(process.env.SKILL || join(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const lines = (s: string, re: RegExp) => s.split("\n").filter((l) => re.test(l)).map((l) => l.trim());
// One paragraph of the brief is for a reviewer that was started in no view; it makes one and removes it.
const NO_VIEW = "**Started in no view.**";
const inAView = (s: string) => {
  const at = s.indexOf(NO_VIEW);
  if (at < 0) return s;
  const end = s.indexOf("\n>\n", at);
  return s.slice(0, at) + s.slice(end < 0 ? s.length : end);
};

test("the brief says the checkout is a view, what is in it, and where the main checkout is", async () => {
  const text = flat(await brief());
  expect(text).toMatch(/it is a \*\*view\*\*: a detached git worktree/);
  expect(text).toContain('dirname "$(git -C <checkout> rev-parse --path-format=absolute --git-common-dir)"');
  expect(text).toContain(NO_VIEW);
});

test("a reviewer in a view makes no worktree and removes none", async () => {
  const text = inAView(await brief());
  expect(lines(text, /worktree\.sh rev-<id>/)).toEqual([]);
  expect(lines(text, /worktree\.sh --remove/)).toEqual([]);
  expect(lines(text, /git -C cloud-brain-dev worktree (add|remove)/)).toEqual([]);
  expect(lines(text, /\$W\b/)).toEqual([]);
  expect(text).toContain("tools/cloud-brain/worktree.sh --at origin/main <view>");
  expect(text).toContain("tools/cloud-brain/worktree.sh --at <sha>^ <view>");
});

test("a reviewer started in no view makes one with --at, and removes it from the checkout it was started in", async () => {
  const text = await brief();
  const at = text.indexOf(NO_VIEW);
  const part = flat(text.slice(at, text.indexOf("\n>\n", at)));
  expect(part).toContain("tools/cloud-brain/worktree.sh --at <sha> rev-<id>");
  expect(part).toContain("tools/cloud-brain/worktree.sh --remove rev-<id>");
});

test("every brain.ts command of the brief has the main checkout's state before it", async () => {
  const text = await brief();
  expect(flat(text)).toContain("BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts");
  // A command is `brain.ts` and a word after it, in one pair of backticks; `brain.ts` alone is the tool's name.
  const commands = [...flat(text).matchAll(/`([^`]*brain\.ts [a-z][^`]*)`/g)].map((m) => m[1]);
  expect(commands.length).toBeGreaterThan(0);
  for (const c of commands) expect(c, c).toMatch(/^BRAIN_STATE_DIR=<root>\/tools\/cloud-brain\/\.emitted /);
});

test("the fetch does not enter the submodules, which are links in a view", async () => {
  const text = await brief();
  const fetches = lines(text, /git -C <checkout> fetch/);
  expect(fetches.length).toBeGreaterThan(0);
  for (const f of fetches) expect(f, f).toContain("fetch --no-recurse-submodules origin main");
});

test("a note is mended by a commit in the view and a push from it, with nothing written in the main checkout", async () => {
  const text = await brief();
  expect(lines(text, /pull --ff-only|push origin main/)).toEqual([]);
  const at = (s: string) => { const i = text.indexOf(s); expect(i, s).toBeGreaterThan(-1); return i; };
  const take = at("lock.sh take land rev-<id> --wait"), rebase = at("tools/cloud-brain/worktree.sh --rebase <view>");
  const push = at("git -C <checkout> push origin HEAD:main"), release = at("lock.sh release land rev-<id>");
  expect(take).toBeLessThan(rebase);
  expect(rebase).toBeLessThan(push);
  expect(push).toBeLessThan(release);
});

// from "**The reviewer is not an Agent call**" to step 5
const launch = skill.slice(skill.indexOf("**The reviewer is not an Agent call**"), skill.indexOf("\n5. **When an agent reports**"));

test("SKILL.md step 4 makes the view at the submit's commit and starts the reviewer from its clone", () => {
  expect(launch).toContain("V=$(tools/cloud-brain/worktree.sh --at <sha> rev-<id>)");
  expect(launch).toContain('CHECKOUT=$V $V/cloud-brain-dev/agent.sh reviewer "review issue <id>; your token is <name>"');
  expect(skill).not.toContain("<root>/cloud-brain-dev/agent.sh reviewer");
  expect(skill).not.toContain("the reviewer is not put in one yet");
  expect(flat(launch)).toMatch(/`<sha>` is the last `commit` ref of the issue's last `submit` or `submit-spec`/);
});

test("SKILL.md removes the view when the reviewer has reported, and never one that holds a commit", () => {
  const step5 = flat(skill.slice(skill.indexOf("\n5. **When an agent reports**"), skill.indexOf("\n6. ", skill.indexOf("\n5. **When an agent reports**"))));
  expect(step5).toContain("tools/cloud-brain/worktree.sh --remove rev-<id>");
  expect(step5).toMatch(/`ahead=0` and `dev-ahead=0`[^.]*`--remove rev-<id> --force`/);
  expect(step5).not.toContain("a light reviewer has none");
});

test("SKILL.md step 1 no longer reads the reviewer's agent.sh from the main checkout's copy", () => {
  const step1 = skill.slice(skill.indexOf("\n1. **Health.**"), skill.indexOf("\n2. **Count your running agents"));
  expect(step1).not.toContain("the reviewer's `agent.sh`");
});

// agent.sh is not changed by this task: CHECKOUT is the view, and TAB=1 starts the channel server there.
testNeeding("reviewer-in-a-view.test.ts, its test of agent.sh", [agentSh])("agent.sh given a view names it as the checkout, and starts the tab's server in it", () => {
  const view = mkdtempSync(join(tmpdir(), "bm-rev-"));
  try {
    mkdirSync(join(view, "tools/cloud-brain"), { recursive: true });
    // What agent.sh reads is set here, not inherited: an agent it started with a tab runs this with TAB=1.
    const env = { ...process.env, TAB: "", MODEL: "", ADVISOR: "", READS: "", CHECKOUT: view, DRY: "1" };
    const plain = Bun.spawnSync([agentSh, "reviewer", "review issue x; your token is rev-3fa2c1"], { env });
    expect(plain.exitCode).toBe(0);
    const out = plain.stdout.toString();
    expect(out).toContain(`\ncheckout: ${view}\n`);
    expect(out).not.toContain("--mcp-config");
    expect(out).toContain(`--add-dir\n${view}\n`);
    const tab = Bun.spawnSync([agentSh, "reviewer", "review issue x; your token is rev-3fa2c1"], { env: { ...env, TAB: "1" } });
    expect(tab.exitCode).toBe(0);
    expect(tab.stdout.toString()).toContain(`cd '${view}' && exec bun run lopecode-plugin/src/lopecode-channel.ts`);
    expect(tab.stdout.toString()).toContain("Bash,Read,Grep,Glob,mcp__lopecode");
  } finally {
    rmSync(view, { recursive: true });
  }
});
