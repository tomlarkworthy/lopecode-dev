// rules.md wrote four lock.sh commands with no LOCK_TOKEN (Always: the landing lock and the deploy lock). Since
// lock-sh-default-token-r4 the script has no default token, so each of the four, run as written, sent nothing and
// was exit 2. Issue rules-md-lock-sh-lines-name-no-token.
//
//   bun test ./tests/tools/rules-md-lock-sh-lines-name-token.test.ts
// RULES=<file> reads that file in place of rules.md (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dir, "../..");
const rules = readFileSync(process.env.RULES || join(root, ".claude/skills/brain-maintenance/rules.md"), "utf8");

// The `…` spans of a text that are a lock.sh command: the script, a command it has, and the lock's name.
const commands = (text: string): string[] =>
  [...text.matchAll(/`([^`\n]*)`/g)].map((m) => m[1]).filter((s) => /lock\.sh (take|renew|release|show) (land|cb4)\b/.test(s));
const named = (command: string): boolean => /^LOCK_TOKEN=<token> (tools\/cloud-brain\/)?lock\.sh /.test(command);

test("the pattern reads the four commands the issue was filed about, and not the prose beside them", () => {
  const before =
    "  `tools/cloud-brain/lock.sh take land <who>`, and `lock.sh release land <who>` when done. The\n" +
    "- Deploy under the lock: `lock.sh take cb4 <who>`, apply, `lock.sh release cb4 <who>`. Exit 1\n";
  expect(commands(before)).toEqual([
    "tools/cloud-brain/lock.sh take land <who>", "lock.sh release land <who>", "lock.sh take cb4 <who>", "lock.sh release cb4 <who>"]);
  expect(commands(before).filter(named)).toEqual([]);
  expect(commands("which `lock.sh show` and the history trace to no issue; the lock is held in the cluster (`tools/cloud-brain/lock.sh`)")).toEqual([]);
  expect(named("LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take land <who>")).toBe(true);
  expect(named("LOCK_TOKEN=<token> lock.sh release cb4 <who>")).toBe(true);
  expect(named("LOCK_TOKEN= lock.sh release cb4 <who>")).toBe(false);
  expect(named("lock.sh release cb4 <who> LOCK_TOKEN=<token>")).toBe(false);
});

test("every lock.sh command of rules.md has LOCK_TOKEN=<token> before it", () => {
  const found = commands(rules);
  expect(found.length).toBeGreaterThanOrEqual(4);
  for (const lock of ["land", "cb4"]) for (const c of ["take", "release"]) expect(found.some((s) => s.includes(`lock.sh ${c} ${lock} `)), `${c} ${lock}`).toBe(true);
  expect(found.filter((s) => !named(s))).toEqual([]);
});

// Each command as rules.md writes it, with a name in place of <token> and of <who>, no LOCK_TOKEN in the environment,
// an empty state directory and an address nothing listens on: the script gets as far as looking for the token.
test("run as written, each command of rules.md passes the script's check for a token; nothing is sent", () => {
  const dir = mkdtempSync(join(tmpdir(), "rules-lock-"));
  try {
    const env: Record<string, string> = { PATH: process.env.PATH ?? "", BRAIN_STATE_DIR: dir, LOCK_BASE: "http://127.0.0.1:9", LOCK_DOCS: "0" };
    for (const written of commands(rules)) {
      const line = written.replace("<token>", "impl-000000").replace("<who>", "x").replace(/(tools\/cloud-brain\/)?lock\.sh /, `bash ${join(root, "tools/cloud-brain/lock.sh")} `);
      const run = spawnSync("bash", ["-c", line], { env, encoding: "utf8" });
      expect(run.stderr, written).not.toContain("no LOCK_TOKEN");
      expect(run.stderr, written).toContain("no token named impl-000000 is kept");
      expect(run.status, written).toBe(2);
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});
