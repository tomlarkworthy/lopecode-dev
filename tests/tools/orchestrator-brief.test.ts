// agents/orchestrator.md (st-4-orchestrator-brief, 2026-10-13; task 4 of plan/cloud-brain-orchestrator-as-steps.md): the
// brief of a judgment run, the model `loop.ts step` starts for the entries a program cannot decide. Five texts of
// SKILL.md were moved into it and not rewritten, and SKILL.md keeps a pass by hand, which reads them there.
// Held here: each moved heading is in the brief and not in SKILL.md; the five texts, in the commit that added the
// brief, are texts of SKILL.md of the commit before, byte for byte; SKILL.md says where each is; the brief has a row
// for each word `step` gives an entry by, the three words of a verdict, and names rows of SKILL.md that are there once.
//
//   bun test --timeout=30000 ./tests/tools/orchestrator-brief.test.ts
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { BRIEF } from "../../tools/cloud-brain/loop.ts";

const root = resolve(import.meta.dir, "../..");
const DIR = ".claude/skills/brain-maintenance", SKILL = DIR + "/SKILL.md", ORCH = DIR + "/agents/orchestrator.md";
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const git = (...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
const headings = (text: string) => text.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
// The three sections that were moved whole, and the two headings the brief gives what was moved out of two rows.
const SECTIONS = ["A quick win", "A post mortem", "Triage"], ROWS = ["The `decompose` row", "A round at 3 `rework` moves"];
// A section of a text: from its heading to the next heading of that level, or the end.
const section = (text: string, title: string) => {
  const a = text.indexOf(`\n## ${title}\n`);
  if (a < 0) return "";
  const b = text.indexOf("\n## ", a + 1);
  return text.slice(a + 1, b < 0 ? text.length : b + 1);
};

test("each moved heading is in agents/orchestrator.md and not in SKILL.md", () => {
  const brief = headings(read(ORCH)), skill = headings(read(SKILL));
  for (const h of [...SECTIONS, ...ROWS]) expect([h, brief.filter((x) => x === h).length, skill.includes(h)]).toEqual([h, 1, false]);
  // The brief's own part is first, and the moved texts are last, the three sections in the order SKILL.md had them:
  // "Triage" names "A post mortem" as above it.
  expect(brief.slice(-5)).toEqual([...SECTIONS, ...ROWS]);
  expect(brief.slice(0, -5)).toEqual(["Your prompt, and your token", "The entries", "How an entry is answered", "Two dead runs", "The cluster is not healthy", "What you do not do", "Your report"]);
  expect(BRIEF.orchestrator).toBe("orchestrator");
  expect(existsSync(join(root, DIR, "agents", BRIEF.orchestrator + ".md"))).toBe(true);
});

// The brief as the commit that added it has it, against SKILL.md of that commit's parent. A later edit of either file
// does not move this: it reads two commits.
test("moved and not rewritten: the five texts of the commit that added the brief are texts of SKILL.md as it stood before, byte for byte, and are not in SKILL.md of that commit", () => {
  // ORCHESTRATOR_BRIEF_COMMIT names another commit to read in its place: the record's check that this test can fail.
  const added = process.env.ORCHESTRATOR_BRIEF_COMMIT || git("log", "--diff-filter=A", "--format=%H", "--", ORCH).stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!added) return void console.log("skipped: orchestrator-brief.test.ts: no commit that added agents/orchestrator.md (it is not committed, or the clone is shallow)");
  const before = git("show", `${added}^:${SKILL}`), after = git("show", `${added}:${SKILL}`), brief = git("show", `${added}:${ORCH}`);
  expect([before.status, after.status, brief.status]).toEqual([0, 0, 0]);
  for (const h of SECTIONS) {
    const text = section(brief.stdout, h);
    expect([h, text.length > 2000, before.stdout.split(text).length - 1, after.stdout.includes(text)]).toEqual([h, true, 1, false]);
    // and it is the whole section of before, not a part of it
    expect([h, section(before.stdout, h) === text]).toEqual([h, true]);
  }
  for (const h of ROWS) {
    const text = section(brief.stdout, h).split("\n").slice(2).join("\n").trim();
    expect([h, text.length > 500, text.includes("\n"), before.stdout.split(text).length - 1, after.stdout.includes(text)]).toEqual([h, true, false, 1, false]);
  }
  // What was in a row was a cell's end: the cell of `decompose` whole, and the row of an issue sent back from "Do not".
  const row = (text: string, start: string) => text.split("\n").find((l) => l.startsWith(start)) || "";
  expect(row(before.stdout, "   | `decompose` | ")).toBe("   | `decompose` | " + section(brief.stdout, ROWS[0]).split("\n").slice(2).join("\n").trim() + " |");
  expect(row(before.stdout, "   | `in-progress`, started by a writer or a digest writer").endsWith(" " + section(brief.stdout, ROWS[1]).split("\n").slice(2).join("\n").trim() + " |")).toBe(true);
  // Nothing else left SKILL.md: the lines of before, less the five texts, that the commit has not are the lines
  // that were edited to name the brief.
  const moved = [...SECTIONS.map((h) => section(brief.stdout, h)), ...ROWS.map((h) => section(brief.stdout, h).split("\n").slice(2).join("\n").trim())];
  let rest = before.stdout;
  for (const t of moved) rest = rest.replace(t, "");
  const has = new Set(after.stdout.split("\n")), gone = rest.split("\n").filter((l) => !has.has(l));
  const edited = ["reported. You review nothing yourself, and you fix only a quick win (below).", "   | `triage` | Triage it yourself (Triage, below)", "   | `decompose` |  |", "   | `in-progress`, started by a writer or a digest writer", "   | labeled `post-mortem`, at `open` | ", "   | labeled `post-mortem`, at `ready` | ", '   Then the post mortems ("A post mortem", below)'];
  expect(gone.map((l) => edited.find((p) => l.startsWith(p)) || l)).toEqual(edited);
});

test("SKILL.md keeps a pass by hand: it says where each of the five is, and its rows name the brief", () => {
  const skill = read(SKILL), note = section(skill, "What is in `agents/orchestrator.md`");
  expect(note.length).toBeGreaterThan(500);
  const rows = note.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Was here") && !l.startsWith("|---"));
  expect(rows.map((r) => r.split("|")[2].trim())).toEqual([...SECTIONS, ...ROWS].map((h) => `"${h}"`));
  const text = flat(skill);
  for (const s of ["moved as they stood with no word changed", "from its heading \"A quick win\" on; what stands above that heading is for a judgment run and not for you",
    "Where this file or another text names one of the five as a section or a row of `SKILL.md`", "it means that file",
    'you fix only a quick win (`agents/orchestrator.md`, "A quick win")', 'Triage it yourself (`agents/orchestrator.md`, "Triage")',
    '| `decompose` | `agents/orchestrator.md`, "The `decompose` row":', '`agents/orchestrator.md`, "A round at 3 `rework` moves". |',
    'Triage it by its one question ("A post mortem" of `agents/orchestrator.md`)']) expect(text).toContain(s);
  expect(text).not.toContain("Triage, below)");
  expect(text).not.toContain('"A post mortem", below');
  // The steps of a pass are all here still.
  expect(skill.split("\n").filter((l) => /^\d\. \*\*/.test(l)).map((l) => l.slice(0, 2))).toEqual(["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8."]);
});

test("the brief has a row for each word `step` gives an entry by, the words of a verdict, and names rows of SKILL.md that are there once", () => {
  const brief = read(ORCH), entries = section(brief, "The entries"), tool = read("tools/cloud-brain/loop.ts");
  const rows = entries.split("\n").filter((l) => /^\| `/.test(l) && !l.startsWith("| `<do>`"));
  const words = rows.map((r) => /^\| `([a-z]+)/.exec(r)![1]);
  expect(words).toEqual(["triage", "decompose", "round", "dead", "promote", "look", "answer", "asks", "unhealthy"]);
  // loop.ts: the four of the queue, and each word its rows give to `judge`, and `unhealthy`.
  const given = [...JSON.parse(/const JUDGED = (\[[^\]]+\])/.exec(tool)![1]), ...[...tool.matchAll(/judge\([^,]+, "([a-z]+)"/g)].map((m) => m[1]), /do: "(unhealthy)"/.exec(tool)![1]];
  expect([...new Set(given)].sort()).toEqual([...words].sort());
  // Each section of this file a row sends to is one of its headings.
  for (const h of ["Triage", "A post mortem", "A quick win", "The `decompose` row", "A round at 3 `rework` moves", "Two dead runs", "The cluster is not healthy"]) expect([h, entries.includes(`"${h}"`), headings(brief).includes(h)]).toEqual([h, true, true]);
  // Each row of SKILL.md it sends to is one line there, found as the brief says to find it.
  const cells = [...entries.matchAll(/first cell is `` (.+?) ``/g)].map((m) => m[1]);
  expect(cells).toEqual(["`open`, kind `feedback`", "`look`", "labeled `needs-owner`", "labeled `asks-orchestrator`, at any state"]);
  const skill = read(SKILL);
  for (const c of [...cells.map((c) => `| ${c} |`), "| Anything else:"]) expect([c, skill.split("\n").filter((l) => l.includes(c)).length]).toEqual([c, 1]);
  const answered = flat(section(brief, "How an entry is answered"));
  for (const s of ["`orch/<id>/verdict-<do>-<at>`", "`go-on`, for `round`", "`not-answered`, for `answer`", "`left`, then the reason on the same line", "never in a comment alone"]) expect(answered).toContain(s);
  expect(tool).toContain("`orch/${id}/verdict-${what}-${at}`");
  const not = flat(section(brief, "What you do not do"));
  for (const s of ["You start no agent", "no `loop.ts start` or `resume`", "Nothing with the owner's session or his key", "the verdict `left: a session with the owner <the act>`"]) expect(not).toContain(s);
  // The prompt the brief describes is the one `start` writes.
  expect(flat(section(brief, "Your prompt, and your token"))).toContain("`Entries: <do> <id> (event <at>); …`");
  expect(tool).toContain("`Entries: ${entries}`");
  expect(tool).toContain("`${x.do} ${x.id} (event ${x.at})`");
});
