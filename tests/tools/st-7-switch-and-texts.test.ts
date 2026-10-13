// The texts of the loop as steps: task 7 of plan/cloud-brain-orchestrator-as-steps.md. rules.md says "a session the
// owner is in" of the two standing leaves and of a token an approved spec names, "Which token" has the driver's line,
// and the two pulls of "Always" are the driver's too; SKILL.md, "Run it" and "Runs"; the knowledge page; the "As
// amended" notes of the Fly spec. Issue st-7-switch-and-texts.
//
//   bun test --timeout=30000 ./tests/tools/st-7-switch-and-texts.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string): string => readFileSync(join(root, p), "utf8");
const rules = read(".claude/skills/brain-maintenance/rules.md");
const skill = read(".claude/skills/brain-maintenance/SKILL.md");
const page = read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");
const fly = read("plan/cloud-brain-worker-machine-on-fly.md");
const loop = read("tools/cloud-brain/loop.ts");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// A section: from its heading to the next of the same depth.
const section = (text: string, heading: string, mark = "## "): string => {
  const at = text.indexOf(`\n${mark}${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf(`\n${mark}`, at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};

test("section() reads one and stops at the next", () => {
  expect(section("# t\n\n## a\nx\n\n## b\ny\n", "a")).toBe("## a\nx\n");
  expect(section("# t\n\n## a\nx\n", "z")).toBe("");
});

test("rules.md: the standing leaves and the spec's tokens are a session's the owner is in", () => {
  expect(section(rules, "Two standing leaves of the orchestrating session")).toBe("");
  const leaves = flat(section(rules, "Two standing leaves of a session the owner is in"));
  expect(leaves).toContain("Both are made by a session the owner is in. A step and a judgment run make neither.");
  const token = flat(section(rules, "A token an approved spec names"));
  expect(token).toContain("is made by a session the owner is in, with the owner's session, from the main checkout");
  expect(token).not.toContain("is made by the orchestrating session with the owner's session");
  const never = flat(section(rules, "Never"));
  expect(never).toContain("made by a session the owner is in and by no step of the loop");
  // No text of the file names the section by its old name.
  expect(flat(rules).split("Two standing leaves of the orchestrating session").length).toBe(2);
});

test("rules.md: what a session the owner is in is, with his word and the choice it answered", () => {
  const s = flat(section(rules, "A session the owner is in"));
  expect(s).toContain(
    '"Approve as written. A step never acts with your session. The three acts the session makes today while you ' +
      "are away (a token an approved spec names, posting the page's shell, pushing your quoted words) wait for a " +
      'session you are in."',
  );
  expect(s).toContain('(event 5736): "Ok approve last 2"');
  expect(s.indexOf("The rest of this section is the writer's reading, not his words")).toBeGreaterThan(s.indexOf("Ok approve last 2"));
  expect(s).toContain("**What is not one.** The driver (`tools/cloud-brain/loop.ts run`), a step, a judgment run");
  expect(s).toContain('under "What a session with the owner is asked to do"');
});

test("rules.md, Which token: the driver's line, and who makes an agent's token", () => {
  const s = section(rules, "Which token");
  const row = (first: string) => s.split("\n").filter((l) => l.startsWith(`| ${first}`));
  expect(row("The driver, `tools/cloud-brain/loop.ts run` |").length).toBe(1);
  expect(row("The driver")[0]).toContain("itself, when it starts");
  expect(row("A judgment run")[0]).toContain("the step that starts it");
  expect(row("A writer")[0]).toContain("`loop.ts start`");
  expect(s).not.toContain("the orchestrating session, before the spawn");
  expect(flat(s)).toContain("**The driver's line**");
  expect(flat(s)).toContain("was decided by a rule of `loop.ts` and by no model");
});

test("rules.md, Always: the two pulls are the driver's too", () => {
  const s = flat(section(rules, "Always"));
  expect(s).toContain("and they are the driver's too: by a step begun for the clock");
  expect(s).toContain("and by a session that makes a pass by hand");
});

test("what rules.md and SKILL.md say of the program is what loop.ts has", () => {
  // The notes of the two tokens, the parts of status.md, the lock's name and the 40 hours.
  expect(loop).toContain('brain("agent-token", "orch", `driver:${host}`)');
  expect(loop).toContain('brain("agent-token", "orch", `judgment:${on || "unhealthy"}`)');
  const parts = [...loop.matchAll(/\.\.\.part\(([^,]+),/g)].map((m) => m[1]);
  expect(parts.length).toBe(10);
  for (const name of ["Health", "What runs", "What waits for the owner", "Judged and left as it was", "What a session with the owner is asked to do"])
    expect(parts).toContain(JSON.stringify(name));
  expect(parts.join(" ")).toContain('"What the step did"');
  expect(flat(section(skill, "Run it"))).toContain("with ten parts, among them");
  expect(loop).toContain("at 40 hours of its token");
});

test("SKILL.md, Run it: the driver is the owner's to start, and a session starts none", () => {
  const s = flat(section(skill, "Run it"));
  expect(s).toContain("tools/cloud-brain/loop.sh the loop. The owner starts it in a terminal of his own and stops it with Ctrl-C");
  expect(s).toContain("**The driver is the owner's to start. You start none.**");
  expect(s).toContain("You run no `loop.sh` and no `loop.ts run` without `--dry`");
  expect(s).toContain("**It had not been started when this was written**");
  expect(s).toContain("its first run is the owner's and its first minutes are watched");
  expect(s).toContain("lock.sh show loop");
  expect(s).toContain("bun tools/cloud-brain/loop.ts start <id>");
  expect(s).toContain("/loop /brain-maintenance going back");
  expect(s).not.toContain("every wake does one pass, then schedules the next /brain-maintenance");
  // The paragraph that was there stands.
  expect(s).toContain("Read `philosophy.md` and then `rules.md` in this directory before the first pass.");
});

test("SKILL.md: nothing says that no step runs yet, and Runs has a line for the driver", () => {
  expect(flat(skill)).not.toContain("Nothing of the loop runs `step` yet");
  expect(loop).not.toContain("Nothing of the loop calls it yet");
  const runs = flat(section(skill, "Runs"));
  expect(runs).toContain("and one per run of the driver from its start to its Ctrl-C");
  expect(runs).toContain("- 2026-10-13.");
  expect(runs).toContain("- 2026-10-10, about 16:00 to 21:25 CEST");
});

test("the knowledge page: the row of the loop names the driver and where its status is", () => {
  const row = page.split("\n").filter((l) => l.startsWith("| The loop that works the tracker"));
  expect(row.length).toBe(1);
  expect(row[0]).toContain("(written 2026-10-10, run as a loop since that day)");
  expect(row[0]).toContain("`tools/cloud-brain/loop.sh`");
  expect(row[0]).toContain("no agent starts it without `--dry`");
  expect(row[0]).toContain("`tools/cloud-brain/.emitted/issue-loop/status.md`");
  expect(row[0]).toContain("The driver had not been started when this was written");
});

test("the Fly spec: an As amended note in part 1, at the head of part 2, and in T2 and T4", () => {
  // Four notes, and the head of the table of the second.
  expect(fly.split("As amended").length - 1).toBe(5);
  expect(fly.split("st-7-switch-and-texts`, 2026-10-13").length - 1).toBe(4);
  const two = section(fly, '2. The loop there, and its end (R2, R8). Answers "who turns it on and off", "how the two loops keep apart"', "### ");
  expect(two.indexOf("**As amended (`st-7-switch-and-texts`, 2026-10-13).**")).toBeLessThan(two.indexOf("**What the machine's loop does not do.**"));
  const note = flat(two.slice(0, two.indexOf("**What the machine's loop does not do.**")));
  for (const said of ["`run.sh` execs", "`--hold` is not built", "a read of `fly.status` by the driver at each renew", "releases `loop` and exits 0", "the label `laptop`"])
    expect(note).toContain(said);
  // What the note says is not built was not in the program until fly-4-loop-files (2026-10-13), which built it and
  // says so in a note of its own under this one: the program has the yield, and run.sh starts the driver.
  expect(note).toContain("**As built (`fly-4-loop-files`, 2026-10-13).**");
  // (Until then this line read `loop.split("\nimport ")[1]`, which is the first import statement alone, for `false`.)
  expect(/yielding/.test(loop.slice(loop.indexOf("\nimport "))) && /fly\.status/.test(loop.slice(loop.indexOf("\nimport ")))).toBe(true);
  expect(read("tools/cloud-brain/fly/run.sh")).toContain('bun tools/cloud-brain/loop.ts run < /dev/null');
  const tasks = section(fly, "The tasks, in the order they land");
  expect(flat(tasks.slice(tasks.indexOf("2. **T2"), tasks.indexOf("3. **T3")))).toContain("(As amended, `st-7-switch-and-texts`");
  expect(flat(tasks.slice(tasks.indexOf("4. **T4, "), tasks.indexOf("5. **T4b")))).toContain("(As amended, `st-7-switch-and-texts`");
});
