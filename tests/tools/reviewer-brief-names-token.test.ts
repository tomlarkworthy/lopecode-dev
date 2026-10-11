// The reviewer's brief tells the reviewer to write with the token its task names, and with the role's token when
// the task names none. Issue ta-4-reviewer-brief-names-token, task 4 of plan/cloud-brain-record-names-token-not-agent.md.
//
//   bun test ./tests/tools/reviewer-brief-names-token.test.ts
// The brief has one copy, a public file of the Brain, so the first three tests read it over the network (no token).
// BRIEF=<file> reads a file in its place. The last test sends nothing: `claude` is a stand-in on PATH.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import { testNeeding } from "./needs.ts";

const root = resolve(import.meta.dir, "../..");
const agentSh = join(process.env.CLOUD_BRAIN_DEV || join(root, "cloud-brain-dev"), "agent.sh");
const url = `${process.env.BRAIN || "https://cb4.endpointservices.workers.dev"}/static/cloud-brain-dev/roles/reviewer.md`;
const brief = async () => {
  if (process.env.BRIEF) return readFileSync(process.env.BRIEF, "utf8");
  const r = await fetch(url);
  if (r.status !== 200) throw new Error(`${url} answered ${r.status}`);
  return r.text();
};
const flat = (s: string) => s.replace(/\s+/g, " ");

test("the brief says the token is the one the task names, and the role's when it names none", async () => {
  const text = flat(await brief());
  expect(text).toContain("the token your task names");
  expect(text).toMatch(/`issues-reviewer-2` when it names none/);
});

test("the role's token is named once, as the fallback, and in no command", async () => {
  const text = await brief();
  expect(text.match(/issues-reviewer-2/g)?.length).toBe(1);
  expect(text).not.toMatch(/issue-as\.sh issues-reviewer-2/);
});

test("the shorthand is defined with a name to write in, not a shell variable", async () => {
  const text = await brief();
  expect(text).toContain('ir() { tools/cloud-brain/issue-as.sh <token> "$@"; }');
  expect(text).not.toMatch(/issue-as\.sh "?\$\{?[A-Za-z]/);
});

// agent.sh is not changed by this task: the name reaches the reviewer in the task text, which it sends as given.
testNeeding("reviewer-brief-names-token.test.ts, its test of agent.sh", [agentSh])("agent.sh sends a task that names a token as its task line, whole", () => {
  const dir = mkdtempSync(join(tmpdir(), "brief-token-"));
  try {
    writeFileSync(join(dir, "claude"), `#!/bin/bash\nprintf '%s' "$2" > "${dir}/prompt"\necho '{"type":"result","session_id":"s","result":"ok","usage":{}}'\n`);
    chmodSync(join(dir, "claude"), 0o755);
    const task = "review issue some-issue; your token is rev-3fa2c1";
    const r = Bun.spawnSync([agentSh, "reviewer", task], {
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, CHECKOUT: root },
    });
    expect(r.exitCode).toBe(0);
    const lines = readFileSync(join(dir, "prompt"), "utf8").split("\n");
    expect(lines[0]).toBe("role: reviewer");
    expect(lines[lines.length - 1]).toBe(`task: ${task}`);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
