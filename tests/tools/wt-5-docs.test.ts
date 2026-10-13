// Since wt-3-land-by-push a landing of the issue loop is a push from a worktree, and nothing is committed, merged or
// built in the main checkout. Four docs still said the opposite, or said nothing: "Always" of rules.md ("Commit, build
// or push in the main checkout only while holding the landing lock"), the guide to changing a Worker ("Commit on
// `main` here, and push"), the README of cloud-brain-dev (a push by hand, with a token nobody of the loop has), and the
// guide's part for a session outside the loop (no worktree named). Task 5 of plan/cloud-brain-worktree-per-topic.md;
// issue wt-5-docs.
//
//   bun test ./tests/tools/wt-5-docs.test.ts
// RULES=, CHANGING=, GUIDE=, HUB=, README=, AGENTS= each read another copy of that file (the file before the change).
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (env: string, path: string) => readFileSync(process.env[env] || resolve(root, path), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const rules = read("RULES", ".claude/skills/brain-maintenance/rules.md");
const changing = read("CHANGING", "knowledge/changing-and-deploying-a-cloud-brain-worker.md");
const guide = read("GUIDE", "knowledge/calling-a-cloud-brain-from-this-checkout.md");
const hub = read("HUB", "knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");
const tool = readFileSync(resolve(root, "tools/cloud-brain/worktree.sh"), "utf8");
// The header of worktree.sh, its reference: the lines its usage prints.
const header = tool.split("\n").slice(1, Number(/usage\(\) \{ sed -n '2,(\d+)p'/.exec(tool)?.[1] ?? 0)).join("\n");

// "Always" of rules.md, from its heading to the next.
const always = (() => {
  const from = rules.indexOf("\n## Always\n"), to = rules.indexOf("\n## ", from + 1);
  return from >= 0 && to > from ? flat(rules.slice(from, to)) : "";
})();

test("Always no longer lets an agent commit, build or push in the main checkout under the lock", () => {
  expect(always).not.toBe("");
  // The sentence may be quoted as what the line read until this change, and is no item of the list.
  expect(rules).not.toMatch(/^- Commit, build or push in the main checkout only while holding the landing lock/m);
  expect(always).toContain("- Write no tracked file of `lopecode-dev` in the main checkout");
  expect(always).toMatch(/no edit, no `build\.ts`, no `git commit`, `merge` or `pull` there/);
});

test("Always says where the work is, who makes the worktree, and names the three writes that remain", () => {
  expect(always).toContain("`.claude/worktrees/bm-<name>`");
  expect(always).toContain("`tools/cloud-brain/worktree.sh --fresh <topic> --for <token>`");
  expect(always).toMatch(/makes none and removes none/);
  expect(always).toMatch(/Three writes of the main checkout remain/);
  expect(always).toContain("`tools/cloud-brain/notebook-backup.sh`");
  expect(always).toMatch(/fast-forward pull of the main checkout and one of its `cloud-brain-dev`/);
  // The old sentence had the writer make its own worktree, one an issue.
  expect(always).not.toContain("are in its worktree (`tools/cloud-brain/worktree.sh <id>`)");
});

test("Always gives the landing as a push from the worktree under the landing lock, in order", () => {
  const order = [
    "`LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take land <who>`",
    "`tools/cloud-brain/worktree.sh --rebase <name>`",
    "`git push origin HEAD:main`",
    "`LOCK_TOKEN=<token> lock.sh release land <who>`",
  ];
  const at = order.map((s) => always.indexOf(s));
  expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
});

test("Always: what is staged, and which repository is pushed how", () => {
  expect(always).not.toContain("Push `lopebooks` and `lopecode-dev`.");
  expect(always).toMatch(/`git commit -a` and `git add -A`/);
  expect(always).toContain("`tools/cloud-brain/worktree.sh --push-dev <name>`");
  expect(always).toMatch(/no branch is made in the main checkout's copy/);
  expect(always).toMatch(/`bm\/<name>`, is local and is not pushed/);
});

test("each worktree.sh command the four docs name is one the tool's header has", () => {
  const named = new Set<string>();
  for (const text of [rules, changing, guide, hub]) for (const m of text.matchAll(/worktree\.sh (--[a-z-]+)/g)) named.add(m[1]);
  for (const flag of ["--fresh", "--rebase", "--push-dev", "--remove"]) expect(named.has(flag), flag).toBe(true);
  for (const flag of named) expect(header, flag).toContain(`# worktree.sh ${flag} `);
  expect(header).toContain("# worktree.sh <name> ");
  // `--for` is of --fresh, and the name `out-<name>` is one the tool takes.
  expect(header).toContain("# worktree.sh --fresh <name> [--for <token>]");
  expect(tool).toContain('case "$1" in ""|-*|*[!a-zA-Z0-9._-]*) usage ;; esac');
});

test("the guide to changing a Worker says where an agent of the loop does it, and that its build names --out", () => {
  const s = flat(changing);
  expect(s).toMatch(/Since 2026-10-12 an agent of the issue loop does these steps in a git worktree/);
  expect(s).toContain("`tools/cloud-brain/worktree.sh <name>`");
  expect(s).toContain("`bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`");
  expect(s).toContain("`git push origin HEAD:main`");
  expect(s).toContain("`BRAIN_STATE_DIR=<main checkout>/tools/cloud-brain/.emitted`");
  // What the guide says build.ts answers with no --out is what build.ts has.
  const build = readFileSync(resolve(root, "tools/cloud-brain/build.ts"), "utf8");
  const words = "in a worktree: pass --out tools/cloud-brain/.emitted/cloud-brain.html";
  expect(build).toContain(`throw new Error("${words}")`);
  expect(s).toContain("`" + words + "`");
});

test("the guide's part for a session outside the loop names a worktree of its own, landed by push", () => {
  const from = guide.indexOf("**A session outside the loop"), to = guide.indexOf("A health check that takes");
  const part = from >= 0 && to > from ? guide.slice(from, to) : "";
  expect(part).toMatch(/^W=\$\(tools\/cloud-brain\/worktree\.sh out-<name>\)/m);
  expect(part).toMatch(/^LOCK_TOKEN=out-xxxxxx tools\/cloud-brain\/lock\.sh take land out-<name>$/m);
  expect(part).toMatch(/^tools\/cloud-brain\/worktree\.sh --rebase out-<name>$/m);
  expect(part).toMatch(/^git -C "\$W" push origin HEAD:main$/m);
  expect(part).toMatch(/^LOCK_TOKEN=out-xxxxxx tools\/cloud-brain\/lock\.sh release land out-<name>$/m);
  // The loop leaves such a worktree: SKILL.md says so of the names its list prints.
  const skill = flat(readFileSync(resolve(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8"));
  expect(skill).toContain("`orch-*`, `over-*` and `out-*` are of no issue and are left");
  // The spec does not ask it of the owner's sessions, and the guide does not either.
  expect(flat(part)).toContain("the main checkout is his");
});

test("the hub's row for cloud-brain-dev names the push from a worktree", () => {
  const row = hub.split("\n").find((l) => l.startsWith("| `cloud-brain-dev/`: a submodule")) ?? "";
  expect(row).not.toBe("");
  expect(row).toContain("`tools/cloud-brain/worktree.sh --push-dev <name>`");
});

// cloud-brain-dev is a repository of its own: a clone in a worktree, absent from a checkout whose submodule was not
// initialised. The pointer of the commit that has this test names a commit of it with these lines.
const readme = process.env.README || resolve(root, "cloud-brain-dev/README.md");
const agents = process.env.AGENTS || resolve(root, "cloud-brain-dev/AGENTS.md");
if (!existsSync(readme) || !existsSync(agents)) {
  console.log(`skipped: wt-5-docs.test.ts, its test of cloud-brain-dev: no ${[readme, agents].filter((f) => !existsSync(f)).join(", ")}`);
} else {
  test("the README of cloud-brain-dev says how a change to it is landed from a worktree, and AGENTS.md names the tool", () => {
    const s = flat(readFileSync(readme, "utf8"));
    expect(s).toContain("lopecode-dev/tools/cloud-brain/worktree.sh --push-dev <name> ");
    expect(s).toContain("`loop-git`");
    expect(s).toMatch(/No branch is made in the main checkout's copy/);
    expect(s).toContain("you can use branches in the copy but not in the root one");
    const a = flat(readFileSync(agents, "utf8"));
    expect(a).not.toContain("Work in a copy of your own (`git worktree add`)");
    expect(a).toContain("`lopecode-dev/tools/cloud-brain/worktree.sh <name>`");
  });
}
