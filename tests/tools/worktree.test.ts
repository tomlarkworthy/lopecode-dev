// worktree.sh --rebase <id>: a writer's worktree brought up to main with the submodule links out of git's way.
// Issue worktree-rebase-and-state-gaps: `git rebase --continue` in a linked worktree stopped with
// "expected submodule path 'lopecode' not to be a symbolic link", and ORIG_HEAD after a rebase that did
// nothing still named the files of the one before.
//
//   cd tests/tools && bun test worktree.test.ts       # not from the repo root, see brain-cli.test.ts
//   WORKTREE_SH=/path/to/another/worktree.sh bun test …
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const script = process.env.WORKTREE_SH || resolve(import.meta.dir, "../../tools/cloud-brain/worktree.sh");
const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" };
const sh = (cwd: string, ...cmd: string[]) => {
  const p = Bun.spawnSync(cmd, { cwd, env });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
};
const git = (cwd: string, ...a: string[]) => {
  const r = sh(cwd, "git", ...a);
  if (r.code) throw new Error(`git ${a.join(" ")}: ${r.err}`);
  return r.out.trim();
};
const isLink = (p: string) => lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;

// A repository shaped like lopecode-dev where it matters: two submodules, a seed, another file, the script.
const repo = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "bm-worktree-")));
  mkdirSync(join(root, "tools/cloud-brain"), { recursive: true });
  mkdirSync(join(root, "tools/node_modules"));
  copyFileSync(script, join(root, "tools/cloud-brain/worktree.sh"));
  git(root, "init", "-q", "-b", "main", ".");
  let modules = "";
  for (const m of ["lopebooks", "lopecode"]) {
    git(root, "init", "-q", m);
    git(join(root, m), "commit", "-q", "--allow-empty", "-m", "first");
    modules += `[submodule "${m}"]\n\tpath = ${m}\n\turl = ./${m}\n`;
  }
  writeFileSync(join(root, ".gitmodules"), modules);
  writeFileSync(join(root, "seed.ojs"), "base\n");
  writeFileSync(join(root, "other.txt"), "base\n");
  git(root, "add", ".gitmodules", "seed.ojs", "other.txt", "tools/cloud-brain/worktree.sh", "lopebooks", "lopecode");
  git(root, "commit", "-q", "-m", "base");
  const wt = (...a: string[]) => sh(root, "bash", join(root, "tools/cloud-brain/worktree.sh"), ...a);
  // What every landing does on main: a file changes and the lopebooks pointer moves.
  const land = (file: string, text: string) => {
    git(join(root, "lopebooks"), "commit", "-q", "--allow-empty", "-m", "next");
    writeFileSync(join(root, file), text);
    git(root, "add", file, "lopebooks");
    git(root, "commit", "-q", "-m", "landed " + file);
  };
  const writer = (id: string, file = "seed.ojs") => {
    const w = wt(id).out.trim();
    writeFileSync(join(w, file), "mine\n");
    git(w, "add", file);
    git(w, "commit", "-q", "-m", "mine");
    return w;
  };
  return { root, wt, land, writer };
};
const linked = (w: string) => isLink(join(w, "lopebooks")) && isLink(join(w, "lopecode"));
const gitlinks = (w: string) => git(w, "ls-tree", "HEAD", "lopebooks", "lopecode").split("\n").every((l) => l.startsWith("160000 commit "));

test("a clean rebase prints what came in from main, keeps the links and the gitlinks", () => {
  const { wt, land, writer } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(r.out.trim().split("\n").sort()).toEqual(["lopebooks", "other.txt"]);
  expect(linked(w)).toBe(true);
  expect(gitlinks(w)).toBe(true);
  expect(git(w, "merge-base", "HEAD", "main")).toBe(git(w, "rev-parse", "main"));
});

test("a rebase that did nothing prints no file", () => {
  const { wt, land, writer } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  expect(wt("--rebase", "t1").code).toBe(0);
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(r.out.trim()).toBe("");
  expect(linked(w)).toBe(true);
});

test("a conflict stops with the links out; resolved and run again it finishes and prints the files", () => {
  const { wt, land, writer } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  land("seed.ojs", "theirs\n");
  const stop = wt("--rebase", "t1");
  expect(stop.code).not.toBe(0);
  expect(stop.out.trim()).toBe("");
  expect(stop.err).toContain("seed.ojs");
  expect(linked(w)).toBe(false);
  // The plain call does not put the links back while the rebase is stopped.
  expect(wt("t1").code).toBe(0);
  expect(linked(w)).toBe(false);
  // Run again with the conflict still there: it stops again and changes nothing.
  expect(wt("--rebase", "t1").code).not.toBe(0);
  writeFileSync(join(w, "seed.ojs"), "both\n");
  git(w, "add", "seed.ojs");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(r.out.trim().split("\n").sort()).toEqual(["lopebooks", "other.txt", "seed.ojs"]);
  expect(linked(w)).toBe(true);
  expect(gitlinks(w)).toBe(true);
  expect(git(w, "show", "HEAD:seed.ojs")).toBe("both");
  expect(git(w, "show", "--name-only", "--format=", "HEAD")).toBe("seed.ojs");
});

test("a commit that carries a link in a submodule's place is refused", () => {
  const { wt, land, writer } = repo();
  const w = writer("t1");
  writeFileSync(join(w, "other.txt"), "mine too\n");
  git(w, "commit", "-q", "-a", "-m", "with -a: the links go in");
  expect(gitlinks(w)).toBe(false);
  land("seed2.ojs", "theirs\n");
  const r = wt("--rebase", "t1");
  expect(r.code).not.toBe(0);
  expect(r.out.trim()).toBe("");
  expect(r.err).toContain("lopebooks");
});

test("--rebase of a worktree that does not exist stops", () => {
  const { wt } = repo();
  const r = wt("--rebase", "nobody");
  expect(r.code).not.toBe(0);
  expect(r.out.trim()).toBe("");
});

test("an uncommitted change stops it, with the links back and no file printed", () => {
  const { wt, land, writer } = repo();
  const w = writer("t1");
  writeFileSync(join(w, "other.txt"), "not committed\n");
  land("seed2.ojs", "theirs\n");
  const r = wt("--rebase", "t1");
  expect(r.code).not.toBe(0);
  expect(r.out.trim()).toBe("");
  expect(linked(w)).toBe(true);
  git(w, "checkout", "other.txt");
  expect(wt("--rebase", "t1").out.trim().split("\n").sort()).toEqual(["lopebooks", "seed2.ojs"]);
});

test("the worktree's own copy of the script acts on the main checkout's worktrees", () => {
  const { root, land, writer } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  const own = (...a: string[]) => sh(w, "bash", join(w, "tools/cloud-brain/worktree.sh"), ...a);
  expect(own("t1").out.trim()).toBe(w);
  const r = own("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(r.out.trim().split("\n").sort()).toEqual(["lopebooks", "other.txt"]);
  expect(lstatSync(join(w, ".claude"), { throwIfNoEntry: false })).toBeUndefined();
  expect(realpathSync(join(w, "lopebooks"))).toBe(join(root, "lopebooks"));
});
