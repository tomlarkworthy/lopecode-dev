// The reviewer's brief, for a test of this directory that holds lines of it.
//
// The brief is a file of the Brain (/static/cloud-brain-dev/roles/reviewer.md), changed by a put and not by a commit.
// Until suite-tests-read-the-live-brief each test fetched it, so the count of the suite at a commit changed with
// each put: a worktree behind origin/main failed tests of a brief it did not have (2026-10-12, three reports).
// A test now reads fixtures/reviewer-brief.md, the brief as cb4 served it when the copy was last written: `git log` of
// that file has when and by whom, and `shasum -a 256` of it is the hash to hold against the Brain's. (This header named a hash and
// a time until kept-brief-copy-behind-holders-four, 2026-10-13, and was three puts behind that day.) It is what these
// tests hold, at their commit. No agent follows it.
//
//   BRIEF=<file> bun test …      a file in its place: the edited brief, before its put
//   BRAIN=<address> bun test …   what that Brain serves now (https://cb4.endpointservices.workers.dev), after it
// Who writes the copy again: whoever puts the brief, after the put and in a commit that is landed. An overseer does
// so as agents/overseer.md has it ("What you may do"); a writer whose task puts the brief, in the commit of its tests.
//   curl -sf https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md -o tests/tools/fixtures/reviewer-brief.md
//   BRAIN=https://cb4.endpointservices.workers.dev bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
// The second line fails when the copy is not what the Brain serves. No test of the suite does: with neither variable
// nothing is fetched, so a copy that is behind is seen by that line alone.
// tools/cloud-brain/records/suite-tests-read-the-live-brief.md, records/kept-brief-copy-behind-holders-four.md.
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
