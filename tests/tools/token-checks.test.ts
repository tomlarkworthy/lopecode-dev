// token-checks.ts: the checks of R1 and of the parent of plan/cloud-brain-record-names-token-not-agent.md, made from a
// list of events. Issue ta-6-checks-after-three-issues.
//
//   bun test ./tests/tools/token-checks.test.ts
// No call leaves the machine: the tests that run the tool give it a stand-in for issue-as.sh, or none.
import { test, expect } from "bun:test";
import { join, resolve } from "node:path";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

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

// ap-2-brief-and-shadow-step: an approver's token is held to a cost line as a writer's is.
test("an appr- holder with no cost line an orch- token wrote fails the third check, and passes with one", () => {
  const r = good(), before = checks(r.list).r1.third.holders;
  r.ev("appr-aaaaaa", { key: "approver/a/verdict-1" });
  const c = checks(r.list);
  expect(c.r1.third.pass).toBe(false);
  expect(c.r1.third.holders).toBe(before + 1);
  expect(c.r1.third.noLine.map((h: any) => h.name)).toEqual(["appr-aaaaaa"]);
  expect(text(c).join("\n")).toContain("that start impl-, rev-, spec-, over-, dig- or appr-;");
  r.cost("orch-dddddd", "appr-aaaaaa", "agent9");
  expect(checks(r.list).r1.third.pass).toBe(true);
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

// Issue token-checks-after-nan-reads-pass. The stand-in for issue-as.sh writes a line to a file when it is called.
const run = (...args: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), "token-checks-")), as = join(dir, "issue-as.sh"), called = join(dir, "called");
  writeFileSync(as, `#!/bin/sh\necho "$@" >> "${called}"\necho '{"events":[]}'\n`, { mode: 0o755 });
  const p = Bun.spawnSync(["bun", tool, "--token", "impl-aaaaaa", ...args], { env: { ...process.env, ISSUE_AS: as } });
  const out = { exit: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString(), calls: existsSync(called) ? readFileSync(called, "utf8").trim().split("\n").length : 0 };
  rmSync(dir, { recursive: true });
  return out;
};

test("an --after or --until that is no whole number is exit 2, with nothing read and no check printed", () => {
  const after = [["--after", "abc"], ["--after", "-5"], ["--after", "1.5"], ["--after", "1e3"], ["--after", "0x10"], ["--after", " 7"], ["--after", ""], ["--after=abc"], ["--after="], ["--after"], ["--after", "--json"], ["--until", "12", "--after", "x"]];
  const until = [["--until", "abc"], ["--until"], ["--until=1.5"], ["--after", "12", "--until", "x"]];
  for (const [flag, list] of [["--after", after], ["--until", until]] as const) for (const args of list) {
    const p = run(...args);
    expect([args, p.exit, p.calls, p.stdout]).toEqual([args, 2, 0, ""]);
    expect(p.stderr).toContain(`token-checks.ts: ${flag} is not a whole number; nothing was read`);
  }
});

test("a whole number for --after and --until is read: one call, and the checks are printed", () => {
  for (const args of [["--after", "0"], ["--after=12"], ["--until", "7"], ["--after", "3", "--until=9"], []]) {
    const p = run(...args);
    expect([args, p.exit, p.calls]).toEqual([args, 0, 1]);
    expect(p.stdout).toContain("R1, first check: pass");
  }
  expect(run("--after", "12").stdout).toContain("read 0 events to 0; N = 12");
});

test("a pass with no event after N says so on its line, and a pass with one does not", () => {
  const c = checks(good().list, { after: 99 });
  expect([c.afterN, passed(c)]).toEqual([0, true]);
  const l = text(c);
  expect(l[0]).toBe("read 9 events to 9; N = 99; no event is after N (the first start by an impl- token on an issue is 4, a, impl-bbbbbb)");
  expect(l).toContain("R1, first check: pass (no event is after N)");
  expect(l).toContain("R1, third check: pass (no event is after N), of what the record has (the live children are agent-token list's)");
  expect(l.at(-1)).toBe("the parent: pass (no event is after N); secret:loop-agents wrote 0 events after N, 0 in all");
  // N at the last event, and N past it with --until, read the same way.
  expect(checks(good().list, { after: 9 }).afterN).toBe(0);
  expect(checks(good().list, { after: 5, until: 5 }).afterN).toBe(0);
  // One event after N, and the default N: no such words.
  expect(checks(good().list, { after: 8 }).afterN).toBe(1);
  expect(text(checks(good().list, { after: 8 })).join("\n")).not.toContain("no event is after N");
  const d = checks(good().list);
  expect(d.afterN).toBe(6);
  expect(text(d).join("\n")).not.toContain("no event is after N");
  // A check that fails with no event after N (a token beside two agents is read from every cost line) is still FAIL.
  const r = good();
  r.cost("orch-dddddd", "impl-bbbbbb", "agent2");
  expect(text(checks(r.list, { after: 99 }))).toContain("R1, first check: FAIL");
});

test("--until 0 is the record before its first event, not the whole record", () => {
  const c = checks(good().list, { until: 0 });
  expect([c.read, c.last, c.afterN]).toEqual([0, 0, 0]);
});
