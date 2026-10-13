// notebook-backup.sh: a landing writes the built notebook into lopebooks and commits it once a day.
// Issue notebook-commit-once-a-day; tools/cloud-brain/records/notebook-commit-once-a-day.md.
//
//   bun test ./tests/tools/notebook-backup.test.ts
// The tool runs on a repository made here (NOTEBOOK_REPO) with the day given (NOTEBOOK_TODAY); nothing of the
// checkout's lopebooks is read or written. The last three tests read the writer's brief and the knowledge doc.
import { test, expect } from "bun:test";
import { inFull } from "./implementer-brief";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TOOL = join(ROOT, "tools/cloud-brain/notebook-backup.sh");
const HTML = "notebooks/@tomlarkworthy_cloud-brain.html";
const JSON_ = "notebooks/@tomlarkworthy_cloud-brain.json";
const who = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
const sh = (cmd: string[], cwd: string, env: Record<string, string> = {}) => {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...who, ...env } });
  return { code: r.exitCode, out: r.stdout.toString().trim(), err: r.stderr.toString().trim() };
};
// A repository whose notebook was last committed at noon of `day`, local time.
const repo = (day: string | null) => {
  const dir = mkdtempSync(join(tmpdir(), "nb-backup-"));
  sh(["git", "init", "-q", "-b", "main"], dir);
  mkdirSync(join(dir, "notebooks"));
  writeFileSync(join(dir, "other.txt"), "x");
  if (day) writeFileSync(join(dir, HTML), "<html>one</html>\n");
  sh(["git", "add", "-A"], dir);
  const at = `${day || "2026-01-01"}T12:00:00`;
  sh(["git", "commit", "-q", "-m", "first"], dir, { GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at });
  return dir;
};
const built = (dir: string, text: string) => { const p = join(dir, "built.html"); writeFileSync(p, text); return p; };
const run = (dir: string, file: string, today: string) => sh(["bash", TOOL, file], ROOT, { NOTEBOOK_REPO: dir, NOTEBOOK_TODAY: today });
const count = (dir: string) => Number(sh(["git", "rev-list", "--count", "HEAD", "--", HTML], dir).out);
const dirty = (dir: string) => sh(["git", "status", "--porcelain", "--", "notebooks"], dir).out;

test("a second landing of a day writes the file and commits nothing", () => {
  const dir = repo("2026-10-11");
  try {
    const r = run(dir, built(dir, "<html>two</html>\n"), "2026-10-11");
    expect([r.code, r.out]).toEqual([0, "not due: last committed 2026-10-11"]);
    expect(readFileSync(join(dir, HTML), "utf8")).toBe("<html>two</html>\n");
    expect(count(dir)).toBe(1);
    expect(dirty(dir)).toBe(`M ${HTML}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the first landing of a later day commits it, with what the day before left uncommitted, and the next does not", () => {
  const dir = repo("2026-10-11");
  try {
    run(dir, built(dir, "<html>two</html>\n"), "2026-10-11");
    const r = run(dir, built(dir, "<html>three</html>\n"), "2026-10-12");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^committed [0-9a-f]{8} 2026-10-12$/);
    expect(count(dir)).toBe(2);
    expect(sh(["git", "show", `HEAD:${HTML}`], dir).out).toBe("<html>three</html>");
    expect(dirty(dir)).toBe("");
    expect(sh(["git", "log", "-1", "--format=%s"], dir).out).toMatch(/^cloud-brain: the notebook of 2026-10-12, built from the seeds of lopecode-dev@[0-9a-f]+ /);
    // the committer's clock is today's, so the day the tool reads back is the real one
    const real = sh(["date", "+%F"], dir).out;
    const again = run(dir, built(dir, "<html>four</html>\n"), real);
    expect([again.code, again.out]).toEqual([0, `not due: last committed ${real}`]);
    expect(count(dir)).toBe(2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a backup that is due and the same as the committed file makes no commit", () => {
  const dir = repo("2026-10-10");
  try {
    const r = run(dir, built(dir, "<html>one</html>\n"), "2026-10-12");
    expect([r.code, r.out]).toEqual([0, "same: last committed 2026-10-10"]);
    expect(count(dir)).toBe(1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a repository that never had the notebook gets it committed", () => {
  const dir = repo(null);
  try {
    const r = run(dir, built(dir, "<html>new</html>\n"), "2026-10-12");
    expect(r.out).toMatch(/^committed [0-9a-f]{8} 2026-10-12$/);
    expect(count(dir)).toBe(1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("only the notebook and its .json are committed, whatever else is staged", () => {
  const dir = repo("2026-10-10");
  try {
    writeFileSync(join(dir, "other.txt"), "changed");
    sh(["git", "add", "other.txt"], dir);
    writeFileSync(join(dir, JSON_), "{}\n");
    const r = run(dir, built(dir, "<html>two</html>\n"), "2026-10-12");
    expect(r.out).toMatch(/^committed /);
    expect(sh(["git", "show", "--name-only", "--format=", "HEAD"], dir).out.split("\n").sort()).toEqual([HTML, JSON_]);
    expect(sh(["git", "status", "--porcelain"], dir).out).toMatch(/^M  other\.txt/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a hook that writes the .json and refuses is met by a second try, which has the .json", () => {
  const dir = repo("2026-10-10");
  try {
    const hook = join(dir, ".git/hooks/pre-commit");
    writeFileSync(hook, `#!/bin/sh\n[ "$(cat '${JSON_}' 2>/dev/null)" = '{"synced":1}' ] && exit 0\necho '{"synced":1}' > '${JSON_}'\necho "spec written" >&2\nexit 1\n`);
    chmodSync(hook, 0o755);
    const r = run(dir, built(dir, "<html>two</html>\n"), "2026-10-12");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^committed /);
    expect(sh(["git", "show", `HEAD:${JSON_}`], dir).out).toBe('{"synced":1}');
    expect(dirty(dir)).toBe("");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a hook that always refuses is exit 3, with the file written and nothing committed", () => {
  const dir = repo("2026-10-10");
  try {
    const hook = join(dir, ".git/hooks/pre-commit");
    writeFileSync(hook, "#!/bin/sh\necho no >&2\nexit 1\n");
    chmodSync(hook, 0o755);
    const r = run(dir, built(dir, "<html>two</html>\n"), "2026-10-12");
    expect(r.code).toBe(3);
    expect(r.out).toBe("");
    expect(count(dir)).toBe(1);
    expect(readFileSync(join(dir, HTML), "utf8")).toBe("<html>two</html>\n");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("no build, an empty build and no argument are exit 1 and write nothing", () => {
  const dir = repo("2026-10-10");
  try {
    for (const file of [join(dir, "absent.html"), built(dir, ""), ""]) {
      const r = run(dir, file, "2026-10-12");
      expect([file, r.code, r.out]).toEqual([file, 1, ""]);
    }
    expect(readFileSync(join(dir, HTML), "utf8")).toBe("<html>one</html>\n");
    expect(count(dir)).toBe(1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// backup-committed-before-apply-answers (2026-10-13): a backup committed before an apply that was put back is the
// build of a version cb4 never ran, and it was never pushed. A repository with an origin, as the main checkout's
// lopebooks has: the tool takes back a backup commit of its own that origin does not have.
const withOrigin = (dir: string) => {
  const bare = mkdtempSync(join(tmpdir(), "nb-backup-origin-"));
  sh(["git", "init", "-q", "--bare", "-b", "main"], bare);
  sh(["git", "remote", "add", "origin", bare], dir);
  expect(sh(["git", "push", "-q", "-u", "origin", "main"], dir).code).toBe(0);
  return bare;
};
const ahead = (dir: string) => sh(["git", "log", "--format=%s", "origin/main..HEAD"], dir).out;
const head = (dir: string) => sh(["git", "rev-parse", "--short=8", "HEAD"], dir).out;

test("a backup that was committed and not pushed is taken back by the next run, which makes the day's backup of its own build", () => {
  const dir = repo("2026-10-10"), bare = withOrigin(dir);
  const real = sh(["date", "+%F"], dir).out;
  try {
    const first = run(dir, built(dir, "<html>never ran</html>\n"), real);
    expect(first.out).toMatch(/^committed [0-9a-f]{8} /);
    const never = head(dir);
    expect(ahead(dir)).toContain("cloud-brain: the notebook of");
    const r = run(dir, built(dir, "<html>ran</html>\n"), real);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(new RegExp(`^committed [0-9a-f]{8} ${real}$`));
    expect(r.err).toContain(`took back ${never}`);
    expect(sh(["git", "rev-parse", "HEAD~1"], dir).out).toBe(sh(["git", "rev-parse", "origin/main"], dir).out);
    expect(sh(["git", "show", `HEAD:${HTML}`], dir).out).toBe("<html>ran</html>");
    expect(sh(["git", "log", "--format=%h", "--abbrev=8"], dir).out).not.toContain(never);
    expect(dirty(dir)).toBe("");
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(bare, { recursive: true, force: true }); }
});

test("a backup taken back whose next build is the file origin has leaves nothing ahead of origin", () => {
  const dir = repo("2026-10-10"), bare = withOrigin(dir);
  try {
    run(dir, built(dir, "<html>never ran</html>\n"), "2026-10-12");
    const r = run(dir, built(dir, "<html>one</html>\n"), "2026-10-12");
    expect([r.code, r.out]).toEqual([0, "same: last committed 2026-10-10"]);
    expect(ahead(dir)).toBe("");
    expect(dirty(dir)).toBe("");
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(bare, { recursive: true, force: true }); }
});

test("--take-back undoes an unpushed backup with its .json, puts the committed notebook back, and keeps what else is staged", () => {
  const dir = repo("2026-10-10"), bare = withOrigin(dir);
  try {
    writeFileSync(join(dir, JSON_), "{}\n");
    writeFileSync(join(dir, "other.txt"), "changed");
    sh(["git", "add", "other.txt"], dir);
    expect(run(dir, built(dir, "<html>never ran</html>\n"), "2026-10-12").out).toMatch(/^committed /);
    const never = head(dir);
    const r = sh(["bash", TOOL, "--take-back"], ROOT, { NOTEBOOK_REPO: dir });
    expect([r.code, r.out]).toEqual([0, `took back ${never}`]);
    expect(ahead(dir)).toBe("");
    expect(readFileSync(join(dir, HTML), "utf8")).toBe("<html>one</html>\n");
    expect(sh(["git", "status", "--porcelain"], dir).out.split("\n").sort()).toEqual(["?? built.html", "?? " + JSON_, "M  other.txt"]);
    const again = sh(["bash", TOOL, "--take-back"], ROOT, { NOTEBOOK_REPO: dir });
    expect([again.code, again.out]).toEqual([0, "nothing to take back"]);
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(bare, { recursive: true, force: true }); }
});

test("a backup that was pushed is kept: the next run of the day is not due", () => {
  const dir = repo("2026-10-10"), bare = withOrigin(dir);
  const real = sh(["date", "+%F"], dir).out;
  try {
    run(dir, built(dir, "<html>two</html>\n"), real);
    const kept = head(dir);
    expect(sh(["git", "push", "-q"], dir).code).toBe(0);
    const r = run(dir, built(dir, "<html>three</html>\n"), real);
    expect([r.code, r.out, r.err]).toEqual([0, `not due: last committed ${real}`, ""]);
    expect(head(dir)).toBe(kept);
    const t = sh(["bash", TOOL, "--take-back"], ROOT, { NOTEBOOK_REPO: dir });
    expect([t.code, t.out, head(dir)]).toEqual([0, "nothing to take back", kept]);
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(bare, { recursive: true, force: true }); }
});

test("an unpushed commit that is not the tool's is not taken back: another subject, or another file in it", () => {
  for (const kind of ["subject", "file"]) {
    const dir = repo("2026-10-10"), bare = withOrigin(dir);
    const real = sh(["date", "+%F"], dir).out;
    try {
      writeFileSync(join(dir, HTML), "<html>by hand</html>\n");
      if (kind === "file") writeFileSync(join(dir, "other.txt"), "y");
      sh(["git", "add", "-A"], dir);
      sh(["git", "commit", "-q", "-m", kind === "file" ? "cloud-brain: the notebook of a day, and another file" : "an edit by hand"], dir);
      const kept = head(dir);
      const r = run(dir, built(dir, "<html>two</html>\n"), real);
      expect([kind, r.code, r.out, r.err]).toEqual([kind, 0, `not due: last committed ${real}`, ""]);
      const t = sh(["bash", TOOL, "--take-back"], ROOT, { NOTEBOOK_REPO: dir });
      expect([kind, t.out, head(dir)]).toEqual([kind, "nothing to take back", kept]);
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(bare, { recursive: true, force: true }); }
  }
});

test("a repository with no origin is run as before: --take-back finds nothing, and a second run of the day is not due", () => {
  const dir = repo("2026-10-10");
  const real = sh(["date", "+%F"], dir).out;
  try {
    run(dir, built(dir, "<html>two</html>\n"), real);
    const kept = head(dir);
    const t = sh(["bash", TOOL, "--take-back"], ROOT, { NOTEBOOK_REPO: dir });
    expect([t.code, t.out, head(dir)]).toEqual([0, "nothing to take back", kept]);
    expect(run(dir, built(dir, "<html>three</html>\n"), real).out).toBe(`not due: last committed ${real}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// wt-3-land-by-push: a landing runs the tool from its worktree and commits nothing in the main checkout, whose HEAD
// is then behind the seeds of the build. The message named the main checkout's HEAD until that change.
test("the backup's message names the commit of the checkout the tool is run from, a worktree's and not the main checkout's", () => {
  const dir = repo("2026-10-11");
  const main = mkdtempSync(join(tmpdir(), "nb-backup-checkout-"));
  try {
    sh(["git", "init", "-q", "-b", "main"], main);
    mkdirSync(join(main, "tools/cloud-brain"), { recursive: true });
    writeFileSync(join(main, "tools/cloud-brain/notebook-backup.sh"), readFileSync(TOOL));
    writeFileSync(join(main, "seed.ojs"), "base\n");
    sh(["git", "add", "-A"], main);
    sh(["git", "commit", "-q", "-m", "base"], main);
    const wt = join(main, "wt");
    expect(sh(["git", "worktree", "add", "-q", "-b", "bm/x", wt], main).code).toBe(0);
    writeFileSync(join(wt, "seed.ojs"), "the writer's\n");
    sh(["git", "commit", "-q", "-m", "mine", "seed.ojs"], wt);
    const mainHead = sh(["git", "rev-parse", "--short", "HEAD"], main).out, wtHead = sh(["git", "rev-parse", "--short", "HEAD"], wt).out;
    expect(mainHead).not.toBe(wtHead);
    const r = sh(["bash", "tools/cloud-brain/notebook-backup.sh", built(dir, "<html>two</html>\n")], wt, { NOTEBOOK_REPO: dir, NOTEBOOK_TODAY: "2026-10-12" });
    expect(r.out).toMatch(/^committed [0-9a-f]{8} 2026-10-12$/);
    const subject = sh(["git", "log", "-1", "--format=%s"], dir).out;
    expect(subject).toContain(`built from the seeds of lopecode-dev@${wtHead} `);
    expect(subject).not.toContain(mainHead);
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(main, { recursive: true, force: true }); }
});

const flat = (s: string) => s.replace(/\s+/g, " ");
const brief = () => inFull();
const step = (s: string, n: number) => s.slice(s.indexOf(`\n${n}. **`), s.indexOf(`\n${n + 1}. **`));

test("step 10 of the writer's brief hands the build to the tool and commits lopebooks only on `committed`", () => {
  const s = flat(step(brief(), 10));
  expect(s).toContain('tools/cloud-brain/notebook-backup.sh "$W/tools/cloud-brain/.emitted/cloud-brain.html"');
  expect(s).not.toContain("Commit `lopebooks` first");
  expect(s).not.toMatch(/&& cp tools\/cloud-brain\/\.emitted\/cloud-brain\.html/);
  expect(s).toMatch(/`not due: …` or `same: …`[^.]*no `lopebooks` commit/);
  expect(existsSync(TOOL)).toBe(true);
});

test("step 10 has the backup after the apply has answered, and a put-back with no backup", () => {
  const s = flat(step(brief(), 10));
  const apply = s.indexOf("brain.ts apply <id>-<worker>.json"), backup = s.indexOf('tools/cloud-brain/notebook-backup.sh "$W/tools/cloud-brain/.emitted/cloud-brain.html"');
  const pull = s.indexOf("git -C <root>/lopebooks pull --ff-only"), seen = s.indexOf("Commit `seen.json` in the worktree");
  expect(apply).toBeGreaterThan(0);
  expect(pull).toBeGreaterThan(apply);
  const renew = s.indexOf("lock.sh renew land <id>` once more");
  expect(renew).toBeGreaterThan(apply);
  expect(pull).toBeGreaterThan(renew);
  expect(backup).toBeGreaterThan(pull);
  expect(seen).toBeGreaterThan(backup);
  expect(s).toContain("notebook-backup.sh --take-back");
  expect(s).toMatch(/put back[^.]*: no build[^.]*no backup/);
  expect(s).toContain("git -C <root>/lopebooks log origin/main..HEAD");
});

test("step 12 asks for no lopebooks ref", () => {
  const s = step(brief() + "\n13. **", 12);
  expect(s).not.toContain('"value":"lopebooks@<sha>"');
  expect(flat(s)).toContain("the notebook of a change is the build of its `lopecode-dev` commit");
});

test("the knowledge doc says the seeds are the source and the committed notebook a daily backup", () => {
  const s = flat(readFileSync(join(ROOT, "knowledge/working-with-cloud-brain-remote-lopecode-cluster.md"), "utf8"));
  expect(s).not.toContain("The notebook (canonical, built, do not hand-edit)");
  expect(s).toContain("committed once a day as a backup");
});
