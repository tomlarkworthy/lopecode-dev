// The loop's procedure, its briefs and its rules give each agent a tracker token of its own: the orchestrator makes
// it before the spawn and names it in the prompt, a brief writes with "the token your prompt names", and step 3 of
// SKILL.md says who makes `back` and who makes the second `start` or `spec` when the starter cannot go on.
// Issue ta-3-orchestrator-steps, task 3 of plan/cloud-brain-record-names-token-not-agent.md.
//
//   bun test ./tests/tools/briefs-name-the-prompts-token.test.ts
// BRIEFS=<dir> reads a copy of .claude/skills/brain-maintenance in its place (the files before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const dir = process.env.BRIEFS || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance");
const read = (f: string) => readFileSync(join(dir, f), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const skill = read("SKILL.md"), rules = read("rules.md");
const briefs = ["agents/implementer.md", "agents/spec.md", "agents/digest.md", "agents/overseer.md"];
const role = /issues-(?:implementer|reviewer|overseer)-\d/g;
// A `## ` section, up to the next one.
const section = (text: string, heading: string) => text.match(new RegExp(`\\n## ${heading}\\n[\\s\\S]*?(?=\\n## |$)`))?.[0] ?? "";
const rows = skill.split("\n").filter((l) => l.trim().startsWith("| "));

test("no command of the procedure, a brief or the rules is written with a role's token", () => {
  for (const f of ["SKILL.md", "rules.md", "agents/reviewer.md", ...briefs]) {
    const text = read(f);
    for (const bad of [/issue-as\.sh issues-/, /--token=issues-/, /LOCK_TOKEN=issues-/, /issue-watch\.sh issues-/]) expect(text.match(bad)?.[0] ?? "", f).toBe("");
  }
});

test("a brief names a role's token once, for a prompt that names none; the reviewer's stub names none", () => {
  for (const f of briefs) {
    const text = flat(read(f));
    expect(text.match(role)?.length, f).toBe(1);
    expect(text, f).toMatch(/`issues-(implementer|overseer)-\d` when (it|the prompt) names none/);
    expect(text, f).toMatch(/the (token|one) your prompt names/);
  }
  expect(read("agents/reviewer.md").match(role)).toBe(null);
});

test("SKILL.md and rules.md name the three role tokens once each, where they say the owner revokes them", () => {
  for (const [f, text] of [["SKILL.md", skill], ["rules.md", rules]] as const) {
    const names = text.match(role) ?? [];
    expect([...names].sort(), f).toEqual(["issues-implementer-2", "issues-overseer-1", "issues-reviewer-2"]);
    const from = text.indexOf(names[0]), part = flat(text.slice(from, from + 1100));
    expect(part, f).toContain("kept until the owner revokes them");
    expect(part, f).toMatch(/started by a token no agent holds/);
    expect(part, f).toContain("`back`");
  }
});

test("the orchestrator makes itself a token, and one before each spawn, and ends it", () => {
  const s = section(skill, "A token for each agent");
  for (const word of ['agent-token orch "$CLAUDE_CODE_SESSION_ID"', "agent-token <role> <issue id>", "agent-token revoke <name>", "agent-token list", "`loop-agents`", "48 hours", "`in-review` for good", "`approved`"]) expect(s).toContain(word);
  for (const r of ["`impl`", "`rev`", "`spec`", "`dig`", "`over`"]) expect(s).toContain(r);
});

test("the prompt of a spawn ends with the token's line, and the reviewer's task has it", () => {
  expect(skill).toContain("   Issue: <id>\n   Your token is <name>.\n   ```");
  expect(skill).toContain('agent.sh reviewer "review issue <id>; your token is <name>"');
  expect(skill).not.toContain('agent.sh reviewer "review issue <id>"');
});

test("each cost example has the token of the run, and the comment is written with the session's own", () => {
  const costs = [...skill.matchAll(/`cost (\{[^`]*\})`/g)].map((m) => JSON.parse(m[1]));
  expect(costs.length).toBe(2);
  for (const c of costs) expect(c.token).toMatch(/^(impl|rev|spec|dig|over)-[0-9a-f]{6}$/);
  expect(flat(skill)).toContain("one comment, with your own token (`orch-…`)");
  expect(skill).not.toContain("with the token you triage");
});

test("step 3 has the four rows that add moves, each with who makes back and who makes the second start or spec", () => {
  const row = (label: string) => rows.find((l) => l.includes(`**${label}**`)) ?? "";
  const dead = row("A dead writer.");
  for (const word of ["You end its token", "you make `back` to `ready`", "the writer you spawn makes the second `start` with its own token", "Two more moves"]) expect(dead).toContain(word);
  const quick = row("A quick win of your own, sent back.");
  for (const word of ["`secret:orch-…`", "Do the round yourself and submit: no more moves", "you make `back`, the writer you spawn makes `start` and then submits", "Two more moves"]) expect(quick).toContain(word);
  const forWriter = row("A submit made for a writer.");
  for (const word of ["Ask the writer to submit, by message", "you end its token, make `back`, make `start` with your own token, and submit", "Two more moves"]) expect(forWriter).toContain(word);
  const spec = row("A spec sent back.");
  for (const word of ["by message", "make `back` from `spec` to `open`", "the spec writer you spawn makes `spec` with its own token", "`spec/<id>/spec-<round>`", "`submit-spec`", "Two more moves"]) expect(spec).toContain(word);
  // the row they replace read the role from a shared token
  expect(skill).not.toContain("started by the implementer token");
  expect(rows.find((l) => l.includes("sent back, no agent running")) ?? "").toContain("`by.holder` of its last `start` event");
});

// Until os-2-order-and-pool this held the limits 8 and 4. No number is set since; tests/tools/os-2-order-and-pool.test.ts holds the rule.
test("the owner's words on the number of agents are kept, and no limit is stated as in force", () => {
  expect(skill).toContain('"can we increase the parrallism twofold?"');
  expect(skill).not.toMatch(/Keep up to \d+ implementers|More than \d+ writers or \d+ reviewers at once/);
});

test("the writer's brief: an issue another started is not its to submit, and every lock.sh call names the token", () => {
  const brief = read("agents/implementer.md"), text = flat(brief);
  expect(text).toContain("it is not yours to submit, whatever your prompt says: comment with what you read, say so in your report, and stop");
  expect(text).toContain("`secret:<token>`");
  const calls = (brief.match(/`[^`\n]*lock\.sh (?:take|renew|release|show)[^`\n]*`/g) ?? []);
  expect(calls.length).toBeGreaterThan(10);
  expect(calls.filter((c) => !c.startsWith("`LOCK_TOKEN=<token> "))).toEqual([]);
  expect(flat(section(brief, "A resumed round"))).toContain("Your token is the one of your first round");
});

test("the spec writer's brief: back is the orchestrator's and the second spec is the writer's; a token goes in a list of its own", () => {
  const text = flat(read("agents/spec.md"));
  expect(text).toContain("the orchestrator has made `back`. You make `spec`, with the key `spec/<id>/spec-<round>`");
  expect(text).toContain('"What the orchestrator makes"');
  expect(text).toContain('"Why do I need to even do it? It seems like common sense to issue scoped tokens that follow a spec."');
  expect(text).toContain("--token=<token>");
});

test("the overseer's brief: its own token in each call, and its 3 issues counted from it", () => {
  const text = read("agents/overseer.md");
  expect(text).toContain('io() { <root>/tools/cloud-brain/issue-as.sh <token> "$@"; }');
  expect(text.match(/LOCK_TOKEN=<token> /g)?.length).toBe(3);
  expect(flat(text)).toContain("The 3 are counted from your own token");
});

test("rules.md, Which token: a name for each kind of agent, and who makes it", () => {
  const s = section(rules, "Which token");
  for (const p of ["`orch-`", "`impl-…`", "`rev-…`", "`spec-…`", "`dig-…`", "`over-…`", "`out-…`"]) expect(s).toContain(p);
  expect(flat(s)).toContain("You write to the tracker with the token your prompt names and with no other.");
  expect(flat(s)).toContain("does not make itself a token");
  expect(rules).not.toContain("| Triage and implementing | `issues-implementer-2` |");
  expect(flat(rules)).toContain("`cb4-issues-tokens.json` or `cb4-agent-tokens.json` into your output");
});

test("rules.md has the owner's words of event 1406 on loop-roles, letter for letter", () => {
  expect(flat(rules)).toContain('"A, narrowed to "a writer may put a brief when its issue is a task of a spec you approved""');
  expect(flat(rules)).not.toContain("The overseer changes a brief with it; no other role does.");
});

test("rules.md says who makes a token an approved spec names, in the owner's words, and has the four of 2026-10-11", () => {
  const s = flat(section(rules, "A token an approved spec names"));
  expect(s).toContain('"I did not do the others, can you jsut do it"');
  expect(s).toContain('"Why do I need to even do it? It seems like common sense to issue scoped tokens that follow a spec."');
  expect(s).toContain("with the methods that spec gives and no more");
  expect(s).toContain("Still the owner's alone: a token no approved spec names, a scope wider than the spec's");
  for (const [name, methods] of [
    ["loop-agents", ["`issue.*`", "`delegate`"]],
    ["loop-docs", ["`knowledge.put`", "`knowledge.list`"]],
    ["loop-papers", ["`knowledge.put`", "`knowledge.search`", "`static.get`"]],
    ["loop-dashboard", ["`metric.query`", "`metric.list`", "`dashboard.*`"]],
  ] as const) {
    const item = s.match(new RegExp("- `" + name + "` names .*?(?= - `loop-|$)"))?.[0] ?? "";
    for (const m of methods) expect(item, name).toContain(m);
  }
  // SKILL.md has the routine, and neither shows the command with the tracker's methods on its line (doc-token-example.test.ts)
  expect(flat(section(skill, "A token an approved spec names"))).toContain("brain.ts token NAME METHODS");
});
