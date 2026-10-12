// Step 7 of the spec writer's brief attaches the spec to its issue before the move to spec-review, so the text
// is in the cluster with the issue (specs-kept-in-the-cluster; the owner's A of comment 4085, 2026-10-12).
// The brief is read as it is. The line that writes the body of the call is taken out of it and run on a file
// with an apostrophe, a quote, a CRLF and a letter outside ASCII: the text of the body is the file's bytes.
//
//   bun test ./tests/tools/spec-brief-attaches-the-spec.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dir, "../..");
const brief = () => readFileSync(resolve(root, ".claude/skills/brain-maintenance/agents/spec.md"), "utf8");
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

// Step 7: from its heading to the line after the list.
const step7 = () => {
  const text = brief();
  const from = text.indexOf("\n7. **");
  const to = text.indexOf("\nAfter the owner's approval");
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return text.slice(from, to);
};
const writes = () => step7().split("\n").map((l) => l.trim()).filter((l) => l.startsWith("python3 -c "));

test("step 7 attaches the spec before the move to spec-review", () => {
  const step = step7();
  const attach = step.indexOf("ia attach @<scratchpad>/<token>-attach.json");
  const move = step.indexOf('"to":"spec-review"');
  expect(attach).toBeGreaterThan(0);
  expect(move).toBeGreaterThan(attach);
  expect(step).toContain('"spec/<id>/attach-<round>"');
  expect(step).toContain('"cloud-brain-<id>-r<round>.md"');
  expect(step).toContain('"mimeType":"text/markdown"');
  // A name is taken once an issue: the round sent back attaches under its own.
  expect(step.slice(step.indexOf("Sent back"))).toContain("attach");
});

test("the name the brief gives is one issue.attach takes, for the longest id", () => {
  const name = `cloud-brain-${"a".repeat(40)}-r12.md`;
  expect(/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/.test(name)).toBe(true);
});

test("the brief's line writes a body whose text is the file's bytes", () => {
  const lines = writes();
  expect(lines.length).toBe(1);
  const dir = mkdtempSync(join(tmpdir(), "spec-attach-"));
  try {
    mkdirSync(join(dir, "plan"));
    const spec = "# A spec\r\n\nTom's words: \"keep them\" \\ café → $HOME `x`\n";
    writeFileSync(join(dir, "plan/cloud-brain-p1.md"), spec);
    const line = lines[0].split("<id>").join("p1").split("<round>").join("2").split("<scratchpad>").join(dir).split("<token>").join("spec-000000");
    expect(line).not.toMatch(/<[a-z]+>/);
    const run = spawnSync("zsh", ["-c", line], { env: { ...process.env, W: dir }, encoding: "utf8" });
    expect([run.status, run.stderr]).toEqual([0, ""]);
    const body = JSON.parse(readFileSync(join(dir, "spec-000000-attach.json"), "utf8"));
    expect(Object.keys(body).sort()).toEqual(["id", "key", "mimeType", "name", "text"]);
    expect({ ...body, text: "" }).toEqual({ key: "spec/p1/attach-2", id: "p1", name: "cloud-brain-p1-r2.md", mimeType: "text/markdown", text: "" });
    expect(sha(new TextEncoder().encode(body.text))).toBe(sha(readFileSync(join(dir, "plan/cloud-brain-p1.md"))));
  } finally {
    rmSync(dir, { recursive: true });
  }
});
