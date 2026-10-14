// The hook scripts/learnings-gate.sh refused the write of a record, tools/cloud-brain/records/<id>.md, until
// knowledge/changing-and-deploying-a-cloud-brain-worker.md was read: the first trigger of that page was every write
// under tools/cloud-brain/. Since this change it is a write of a seed or a tool there (.ojs, .ts, .js, .sh, .py), and
// a record is asked for knowledge/working-with-cloud-brain-remote-lopecode-cluster.md alone, whose trigger stays.
// Issue learnings-gate-deploy-page-for-a-record.
//
//   bun test --timeout=30000 ./tests/tools/learnings-gate-deploy-page-for-a-record.test.ts
// LEARNINGS= names another knowledge directory's parent (a checkout with the pages before the change).
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dir, "../..");
const project = process.env.LEARNINGS || root;
const PAGE = "knowledge/changing-and-deploying-a-cloud-brain-worker.md";
const HUB = "knowledge/working-with-cloud-brain-remote-lopecode-cluster.md";
const tmp = mkdtempSync(join(tmpdir(), "learnings-gate-"));

// One run of the hook as Claude Code makes it, in a session that has read nothing: the pages it asks for.
function asked(tool: string, input: Record<string, string>) {
  const r = spawnSync("bash", [resolve(root, "scripts/learnings-gate.sh")], {
    input: JSON.stringify({ tool_name: tool, cwd: project, session_id: "test-gate", tool_input: input }),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: project,
      CLAUDE_CODE_SESSION_ID: "test-gate-read-nothing",
      TMPDIR: tmp,
      LEARNINGS_FIRE_LOG: join(tmp, "fires.tsv"),
    },
    encoding: "utf8",
  });
  const pages = [...r.stderr.matchAll(/^  - (knowledge\/\S+)$/gm)].map((m) => m[1]);
  return { status: r.status, pages };
}
const write = (path: string, tool = "Write") => asked(tool, { file_path: path });
const under = (rel: string) => resolve(project, "tools/cloud-brain", rel);

test("a record's write is asked for the hub page and not for the page on changing and deploying", () => {
  const r = write(under("records/some-issue.md"));
  expect(r.status).toBe(2);
  expect(r.pages).toContain(HUB);
  expect(r.pages).not.toContain(PAGE);
});

test("neither is a post mortem (by Write, Edit and MultiEdit), a digest's README, a measured record or a name that ends .ts.md", () => {
  for (const rel of ["post-mortems/pm-some.md", "digests/README.md", "spec-as-built.md", "records/a-tool.ts.md"])
    for (const tool of rel.startsWith("post-mortems") ? ["Write", "Edit", "MultiEdit"] : ["Write"]) {
      const r = write(under(rel), tool);
      expect([rel, tool, r.pages.includes(HUB), r.pages.includes(PAGE)]).toEqual([rel, tool, true, false]);
    }
});

test("a seed or a tool is still asked for both pages, at any depth and by a relative path", () => {
  const paths = ["brain-topic.ojs", "brain.ts", "land.sh", "hono.js", "merge-live.py", "fly/token-file.ts", "digests/2026-10-13.ojs"]
    .map(under)
    .concat(["tools/cloud-brain/build.ts"]);
  // Each tool name is tried on the first path, and Write on the rest: a run of the hook is about 0.75 s.
  for (const [i, path] of paths.entries())
    for (const tool of i ? ["Write"] : ["Write", "Edit", "MultiEdit"]) {
      const r = write(path, tool);
      expect([path, tool, r.status, r.pages.includes(HUB), r.pages.includes(PAGE)]).toEqual([path, tool, 2, true, true]);
    }
});

test("a file elsewhere is asked for neither, and the page's commands still ask for it", () => {
  const out = write(resolve(project, "tools/lope-reader.ts"));
  expect(out.pages).not.toContain(PAGE);
  expect(out.pages).not.toContain(HUB);
  for (const command of ["bun tools/cloud-brain/build.ts", "BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply x.json --reason=why"]) {
    const r = asked("Bash", { command });
    expect([command, r.status, r.pages.includes(PAGE)]).toEqual([command, 2, true]);
  }
});

test("the page's triggers pass the lint, and the hub's first trigger is as it was", () => {
  const lint = spawnSync("bash", [resolve(root, "scripts/check-learnings-triggers.sh"), "--learnings-dir", resolve(project, "knowledge")], { encoding: "utf8" });
  expect(lint.stdout + lint.stderr).toContain(" 0 error(s)");
  expect(lint.status).toBe(0);
  expect(readFileSync(resolve(project, HUB), "utf8")).toContain('  - "^(Edit|Write|MultiEdit) .*tools/cloud-brain/"\n');
});
