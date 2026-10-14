// Three runs of 2026-10-13 were refused a write to the tracker for a length no brief they read names: an id over 40
// characters, a move's reason over 2,000. Three briefs now have the lengths. The numbers are asked of the tracker cb4
// runs (cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js after `bun sync.ts`: issuesLimits, and issueAct for the id,
// which is no entry of issuesLimits; the seed brain-issues.ojs until 2026-10-14), so a limit that changes there fails this
// file until the briefs say the new one.
// Issue tracker-limits-in-no-brief.
//
//   bun test --timeout=30000 ./tests/tools/tracker-limits-in-the-briefs.test.ts
import { expect, beforeAll } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { testNeedingRunning } from "./needs.ts";

const AGENTS = resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents");
const { test, module } = testNeedingRunning("tracker-limits-in-the-briefs.test.ts", "brain-issues");
const flat = (s: string) => s.replace(/\s+/g, " ");
const brief = (file: string) => flat(readFileSync(join(AGENTS, file), "utf8"));
// 2000 as a brief writes it: "2,000".
const n = (x: number) => x.toLocaleString("en-US");

let L: any, act: any;
beforeAll(async () => {
  if (!module) return;
  // issueAct names checkedRule for a wait and a policy, which is an import of cloudflare-iac: no act of this file reaches it.
  const issues = await importNotebookModule(module, { overrides: { checkedRule: () => { throw new Error("no rule is checked here"); } } });
  L = await issues.value("issuesLimits");
  act = await issues.value("issueAct");
});
// The message of the 400, or "" when the act is taken.
const refused = (type: string, body: any) => { try { act(type, body); return ""; } catch (e: any) { return `${e.status} ${e.message}`; } };
// The longest id the seed takes: asked of issueAct, one length at a time.
const idMax = () => { let k = 1; while (k < 200 && !refused("comment", { id: "a".repeat(k + 1), body: "b" })) k++; return k; };

test("the seed refuses an id, a reason, a title and a body one character over, with the message a run was shown", () => {
  expect(idMax()).toBe(40);
  expect(refused("comment", { id: "a".repeat(41), body: "b" })).toBe("400 id: 40 characters at most");
  expect(refused("move", { id: "a", to: "ready", reason: "r".repeat(L.reason) })).toBe("");
  expect(refused("move", { id: "a", to: "ready", reason: "r".repeat(L.reason + 1) })).toBe(`400 reason: text, ${L.reason} characters at most`);
  expect(refused("open", { title: "t".repeat(L.title + 1), kind: "task" })).toBe(`400 title: text, ${L.title} characters at most`);
  expect(refused("comment", { id: "a", body: "b".repeat(L.body + 1) })).toBe(`400 body: text, ${L.body} characters at most`);
});

test("the page tracker-calls has the five lengths, as the seed has them", () => {
  const page = brief("implementer/tracker-calls.md");
  expect(page).toContain(`an id ${idMax()} characters, a key ${n(L.key)}, a title ${n(L.title)}, a \`reason\` ${n(L.reason)}, a body ${n(L.body)}`);
  expect(page).toContain("`issuesLimits` and `issueAct`");
});

test("agents/orchestrator.md has the id, the key and the reason in its own part, and says where a longer triage goes", () => {
  const text = brief("orchestrator.md"), own = text.slice(0, text.indexOf("## A quick win"));
  expect(own).toContain(`an id of more than ${idMax()} characters, a key of more than ${n(L.key)} and a \`reason\` of more than ${n(L.reason)}`);
  expect(own).toContain("go in a comment, and the reason names it");
});

test("agents/spec.md says how long the id of a task may be", () => {
  expect(brief("spec.md")).toContain(`An id is \`a-z 0-9 -\`, ${idMax()} characters at most`);
});
