// rules.md, Never, had a fix that needs the kernel, the core, the database or the deployer "written up on the issue,
// which gets the label `needs-owner` and is not started". The owner asked for three lines of the list to be reduced
// (issue never-list-three-reductions, 2026-10-13); this is the first: the loop writes, tests and reviews such a fix
// with no word of his, and the deploy alone waits for him. Held here: the line of Never and "What an issue is" in
// rules.md, Triage in SKILL.md, step 3 of the implementer's brief and of its page `start`, and what was not changed.
//
//   bun test --timeout=30000 ./tests/tools/never-list-three-reductions.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const dir = join(root, ".claude/skills/brain-maintenance");
const read = (name: string): string => readFileSync(join(dir, name), "utf8");
const rules = read("rules.md");
const skill = read("SKILL.md");
const brief = read("agents/implementer.md");
const start = read("agents/implementer/start.md");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// A section: from its "## " heading to the next one ("" when the file has none of that name).
const section = (text: string, heading: string): string => {
  const at = text.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf("\n## ", at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};
// Step 3 of a brief: from its title to the title of step 4.
const step3 = (text: string): string => {
  const at = text.indexOf("3. **Decide whether it is yours.**");
  const end = text.indexOf("4. **Claim it.**");
  return at < 0 || end < at ? "" : flat(text.slice(at, end));
};

const seeds = "`brain-kernel.ojs`, `brain-core.ojs`, `brain-db.ojs`, `brain-deployer.ojs`";
const was = "written up on the issue, which gets the label `needs-owner` and is not started";

test("section() and step3() read one and say when there is none", () => {
  expect(section("# t\n\n## a\nx\n\n## b\ny\n", "a")).toBe("## a\nx\n");
  expect(section("# t\n\n## a\nx\n", "z")).toBe("");
  expect(step3("3. **Decide whether it is yours.** a\n  b\n4. **Claim it.** c")).toBe("3. **Decide whether it is yours.** a b");
  expect(step3("4. **Claim it.** c\n3. **Decide whether it is yours.** a")).toBe("");
  expect(step3("")).toBe("");
});

test("rules.md, Never: the deploy of the four is still in the list, and a fix that needs one is written and reviewed", () => {
  const never = flat(section(rules, "Never"));
  expect(never).toContain("- Deploy the kernel (`brain`), `brain-core`, `brain-db` or the deployer. A fix that needs one of them is written, tested and reviewed with no word of the owner, and the deploy alone waits for him.");
  expect(never).toContain("Its seed is landed on `main` with no deploy (`land.sh`, `--seed-lands-undeployed`): nothing of it is emitted, applied or probed on cb4.");
  expect(never).toContain("begin by saying that cb4 does not run the change and that the deploy is the owner's, and the comment says what he is to apply.");
  // the old sentence is there once, quoted with its date, and is no longer the rule
  expect(never.split(was).length - 1).toBe(1);
  expect(never).toContain(`(Until 2026-10-13 such a fix was "${was}".`);
  // his words, and whose the sentence of the rule is
  expect(never).toContain('"ok please a file a ticket to reduce those suggested"');
  expect(never).toContain("in that session's words as he was shown them");
  expect(never).toContain("Issue `never-list-three-reductions`");
});

test("rules.md: what is not reduced stays asked of the owner", () => {
  const never = flat(section(rules, "Never"));
  expect(never).toContain("What such a fix needs beside the deploy is asked as before: a new policy, secret, permission or Worker, and the plan of a `major` change, each under `needs-owner`.");
  expect(never).toContain("A session with the owner present deploys one on his word (\"An act of Never, on the owner's word\").");
  // the second and the third of the three are tasks of their own: their lines are as they were
  expect(never).toContain("- Run `brain.ts page up`, or open the Brain's own page (`https://cb4…/`) in a browser of the cluster, until `deployer-put-back-issues-worker` is closed.");
  expect(never).toContain("- Deploy text that was not built from a seed.");
  expect(flat(rules)).toContain("the kernel, `brain-core`, `brain-db` and the deployer are still not deployed by the loop (Never)");
});

test("rules.md, What an issue is: an issue whose fix is in one of the four seeds is not left for the owner before its deploy", () => {
  const what = flat(section(rules, "What an issue is"));
  expect(what).toContain('An issue that asks for anything in "Never" below is commented on and left for the owner.');
  expect(what).toContain("Of an issue whose fix is in the seed of the kernel, the core, the database or the deployer, the deploy is what is left for him: the fix is written and reviewed first (Never, the line of the four).");
  expect(what).toContain("Anything else of that list it asks for is left for him as before.");
});

test("SKILL.md, Triage: a deploy of the four is no longer a reason for needs-owner, and the major labels are as they were", () => {
  const triage = flat(section(skill, "Triage"));
  expect(triage).toContain("may do (a policy install, a new secret, a deletion of kept data).");
  expect(triage).not.toContain("a deploy of the kernel, core, database or deployer, a deletion of kept data");
  expect(triage).not.toContain("it is not in force");
  expect(triage).toContain("- Not `needs-owner` for its deploy alone: a fix in the seed of the kernel, the core, the database or the deployer. It goes to `ready` as any issue does, and its writer lands the seed with no deploy");
  expect(triage).toContain("The deploy is still the owner's.");
  expect(triage).toContain("a fix there that alters who may do what is `major` and waits under `needs-owner` with its plan");
  expect(triage).toContain("Add the labels `major` and `needs-owner` when the change alters who may do what, deletes or rewrites kept data, or changes a method other callers use");
});

for (const [name, text] of [["agents/implementer.md", brief], ["agents/implementer/start.md", start]] as const) {
  test(`${name}, step 3: a change to one of the five seeds is the writer's, and the other stops are as they were`, () => {
    const s = step3(text);
    expect(s).not.toBe("");
    expect(s).toContain(`the fix needs something in the Never list of the rules. A change to ${seeds} or \`cloudflare-iac.ojs\``);
    expect(s).not.toContain("a Worker the loop may not deploy");
    expect(s).not.toContain("comes back with the owner's answer to land");
    expect(s).toContain("add the label `needs-owner`");
    expect(s).toContain("a new policy, a new secret, a new permission or a new Worker");
    expect(s).toContain("does not say which of two reasonable behaviours to take");
  });
}

test("agents/implementer.md, step 3: the deploy alone is the owner's, and the page `start` is read before such a landing", () => {
  const s = step3(brief);
  expect(s).toContain("or `cloudflare-iac.ojs` does not: it is yours, and its deploy alone is the owner's;");
  expect(s).toContain("A seed whose deploy is the owner's is landed with no deploy: read the page `start` first.");
});

test("the page `start`: how such a fix is started and landed, and what its comment and its reason say", () => {
  const s = step3(start);
  expect(s).toContain("**A fix in the seed of the kernel, the core, the database or the deployer is started as any issue is, with no word of the owner; its deploy alone is his** (`rules.md`, Never, since `never-list-three-reductions`, 2026-10-13).");
  expect(s).toContain("A change to a `test_*` cell of one is such a fix too");
  expect(s).toContain("`land.sh` with `--seed-lands-undeployed`");
  expect(s).toContain("you emit, apply and probe nothing of it on cb4");
  expect(s).toContain("say that cb4 does not run the change and that the deploy is the owner's, and the comment says what he is to apply");
  expect(s).toContain("is still the third stop above");
  expect(s).toContain("No writer had landed so on the rule alone when this was written.");
});

// What the brief sends a writer to is in the tool: the flag, and the refusal without it.
test("land.sh has the flag the rule names, and refuses a seed without it", () => {
  const land = readFileSync(join(root, "tools/cloud-brain/land.sh"), "utf8");
  expect(land).toContain("--seed-lands-undeployed) SEED=1; shift ;;");
  expect(land).toContain("the commits change a seed");
});
