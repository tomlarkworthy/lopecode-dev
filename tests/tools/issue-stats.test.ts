// issue-stats.ts: openers counted by the role of the token that opened, and the approve moves of the owner's
// session counted by their key. Issue ta-2-stats-by-prefix, R3 and R5 of plan/cloud-brain-record-names-token-not-agent.md.
//
//   bun test ./tests/tools/issue-stats.test.ts
// No call leaves the machine: the events are the list below.
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const tool = resolve(import.meta.dir, "../../tools/cloud-brain/issue-stats.ts");
const { report, role, text } = await import(tool);

const token = (name: string) => ({ caller: "owner", via: "delegation:b6559fa96c36", holder: `secret:${name}`, tab: false });
const session = { caller: "owner", via: "session", holder: "", tab: true };
let seq = 0;
const opened = (id: string, by: any, more: any = {}) => ({ seq: ++seq, key: `k${seq}`, type: "opened", id, kind: "bug", state: "open", labels: [], by, at: 1000 * seq, ...more });
const approve = (id: string, key: string, by: any = session, more: any = {}) => ({ seq: ++seq, key, type: "moved", id, move: "approve", from: "awaiting-approval", to: "approved", by, at: 1000 * seq, ...more });

const events = [
  opened("a", token("impl-3fa2c1")),
  opened("b", token("impl-3fa2c1")),
  opened("c", token("impl-90b7d2")),
  opened("d", token("rev-51aa0e")),
  opened("e", token("over-0000ff")),
  opened("f", token("orch-7c1e04")),
  opened("g", token("out-e4410b")),
  opened("h", token("issues-implementer-2")),
  opened("i", token("issues-implementer-2")),
  opened("j", token("issues-overseer-1")),
  opened("k", token("claude-mv2fpk63-c9a3")),
  opened("l", session),
  opened("m", { caller: "owner", via: "", holder: "", tab: false }),
  opened("test-n", token("impl-3fa2c1")),
  // The shape of the two keys on cb4: event 26, and event 577.
  approve("a", "b70df59c-a451-4541-b551-20e991515797"),
  approve("b", "93c56898-c968-435a-b7f0-c5e8896067db"),
  approve("c", "orch/verification-runs-are-not-kept/approve-for-owner-1"),
  approve("d", "orch/d/approve-for-owner-12"),
  approve("e", "orch/e/approve-for-owner-1"),
  approve("f", "tests/f/approve"),
  approve("g", "orch/g/approve-for-owner-1", token("orch-7c1e04")),
  approve("test-n", "orch/test-n/approve-for-owner-1"),
  approve("h", "da1fb7b8-0b55-476a-a433-edb96f799f07", session, { hidden: true }),
  { seq: ++seq, key: "8fafa15d-d0a7-4276-b9a8-5fbac11916cd", type: "moved", id: "i", move: "close", from: "open", to: "closed", by: session, at: 1000 * seq }
];

test("a name of the shape <role>-<6 hex> has that role; any other name is its own", () => {
  expect(["impl-3fa2c1", "rev-90b7d2", "spec-51aa0e", "over-0000ff", "dig-abcdef", "orch-7c1e04", "out-e4410b"].map(role)).toEqual(["impl", "rev", "spec", "over", "dig", "orch", "out"]);
  for (const name of ["issues-implementer-2", "issues-overseer-1", "claude-mv2fpk63-c9a3", "owner", "owner (token)", "impl-3fa2c", "impl-3fa2c1x", "impl-3FA2C1", "implement-3fa2c1", "loop-agents"]) expect(role(name)).toBe(name);
});

test("openers counts by the role, with the names under each (R3)", () => {
  const r = report(events, { now: 1e6 });
  expect(r.openers).toEqual({
    impl: { count: 3, names: { "impl-3fa2c1": 2, "impl-90b7d2": 1 } },
    rev: { count: 1, names: { "rev-51aa0e": 1 } },
    over: { count: 1, names: { "over-0000ff": 1 } },
    orch: { count: 1, names: { "orch-7c1e04": 1 } },
    out: { count: 1, names: { "out-e4410b": 1 } },
    "issues-implementer-2": { count: 2, names: { "issues-implementer-2": 2 } },
    "issues-overseer-1": { count: 1, names: { "issues-overseer-1": 1 } },
    "claude-mv2fpk63-c9a3": { count: 1, names: { "claude-mv2fpk63-c9a3": 1 } },
    owner: { count: 1, names: { owner: 1 } },
    "owner (token)": { count: 1, names: { "owner (token)": 1 } }
  });
  expect(r.issues).toBe(13);
});

test("--after counts the openers of the issues opened after that event", () => {
  expect(report(events, { now: 1e6, since: 10 }).openers).toEqual({
    "claude-mv2fpk63-c9a3": { count: 1, names: { "claude-mv2fpk63-c9a3": 1 } },
    owner: { count: 1, names: { owner: 1 } },
    "owner (token)": { count: 1, names: { "owner (token)": 1 } }
  });
});

test("approve moves of the session are counted by key: pressed, made for the owner, and neither (R5)", () => {
  const r = report(events, { now: 1e6 });
  expect(r.approveBySession).toEqual({ pressed: 2, madeForOwner: 3, other: [20] });
});

test("the count of approvals is of the whole record up to --until, whatever --after is", () => {
  expect(report(events, { now: 1e6, since: 10 }).approveBySession).toEqual({ pressed: 2, madeForOwner: 3, other: [20] });
  const r = report(events, { now: 1e6, until: 17 });
  expect(r.approveBySession).toEqual({ pressed: 2, madeForOwner: 1, other: [] });
  expect(r.events).toBe(17);
});

test("the lines printed: a role with its names under it, and the approve line", () => {
  const lines = text(report(events, { now: 1e6 }), {});
  const at = lines.findIndex((l: string) => /^openers\b/.test(l));
  expect(lines.slice(at + 1, at + 3)).toEqual(["  impl                       3  impl-3fa2c1 2, impl-90b7d2 1", "  rev                        1  rev-51aa0e 1"]);
  expect(lines).toContain("  issues-implementer-2       2");
  expect(lines).toContain("approve by the session: 2 pressed, 3 made for the owner; 1 with another key [20]");
  const none = text(report(events, { now: 1e6, until: 17 }), {});
  expect(none).toContain("approve by the session: 2 pressed, 1 made for the owner");
});
