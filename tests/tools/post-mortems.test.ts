// The form of a post mortem, over every file of tools/cloud-brain/post-mortems/.
// Issue pm-1-file-and-search, task 1 of plan/cloud-brain-post-mortems-declared-and-kept.md (R5, design part 3). Its run
// is the count a post mortem is submitted with (design part 6).
//
//   bun test ./tests/tools/post-mortems.test.ts
//   POST_MORTEMS_DIR=/another/directory bun test ./tests/tools/post-mortems.test.ts
//
// What is held, of each file:
//   - its name is pm-<short>.md, an id the tracker takes (a-z 0-9 -, 40 at most): the issue's id, and so the entry
//     doc:pm-<short> of knowledge-docs.ts, which no doc of knowledge/ or plan/cloud-brain-*.md has while none is named pm-…;
//   - its first line is `# Post mortem: <one line>`;
//   - its `## ` headings are the seven of the spec's table, each once, in that order, and no other. A heading may go on
//     after the table's words (`## Next actions, filed`). `### ` and a line inside a code fence are not read;
//   - something stands under each heading;
//   - it is 16,000 characters at most, counted as knowledge-docs.ts counts a text (`.length`), over the whole file: an
//     entry's text is the file with its first line out, so a file that passes is entered whole.
// Not held: the line under the title (the first has four lines there), what a part says, and that an issue of the name exists.
import { test, expect } from "bun:test";
import { readdirSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dir, "../..");
const DIR = process.env.POST_MORTEMS_DIR || join(root, "tools/cloud-brain/post-mortems");
const PARTS = ["What happened", "The trace", "The root cause", "What is not known", "What it cost", "Next actions", "How it is known later"];
const LIMIT = 16000, NAME = /^pm-[a-z0-9]+(-[a-z0-9]+)*\.md$/, ID_MAX = 40;

const problems = (name: string, text: string): string[] => {
  const out: string[] = [];
  if (!NAME.test(name)) out.push("the name is not pm-<short>.md");
  else if (name.length - 3 > ID_MAX) out.push(`the name is an id of ${name.length - 3} characters, over ${ID_MAX}`);
  if (text.length > LIMIT) out.push(`${text.length} characters, over ${LIMIT}`);
  const lines = text.split("\n");
  if (!/^# Post mortem: \S/.test(lines[0])) out.push("the first line is not `# Post mortem: <one line>`");
  // The `## ` headings outside a code fence, each with whether a line that is not blank stands under it.
  const heads: { text: string; body: boolean }[] = [];
  let fence = false;
  for (const l of lines.slice(1)) {
    if (/^(```|~~~)/.test(l)) fence = !fence;
    if (!fence && /^## /.test(l)) heads.push({ text: l.slice(3).trim(), body: false });
    else if (heads.length && l.trim()) heads.at(-1)!.body = true;
  }
  const part = (h: string) => PARTS.findIndex((p) => h === p || (h.startsWith(p) && !/[A-Za-z0-9]/.test(h[p.length])));
  const at = heads.map((h) => part(h.text));
  for (const [i, h] of heads.entries()) if (at[i] < 0) out.push(`a heading the form does not have: \`## ${h.text}\``);
  for (const [i, p] of PARTS.entries()) {
    const n = at.filter((x) => x === i).length;
    if (n === 0) out.push(`no heading \`## ${p}\``);
    else if (n > 1) out.push(`${n} headings \`## ${p}\``);
  }
  const found = at.filter((x) => x >= 0);
  for (let i = 1; i < found.length; i++) if (found[i] < found[i - 1]) out.push(`\`## ${PARTS[found[i]]}\` stands after \`## ${PARTS[found[i - 1]]}\``);
  for (const [i, h] of heads.entries()) if (at[i] >= 0 && !h.body) out.push(`nothing under \`## ${h.text}\``);
  return out;
};

// Every .md of a directory with what it lacks; a file that meets the form has [].
const check = (dir: string): Record<string, string[]> =>
  Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => [f, problems(f, readFileSync(join(dir, f), "utf8"))]));

const good = (over: { title?: string; parts?: string[]; body?: (p: string) => string } = {}) =>
  [over.title ?? "# Post mortem: a second role was made where one exists (`pm-x`)", "", "Of `some-issue`, declared 2026-10-12 by the owner, written that day.", "",
    ...(over.parts ?? PARTS).flatMap((p) => ["## " + p, "", (over.body ?? (() => "What is under it."))(p), ""])].join("\n");

test("every file of the directory meets the form", () => {
  const found = check(DIR);
  expect(Object.keys(found).length).toBeGreaterThan(0);
  expect(found).toEqual(Object.fromEntries(Object.keys(found).map((f) => [f, []])));
});

test("the form passes a file with the seven headings, a heading that goes on after the table's words, `###` and a fenced `## `", () => {
  expect(problems("pm-x.md", good())).toEqual([]);
  expect(problems("pm-x.md", good({ parts: PARTS.map((p) => (p === "Next actions" ? "Next actions, filed" : p)) }))).toEqual([]);
  expect(problems("pm-x.md", good({ body: (p) => (p === "The trace" ? "### What the writer had in hand\n\nA step.\n\n```\n## not a heading\n```" : "Text.") }))).toEqual([]);
  expect(problems("pm-second-summarizer-role.md", good())).toEqual([]);
});

test("a heading missing, two out of order and a file over 16,000 characters each fail, read from a directory as the real one is", () => {
  const dir = mkdtempSync(join(tmpdir(), "bm-pm-form-"));
  const fill = good({ body: () => "x".repeat(2000) });
  const at = good() + "y".repeat(LIMIT - good().length), over = at + "y";
  const swapped = [...PARTS]; [swapped[2], swapped[3]] = [swapped[3], swapped[2]];
  writeFileSync(join(dir, "pm-good.md"), fill);
  writeFileSync(join(dir, "pm-missing.md"), good({ parts: PARTS.filter((p) => p !== "What is not known") }));
  writeFileSync(join(dir, "pm-order.md"), good({ parts: swapped }));
  writeFileSync(join(dir, "pm-at-the-limit.md"), at);
  writeFileSync(join(dir, "pm-over.md"), over);
  writeFileSync(join(dir, "notes.txt"), "not read");
  expect([at.length, over.length]).toEqual([LIMIT, LIMIT + 1]);
  expect(check(dir)).toEqual({
    "pm-at-the-limit.md": [],
    "pm-good.md": [],
    "pm-missing.md": ["no heading `## What is not known`"],
    "pm-order.md": ["`## The root cause` stands after `## What is not known`"],
    "pm-over.md": ["16001 characters, over 16000"],
  });
});

test("the title, the name, a heading of another name, one twice and one with nothing under it each fail", () => {
  expect(problems("pm-x.md", good({ title: "# pm-x" }))).toEqual(["the first line is not `# Post mortem: <one line>`"]);
  expect(problems("pm-x.md", good({ title: "# Post mortem: " }))).toEqual(["the first line is not `# Post mortem: <one line>`"]);
  expect(problems("pm-x.md", "\n" + good())).toEqual(["the first line is not `# Post mortem: <one line>`"]);
  expect(problems("pm-x.md", "")).toEqual(["the first line is not `# Post mortem: <one line>`", ...PARTS.map((p) => `no heading \`## ${p}\``)]);
  for (const name of ["second-role.md", "cloud-brain-pm-x.md", "pm-.md", "pm-X.md", "pm-a b.md", "pm-x.r1.md"]) expect(problems(name, good())).toEqual(["the name is not pm-<short>.md"]);
  expect(problems("pm-" + "a".repeat(38) + ".md", good())).toEqual(["the name is an id of 41 characters, over 40"]);
  expect(problems("pm-" + "a".repeat(37) + ".md", good())).toEqual([]);
  expect(problems("pm-x.md", good({ parts: [...PARTS, "Appendix"] }))).toEqual(["a heading the form does not have: `## Appendix`"]);
  // A heading that only starts with the letters of a part is another heading.
  expect(problems("pm-x.md", good({ parts: PARTS.map((p) => (p === "The trace" ? "The traceback" : p)) }))).toEqual(["a heading the form does not have: `## The traceback`", "no heading `## The trace`"]);
  expect(problems("pm-x.md", good({ parts: [...PARTS.slice(0, 2), "The trace", ...PARTS.slice(2)] }))).toEqual(["2 headings `## The trace`"]);
  expect(problems("pm-x.md", good({ body: (p) => (p === "What it cost" ? "" : "Text.") }))).toEqual(["nothing under `## What it cost`"]);
  // A level below is no heading of the form: `### The trace` does not stand for `## The trace`.
  expect(problems("pm-x.md", good().replace("## The trace", "### The trace"))).toEqual(["no heading `## The trace`"]);
});
