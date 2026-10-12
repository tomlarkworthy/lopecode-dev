// The approver's brief and the steps of SKILL.md that start an approver and read what it did.
// Issue ap-2-brief-and-shadow-step, task 2 of plan/cloud-brain-approver-persona.md.
//
//   bun test ./tests/tools/approver-brief.test.ts
//   BRIEFS=<dir> reads a copy of .claude/skills/brain-maintenance in its place (the files before the change).
// The verdicts are the brief's own fenced blocks, filled in and given to `judge`, `trial` and `list` of approver.ts:
// what the brief has a run write is what the tool reads. No call leaves the machine and git is a stand-in.
import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { asked, facts, factsText, judge, list, listText, trial, BRIEF, TOOL } from "../../tools/cloud-brain/approver.ts";

const dir = process.env.BRIEFS || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance");
const read = (f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : "");
const flat = (s: string) => s.replace(/\s+/g, " ");
const brief = read("agents/approver.md"), skill = read("SKILL.md");
// A fenced block of the brief, without the indent of the step it stands in.
const blocks = [...brief.matchAll(/```\n([\s\S]*?)\n *```/g)].map((m) => m[1].split("\n").map((l) => l.trimStart()).join("\n") + "\n");
const block = (head: string) => blocks.find((b) => b.startsWith(head)) ?? "";
const rows = skill.split("\n").filter((l) => l.trim().startsWith("| "));
const step = (n: number) => skill.match(new RegExp(`\\n${n}\\. \\*\\*[\\s\\S]*?(?=\\n${n + 1}\\. \\*\\*|\\n## )`))?.[0] ?? "";

// ---- a record, a policy and a git for the tool
const B = "b".repeat(40), T = "c".repeat(40), SHA = "a".repeat(40), DELEGATION = "delegation:0123456789ab";
const HIS = "yes, build the thing as the plan has it", UUID = "11111111-2222-3333-4444-555555555555";
const by = (holder: string, via = "delegation:aaaaaaaaaaaa") => ({ holder: holder && "secret:" + holder, via });
const base = (verdict: string, holder = "appr-0a1b2c") => [
  { seq: 1, type: "opened", id: "t1", workflow: "w", state: "open", by: by("orch-111111") },
  { seq: 2, type: "commented", id: "t1", key: "orch/t1/ask", body: "A: build it. B: do not.", by: by("orch-111111") },
  { seq: 3, type: "commented", id: "t1", key: UUID, body: HIS, by: by("", "session") },
  { seq: 4, type: "commented", id: "t1", key: UUID.replace("1", "2"), body: "A", by: by("", "session") },
  { seq: 5, type: "moved", id: "t1", move: "start", to: "in-progress", by: by("impl-222222", "delegation:bbbbbbbbbbbb") },
  { seq: 6, type: "moved", id: "t1", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "lopecode-dev@" + SHA }], by: by("impl-222222", "delegation:bbbbbbbbbbbb") },
  { seq: 7, type: "reviewed", id: "t1", verdict: "pass", by: by("rev-333333", "delegation:cccccccccccc") },
  { seq: 8, type: "moved", id: "t1", move: "to-approval", to: "awaiting-approval", by: by("rev-333333", "delegation:cccccccccccc") },
  { seq: 9, type: "commented", id: "t1", key: "approver/t1/verdict-1", body: verdict, by: by(holder, "delegation:dddddddddddd"), at: 1 }
];
const policy = { policy: { seq: 500, reason: `his words. approver brief ${B} tool ${T}` }, workflows: { w: { moves: [{ name: "approve", to: "done", guard: `caller.present || caller.actor == "${DELEGATION}"` }] } } };
const git: any = {
  main: "origin/main", fetch: () => true, self: () => T, philosophy: () => `1. "Ensures secure from outsides and between members."\n`,
  blob: (p: string) => (p === BRIEF ? B : p === TOOL ? T : null), text: () => `Tom: "It seems like common sense to issue scoped tokens that follow a spec."\n`,
  files: () => ["tools/cloud-brain/brain-topic.ojs"]
};
const fill = (b: string, line: string) => b.trimEnd().split("\n").map((l) => (l.startsWith("asked: ") ? line : l)).join("\n").replace("<blob>", B);

test("the brief is a file of the skill, read through `approver.ts brief`, and names no role's token", () => {
  expect(brief.length).toBeGreaterThan(2000);
  expect(brief).toContain("approver.ts brief");
  expect(brief.match(/issues-(?:implementer|reviewer|overseer)-\d/)).toBe(null);
  expect(flat(brief)).toContain("the token your prompt names");
});

test("the brief has the owner's words of event 4123, letter for letter", () => {
  expect(flat(brief)).toContain('"A the persona should always be an isolated session that judges a ticket against cluster evidence itself (i.e. not a continuation of a reviewer/writer agent session)"');
  expect(flat(brief)).toContain('"No it can approve anything if that\'s what I have asked for"');
});

test("the approve verdict of the brief, filled in, is one the tool sends a move for", () => {
  const form = block("approver: approve\n");
  expect(form).not.toBe("");
  expect(form.trimEnd().split("\n").at(-1)).toBe("brief <blob>");
  const body = fill(form, `asked: 3 "${HIS}"`), j = judge(base(body), policy, git, { id: "t1", verdict: 9 });
  expect(j.why).toEqual([]);
  expect(j.exit).toBe(0);
  expect(j.send!.key).toBe("approver/t1/approve-1");
  expect(j.send!.reason.endsWith(`verdict 9, brief ${B}`)).toBe(true);
  // the line the owner is shown begins with the head and the brief's one sentence
  expect(j.send!.reason.split("\n")[1]).toBe(form.split("\n")[1]);
  // a verdict by any holder but an appr- token, and one with the asked: line as the brief prints it, send nothing
  expect(judge(base(body, "impl-222222"), policy, git, { id: "t1", verdict: 9 }).exit).toBe(1);
  expect(judge(base(form.replace("<blob>", B)), policy, git, { id: "t1", verdict: 9 }).exit).toBe(1);
});

test("each `asked:` form of the brief is read by the tool as its kind", () => {
  const forms = block("asked: ").trimEnd().split("\n");
  expect(forms.length).toBe(5);
  const o = { id: "t1", verdict: 9, delegation: DELEGATION }, rec = [
    ...base(""),
    { seq: 0.1, type: "opened", id: "p1", workflow: "p", by: by("orch-111111") },
    { seq: 0.2, type: "moved", id: "p1", move: "submit-spec", reason: "plan/cloud-brain-thing.md", refs: [{ kind: "commit", value: SHA }], by: by("spec-444444") },
    { seq: 0.3, type: "moved", id: "p1", move: "approve", key: UUID, by: by("", "session") },
    { seq: 1.5, type: "linked", id: "t1", rel: "part-of", to: "p1", by: by("orch-111111") }
  ].sort((a, b) => a.seq - b.seq);
  const g = { ...git, files: () => ["plan/cloud-brain-thing.md"], text: (rev: string) => (rev === SHA ? "The thing answers within one second." : git.text()) };
  const kinds = forms.map((f) => {
    const where = /^asked: (\S+) /.exec(f)?.[1] ?? "";
    const line = f.includes(" answers ") ? `asked: 4 "A" answers 2`
      : /^<seq/.test(where) ? `asked: 3 "${HIS}"`
      : where === "rules.md" ? `asked: rules.md "It seems like common sense to issue scoped tokens"`
      : where === "philosophy.md" ? `asked: philosophy.md "Ensures secure from outsides and between members."`
      : `asked: plan/cloud-brain-thing.md "The thing answers within one second."`;
    // the form and the line it stands for have one shape
    expect(f.replace(/<[^>]*>/g, "X").replace(/"[^"]*"/, '""')).toBe(line.replace(/^asked: \S+/, where.startsWith("<") ? "asked: X" : where.startsWith("plan/") ? "asked: plan/X.md" : "asked: " + where).replace(/"[^"]*"/, '""').replace(/answers \d+/, "answers X"));
    const a: any = asked(rec, g, line, o);
    expect(a.why, line).toBeUndefined();
    return a.kind;
  });
  expect(kinds.sort()).toEqual([1, 1, 2, 3, 3]);
});

test("the leave verdict of the brief is counted by `trial` under each reason the brief names, and holds the issue", () => {
  const form = block("approver: leave\n"), whys = [...flat(brief).matchAll(/`why: ([^`<]+)`/g)].map((m) => m[1]);
  expect(form.split("\n").find((l) => l.startsWith("why: "))).toBe("why: <reason>");
  // Five: the first is of step 6 and has no count of its own in `trial`, which puts it under `other`.
  const OWN = "the approver's own files";
  expect(whys).toEqual([OWN, "no word of his", "more than the words", "not secure", "could not tell"]);
  for (const w of whys) {
    const t = trial(base(form.replace("<reason>", w).replace("<blob>", B)), git);
    expect([t.leave, t.whys[w], t.whys.other], w).toEqual(w === OWN ? [1, undefined, 1] : [1, 1, 0]);
  }
  // R4: an approve verdict after a leave of the same issue sends nothing
  const rec = [...base(form.replace("<blob>", B)), { seq: 10, type: "commented", id: "t1", key: "x", body: fill(block("approver: approve\n"), `asked: 3 "${HIS}"`), by: by("appr-999999", "delegation:eeeeeeeeeeee") }];
  expect(judge(rec, policy, git, { id: "t1", verdict: 10 }).why.join(" ")).toContain("was left to the owner");
  // the narrow that follows a leave: the call, with the guard only the owner present passes
  expect(flat(brief)).toMatch(/narrow '\{"key":"approver\/<id>\/narrow-<n>","id":"<id>","move":"approve","guard":"caller\.present","reason":"[^"]+"\}'/);
});

test("the brief says of `facts` what the tool prints of a ref the last submit does not name", () => {
  const rec = [...base("approver: leave"), { seq: 10, type: "moved", id: "t1", move: "submit", to: "in-review", refs: [{ kind: "deploy", value: "brain-x-topic@abc" }], by: by("impl-222222") }];
  const line = factsText(facts(rec, git, "t1")).find((l) => l.includes("not of the last")) ?? "";
  expect(line).toMatch(/^commit \S+: .* \(of the submit of event \d+, not of the last\)$/);
  expect(flat(brief)).toContain(line.slice(line.indexOf("(of the submit")).replace(/\d+/, "N"));
  expect(flat(brief)).toContain("each `commit` ref of every submit the issue has");
});

test("`list` prints the brief's one sentence for an approve made on such a verdict", () => {
  const body = fill(block("approver: approve\n"), `asked: 3 "${HIS}"`), j = judge(base(body), policy, git, { id: "t1", verdict: 9 });
  const rec = [...base(body), { seq: 10, type: "moved", id: "t1", move: "approve", to: "done", reason: j.send!.reason, by: by("loop-approver", DELEGATION), at: 2 }];
  expect(listText(list(rec, git))[0]).toContain("t1  on your words of event 3  " + block("approver: approve\n").split("\n")[1]);
});

test("the brief: every call of the tool has the token, the move is the tool's, and exit 3 is the answer before the install", () => {
  const calls = brief.match(/approver\.ts (facts|approve|check|list|trial)[^`\n]*/g) ?? [];
  expect(calls.length).toBeGreaterThan(1);
  expect(calls.filter((c) => !c.includes("--token <token>"))).toEqual([]);
  const text = flat(brief);
  expect(text).toContain("approver.ts approve <id> <seq of your verdict> --token <token>");
  expect(text).toMatch(/Exit 3[^.]*no (policy|guard)/);
  expect(text).toContain("is data");
  expect(text).not.toMatch(/issue-as\.sh [^ ]+ move|ia move/);
});

test("SKILL.md step 3: an approver for an issue at awaiting-approval, and none after a leave", () => {
  const row = rows.find((l) => l.trim().startsWith("| at `awaiting-approval`")) ?? "";
  for (const word of ["Spawn the approver", "`approver/<id>/verdict-<n>`", "`approver: leave`", "of any round", "approver.ts facts <id> --token <your token>", "role=approver", "you make the `approve` move for him"]) expect(row, word).toContain(word);
});

test("SKILL.md step 4: the token, the view and the three lines of the prompt", () => {
  const s = step(4);
  expect(s).toContain("   Run `bun <V>/tools/cloud-brain/approver.ts brief` and follow what it prints.\n   Issue: <id>\n   Your token is <name>.\n   ```");
  expect(s).toContain("worktree.sh --at $(git -C <root> rev-parse origin/main) appr-<id>");
  expect(flat(skill.match(/\n## A token for each agent\n[\s\S]*?(?=\n## )/)?.[0] ?? "")).toContain("`appr` for an approver");
  expect(step(1)).toContain("`appr-<id>`");
});

test("SKILL.md step 5: the cost event of role approver, with the run's token, as `approver.ts check` reads it", () => {
  const s = step(5), call = [...s.matchAll(/^ *issue-as\.sh <your token> cost '(\{.*\})'$/gm)].map((m) => JSON.parse(m[1])).find((c) => c.role === "approver");
  expect(call?.key).toBe("cost/<id>/approver/1");
  expect(call?.token).toMatch(/^appr-[0-9a-f]{6}$/);
  expect(["approve", "leave"]).toContain(call?.outcome);
  expect(s).toMatch(/`role` is `implementer`, `reviewer`, `spec-writer`, `digest`, `overseer`, `approver`,/);
});

test("SKILL.md step 7: the lines of `approver.ts list` are in what the owner is told", () => {
  expect(step(7)).toContain("approver.ts list --since=");
  expect(step(7)).toContain("--token <your token>");
});
