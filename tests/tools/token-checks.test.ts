// token-checks.ts: the checks of R1 and of the parent of plan/cloud-brain-record-names-token-not-agent.md, made from a
// list of events. Issue ta-6-checks-after-three-issues.
//
//   bun test ./tests/tools/token-checks.test.ts
// No call leaves the machine but in the last test, which runs the tool with no token and sees that it sends nothing.
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const tool = resolve(import.meta.dir, "../../tools/cloud-brain/token-checks.ts");
const { checks, passed, text } = await import(tool);

const by = (name: string) => ({ caller: "owner", via: "delegation:x", holder: `secret:${name}`, tab: false });
const owner = { caller: "owner", via: "session", holder: "", tab: true };
const record = () => {
  let seq = 0;
  const list: any[] = [];
  const add = (e: any) => (list.push({ seq: ++seq, key: `k/${seq}`, id: "a", at: 1000 * seq, ...e }), list.at(-1));
  return {
    list,
    ev: (name: string, more: any = {}) => add({ type: "commented", by: by(name), ...more }),
    start: (name: string, id = "a") => add({ type: "moved", move: "start", id, by: by(name) }),
    cost: (writer: string, token?: string, agent?: string, session = "s1") => add({ type: "cost", key: `cost/a/${seq}`, by: by(writer), token, agent, session }),
    costComment: (writer: string, body: any) => add({ type: "commented", key: `cost-a-${seq}`, by: by(writer), body: `cost ${JSON.stringify(body)}` }),
    session: () => add({ type: "commented", by: owner }),
  };
};

// A record where every check passes: the old tokens stop before the first round, each agent's token is on a cost line.
const good = () => {
  const r = record();
  r.ev("issues-implementer-2");
  r.start("impl-aaaaaa", "r6-check-task-ta-1b"); // 2: not a round
  r.ev("issues-reviewer-2"); // 3
  r.start("impl-bbbbbb"); // 4: the first round, so N is 3
  r.ev("rev-cccccc");
  r.ev("orch-dddddd");
  r.session();
  r.cost("orch-dddddd", "impl-bbbbbb", "agent1");
  r.costComment("orch-dddddd", { role: "reviewer", token: "rev-cccccc", session: "s2" });
  return r;
};

test("N is the event before the first start by an impl- token on an issue that is no r6 check", () => {
  const c = checks(good().list);
  expect(c.after).toBe(3);
  expect(c.firstStart).toEqual({ seq: 4, id: "a", by: "impl-bbbbbb" });
  expect(checks(good().list, { after: 1 }).after).toBe(1);
});

test("a record with no old token after N, each agent's token on a cost line and no event of the parent passes", () => {
  const c = checks(good().list);
  expect(c.r1.first.pass).toBe(true);
  expect(c.r1.first.old.map((o: any) => o.events)).toEqual([0, 0, 0]);
  expect(c.r1.third).toMatchObject({ pass: true, holders: 2, withLine: 2, noLine: [] });
  expect(c.parent).toEqual({ pass: true, events: 0, inAll: 0 });
  expect(passed(c)).toBe(true);
  // A cost line of the older form, a comment, is read: rev-cccccc is on no other.
  expect(c.r1.third.costLines).toBe(2);
});

test("an old role token after N fails the first check, and its keys are counted by their first part", () => {
  const r = good();
  r.ev("issues-implementer-2", { key: "orch2/a/open" });
  r.ev("issues-implementer-2", { key: "orch2/b/open" });
  r.ev("issues-implementer-2", { key: "impl/a/comment-1" });
  const c = checks(r.list);
  expect(c.r1.first.pass).toBe(false);
  expect(c.r1.first.old[0]).toEqual({ token: "issues-implementer-2", events: 3, first: 10, last: 12, keys: { orch2: 2, impl: 1 } });
  expect(passed(c)).toBe(false);
  // With N before the reviewer's event of before the round, that one is counted too.
  expect(checks(r.list, { after: 2 }).r1.first.old[1].events).toBe(1);
  // --until reads the record as it was.
  expect(checks(r.list, { until: 9 }).r1.first.pass).toBe(true);
  expect(text(c).join("\n")).toContain(`issues-implementer-2: 3 events after N, 10 to 12, keys {"orch2":2,"impl":1}`);
});

test("a token beside two agents fails the first check; an agent beside two tokens is listed and does not", () => {
  const r = good();
  r.cost("orch-dddddd", "impl-bbbbbb", "agent2");
  const c = checks(r.list);
  expect(c.r1.first.tokenBesideTwoAgents).toEqual([{ name: "impl-bbbbbb", beside: ["agent1", "agent2"] }]);
  expect(c.r1.first.pass).toBe(false);
  const s = good();
  s.ev("spec-eeeeee");
  s.cost("orch-dddddd", "spec-eeeeee", "agent1");
  const d = checks(s.list);
  expect(d.r1.first.agentBesideTwoTokens).toEqual([{ name: "agent1", beside: ["impl-bbbbbb", "spec-eeeeee"] }]);
  expect(d.r1.first.pass).toBe(true);
});

test("a holder that is the token of no cost line an orch- token wrote fails the third check, with why it could be on none", () => {
  const r = good();
  r.ev("over-ffffff"); // 10: no line names an over- token
  r.ev("impl-111111"); // 11: on a line a writer wrote, not an orch-
  r.cost("impl-bbbbbb", "impl-111111", "agent3");
  r.ev("dig-222222"); // 13: before the first line that names a dig- token
  r.ev("dig-333333");
  r.cost("orch-dddddd", "dig-333333", "agent4"); // 15
  r.ev("rev-444444"); // 16: after the first rev- line, and on none
  const c = checks(r.list);
  expect(c.r1.third.pass).toBe(false);
  expect(c.r1.third).toMatchObject({ holders: 7, withLine: 3 });
  expect(c.r1.third.noLine.map((h: any) => [h.name, h.anyWriter, h.before])).toEqual([
    ["over-ffffff", false, "no line names a token of this role"],
    ["impl-111111", true, ""],
    ["dig-222222", false, "its last event is before 15, the first line that names one"],
    ["rev-444444", false, ""],
  ]);
  expect(c.r1.third.writers).toEqual({ orch: 3, impl: 1 });
});

test("the orch- names are printed with their events, their cost lines and the session of those with an agent", () => {
  const c = checks(good().list);
  expect(c.r1.third.orch).toEqual([{ name: "orch-dddddd", events: 3, first: 6, last: 9, costLines: 2, sessions: { s1: 1 } }]);
});

test("a session outside the loop: not seen with no out- holder, a pass with one; the owner's session is no holder", () => {
  const c = checks(good().list);
  expect(c.r1.second).toEqual({ pass: null, out: [] });
  expect(text(c).join("\n")).toContain("R1, second check: not seen; 0 holders that start out-");
  const r = good();
  r.ev("out-555555");
  expect(checks(r.list).r1.second).toEqual({ pass: true, out: [{ name: "out-555555", events: 1, first: 10, last: 10 }] });
  // out- is not among the five whose token a cost line carries.
  expect(checks(r.list).r1.third.holders).toBe(2);
});

test("an event of the parent fails its check", () => {
  const r = good();
  r.ev("loop-agents");
  const c = checks(r.list);
  expect(c.parent).toEqual({ pass: false, events: 1, inAll: 1 });
  expect(passed(c)).toBe(false);
  expect(text(c).at(-1)).toBe("the parent: FAIL; secret:loop-agents wrote 1 events after N, 1 in all");
});

test("with no --token the tool sends nothing and is exit 2", () => {
  const p = Bun.spawnSync(["bun", tool], { env: { ...process.env, ISSUE_AS: "/nonexistent/issue-as.sh" } });
  expect(p.exitCode).toBe(2);
  expect(p.stderr.toString()).toContain("no --token; nothing was sent");
  expect(p.stdout.toString()).toBe("");
});
