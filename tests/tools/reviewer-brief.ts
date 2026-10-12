// The reviewer's brief, for a test of this directory that holds lines of it.
//
// The brief is a file of the Brain (/static/cloud-brain-dev/roles/reviewer.md), changed by a put and not by a commit.
// Until suite-tests-read-the-live-brief each test fetched it, so the count of the suite at a commit changed with
// each put: a worktree behind origin/main failed tests of a brief it did not have (2026-10-12, three reports).
// A test now reads fixtures/reviewer-brief.md, the brief as cb4 served it on 2026-10-12 at 13:34:15 CEST
// (sha256 52bfc2e5…6a00a3, 37,481 bytes). It is what these tests hold, at their commit. No agent follows it.
//
//   BRIEF=<file> bun test …      a file in its place: the edited brief, before its put
//   BRAIN=<address> bun test …   what that Brain serves now (https://cb4.endpointservices.workers.dev), after it
// A change that puts the brief and changes a test of it writes the copy again, in the commit of the test:
//   curl -s https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md -o tests/tools/fixtures/reviewer-brief.md
// tools/cloud-brain/records/suite-tests-read-the-live-brief.md.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const KEPT = resolve(import.meta.dir, "fixtures/reviewer-brief.md");
export const PATH = "/static/cloud-brain-dev/roles/reviewer.md";

type Env = { BRIEF?: string; BRAIN?: string };
export const briefOf = async (env: Env = process.env): Promise<string> => {
  if (env.BRIEF) return readFileSync(env.BRIEF, "utf8");
  if (!env.BRAIN) return readFileSync(KEPT, "utf8");
  const url = env.BRAIN.replace(/\/+$/, "") + PATH;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (r.status !== 200) throw new Error(`${url} answered ${r.status}`);
  return r.text();
};
