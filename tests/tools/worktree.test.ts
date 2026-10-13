// worktree.sh: a worktree for a writer or a topic, made at origin/main, with cloud-brain-dev a clone of its own.
// Issue worktree-rebase-and-state-gaps: `git rebase --continue` in a linked worktree stopped with
// "expected submodule path 'lopecode' not to be a symbolic link", and ORIG_HEAD after a rebase that did
// nothing still named the files of the one before.
// Issue wt-2-worktree-sh (plan/cloud-brain-worktree-per-topic.md, check 6 and check 8): origin/main as the base,
// the clone, --fresh --for, --leave, --at, --list, --push-dev, --remove, and issue-as.sh from a worktree.
// Issue wt-3-land-by-push (the same spec, parts 1 to 3 and check 9): the commands the briefs and SKILL.md give for a
// landing and for the start of a pass are read out of those files and run here as they are written (the last part).
// Every case is a checkout made in a new temporary directory from a bare repository that stands for origin, with
// no file of the main checkout but the two scripts under test.
//
//   cd tests/tools && bun test worktree.test.ts       # not from the repo root, see brain-cli.test.ts
//   WORKTREE_SH=/path/to/another/worktree.sh ISSUE_AS_SH=… bun test …
import { test, expect } from "bun:test";
import { inFull, PAGES } from "./implementer-brief";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, lstatSync, realpathSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const TMP = realpathSync(tmpdir());
const script = process.env.WORKTREE_SH || resolve(import.meta.dir, "../../tools/cloud-brain/worktree.sh");
const issueAs = process.env.ISSUE_AS_SH || resolve(import.meta.dir, "../../tools/cloud-brain/issue-as.sh");
const { BRAIN_STATE_DIR: _s, BRAIN_BASE: _b, ISSUE_AS_BASE: _i, WORKTREE_GIT_TOKEN: _t, ...outer } = process.env;
const env: Record<string, string | undefined> = { ...outer, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" };
// A path that is empty is the directory the tests were started in, which is somebody's checkout: never a cwd here.
const sh = (cwd: string, ...cmd: string[]) => {
  if (!cwd.startsWith(TMP)) throw new Error(`not a scratch directory: '${cwd}' (${cmd.join(" ")})`);
  const p = Bun.spawnSync(cmd, { cwd, env });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
};
const git = (cwd: string, ...a: string[]) => {
  const r = sh(cwd, "git", ...a);
  if (r.code !== 0) throw new Error(`git ${a.join(" ")}: ${r.code} ${r.err}`);
  return r.out.trim();
};
// The path a call printed. A call that failed printed none, and "" joined with a file name is a file of the cwd.
const path = (r: { code: number | null; out: string; err: string }) => {
  if (r.code !== 0 || !r.out.trim().startsWith(TMP)) throw new Error(`no path: ${r.code} '${r.out}' ${r.err}`);
  return r.out.trim();
};
const isLink = (p: string) => lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
const MODS = ["lopebooks", "lopecode", "lopecode-plugin"];
const SECRET = "art_v1_SECRET-never-printed";

// A repository shaped like lopecode-dev where it matters: three submodules that are linked, cloud-brain-dev with an
// address of its own, a seed, another file, the scripts. `root` stands for the main checkout, `origin.git` for GitHub,
// `dev.git` for the cluster's git, `other` for another machine that lands.
const repo = () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "bm-worktree-")));
  const root = join(base, "root");
  const origin = join(base, "origin.git");
  const devOrigin = join(base, "dev.git");
  git(base, "init", "-q", "--bare", "-b", "main", origin);
  git(base, "init", "-q", "--bare", "-b", "main", devOrigin);
  // cloud-brain-dev: a tracked file under deploy/ that sync.ts writes over, as the real one has.
  const devSrc = join(base, "dev-src");
  mkdirSync(join(devSrc, "deploy"), { recursive: true });
  git(devSrc, "init", "-q", "-b", "main", ".");
  writeFileSync(join(devSrc, "agent.sh"), "one\n");
  writeFileSync(join(devSrc, "deploy/shared.js"), "committed\n");
  writeFileSync(join(devSrc, "sync.ts"), 'await Bun.write("deploy/shared.js", "read from " + process.argv[2] + "\\n");\n');
  git(devSrc, "add", ".");
  git(devSrc, "commit", "-q", "-m", "dev first");
  git(devSrc, "remote", "add", "origin", devOrigin);
  git(devSrc, "push", "-q", "origin", "main");

  mkdirSync(join(root, "tools/cloud-brain/.emitted"), { recursive: true });
  mkdirSync(join(root, "tools/node_modules"));
  copyFileSync(script, join(root, "tools/cloud-brain/worktree.sh"));
  copyFileSync(issueAs, join(root, "tools/cloud-brain/issue-as.sh"));
  chmodSync(join(root, "tools/cloud-brain/worktree.sh"), 0o755);
  chmodSync(join(root, "tools/cloud-brain/issue-as.sh"), 0o755);
  git(root, "init", "-q", "-b", "main", ".");
  let modules = "";
  for (const m of MODS) {
    git(root, "init", "-q", m);
    git(join(root, m), "commit", "-q", "--allow-empty", "-m", "first");
    modules += `[submodule "${m}"]\n\tpath = ${m}\n\turl = ./${m}\n`;
  }
  git(root, "clone", "-q", devOrigin, "cloud-brain-dev");
  modules += `[submodule "cloud-brain-dev"]\n\tpath = cloud-brain-dev\n\turl = ${devOrigin}\n`;
  writeFileSync(join(root, ".gitmodules"), modules);
  writeFileSync(join(root, ".gitignore"), "tools/node_modules/\n");
  writeFileSync(join(root, "tools/cloud-brain/.gitignore"), ".emitted/\n");
  writeFileSync(join(root, "seed.ojs"), "base\n");
  writeFileSync(join(root, "other.txt"), "base\n");
  git(root, "add", ".gitmodules", ".gitignore", "seed.ojs", "other.txt", "tools/cloud-brain", ...MODS, "cloud-brain-dev");
  git(root, "commit", "-q", "-m", "base");
  git(root, "remote", "add", "origin", origin);
  git(root, "push", "-q", "-u", "origin", "main");
  const other = join(base, "other");
  git(base, "clone", "-q", origin, other);

  const wt = (...a: string[]) => sh(root, "bash", join(root, "tools/cloud-brain/worktree.sh"), ...a);
  // What a landing on another machine does: a file changes and the lopebooks pointer moves. The main checkout's own
  // main is left where it was, so a base read from it and not from origin/main fails every case below.
  const land = (file: string, text: string) => {
    git(other, "pull", "-q", "--ff-only");
    git(join(root, "lopebooks"), "commit", "-q", "--allow-empty", "-m", "next");
    git(other, "update-index", "--cacheinfo", `160000,${git(join(root, "lopebooks"), "rev-parse", "HEAD")},lopebooks`);
    writeFileSync(join(other, file), text);
    git(other, "add", file);
    git(other, "commit", "-q", "-m", "landed " + file);
    git(other, "push", "-q", "origin", "main");
  };
  // A commit of cloud-brain-dev pushed to the cluster, with or without its pointer landed in lopecode-dev.
  const landDev = (text: string, pointer = true) => {
    git(devSrc, "pull", "-q", "--ff-only", "origin", "main");
    writeFileSync(join(devSrc, "agent.sh"), text);
    git(devSrc, "commit", "-q", "-a", "-m", "dev " + text.trim());
    git(devSrc, "push", "-q", "origin", "main");
    const sha = git(devSrc, "rev-parse", "HEAD");
    if (pointer) {
      git(other, "pull", "-q", "--ff-only");
      git(other, "update-index", "--cacheinfo", `160000,${sha},cloud-brain-dev`);
      git(other, "commit", "-q", "-m", "pointer");
      git(other, "push", "-q", "origin", "main");
    }
    return sha;
  };
  const made = (id: string) => {
    return path(wt(id));
  };
  const writer = (id: string, file = "seed.ojs") => {
    const w = made(id);
    writeFileSync(join(w, file), "mine\n");
    git(w, "add", file);
    git(w, "commit", "-q", "-m", "mine");
    return w;
  };
  const originMain = () => git(origin, "rev-parse", "main");
  return { base, root, origin, devOrigin, devSrc, other, wt, land, landDev, made, writer, originMain };
};
const linked = (w: string) => MODS.every((m) => isLink(join(w, m)));
const gitlinks = (w: string) => git(w, "ls-tree", "HEAD", ...MODS).split("\n").every((l) => l.startsWith("160000 commit "));
const lines = (s: string) => s.trim().split("\n").filter(Boolean).sort();
const pointer = (w: string) => git(w, "ls-tree", "HEAD", "cloud-brain-dev").split(/\s+/)[2];

// ---- --rebase, as before wt-2, with origin/main as the base ----

test("a clean rebase prints what came in from origin/main, keeps the links and the gitlinks", () => {
  const { root, wt, land, writer, originMain } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(lines(r.out)).toEqual(["lopebooks", "other.txt"]);
  expect(linked(w)).toBe(true);
  expect(gitlinks(w)).toBe(true);
  expect(git(w, "merge-base", "HEAD", "origin/main")).toBe(originMain());
  // The main checkout was not pulled: its main is one behind, and is not what the worktree stands on.
  expect(git(root, "rev-list", "--count", "main..origin/main")).toBe("1");
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
  expect(stop.code).toBe(1);
  expect(stop.out.trim()).toBe("");
  expect(stop.err).toContain("seed.ojs");
  expect(linked(w)).toBe(false);
  // The plain call does not put the links back while the rebase is stopped.
  expect(wt("t1").code).toBe(0);
  expect(linked(w)).toBe(false);
  // Run again with the conflict still there: it stops again and changes nothing.
  expect(wt("--rebase", "t1").code).toBe(1);
  writeFileSync(join(w, "seed.ojs"), "both\n");
  git(w, "add", "seed.ojs");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(lines(r.out)).toEqual(["lopebooks", "other.txt", "seed.ojs"]);
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
  expect(r.code).toBe(1);
  expect(r.out.trim()).toBe("");
  expect(r.err).toContain("lopebooks");
});

test("--rebase of a worktree that does not exist stops", () => {
  const { wt } = repo();
  const r = wt("--rebase", "nobody");
  expect(r.code).toBe(1);
  expect(r.out.trim()).toBe("");
});

test("an uncommitted change stops it, with the links back and no file printed", () => {
  const { wt, land, writer } = repo();
  const w = writer("t1");
  writeFileSync(join(w, "other.txt"), "not committed\n");
  land("seed2.ojs", "theirs\n");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(1);
  expect(r.out.trim()).toBe("");
  expect(linked(w)).toBe(true);
  git(w, "checkout", "other.txt");
  expect(lines(wt("--rebase", "t1").out)).toEqual(["lopebooks", "seed2.ojs"]);
});

test("the worktree's own copy of the script acts on the main checkout's worktrees", () => {
  const { root, land, writer } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  const own = (...a: string[]) => sh(w, "bash", join(w, "tools/cloud-brain/worktree.sh"), ...a);
  expect(own("t1").out.trim()).toBe(w);
  const r = own("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(lines(r.out)).toEqual(["lopebooks", "other.txt"]);
  expect(lstatSync(join(w, ".claude"), { throwIfNoEntry: false })).toBeUndefined();
  expect(realpathSync(join(w, "lopebooks"))).toBe(join(root, "lopebooks"));
});

// ---- origin/main as the base ----

test("a new worktree is made at origin/main after a fetch, not at the main checkout's main; lopecode-plugin is linked", () => {
  const { root, land, made, originMain } = repo();
  land("other.txt", "theirs\n");
  const was = git(root, "rev-parse", "main");
  const w = made("t1");
  expect(git(w, "rev-parse", "HEAD")).toBe(originMain());
  expect(git(w, "rev-parse", "HEAD")).not.toBe(was);
  expect(git(root, "rev-parse", "main")).toBe(was);
  expect(git(w, "symbolic-ref", "--short", "HEAD")).toBe("bm/t1");
  // No upstream: a bare `git push` in the worktree does not go to main by a default.
  expect(sh(w, "git", "rev-parse", "--abbrev-ref", "bm/t1@{upstream}").code).not.toBe(0);
  expect(linked(w)).toBe(true);
  expect(realpathSync(join(w, "lopecode-plugin"))).toBe(join(root, "lopecode-plugin"));
  expect(isLink(join(w, "tools/node_modules"))).toBe(true);
});

test("origin not reached: --rebase, --fresh and a new worktree are exit 2 and change nothing", () => {
  const { root, wt, writer } = repo();
  const w = writer("t1");
  const head = git(w, "rev-parse", "HEAD");
  git(root, "remote", "set-url", "origin", join(root, "no-such-repository.git"));
  for (const a of [["--rebase", "t1"], ["--fresh", "t1"], ["--fresh", "t2", "--for", "impl-000001"], ["t3"]]) {
    const r = wt(...a);
    expect([a.join(" "), r.code]).toEqual([a.join(" "), 2]);
    expect(r.out.trim()).toBe("");
  }
  expect(git(w, "rev-parse", "HEAD")).toBe(head);
  expect(linked(w)).toBe(true);
  expect(existsSync(join(root, ".claude/worktrees/bm-t2"))).toBe(false);
  expect(existsSync(join(root, ".claude/worktrees/bm-t3"))).toBe(false);
}, 60000);

// Step 10 as it was until wt-3-land-by-push. A writer that read the brief before that day still lands this way.
test("step 10 of the writer's brief as it was before wt-3 still lands: pull in the main checkout, --rebase, merge --ff-only, push", () => {
  const { root, wt, land, writer, originMain } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  git(root, "pull", "-q", "--ff-only");
  expect(wt("--rebase", "t1").code).toBe(0);
  git(root, "merge", "-q", "--ff-only", "bm/t1");
  git(root, "push", "-q", "origin", "main");
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  // Landed, so it is clean, and the plain --remove of step 10 takes it.
  const r = wt("--remove", "t1");
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(existsSync(w)).toBe(false);
});

test("--rebase says so when the main checkout's main has a commit origin/main has not", () => {
  const { root, wt, writer } = repo();
  writer("t1");
  writeFileSync(join(root, "other.txt"), "the owner's, not pushed\n");
  git(root, "commit", "-q", "-m", "not pushed", "other.txt");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(r.err).toContain("the main checkout's main has 1 commit(s) origin/main has not");
});

test("a landing by push from the worktree: refused while behind origin/main, taken after --rebase; the main checkout is not written", () => {
  const { root, wt, land, writer, originMain } = repo();
  const w = writer("t1");
  land("other.txt", "theirs\n");
  const before = originMain();
  const rootMain = git(root, "rev-parse", "main");
  const refused = sh(w, "git", "push", "origin", "HEAD:main");
  expect(refused.code).not.toBe(0);
  expect(refused.err).toContain("rejected");
  expect(originMain()).toBe(before);
  expect(wt("--rebase", "t1").code).toBe(0);
  expect(sh(w, "git", "push", "-q", "origin", "HEAD:main").code).toBe(0);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(git(w, "rev-list", "--count", `${before}..HEAD`)).toBe("1");
  expect(git(root, "rev-parse", "main")).toBe(rootMain);
  expect(git(root, "status", "--porcelain", "--untracked-files=no", "--ignore-submodules")).toBe("");
});

// ---- cloud-brain-dev is a clone ----

test("cloud-brain-dev in a worktree is a clone at the pointer, synced; the main checkout's copy gets no worktree and no branch", () => {
  const { root, devOrigin, made } = repo();
  const w = made("t1");
  const c = join(w, "cloud-brain-dev");
  expect(lstatSync(join(c, ".git")).isDirectory()).toBe(true);
  expect(git(c, "rev-parse", "HEAD")).toBe(pointer(w));
  expect(git(c, "config", "remote.origin.url")).toBe(devOrigin);
  expect(readFileSync(join(c, "agent.sh"), "utf8")).toBe("one\n");
  // sync.ts ran there, with the Brain's address.
  expect(readFileSync(join(c, "deploy/shared.js"), "utf8")).toBe("read from https://cb4.endpointservices.workers.dev\n");
  expect(lines(git(join(root, "cloud-brain-dev"), "worktree", "list")).length).toBe(1);
  expect(lines(git(join(root, "cloud-brain-dev"), "branch")).length).toBe(1);
  // A branch made in the clone is not one of the main checkout's copy.
  git(c, "checkout", "-q", "-b", "mine");
  expect(lines(git(join(root, "cloud-brain-dev"), "branch")).length).toBe(1);
});

test("the main checkout's push address is copied into the clone when it has one", () => {
  const { root, made } = repo();
  git(join(root, "cloud-brain-dev"), "config", "remote.origin.pushurl", "https://example.invalid/git/cb4/cloud-brain-dev.git");
  const w = made("t1");
  expect(git(join(w, "cloud-brain-dev"), "config", "remote.origin.pushurl")).toBe("https://example.invalid/git/cb4/cloud-brain-dev.git");
});

test("a clone that is there is fetched when the pointer names a commit pushed after it was made", () => {
  const { wt, landDev, made } = repo();
  const w = made("t1");
  const c = join(w, "cloud-brain-dev");
  const sha = landDev("two\n");
  expect(sh(c, "git", "cat-file", "-e", sha + "^{commit}").code).not.toBe(0);
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(lines(r.out)).toEqual(["cloud-brain-dev"]);
  expect(pointer(w)).toBe(sha);
  expect(git(c, "rev-parse", "HEAD")).toBe(sha);
  expect(readFileSync(join(c, "agent.sh"), "utf8")).toBe("two\n");
});

test("a clone with a commit of its own is left where it is by --rebase, and said", () => {
  const { wt, landDev, made } = repo();
  const w = made("t1");
  const c = join(w, "cloud-brain-dev");
  git(c, "checkout", "-q", "--", "deploy");
  writeFileSync(join(c, "notes.md"), "mine\n");
  git(c, "add", "notes.md");
  git(c, "commit", "-q", "-m", "mine");
  const mine = git(c, "rev-parse", "HEAD");
  landDev("two\n");
  const r = wt("--rebase", "t1");
  expect(r.code).toBe(0);
  expect(git(c, "rev-parse", "HEAD")).toBe(mine);
  expect(r.err).toContain("has commits of its own and is left at");
});

test("a worktree made before the clone, with a `git worktree` of the main checkout's copy, is still rebased and removed", () => {
  const { root, wt, landDev, made } = repo();
  const w = made("t1");
  const c = join(w, "cloud-brain-dev");
  sh(w, "rm", "-rf", c);
  mkdirSync(c);
  git(join(root, "cloud-brain-dev"), "worktree", "add", "-q", "--detach", c, pointer(w));
  expect(lstatSync(join(c, ".git")).isFile()).toBe(true);
  const sha = landDev("two\n");
  expect(wt("--rebase", "t1").code).toBe(0);
  expect(git(c, "rev-parse", "HEAD")).toBe(sha);
  expect(lstatSync(join(c, ".git")).isFile()).toBe(true);
  expect(wt("--remove", "t1").code).toBe(0);
  expect(existsSync(w)).toBe(false);
  expect(lines(git(join(root, "cloud-brain-dev"), "worktree", "list")).length).toBe(1);
});

// ---- --fresh, --for, --leave ----

const occupant = (root: string, id: string) => {
  const f = join(git(join(root, ".claude/worktrees/bm-" + id), "rev-parse", "--absolute-git-dir"), "bm-occupant");
  return existsSync(f) ? readFileSync(f, "utf8").trim() : null;
};

test("--fresh with no worktree makes one at origin/main and writes the occupant", () => {
  const { root, wt, land, originMain } = repo();
  land("other.txt", "theirs\n");
  const r = wt("--fresh", "topic", "--for", "impl-aaaaaa");
  expect(r.code).toBe(0);
  const w = path(r);
  expect(w).toBe(join(root, ".claude/worktrees/bm-topic"));
  expect(git(w, "rev-parse", "HEAD")).toBe(originMain());
  expect(occupant(root, "topic")).toBe("impl-aaaaaa");
  expect(linked(w)).toBe(true);
  expect(lstatSync(join(w, "cloud-brain-dev/.git")).isDirectory()).toBe(true);
});

test("--fresh of a clean worktree that is behind brings it up to origin/main; with no --for no occupant is written", () => {
  const { root, wt, land, landDev, made, originMain } = repo();
  const w = made("topic");
  land("other.txt", "theirs\n");
  const sha = landDev("two\n");
  expect(git(w, "rev-parse", "HEAD")).not.toBe(originMain());
  const r = wt("--fresh", "topic");
  expect([r.code, r.out.trim()]).toEqual([0, w]);
  expect(git(w, "rev-parse", "HEAD")).toBe(originMain());
  expect(git(w, "symbolic-ref", "--short", "HEAD")).toBe("bm/topic");
  expect(readFileSync(join(w, "other.txt"), "utf8")).toBe("theirs\n");
  expect(git(join(w, "cloud-brain-dev"), "rev-parse", "HEAD")).toBe(sha);
  expect(linked(w)).toBe(true);
  expect(gitlinks(w)).toBe(true);
  expect(occupant(root, "topic")).toBe(null);
  // sync.ts has written over a tracked file of deploy/ in the clone: that is not a change.
  expect(git(join(w, "cloud-brain-dev"), "status", "--porcelain")).toContain("deploy/shared.js");
  expect(wt("--fresh", "topic").code).toBe(0);
});

test("--fresh is exit 3, with the count on stderr and nothing touched, for each kind of unlanded work", () => {
  const dirty: [string, (w: string) => void, string][] = [
    ["a tracked file changed", (w) => writeFileSync(join(w, "seed.ojs"), "half way\n"), "changed=1 untracked=0 ahead=0 dev-changed=0 dev-ahead=0"],
    ["a tracked file staged", (w) => { writeFileSync(join(w, "seed.ojs"), "half way\n"); git(w, "add", "seed.ojs"); }, "changed=1 untracked=0 ahead=0 dev-changed=0 dev-ahead=0"],
    ["a new file", (w) => writeFileSync(join(w, "new.ojs"), "new\n"), "changed=0 untracked=1 ahead=0 dev-changed=0 dev-ahead=0"],
    ["a commit not on origin/main", (w) => { writeFileSync(join(w, "seed.ojs"), "mine\n"); git(w, "commit", "-q", "-m", "mine", "seed.ojs"); }, "changed=0 untracked=0 ahead=1 dev-changed=0 dev-ahead=0"],
    ["a file changed in the clone", (w) => writeFileSync(join(w, "cloud-brain-dev/agent.sh"), "half way\n"), "changed=0 untracked=0 ahead=0 dev-changed=1 dev-ahead=0"],
    ["a new file in the clone", (w) => writeFileSync(join(w, "cloud-brain-dev/new.md"), "new\n"), "changed=0 untracked=0 ahead=0 dev-changed=1 dev-ahead=0"],
    ["a commit in the clone", (w) => { const c = join(w, "cloud-brain-dev"); writeFileSync(join(c, "agent.sh"), "mine\n"); git(c, "commit", "-q", "-m", "mine", "agent.sh"); }, "changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=1"],
    ["a commit on a branch of the clone that HEAD has left", (w) => { const c = join(w, "cloud-brain-dev"); const at = git(c, "rev-parse", "HEAD"); git(c, "checkout", "-q", "-b", "mine"); writeFileSync(join(c, "agent.sh"), "mine\n"); git(c, "commit", "-q", "-m", "mine", "agent.sh"); git(c, "checkout", "-q", "--detach", at); }, "changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=1"],
  ];
  for (const [what, make, counts] of dirty) {
    const { root, wt, land, made } = repo();
    const w = made("topic");
    make(w);
    land("other.txt", "theirs\n");
    const head = git(w, "rev-parse", "HEAD");
    const r = wt("--fresh", "topic", "--for", "impl-aaaaaa");
    expect([what, r.code, r.out.trim()]).toEqual([what, 3, ""]);
    expect(r.err).toContain(counts);
    expect(git(w, "rev-parse", "HEAD")).toBe(head);
    expect(readFileSync(join(w, "other.txt"), "utf8")).toBe("base\n");
    expect(occupant(root, "topic")).toBe(null);
  }
}, 120000);

// The tracker's stand-in: a read with the secret of a token that has lapsed answers 401, any other 200.
const tracker = () => {
  const seen: string[] = [];
  const server = Bun.serve({
    port: 0, hostname: "127.0.0.1",
    fetch: (req) => {
      const tok = (req.headers.get("authorization") || "").replace("Bearer ", "");
      seen.push(tok + " " + new URL(req.url).pathname + new URL(req.url).search);
      return new Response(tok === "secret-lapsed" ? '{"error":"Unauthorized"}' : '{"issue":{}}', { status: tok === "secret-lapsed" ? 401 : 200 });
    },
  });
  return { base: `http://127.0.0.1:${server.port}`, seen, stop: () => server.stop(true) };
};
// Not spawnSync: the stand-in answers from this process.
const run = async (cwd: string, extra: Record<string, string>, ...cmd: string[]) => {
  if (!cwd.startsWith(TMP)) throw new Error(`not a scratch directory: '${cwd}'`);
  const p = Bun.spawn(cmd, { cwd, env: { ...env, ...extra }, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { code, out, err };
};
const tokens = (root: string, t: Record<string, string>) => writeFileSync(join(root, "tools/cloud-brain/.emitted/cb4-agent-tokens.json"), JSON.stringify(t));

test("one agent in a worktree: another token is exit 4 with nothing touched, the same token is taken, --leave frees it", async () => {
  const { root, land, made } = repo();
  const svc = tracker();
  try {
    tokens(root, { "impl-aaaaaa": "secret-a", "impl-bbbbbb": "secret-b" });
    const wt = (...a: string[]) => run(root, { ISSUE_AS_BASE: svc.base }, "bash", join(root, "tools/cloud-brain/worktree.sh"), ...a);
    const first = await wt("--fresh", "topic.2", "--for", "impl-aaaaaa");
    expect(first.code).toBe(0);
    const w = path(first);
    land("other.txt", "theirs\n");
    const head = git(w, "rev-parse", "HEAD");
    for (const a of [["--fresh", "topic.2", "--for", "impl-bbbbbb"], ["--fresh", "topic.2"]]) {
      const r = await wt(...a);
      expect([r.code, r.out.trim()]).toEqual([4, ""]);
      expect(r.err).toContain("occupied by impl-aaaaaa");
    }
    expect(git(w, "rev-parse", "HEAD")).toBe(head);
    expect(occupant(root, "topic.2")).toBe("impl-aaaaaa");
    // Asked of the tracker as the occupant, for the topic: .2 is off the name.
    expect(svc.seen).toEqual(["secret-a /xrpc/com.lopecode.brain.issue.get?id=topic", "secret-a /xrpc/com.lopecode.brain.issue.get?id=topic"]);
    // The occupant itself comes back (a resumed round): no question is asked, and it is brought up.
    const again = await wt("--fresh", "topic.2", "--for", "impl-aaaaaa");
    expect(again.code).toBe(0);
    expect(git(w, "rev-parse", "HEAD")).not.toBe(head);
    expect(svc.seen.length).toBe(2);
    expect((await wt("--leave", "topic.2")).code).toBe(0);
    expect(occupant(root, "topic.2")).toBe(null);
    const next = await wt("--fresh", "topic.2", "--for", "impl-bbbbbb");
    expect(next.code).toBe(0);
    expect(occupant(root, "topic.2")).toBe("impl-bbbbbb");
    expect(made("topic.2")).toBe(w);
  } finally { svc.stop(); }
}, 60000);

test("an occupant whose token is gone is taken over: no token of that name kept (exit 2), or a read that answers 401", async () => {
  for (const [what, kept, asked] of [["revoked", {}, 0], ["lapsed", { "impl-aaaaaa": "secret-lapsed" }, 1]] as [string, Record<string, string>, number][]) {
    const { root, land } = repo();
    const svc = tracker();
    try {
      tokens(root, { "impl-aaaaaa": "secret-a", "impl-bbbbbb": "secret-b" });
      const wt = (...a: string[]) => run(root, { ISSUE_AS_BASE: svc.base }, "bash", join(root, "tools/cloud-brain/worktree.sh"), ...a);
      const w = path(await wt("--fresh", "rev-topic", "--for", "impl-aaaaaa"));
      land("other.txt", "theirs\n");
      tokens(root, { ...kept, "impl-bbbbbb": "secret-b" });
      const r = await wt("--fresh", "rev-topic", "--for", "impl-bbbbbb");
      expect([what, r.code, r.out.trim()]).toEqual([what, 0, w]);
      expect(r.err).toContain("the occupant impl-aaaaaa is gone");
      expect(occupant(root, "rev-topic")).toBe("impl-bbbbbb");
      expect(readFileSync(join(w, "other.txt"), "utf8")).toBe("theirs\n");
      expect(svc.seen.length).toBe(asked);
      if (asked) expect(svc.seen[0]).toBe("secret-lapsed /xrpc/com.lopecode.brain.issue.get?id=topic");
    } finally { svc.stop(); }
  }
}, 60000);

test("an occupant that is gone does not make unlanded work free: exit 3, and the occupant's file stays", async () => {
  const { root } = repo();
  const svc = tracker();
  try {
    tokens(root, { "impl-aaaaaa": "secret-a" });
    const wt = (...a: string[]) => run(root, { ISSUE_AS_BASE: svc.base }, "bash", join(root, "tools/cloud-brain/worktree.sh"), ...a);
    const w = path(await wt("--fresh", "topic", "--for", "impl-aaaaaa"));
    writeFileSync(join(w, "seed.ojs"), "half way\n");
    tokens(root, {});
    const r = await wt("--fresh", "topic", "--for", "impl-bbbbbb");
    expect(r.code).toBe(3);
    expect(occupant(root, "topic")).toBe("impl-aaaaaa");
    expect(readFileSync(join(w, "seed.ojs"), "utf8")).toBe("half way\n");
  } finally { svc.stop(); }
});

test("--occupy writes the occupant of a worktree that holds unlanded work, which --fresh leaves at exit 3 with none; then another token is exit 4 and the work is as it was", async () => {
  const { root } = repo();
  const svc = tracker();
  try {
    tokens(root, { "impl-aaaaaa": "secret-a", "impl-bbbbbb": "secret-b" });
    const wt = (...a: string[]) => run(root, { ISSUE_AS_BASE: svc.base }, "bash", join(root, "tools/cloud-brain/worktree.sh"), ...a);
    const w = path(await wt("--fresh", "topic"));
    writeFileSync(join(w, "seed.ojs"), "half way\n");
    const head = git(w, "rev-parse", "HEAD");
    // As a start meets it: exit 3 and no occupant, then the writer of that work is written.
    expect([(await wt("--fresh", "topic", "--for", "impl-aaaaaa")).code, occupant(root, "topic")]).toEqual([3, null]);
    const r = await wt("--occupy", "topic", "impl-aaaaaa");
    expect([r.code, r.out.trim(), r.err, occupant(root, "topic")]).toEqual([0, w, "", "impl-aaaaaa"]);
    expect([git(w, "rev-parse", "HEAD"), readFileSync(join(w, "seed.ojs"), "utf8")]).toEqual([head, "half way\n"]);
    // The same token again; another token, while the first is taken by the tracker: exit 4, also from --fresh.
    expect((await wt("--occupy", "topic", "impl-aaaaaa")).code).toBe(0);
    const other = await wt("--occupy", "topic", "impl-bbbbbb");
    expect([other.code, other.out, occupant(root, "topic")]).toEqual([4, "", "impl-aaaaaa"]);
    expect(other.err).toContain("is occupied by impl-aaaaaa; nothing was touched");
    expect((await wt("--fresh", "topic", "--for", "impl-bbbbbb")).code).toBe(4);
    // Landed, and the writer waits for its review in a clean worktree: no second agent is put there.
    git(w, "checkout", "--", "seed.ojs");
    expect([(await wt("--fresh", "topic", "--for", "impl-bbbbbb")).code, occupant(root, "topic")]).toEqual([4, "impl-aaaaaa"]);
    // An occupant whose token is gone is taken over; --leave frees it.
    writeFileSync(join(w, "seed.ojs"), "half way\n");
    tokens(root, { "impl-bbbbbb": "secret-b" });
    const over = await wt("--occupy", "topic", "impl-bbbbbb");
    expect([over.code, occupant(root, "topic")]).toEqual([0, "impl-bbbbbb"]);
    expect(over.err).toContain("the occupant impl-aaaaaa is gone");
    expect([(await wt("--leave", "topic")).code, occupant(root, "topic")]).toEqual([0, null]);
    // No worktree of the name, no token, a token that is no name: nothing is written.
    expect((await wt("--occupy", "none", "impl-aaaaaa")).code).toBe(1);
    expect([(await wt("--occupy", "topic")).code, (await wt("--occupy", "topic", "a b")).code, (await wt("--occupy", "topic", "impl-aaaaaa", "more")).code, occupant(root, "topic")]).toEqual([2, 2, 2, null]);
  } finally { svc.stop(); }
}, 60000);

test("the tracker not reached is not a token that is gone: the occupant stays", async () => {
  const { root, made } = repo();
  tokens(root, { "impl-aaaaaa": "secret-a" });
  const w = made("topic");
  writeFileSync(join(git(w, "rev-parse", "--absolute-git-dir"), "bm-occupant"), "impl-aaaaaa\n");
  const r = await run(root, { ISSUE_AS_BASE: "http://127.0.0.1:1" }, "bash", join(root, "tools/cloud-brain/worktree.sh"), "--fresh", "topic", "--for", "impl-bbbbbb");
  expect(r.code).toBe(4);
  expect(occupant(root, "topic")).toBe("impl-aaaaaa");
});

// ---- --at ----

test("--at makes a detached view at a commit, with its clone and links; run again it is put at another commit and what was changed there is gone", () => {
  const { root, wt, land, landDev, originMain } = repo();
  const first = originMain();
  const a = wt("--at", first.slice(0, 12), "rev-t1");
  expect(a.code).toBe(0);
  const v = path(a);
  expect(v).toBe(join(root, ".claude/worktrees/bm-rev-t1"));
  expect(git(v, "rev-parse", "HEAD")).toBe(first);
  expect(sh(v, "git", "symbolic-ref", "-q", "HEAD").code).not.toBe(0);
  expect(lines(git(root, "branch")).length).toBe(1);
  expect(linked(v)).toBe(true);
  const c = join(v, "cloud-brain-dev");
  expect(git(c, "rev-parse", "HEAD")).toBe(pointer(v));
  // What a reader left: a changed file, a new file, a built file, a change in the clone.
  writeFileSync(join(v, "seed.ojs"), "a reader's\n");
  writeFileSync(join(v, "note.md"), "a reader's\n");
  writeFileSync(join(v, "tools/cloud-brain/.emitted/built.html"), "built\n");
  writeFileSync(join(c, "agent.sh"), "a reader's\n");
  writeFileSync(join(c, "note.md"), "a reader's\n");
  land("other.txt", "theirs\n");
  const sha = landDev("two\n");
  const second = originMain();
  // The commit is not in the main checkout yet: it is fetched.
  expect(sh(root, "git", "cat-file", "-e", second + "^{commit}").code).not.toBe(0);
  const b = wt("--at", second, "rev-t1");
  expect([b.code, b.out.trim()]).toEqual([0, v]);
  expect(git(v, "rev-parse", "HEAD")).toBe(second);
  expect(readFileSync(join(v, "seed.ojs"), "utf8")).toBe("base\n");
  expect(readFileSync(join(v, "other.txt"), "utf8")).toBe("theirs\n");
  expect(existsSync(join(v, "note.md"))).toBe(false);
  expect(linked(v)).toBe(true);
  expect(isLink(join(v, "tools/node_modules"))).toBe(true);
  expect(git(c, "rev-parse", "HEAD")).toBe(sha);
  expect(readFileSync(join(c, "agent.sh"), "utf8")).toBe("two\n");
  expect(existsSync(join(c, "note.md"))).toBe(false);
  expect(git(v, "status", "--porcelain", "--", "seed.ojs", "other.txt", "note.md")).toBe("");
}, 60000);

test("--at refuses a writer's worktree, and a commit that is nowhere", () => {
  const { wt, writer, originMain } = repo();
  const w = writer("t1");
  writeFileSync(join(w, "seed.ojs"), "half way\n");
  const head = git(w, "rev-parse", "HEAD");
  const r = wt("--at", originMain(), "t1");
  expect([r.code, r.out.trim()]).toEqual([1, ""]);
  expect(r.err).toContain("is on the branch bm/t1");
  expect(git(w, "rev-parse", "HEAD")).toBe(head);
  expect(readFileSync(join(w, "seed.ojs"), "utf8")).toBe("half way\n");
  const none = wt("--at", "0123456789abcdef0123456789abcdef01234567", "rev-t2");
  expect([none.code, none.out.trim()]).toEqual([1, ""]);
});

// ---- --list ----

test("--list names each bm-* worktree with its counts, its occupant, its branch and its head", () => {
  const { root, wt, land, writer, made, originMain } = repo();
  mkdirSync(join(root, ".claude/worktrees"), { recursive: true });
  expect(wt("--list").out).toBe("");
  const clean = made("clean");
  const w = writer("t1");
  writeFileSync(join(w, "new.ojs"), "new\n");
  writeFileSync(join(w, "tools/cloud-brain/.emitted/built.html"), "built\n");
  expect(wt("--fresh", "topic", "--for", "impl-aaaaaa").code).toBe(0);
  const view = path(wt("--at", originMain(), "rev-t1"));
  // A worktree that is not the loop's is not listed.
  git(root, "worktree", "add", "-q", join(root, ".claude/worktrees/someone-elses"), "-b", "theirs");
  land("other.txt", "theirs\n");
  const r = wt("--list");
  expect(r.code).toBe(0);
  const short = (p: string) => git(p, "rev-parse", "--short", "HEAD");
  expect(r.out.trim().split("\n")).toEqual([
    `clean clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=bm/clean head=${short(clean)}`,
    `rev-t1 clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=detached head=${short(view)}`,
    `t1 not-clean changed=0 untracked=1 ahead=1 dev-changed=0 dev-ahead=0 occupant=- branch=bm/t1 head=${short(w)}`,
    `topic clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=impl-aaaaaa branch=bm/topic head=${short(clean)}`,
  ]);
  // It read origin: the landing that came after is not counted as the worktrees' own, and nothing was moved.
  expect(git(root, "rev-parse", "origin/main")).toBe(originMain());
  expect(git(clean, "rev-list", "--count", "HEAD..origin/main")).toBe("1");
}, 60000);

test("--list says a stopped rebase", () => {
  const { wt, land, writer } = repo();
  writer("t1");
  land("seed.ojs", "theirs\n");
  expect(wt("--rebase", "t1").code).toBe(1);
  expect(wt("--list").out).toContain("t1 not-clean ");
  expect(wt("--list").out).toContain(" rebase=stopped ");
});

// ---- --remove ----

test("--remove refuses a worktree that is not clean, exit 3 with the counts; --force removes it with its branch and its clone", () => {
  const { root, wt, writer } = repo();
  const w = writer("t1");
  const r = wt("--remove", "t1");
  expect(r.code).toBe(3);
  expect(r.err).toContain("changed=0 untracked=0 ahead=1 dev-changed=0 dev-ahead=0");
  expect(existsSync(join(w, "seed.ojs"))).toBe(true);
  expect(git(root, "branch", "--list", "bm/t1")).not.toBe("");
  expect(wt("--remove", "t1", "--force").code).toBe(0);
  expect(existsSync(w)).toBe(false);
  expect(git(root, "branch", "--list", "bm/t1")).toBe("");
  expect(lines(git(root, "worktree", "list")).length).toBe(1);
});

test("--remove takes a clean worktree and a clean view, and keeps the main checkout's submodules", () => {
  const { root, wt, made, originMain } = repo();
  const w = made("t1");
  const v = path(wt("--at", originMain(), "rev-t1"));
  writeFileSync(join(w, "tools/cloud-brain/.emitted/built.html"), "built\n");
  expect(wt("--remove", "t1").code).toBe(0);
  expect(wt("--remove", "rev-t1").code).toBe(0);
  expect(existsSync(w)).toBe(false);
  expect(existsSync(v)).toBe(false);
  expect(git(root, "branch", "--list", "bm/t1")).toBe("");
  for (const m of [...MODS, "cloud-brain-dev"]) expect(existsSync(join(root, m, ".git"))).toBe(true);
  const none = wt("--remove", "t1");
  expect(none.code).toBe(1);
});

test("a name that is no name is refused before anything is read: exit 2", () => {
  const { root, wt, made } = repo();
  made("t1");
  for (const a of [["--remove"], ["--remove", ""], ["--remove", "../t1"], ["--remove", "t1", "--hard"], ["--rebase", "a/b"], ["--fresh", "t1", "--for"], ["--fresh", "t1", "--for", "a b"], ["--at", "HEAD"], ["--leave"], ["--push-dev", "t1", "--wet"], ["--nothing", "t1"], [], ["t1", "t2"], ["--list", "x"]]) {
    const r = wt(...a);
    expect([a.join(" "), r.code, r.out]).toEqual([a.join(" "), 2, ""]);
  }
  expect(existsSync(join(root, ".claude/worktrees/bm-t1/seed.ojs"))).toBe(true);
}, 60000);

// ---- --push-dev ----

const tokenProgram = (base: string) => {
  const f = join(base, "token.sh");
  writeFileSync(f, `#!/bin/bash\necho called >> "${base}/token-calls"\necho ${SECRET}\n`);
  chmodSync(f, 0o755);
  return { WORKTREE_GIT_TOKEN: f };
};
const calls = (base: string) => (existsSync(join(base, "token-calls")) ? lines(readFileSync(join(base, "token-calls"), "utf8")).length : 0);

test("--push-dev rebases the clone's commit on what the cluster has, pushes it to main, and commits the pointer in the worktree", () => {
  const { base, root, devOrigin, landDev, made } = repo();
  const w = made("t1");
  const c = join(w, "cloud-brain-dev");
  git(c, "checkout", "-q", "-b", "mine");
  writeFileSync(join(c, "notes.md"), "mine\n");
  git(c, "add", "notes.md");
  git(c, "commit", "-q", "-m", "mine");
  // Another writer's push, with no pointer yet in lopecode-dev.
  const theirs = landDev("two\n", false);
  const wt = (...a: string[]) => { const p = Bun.spawnSync(["bash", join(root, "tools/cloud-brain/worktree.sh"), ...a], { cwd: root, env: { ...env, ...tokenProgram(base) } }); return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() }; };
  const dry = wt("--push-dev", "t1", "--dry-run");
  expect([dry.code, dry.out, dry.code ? dry.err : ""]).toEqual([0, "", ""]);
  expect(git(devOrigin, "rev-parse", "main")).toBe(theirs);
  expect(git(w, "rev-list", "--count", "origin/main..HEAD")).toBe("0");
  expect(calls(base)).toBe(1);
  // A file the writer has staged is not swept into the pointer's commit.
  writeFileSync(join(w, "seed.ojs"), "staged, not committed\n");
  git(w, "add", "seed.ojs");
  const r = wt("--push-dev", "t1");
  expect(r.code).toBe(0);
  expect(git(w, "diff", "--cached", "--name-only")).toBe("seed.ojs");
  git(w, "reset", "-q", "--", "seed.ojs");
  git(w, "checkout", "--", "seed.ojs");
  const sha = r.out.trim();
  expect(git(devOrigin, "rev-parse", "main")).toBe(sha);
  expect(git(devOrigin, "rev-parse", "main~1")).toBe(theirs);
  expect(git(devOrigin, "show", "main:notes.md")).toBe("mine");
  expect(lines(git(devOrigin, "for-each-ref", "--format=%(refname)"))).toEqual(["refs/heads/main"]);
  expect(git(c, "rev-parse", "HEAD")).toBe(sha);
  expect(pointer(w)).toBe(sha);
  expect(git(w, "show", "--name-only", "--format=", "HEAD")).toBe("cloud-brain-dev");
  expect(git(w, "rev-list", "--count", "origin/main..HEAD")).toBe("1");
  expect(gitlinks(w)).toBe(true);
  expect(calls(base)).toBe(2);
  // deploy/ was read again after the push.
  expect(readFileSync(join(c, "deploy/shared.js"), "utf8")).toContain("read from ");
  // The token is in no output.
  expect(dry.out + dry.err + r.out + r.err).not.toContain(SECRET);
  // Run again: nothing to push, no token asked for, the same commit, no second pointer commit.
  const again = wt("--push-dev", "t1");
  expect([again.code, again.out.trim()]).toEqual([0, sha]);
  expect(calls(base)).toBe(2);
  expect(git(w, "rev-list", "--count", "origin/main..HEAD")).toBe("1");
  // The main checkout's copy has no branch and no worktree of it.
  expect(lines(git(join(root, "cloud-brain-dev"), "branch")).length).toBe(1);
  expect(lines(git(join(root, "cloud-brain-dev"), "worktree", "list")).length).toBe(1);
}, 60000);

test("--push-dev pushes nothing with a change that is not committed, with a conflict, or with no token", () => {
  const { base, root, devOrigin, landDev, made } = repo();
  const w = made("t1");
  const c = join(w, "cloud-brain-dev");
  const first = git(devOrigin, "rev-parse", "main");
  const wt = (extra: Record<string, string>, ...a: string[]) => { const p = Bun.spawnSync(["bash", join(root, "tools/cloud-brain/worktree.sh"), ...a], { cwd: root, env: { ...env, ...extra } }); return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() }; };
  writeFileSync(join(c, "agent.sh"), "mine\n");
  const open = wt(tokenProgram(base), "--push-dev", "t1");
  expect([open.code, open.out]).toEqual([1, ""]);
  expect(open.err).toContain("not committed");
  git(c, "commit", "-q", "-m", "mine", "agent.sh");
  // No token: the program prints nothing.
  writeFileSync(join(base, "none.sh"), "#!/bin/bash\nexit 1\n");
  chmodSync(join(base, "none.sh"), 0o755);
  const none = wt({ WORKTREE_GIT_TOKEN: join(base, "none.sh") }, "--push-dev", "t1");
  expect([none.code, none.out]).toEqual([1, ""]);
  expect(none.err).toContain("no write token");
  expect(git(devOrigin, "rev-parse", "main")).toBe(first);
  // The same line changed on the cluster: the rebase stops, and a second run says so too.
  const theirs = landDev("two\n", false);
  for (const _ of [1, 2]) {
    const r = wt(tokenProgram(base), "--push-dev", "t1");
    expect([r.code, r.out]).toEqual([1, ""]);
    expect(r.err).toContain("git rebase --continue");
  }
  expect(git(devOrigin, "rev-parse", "main")).toBe(theirs);
  expect(calls(base)).toBe(0);
  expect(pointer(w)).toBe(first);
}, 60000);

// ---- issue-as.sh from a worktree ----

test("issue-as.sh run from a worktree reads the main checkout's tokens; BRAIN_STATE_DIR names another place; a name not kept is exit 2", async () => {
  const { base, root, made } = repo();
  const svc = tracker();
  try {
    tokens(root, { "impl-aaaaaa": "secret-a" });
    const w = made("t1");
    const own = join(w, "tools/cloud-brain/issue-as.sh");
    // The worktree's own .emitted is there and has no token file.
    expect(existsSync(join(w, "tools/cloud-brain/.emitted"))).toBe(true);
    expect(existsSync(join(w, "tools/cloud-brain/.emitted/cb4-agent-tokens.json"))).toBe(false);
    const r = await run(w, { ISSUE_AS_BASE: svc.base }, own, "impl-aaaaaa", "get?id=x");
    expect([r.code, r.out, r.err]).toEqual([0, '{"issue":{}}', " [200]\n"]);
    expect(svc.seen).toEqual(["secret-a /xrpc/com.lopecode.brain.issue.get?id=x"]);
    const missing = await run(w, { ISSUE_AS_BASE: svc.base }, own, "impl-zzzzzz", "get?id=x");
    expect(missing.code).toBe(2);
    expect(missing.err).toContain("no token named impl-zzzzzz is kept; nothing was sent");
    const elsewhere = join(base, "state");
    mkdirSync(elsewhere);
    writeFileSync(join(elsewhere, "cb4-issues-tokens.json"), JSON.stringify({ "impl-zzzzzz": "secret-z" }));
    const named = await run(w, { ISSUE_AS_BASE: svc.base, BRAIN_STATE_DIR: elsewhere }, own, "impl-zzzzzz", "get?id=x");
    expect(named.code).toBe(0);
    expect((await run(w, { ISSUE_AS_BASE: svc.base, BRAIN_STATE_DIR: elsewhere }, own, "impl-aaaaaa", "get?id=x")).code).toBe(2);
    expect(svc.seen.length).toBe(2);
    expect(svc.seen[1]).toBe("secret-z /xrpc/com.lopecode.brain.issue.get?id=x");
  } finally { svc.stop(); }
});

test("issue-as.sh in no git repository reads .emitted beside itself", async () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-issue-as-")));
  const svc = tracker();
  try {
    mkdirSync(join(dir, ".emitted"));
    writeFileSync(join(dir, ".emitted/cb4-issues-tokens.json"), JSON.stringify({ t: "secret-t" }));
    copyFileSync(issueAs, join(dir, "issue-as.sh"));
    chmodSync(join(dir, "issue-as.sh"), 0o755);
    const r = await run(dir, { ISSUE_AS_BASE: svc.base, GIT_CEILING_DIRECTORIES: dir }, join(dir, "issue-as.sh"), "t", "get?id=x");
    expect(r.code).toBe(0);
    expect(svc.seen).toEqual(["secret-t /xrpc/com.lopecode.brain.issue.get?id=x"]);
  } finally { svc.stop(); }
});

test("the scripts name no path of one machine", () => {
  for (const f of [script, issueAs]) expect(readFileSync(f, "utf8")).not.toContain("/Users/");
});

// ---- wt-3-land-by-push: the commands of the briefs, read from the files and run as written ----
// A fenced block of a brief is taken by a command only it has, and each of its lines is run by bash in a scratch
// checkout with the placeholders filled in. A brief that loses the block, or changes a command so that it no longer
// does what the test sees, fails here. BRIEFS names another directory of briefs (the one before the change fails).
const BRIEFS = process.env.BRIEFS || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance");
// The writer's brief is read in full, its pages joined (tests/tools/implementer-brief.ts).
const brief = (f: string) => f === "agents/implementer.md" ? inFull(join(BRIEFS, "agents")) : readFileSync(join(BRIEFS, f), "utf8");
const flat = (t: string) => t.replace(/\s+/g, " ");
const fenced = (t: string) => [...t.matchAll(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```/gm)].map((m) => m[1].split("\n").map((l) => l.trim()).filter(Boolean));
const block = (f: string, has: string, not = "\u0000") => {
  const b = fenced(brief(f)).filter((l) => l.some((x) => x.includes(has)) && !l.some((x) => x.includes(not)));
  if (b.length !== 1) throw new Error(`${f}: ${b.length} fenced block(s) with '${has}', 1 wanted`);
  return b[0];
};
const fill = (line: string, subs: Record<string, string>) => Object.entries(subs).reduce((l, [k, v]) => l.split(k).join(v), line);
const bash = (cwd: string, line: string, subs: Record<string, string>) => sh(cwd, "bash", "-c", fill(line, subs));
const section = (t: string, from: string, to: string) => { const a = t.indexOf(from), b = t.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error(`no part from '${from}' to '${to}'`); return t.slice(a, b); };

test("SKILL.md step 1, the two pulls at the start of a pass: the main checkout and its cloud-brain-dev come up to origin, and check 9 reads 0 and exit 0", () => {
  const { root, land, landDev, originMain } = repo();
  const dev = join(root, "cloud-brain-dev");
  land("other.txt", "theirs\n");
  const sha = landDev("two\n");
  expect(git(root, "rev-parse", "main")).not.toBe(originMain());
  const check = block("SKILL.md", "merge-base --is-ancestor");
  expect(check.length).toBe(2);
  // Before the pulls the root copy has not fetched: the pointer of origin/main is a commit it lacks.
  git(root, "fetch", "-q", "origin", "main");
  expect(bash(root, check[1], { "<root>": root }).code).not.toBe(0);
  const pulls = block("SKILL.md", "cloud-brain-dev pull --ff-only", "checkout -- deploy");
  expect(pulls).toEqual(["git -C <root> pull --ff-only", "git -C <root>/cloud-brain-dev pull --ff-only"]);
  for (const l of pulls) expect([l, bash(root, l, { "<root>": root }).code]).toEqual([l, 0]);
  expect(git(root, "rev-parse", "main")).toBe(originMain());
  // The root's pull moved the pointer and not the submodule's files; the second pull did.
  expect(git(dev, "rev-parse", "HEAD")).toBe(sha);
  expect(bash(root, check[0], { "<root>": root }).out.trim()).toBe("0");
  expect(bash(root, check[1], { "<root>": root }).code).toBe(0);
});

// A landing of cloud-brain-dev that changes a tracked file under deploy/ and adds one there.
const landDeploy = (r: ReturnType<typeof repo>, files: Record<string, string>) => {
  git(r.devSrc, "pull", "-q", "--ff-only", "origin", "main");
  for (const [f, t] of Object.entries(files)) writeFileSync(join(r.devSrc, f), t);
  git(r.devSrc, "add", ".");
  git(r.devSrc, "commit", "-q", "-m", "dev deploy");
  git(r.devSrc, "push", "-q", "origin", "main");
  const sha = git(r.devSrc, "rev-parse", "HEAD");
  git(r.other, "pull", "-q", "--ff-only");
  git(r.other, "update-index", "--cacheinfo", `160000,${sha},cloud-brain-dev`);
  git(r.other, "commit", "-q", "-m", "pointer");
  git(r.other, "push", "-q", "origin", "main");
  return sha;
};

test("SKILL.md step 1, the pull of cloud-brain-dev refused for a file sync.ts wrote under deploy/: the four commands bring it up and deploy/ is read again", () => {
  const subs = (root: string) => ({ "<root>": root });
  const pulls = block("SKILL.md", "cloud-brain-dev pull --ff-only", "checkout -- deploy");
  const four = block("SKILL.md", "checkout -- deploy");
  const check = block("SKILL.md", "merge-base --is-ancestor");
  expect(four.length).toBe(4);
  // A tracked file that sync.ts wrote over, changed by the landing.
  {
    const r = repo(), dev = join(r.root, "cloud-brain-dev");
    sh(dev, "bun", "sync.ts", "before");
    expect(git(dev, "status", "--porcelain")).toBe("M deploy/shared.js");
    const sha = landDeploy(r, { "deploy/shared.js": "committed again\n" });
    expect(bash(r.root, pulls[0], subs(r.root)).code).toBe(0);
    const refused = bash(r.root, pulls[1], subs(r.root));
    expect(refused.code).not.toBe(0);
    expect(refused.err).toContain("would be overwritten");
    expect(bash(r.root, check[0], subs(r.root)).out.trim()).toBe("1");
    for (const l of four) { const x = bash(r.root, l, subs(r.root)); expect([l, x.code, x.code ? x.err : ""]).toEqual([l, 0, ""]); }
    expect(git(dev, "rev-parse", "HEAD")).toBe(sha);
    expect(readFileSync(join(dev, "deploy/shared.js"), "utf8")).toBe("read from https://cb4.endpointservices.workers.dev\n");
    expect(bash(r.root, check[0], subs(r.root)).out.trim()).toBe("0");
    expect(bash(r.root, check[1], subs(r.root)).code).toBe(0);
  }
  // A file sync.ts made that a landing has since added: untracked there. `checkout -- deploy` alone does not free the pull.
  {
    const r = repo(), dev = join(r.root, "cloud-brain-dev");
    writeFileSync(join(dev, "deploy/new.js"), "read from cb4\n");
    const sha = landDeploy(r, { "deploy/new.js": "committed\n" });
    expect(bash(r.root, pulls[0], subs(r.root)).code).toBe(0);
    const refused = bash(r.root, pulls[1], subs(r.root));
    expect(refused.code).not.toBe(0);
    expect(refused.err).toContain("untracked working tree files would be overwritten");
    expect(bash(r.root, four[0], subs(r.root)).code).toBe(0);
    expect(bash(r.root, pulls[1], subs(r.root)).code).not.toBe(0);
    for (const l of four.slice(1)) expect([l, bash(r.root, l, subs(r.root)).code]).toEqual([l, 0]);
    expect(git(dev, "rev-parse", "HEAD")).toBe(sha);
    expect(bash(r.root, check[0], subs(r.root)).out.trim()).toBe("0");
    expect(bash(r.root, check[1], subs(r.root)).code).toBe(0);
  }
}, 60000);

test("SKILL.md step 1, the main checkout's pull refused: a changed file the landing changes, or a commit that is not pushed; nothing is lost and the second pull still runs", () => {
  const pulls = block("SKILL.md", "cloud-brain-dev pull --ff-only", "checkout -- deploy");
  // Another session's edit, not committed, of a file a landing changed.
  {
    const r = repo();
    writeFileSync(join(r.root, "other.txt"), "the owner's, open\n");
    r.land("other.txt", "theirs\n");
    const sha = r.landDev("two\n");
    const main = git(r.root, "rev-parse", "main");
    const refused = bash(r.root, pulls[0], { "<root>": r.root });
    expect(refused.code).not.toBe(0);
    expect(refused.err).toContain("would be overwritten");
    expect(readFileSync(join(r.root, "other.txt"), "utf8")).toBe("the owner's, open\n");
    expect(git(r.root, "rev-parse", "main")).toBe(main);
    expect(bash(r.root, pulls[1], { "<root>": r.root }).code).toBe(0);
    expect(git(join(r.root, "cloud-brain-dev"), "rev-parse", "HEAD")).toBe(sha);
  }
  // A commit made in the main checkout and not pushed.
  {
    const r = repo();
    writeFileSync(join(r.root, "seed.ojs"), "the owner's, committed\n");
    git(r.root, "commit", "-q", "-m", "not pushed", "seed.ojs");
    const main = git(r.root, "rev-parse", "main");
    r.land("other.txt", "theirs\n");
    const refused = bash(r.root, pulls[0], { "<root>": r.root });
    expect(refused.code).not.toBe(0);
    expect(git(r.root, "rev-parse", "main")).toBe(main);
    expect(bash(r.root, pulls[1], { "<root>": r.root }).code).toBe(0);
  }
});

test("SKILL.md step 1, the health step reads seen.json as origin/main has it, which a main checkout that is behind does not", () => {
  const r = repo();
  const one = flat(section(brief("SKILL.md"), "\n1. **", "\n2. **"));
  const cmd = "git -C <root> show origin/main:tools/cloud-brain/seen.json";
  expect(one).toContain("`" + cmd + "`");
  expect(one).not.toContain("at the hash `tools/cloud-brain/seen.json` holds for it");
  writeFileSync(join(r.root, "other.txt"), "the owner's, open\n");
  r.land("other.txt", "theirs\n");
  r.land("tools/cloud-brain/seen.json", '{"brain-x-static":{"hash":"abc"}}\n');
  const pulls = block("SKILL.md", "cloud-brain-dev pull --ff-only", "checkout -- deploy");
  expect(bash(r.root, pulls[0], { "<root>": r.root }).code).not.toBe(0);
  expect(existsSync(join(r.root, "tools/cloud-brain/seen.json"))).toBe(false);
  expect(bash(r.root, cmd, { "<root>": r.root }).out).toBe('{"brain-x-static":{"hash":"abc"}}\n');
});

// lock.sh is held in the cluster: here a program that writes each call down and answers 0.
const lockStub = (base: string) => {
  const p = join(base, "lock-stub.sh");
  writeFileSync(p, `#!/bin/bash\necho "$LOCK_TOKEN $*" >> "${join(base, "lock-calls")}"\n`);
  chmodSync(p, 0o755);
  return p;
};

test("implementer.md step 10, a landing with no deploy, run as written: the lock, --rebase, a push of HEAD to main; the main checkout is not written and the worktree stays, clean", () => {
  const { base, root, wt, land, writer, originMain } = repo();
  const w = writer("topic-a");
  land("other.txt", "theirs\n");
  const rootMain = git(root, "rev-parse", "main");
  const steps = block("agents/implementer.md", "push origin HEAD:main", "update-index");
  expect(steps.map((l) => l.replace(/^LOCK_TOKEN=<token> /, "").replace("$W/tools/cloud-brain/", "").split(" ").slice(0, 2).join(" "))).toEqual(["lock.sh take", "worktree.sh --rebase", "lock.sh renew", "git -C", "lock.sh release"]);
  const subs = { "$W/tools/cloud-brain/lock.sh": lockStub(base), "$W": w, "<token>": "impl-000001", "<id>": "task-1", "<tree>": "topic-a" };
  for (const l of steps) { const x = bash(root, l, subs); expect([l, x.code]).toEqual([l, 0]); }
  expect(lines(readFileSync(join(base, "lock-calls"), "utf8"))).toEqual(["impl-000001 release land task-1", "impl-000001 renew land task-1", "impl-000001 take land task-1"]);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(git(w, "show", "HEAD:other.txt")).toBe("theirs");
  expect(git(w, "show", "HEAD:seed.ojs")).toBe("mine");
  expect(git(root, "rev-parse", "main")).toBe(rootMain);
  expect(git(root, "status", "--porcelain", "--untracked-files=no", "--ignore-submodules")).toBe("");
  // The writer removes nothing: the worktree is there, on its branch, with nothing unlanded.
  expect(existsSync(w)).toBe(true);
  expect(wt("--list").out).toMatch(/^topic-a clean changed=0 untracked=0 ahead=0 /m);
  const ten = flat(section(brief("agents/implementer.md"), "\n10. **", "\n11. **"));
  for (const gone of ["merge --ff-only bm/", "git -C <root> pull --ff-only", "worktree.sh --remove <id>", "worktree.sh --remove <tree>"]) expect(ten).not.toContain(gone);
}, 60000);

test("implementer.md step 10, the day's backup: the lopebooks pointer is committed in the worktree by the full sha, and lands with the links kept", () => {
  const { base, root, wt, writer, origin, originMain } = repo();
  const w = writer("topic-a");
  const lb = join(root, "lopebooks"), lbOrigin = join(base, "lopebooks.git");
  git(base, "init", "-q", "--bare", "-b", "main", lbOrigin);
  git(lb, "remote", "add", "origin", lbOrigin);
  const branch = git(lb, "symbolic-ref", "--short", "HEAD");
  git(lb, "push", "-q", "-u", "origin", "HEAD");
  // What notebook-backup.sh does on the day's first landing that builds: a commit in the main checkout's lopebooks.
  git(lb, "commit", "-q", "--allow-empty", "-m", "the day's backup");
  const sha = git(lb, "rev-parse", "HEAD");
  // The tool prints 8 characters of it, which update-index does not take.
  expect(sh(w, "git", "update-index", "--cacheinfo", `160000,${sha.slice(0, 8)},lopebooks`).code).not.toBe(0);
  const steps = block("agents/implementer.md", "update-index --cacheinfo");
  expect(steps.length).toBe(3);
  const subs = { "$W": w, "<root>": root, "<id>": "task-1", "<day>": "2026-10-12" };
  for (const l of steps) { const x = bash(root, l, subs); expect([l, x.code, x.code ? x.err : ""]).toEqual([l, 0, ""]); }
  expect(git(lbOrigin, "rev-parse", branch)).toBe(sha);
  expect(git(w, "show", "--name-only", "--format=", "HEAD")).toBe("lopebooks");
  expect(git(w, "ls-tree", "HEAD", "lopebooks")).toBe(`160000 commit ${sha}\tlopebooks`);
  expect(gitlinks(w)).toBe(true);
  expect(linked(w)).toBe(true);
  expect(sh(w, "git", "push", "-q", "origin", "HEAD:main").code).toBe(0);
  expect(git(origin, "ls-tree", "main", "lopebooks")).toBe(`160000 commit ${sha}\tlopebooks`);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(wt("--list").out).toMatch(/^topic-a clean changed=0 untracked=0 ahead=0 /m);
});

test("the briefs after wt-3: a writer is put in a worktree and does not make or remove one; the orchestrator assigns, writes it on the topic, frees and removes", () => {
  const impl = brief("agents/implementer.md"), spec = brief("agents/spec.md"), digest = brief("agents/digest.md"), skill = flat(brief("SKILL.md")), over = flat(brief("agents/overseer.md"));
  const resumed = flat(impl.slice(impl.indexOf("\n## A resumed round"), impl.indexOf("\n## A quick win")));
  expect(resumed).not.toContain("Make the worktree again");
  expect(resumed).not.toContain("diff --stat <sha> main");
  expect(resumed).toContain("git -C $W diff --stat <sha> origin/main");
  expect(resumed).toContain("git -C $W/cloud-brain-dev log --since=");
  expect(resumed).not.toContain("git -C <root>/cloud-brain-dev log");
  const specResumed = flat(spec.slice(spec.indexOf("\n## A resumed round")));
  expect(specResumed).not.toContain("Make the worktree again");
  expect(specResumed).not.toContain("the landing removed yours");
  expect(flat(spec)).toContain("git -C $W push origin HEAD:main");
  expect(flat(digest)).not.toContain("before the worktree goes");
  for (const has of [
    "tools/cloud-brain/worktree.sh --fresh <topic> --for <the agent's token>",
    '"key":"orch/<topic>/worktree-<n>"',
    'worktree {"topic":"<topic>","branch":"bm/<tree>","machine":"<hostname -s>","path":"<W>","at":"<sha of origin/main>","for":"<id>"}',
    "Working directory: <W>.",
    "Read <W>/.claude/skills/brain-maintenance/agents/<role>.md and follow it.",
    "tools/cloud-brain/worktree.sh --leave <tree>",
    "tools/cloud-brain/worktree.sh --list",
    "tools/cloud-brain/worktree.sh --remove <tree>",
    "worktree removed {",
    "tools/cloud-brain/worktree.sh --fresh orch-$(hostname -s)",
    "tools/cloud-brain/worktree.sh --fresh over-$(hostname -s) --for <its token>"
  ]) expect([has, skill.includes(has)]).toEqual([has, true]);
  expect(skill).not.toContain("A commit of your own in the main checkout is made between");
  expect(over).not.toContain("Writers land in the same checkout");
  expect(over).toContain("git -C $W push origin HEAD:main");
});

test("check 8: no brief and no tool of the landing names a path of one machine", () => {
  const tools = resolve(import.meta.dir, "../../tools/cloud-brain");
  const files = ["SKILL.md", "agents/digest.md", "agents/implementer.md", ...PAGES.map((p) => `agents/implementer/${p}.md`), "agents/overseer.md", "agents/reviewer.md", "agents/spec.md"].map((f) => join(BRIEFS, f))
    .concat(["worktree.sh", "lock.sh", "issue-as.sh", "notebook-backup.sh"].map((f) => join(tools, f)));
  for (const f of files) expect([f, readFileSync(f, "utf8").includes("/Users/")]).toEqual([f, false]);
});
