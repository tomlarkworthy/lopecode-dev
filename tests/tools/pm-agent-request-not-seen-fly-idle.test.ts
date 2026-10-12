// The post mortem of pm-agent-request-not-seen-fly-idle says what five texts of the loop had on 2026-10-12. Each is
// read as commit 45687267 has it (the commit the post mortem was written from), never as the file is now: its
// actions change them. The watch of that commit is run on three events shaped as 4816, 4916 and a submit.
//
//   bun test ./tests/tools/pm-agent-request-not-seen-fly-idle.test.ts
import { test, expect } from "bun:test";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dir, "../..");
const AT = "45687267";
const show = (path: string) => {
  const p = Bun.spawnSync(["git", "show", `${AT}:${path}`], { cwd: root });
  if (p.exitCode !== 0) throw new Error(`git show ${AT}:${path}: ${p.stderr.toString().trim()}`);
  return p.stdout.toString();
};
const flat = (s: string) => s.replace(/^> ?/gm, "").replace(/\s+/g, " ");
const pm = readFileSync(resolve(root, "tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md"), "utf8");
const SKILL = ".claude/skills/brain-maintenance/SKILL.md", BRIEF = ".claude/skills/brain-maintenance/agents/implementer.md";

// A sentence the post mortem quotes is in the text at the commit and in the post mortem.
const both = (text: string, quotes: string[]) => {
  for (const q of quotes) {
    expect(flat(text)).toContain(q);
    expect(flat(pm)).toContain(q);
  }
};

test("the post mortem has the owner's words, the two events and the three actions", () => {
  expect(pm).toContain("Something is not working correctly about the loop / issue workflow and things important things are being dropped.");
  for (const s of ["4816", "4916", "4921", "impl-ebb0f2", "orch-d97e0e", "EACH WAKE: read fly-1-by-hand for the first key"]) expect(pm).toContain(s);
  for (const id of ["asks-orchestrator-label-and-watch", "wait-says-what-runs-and-until-when", "watch-prints-an-outside-sessions-comment"]) {
    expect(pm).toContain("| `" + id + "` |");
    expect(id.length).toBeLessThanOrEqual(40);
  }
});

test("the watch of that commit prints a submit, and neither an agent's comment nor an outside session's", () => {
  const dir = mkdtempSync(join(tmpdir(), "bm-pm-watch-"));
  mkdirSync(join(dir, "tools/cloud-brain"), { recursive: true });
  const script = join(dir, "tools/cloud-brain/issue-watch.sh");
  writeFileSync(script, show("tools/cloud-brain/issue-watch.sh"), { mode: 0o755 });
  const by = (holder: string, via: string) => ({ caller: "owner", via, holder: "secret:" + holder, tab: false });
  const run = (events: object[]) => {
    const p = Bun.spawnSync(["bash", script, "--filter", "orch-d97e0e"], { stdin: Buffer.from(JSON.stringify({ events })) });
    return p.stdout.toString().trim().split("\n");
  };
  const ask = { seq: 4816, type: "commented", id: "fly-1-by-hand", key: "impl/fly-1-by-hand/ready-for-machine-pass", body: "ready for the machine's pass", by: by("impl-ebb0f2", "delegation:a11c5e52d7a2") };
  const owners = { seq: 4916, type: "commented", id: "fly-1-by-hand", key: "out/fly-1-by-hand/owner-idle-machine-1", body: "From a session with the owner", by: by("out-5f56b2", "delegation:931272f8f20c") };
  const submit = { seq: 4917, type: "moved", id: "x", move: "submit", to: "in-review", reason: "r", by: by("impl-ebb0f2", "delegation:a11c5e52d7a2") };
  expect(run([ask, owners])).toEqual(["LAST 4916"]);
  expect(run([ask, owners, submit])).toEqual(["4917 moved x impl-ebb0f2 in-review r", "LAST 4917"]);
  // The same comment made with the owner's session is printed: what the filter reads is by.via.
  expect(run([{ ...owners, by: by("", "session") }])[0]).toStartWith("4916 commented fly-1-by-hand OWNER");
  expect(show("tools/cloud-brain/issue-watch.sh")).toContain('own or sent or (e["type"]=="opened" and (asked or ');
});

test("SKILL.md at that commit: an agent's comment is no wake, no row of step 3 is of an agent that asks, the journal is read by no step", () => {
  const skill = show(SKILL);
  both(skill, [
    "A line is a wake: read that issue and take it from the table of step 3, without a whole pass. An agent's other writes print nothing; its report wakes you as before.",
    "the watch prints only what you would act on",
    "neither of them needed to resume",
  ]);
  expect(flat(skill)).toContain("After each agent finishes");
  const lines = skill.split("\n");
  const from = lines.findIndex((l) => /^3\. \*\*/.test(l)), to = lines.findIndex((l) => /^4\. \*\*Spawn/.test(l));
  const rows = lines.slice(from, to).filter((l) => /^   \| /.test(l) && l.includes("`in-progress`") && !l.startsWith("   | Anything else"));
  expect(rows.length).toBe(4);
  expect(rows.filter((l) => /asks|waits for you|ready-for/i.test(l.split("|")[1]))).toEqual([]);
  expect(skill.split("\n").filter((l) => l.includes("_orchestrator"))).toHaveLength(1);
  expect(skill).not.toContain("asks-orchestrator");
});

test("the writer's brief at that commit has a wait for its review and none for the orchestrating session", () => {
  const brief = show(BRIEF);
  both(brief, ["say so in a comment and in your report, with no label"]);
  expect(brief).toContain("issue-wait.sh <token> <id> <seq of your submit>");
  expect(brief.split("\n").filter((l) => /wait/i.test(l) && /orchestrat/i.test(l) && !/review|round|judg/i.test(l))).toEqual([]);
  expect(brief).not.toContain("asks-orchestrator");
});

test("the two specs and rules.md at that commit say what the post mortem quotes of them", () => {
  both(show("plan/cloud-brain-tracker-trigger-rules.md"), ["prints `WAKE <id> <when>` once for each due wait of its token", "no fact says that the owner has commented"]);
  both(show("plan/cloud-brain-bookkeeping-in-the-tracker.md"), ["an agent has it, or had"]);
  both(show("plan/cloud-brain-worker-machine-on-fly.md"), ["billed by the second"]);
  expect(flat(show(".claude/skills/brain-maintenance/rules.md"))).toContain("Before finishing: the QA tab you opened is closed by name; `browser.all` and `container.all` show nothing you started.");
  expect(flat(pm)).toContain("`browser.all` and `container.all` show nothing you started");
});
