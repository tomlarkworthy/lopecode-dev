// git-status-answers-in-a-worktree (2026-10-13): in a worktree made by worktree.sh the submodules are links, and
// `git status` stops on the first, exit 128. Two briefs said it fails and gave no form that answers; the judgment
// run's brief said nothing, and a judgment run could not confirm its worktree was unchanged.
// Held here: what git does with a link in a submodule's place, in a repository made for the test; and that the three
// briefs an agent in a worktree reads give the form that answers; and the overseer's, a fourth, since
// overseer-md-git-status-form (the last test).
//
//   bun test --timeout=30000 ./tests/tools/briefs-git-status-in-a-worktree.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, rmdirSync, symlinkSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { core, page } from "./implementer-brief";

const root = resolve(import.meta.dir, "../..");
const flat = (s: string) => s.replace(/\s+/g, " ");
const FORM = "`git status --short --ignore-submodules=all`";
const ERROR = "error: expected submodule path 'lopebooks' not to be a symbolic link";

test("with a link in a submodule's place git status is exit 128, and with --ignore-submodules=all it lists the changed and the untracked file, exit 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "git-status-worktree-"));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (cwd: string, ...args: string[]) =>
    spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "protocol.file.allow=always", ...args], { cwd, env, encoding: "utf8" });
  const ok = (cwd: string, ...args: string[]) => { const r = git(cwd, ...args); expect([args.join(" "), r.status, r.stderr]).toEqual([args.join(" "), 0, r.stderr]); };
  try {
    const sub = join(dir, "sub"), main = join(dir, "main"), wt = join(dir, "wt");
    for (const d of [sub, main]) { mkdirSync(d); ok(d, "init", "-q"); }
    writeFileSync(join(sub, "a"), "a\n"); ok(sub, "add", "a"); ok(sub, "commit", "-q", "-m", "a");
    writeFileSync(join(main, "kept"), "kept\n"); ok(main, "add", "kept"); ok(main, "submodule", "--quiet", "add", sub, "lopebooks"); ok(main, "commit", "-q", "-m", "main");
    ok(main, "worktree", "add", "-q", wt, "-b", "bm/wt");
    // as worktree.sh leaves it: the submodule's empty directory is a link to the main checkout's
    rmdirSync(join(wt, "lopebooks")); symlinkSync(join(main, "lopebooks"), join(wt, "lopebooks"));
    writeFileSync(join(wt, "kept"), "changed\n"); writeFileSync(join(wt, "new"), "new\n");

    const plain = git(wt, "status", "--short");
    expect([plain.status, plain.stdout, plain.stderr.trim()]).toEqual([128, "", ERROR]);
    const form = git(wt, "status", "--short", "--ignore-submodules=all");
    expect([form.status, form.stdout, form.stderr]).toEqual([0, " M kept\n?? new\n", ""]);
    // the two diffs start.md names: the link is listed as a change, and is not with the flag
    expect(git(wt, "diff", "--stat", "HEAD").stdout).toContain("lopebooks");
    const diff = git(wt, "diff", "--stat", "--ignore-submodules=all", "HEAD");
    expect([diff.status, diff.stdout.includes("lopebooks"), diff.stdout.includes("kept")]).toEqual([0, false, true]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("agents/implementer.md gives the form in \"Where you work\", beside the commands that work there, and does not say status fails with no more", () => {
  const text = core();
  const part = flat(text.slice(text.indexOf("\n## Where you work\n"), text.indexOf("\n## Steps\n")));
  expect(part).toContain(FORM);
  expect(part).not.toContain("`git status` fails in the worktree");
  for (const s of ["`git diff`, `git add <file>` and `git commit` work", "Never `git commit -a` or `git add -A`", "`git fetch --no-recurse-submodules origin`"]) expect(part).toContain(s);
  expect([...text].length).toBeLessThanOrEqual(20000);
});

test("the page start.md gives the form, the error of the plain command, and the diff that does not list the links", () => {
  const text = flat(page("start"));
  for (const s of [FORM, "`" + ERROR + "`", "exit 128", "`git diff --stat --ignore-submodules=all HEAD`"]) expect(text).toContain(s);
  expect(text).not.toContain("`git status` fails in the worktree (`lopebooks`, `lopecode` and `lopecode-plugin` are links); `git diff`");
});

test("agents/orchestrator.md gives the form in its own part, above \"A quick win\"", () => {
  const text = readFileSync(join(root, ".claude/skills/brain-maintenance/agents/orchestrator.md"), "utf8");
  const own = flat(text.slice(text.indexOf("\n## Your prompt, and your token\n"), text.indexOf("\n## A quick win\n")));
  expect(own.length).toBeGreaterThan(1000);
  for (const s of [FORM, "`" + ERROR + "`"]) expect(own).toContain(s);
});

// overseer-md-git-status-form (2026-10-13): the overseer commits in a worktree too, and its brief had no line of it.
test("agents/overseer.md gives the form in \"What you may do\", after the line that says which files it edits, with the error and the staging by name", () => {
  const text = readFileSync(process.env.OVERSEER || join(root, ".claude/skills/brain-maintenance/agents/overseer.md"), "utf8");
  const part = flat(text.slice(text.indexOf("\n## What you may do\n"), text.indexOf("\n## Finish\n")));
  expect(part.length).toBeGreaterThan(1000);
  const at = part.indexOf("The briefs and `oversight.md` you edit are the files of `$W`. `git status` in `$W` is " + FORM);
  expect(at).toBeGreaterThan(-1);
  const line = part.slice(at, part.indexOf("Each commit, or several, is landed by a push from it", at));
  for (const s of ["`" + ERROR + "`", "exit 128", "stage each file by its name"]) expect(line).toContain(s);
});
