// Step 3 of the reviewer's brief waits for a landing by asking `lock.sh show land`, not by looking for the
// directory, and compares against a build of origin/main after a fetch. Issue lk-2-reviewer-brief-waits-on-show, task 2 of
// plan/cloud-brain-locks-held-in-the-cluster.md (R3's check of the Brain's copy).
//
//   bun test ./tests/tools/reviewer-brief-waits-on-show.test.ts
// The brief is a file of the Brain. The tests read the copy kept beside them (reviewer-brief.ts, which has why):
// BRIEF=<file> reads a file in its place, BRAIN=<address> what that Brain serves now.
// The last test runs the brief's own wait line on a stand-in lock.sh.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { briefOf } from "./reviewer-brief.ts";

const brief = () => briefOf();
const flat = (s: string) => s.replace(/\s+/g, " ");
const lines = (s: string, re: RegExp) => s.split("\n").filter((l) => re.test(l));
// step 3 alone: from its number to step 4's
const step3 = (s: string) => s.slice(s.indexOf("\n3. **"), s.indexOf("\n4. **"));
const waitLine = (s: string) => lines(s, /lock\.sh show land/)[0] ?? "";

test("the brief names neither lock directory (R3's grep, 0)", async () => {
  expect(lines(await brief(), /land\.lock|cb4\.lock/)).toEqual([]);
});

test("the wait asks lock.sh show land, on one line, and goes on at exit 1 only (R3's grep, 1)", async () => {
  const text = await brief();
  expect(lines(text, /lock\.sh show land/).length).toBe(1);
  const wait = waitLine(text).trim();
  expect(wait).toBe("until LOCK_TOKEN=<token> <checkout>/tools/cloud-brain/lock.sh show land >/dev/null 2>&1; [ $? -eq 1 ]; do sleep 20; done");
  expect(step3(text)).toContain(wait);
});

// Since notebook-commit-once-a-day a submit names no lopebooks commit: the notebook compared is a build of origin/main.
// Since wt-4-reviewer-in-a-view the reviewer is in a view: it moves that to origin/main, and its fetch stays out of the links.
test("after the wait it fetches and compares against a build of origin/main, not HEAD and not a lopebooks commit", async () => {
  const s = step3(await brief());
  expect(lines(s, /git -C <checkout> fetch/).map((l) => l.trim())).toEqual(["git -C <checkout> fetch --no-recurse-submodules origin main"]);
  expect(s).toContain("git merge-base --is-ancestor <sha> origin/main");
  expect(s).toContain("cd <checkout> && tools/cloud-brain/worktree.sh --at origin/main <view>");
  expect(s).toContain("bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html");
  expect(s).toContain("lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module <module>");
  expect(s).not.toMatch(/is-ancestor <sha> HEAD|show HEAD:|git -C (<checkout>\/)?lopebooks/);
  expect(s.indexOf("fetch --no-recurse-submodules origin main")).toBeGreaterThan(s.indexOf("lock.sh show land"));
});

test("it says what to do when the fetch fails", async () => {
  const s = flat(step3(await brief()));
  expect(s).toMatch(/When a fetch fails, compare against `HEAD`/);
  expect(s).toMatch(/say in the review that you did and what the fetch answered/);
});

// The line as the brief has it, with a lock.sh that answers exit 0 (held), then 2 (the call failed), then 1 (nobody).
test("the brief's wait line goes on after an exit 1, and after neither a 0 nor a 2", async () => {
  const wait = waitLine(await brief()).trim();
  expect(wait).not.toBe("");
  const dir = mkdtempSync(join(tmpdir(), "brief-wait-"));
  try {
    const tool = join(dir, "tools/cloud-brain");
    Bun.spawnSync(["mkdir", "-p", tool]);
    writeFileSync(join(dir, "codes"), "0\n2\n1\n");
    writeFileSync(
      join(tool, "lock.sh"),
      `#!/bin/bash\n[ "$1 $2" = "show land" ] || exit 9\nprintf '%s\\n' "$LOCK_TOKEN" >> "${dir}/tokens"\n` +
        `C=$(head -1 "${dir}/codes"); sed -i '' 1d "${dir}/codes" 2>/dev/null || sed -i 1d "${dir}/codes"\necho "$C" >> "${dir}/asked"; exit "\${C:-9}"\n`,
    );
    chmodSync(join(tool, "lock.sh"), 0o755);
    const cmd = wait.replaceAll("<checkout>", dir).replaceAll("<token>", "rev-3fa2c1").replace("sleep 20", "sleep 0.1");
    const r = Bun.spawnSync(["/bin/bash", "-c", `${cmd}; echo went-on`], { timeout: 10000 });
    expect(r.stdout.toString().trim()).toBe("went-on");
    expect(readFileSync(join(dir, "asked"), "utf8")).toBe("0\n2\n1\n");
    expect(readFileSync(join(dir, "tokens"), "utf8")).toBe("rev-3fa2c1\n".repeat(3));
    expect(existsSync(join(dir, "codes")) && readFileSync(join(dir, "codes"), "utf8")).toBe("");
  } finally {
    rmSync(dir, { recursive: true });
  }
});
