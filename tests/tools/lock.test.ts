// lock.sh take|release|show land|cb4 <who>: the landing lock and the deploy lock name their holder.
// Issue land-lock-any-session-can-remove: on 2026-10-11 15:25 a session ran
// `mkdir land.lock && …; rmdir land.lock`; the mkdir failed (a writer held the lock) and the rmdir
// after the `;` removed that writer's lock.
//
//   bun test ./tests/tools/lock.test.ts
//   LOCK_SH=/path/to/another/lock.sh bun test …
// Every case runs in a directory of its own (BRAIN_STATE_DIR), never the checkout's .emitted/.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = process.env.LOCK_SH || join(root, "tools/cloud-brain/lock.sh");
const fresh = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-lock-")));
  const sh = (cmd: string) => {
    const p = Bun.spawnSync(["bash", "-c", cmd], { env: { ...process.env, BRAIN_STATE_DIR: dir, LOCK: script } });
    return { code: p.exitCode, out: p.stdout.toString().trim(), err: p.stderr.toString().trim() };
  };
  const lock = (...a: string[]) => sh(`bash "$LOCK" ${a.join(" ")}`);
  return { dir, sh, lock };
};

test("take makes the directory rules.md names, with the holder in it", () => {
  const { dir, lock } = fresh();
  expect(lock("take", "land", "writer-a").code).toBe(0);
  expect(readFileSync(join(dir, "land.lock/holder"), "utf8").split("\t")[0]).toBe("writer-a");
  const shown = lock("show", "land");
  expect(shown.code).toBe(0);
  expect(shown.out).toContain("writer-a");
});

test("the slip of the issue: a session that failed to take the lock does not remove it", () => {
  const { dir, sh, lock } = fresh();
  expect(lock("take", "land", "writer-a").code).toBe(0);
  // The command as the session ran it, with the tool in place of mkdir and rmdir.
  const slip = sh(`bash "$LOCK" take land orchestrator && echo landed; bash "$LOCK" release land orchestrator`);
  expect(slip.out).not.toContain("landed");
  expect(slip.code).toBe(1);
  expect(slip.err).toContain("writer-a");
  expect(lock("show", "land").out).toContain("writer-a");
  // And as it was run that day, with a bare rmdir: the directory is not empty.
  expect(sh(`rmdir "${dir}/land.lock"`).code).not.toBe(0);
  expect(lock("show", "land").out).toContain("writer-a");
});

test("a second take is refused and names the holder", () => {
  const { lock } = fresh();
  lock("take", "land", "writer-a");
  const r = lock("take", "land", "writer-b");
  expect(r.code).toBe(1);
  expect(r.err).toContain("writer-a");
  const again = lock("take", "land", "writer-a");
  expect(again.code).toBe(1);
});

test("the holder releases, and the next writer takes", () => {
  const { dir, lock } = fresh();
  lock("take", "land", "writer-a");
  expect(lock("release", "land", "writer-a").code).toBe(0);
  expect(existsSync(join(dir, "land.lock"))).toBe(false);
  expect(lock("show", "land").code).toBe(1);
  expect(lock("take", "land", "writer-b").code).toBe(0);
});

test("a lock made with a bare mkdir is held by nobody the tool knows: no take, no release", () => {
  const { dir, lock } = fresh();
  mkdirSync(join(dir, "land.lock"));
  expect(lock("take", "land", "writer-a").code).toBe(1);
  const r = lock("release", "land", "writer-a");
  expect(r.code).toBe(1);
  expect(existsSync(join(dir, "land.lock"))).toBe(true);
  expect(lock("show", "land").out).toContain("bare mkdir");
});

test("a release with no lock is refused", () => {
  const { lock } = fresh();
  expect(lock("release", "land", "writer-a").code).toBe(1);
});

test("land and cb4 are two locks", () => {
  const { dir, lock } = fresh();
  expect(lock("take", "land", "writer-a").code).toBe(0);
  expect(lock("take", "cb4", "writer-a").code).toBe(0);
  expect(lock("release", "cb4", "writer-b").code).toBe(1);
  expect(lock("release", "cb4", "writer-a").code).toBe(0);
  expect(existsSync(join(dir, "land.lock/holder"))).toBe(true);
});

test("take --wait returns when the holder releases", async () => {
  const { dir, lock } = fresh();
  lock("take", "land", "writer-a");
  const p = Bun.spawn(["bash", script, "take", "land", "writer-b", "--wait", "0.2"], { env: { ...process.env, BRAIN_STATE_DIR: dir }, stderr: "ignore" });
  await Bun.sleep(500);
  expect(p.exitCode).toBe(null);
  expect(lock("release", "land", "writer-a").code).toBe(0);
  expect(await p.exited).toBe(0);
  expect(lock("show", "land").out).toContain("writer-b");
});

test("a call that names no lock, no holder or a holder with a space is a usage error", () => {
  const { dir, lock } = fresh();
  for (const a of [["take", "land"], ["take", "other", "writer-a"], ["release", "land"], ["take", "land", "'two words'"], ["steal", "land", "writer-a"], []])
    expect(lock(...a).code).toBe(2);
  expect(existsSync(join(dir, "land.lock"))).toBe(false);
});

// The briefs a writer may edit give the tool, and no bare rmdir of either lock. rules.md is the owner's and is not read here.
test("the briefs name lock.sh for both locks", () => {
  const read = (f: string) => readFileSync(join(root, f), "utf8");
  const briefs = [".claude/skills/brain-maintenance/agents/implementer.md", ".claude/skills/brain-maintenance/agents/overseer.md", "knowledge/working-with-cloud-brain-remote-lopecode-cluster.md"];
  for (const f of briefs) {
    const text = read(f);
    expect(text.includes("lock.sh take"), f + " names lock.sh take").toBe(true);
    expect(text.includes("lock.sh release"), f + " names lock.sh release").toBe(true);
    for (const line of text.split("\n")) expect(/`(mkdir|rmdir) [^`]*(land|cb4)\.lock`/.test(line), f + ": " + line).toBe(false);
  }
});
