// A run that loop.ts start began has WORK, SESSION and four LOOP_ names in its environment. A test that starts
// agent.sh with the caller's environment is then taken for a run in the caller's worktree: no `role:` line, no
// `checkout:` line. The two files below give agent.sh an environment with no WORK and no SESSION.
// Issue suite-fails-under-a-loop-started-run; tools/cloud-brain/records/suite-fails-under-a-loop-started-run.md.
//
//   bun test ./tests/tools/agent-sh-tests-own-env.test.ts
import { expect } from "bun:test";
import { resolve, join } from "node:path";

import { testNeeding } from "./needs.ts";

const root = resolve(import.meta.dir, "../..");
const agentSh = join(process.env.CLOUD_BRAIN_DEV || join(root, "cloud-brain-dev"), "agent.sh");
const FILES = ["reviewer-brief-names-token.test.ts", "reviewer-in-a-view.test.ts"];
// As loop.ts start sets them for a writer: WORK a directory, SESSION a UUID.
const RUN = { WORK: root, SESSION: "3a602f0d-d236-472c-abfa-d4802c678267", LOOP_TOKEN: "orch-000000", LOOP_RUN: join(root, "no-such-run"), LOOP_RUN_TOKEN: "impl-000000", LOOP_TS: join(root, "tools/cloud-brain/loop.ts") };

for (const f of FILES)
  testNeeding("agent-sh-tests-own-env.test.ts", [agentSh])(`${f} passes with the names of a started run in the caller's environment`, () => {
    const r = Bun.spawnSync(["bun", "test", "--timeout=30000", `./tests/tools/${f}`], { cwd: root, env: { ...process.env, ...RUN }, timeout: 80000 });
    const out = r.stdout.toString() + r.stderr.toString();
    expect(out).toMatch(/\n\s*0 fail\n/);
    expect(out).not.toMatch(/\n\s*0 pass\n/);
    expect(r.exitCode).toBe(0);
  }, 90000);
