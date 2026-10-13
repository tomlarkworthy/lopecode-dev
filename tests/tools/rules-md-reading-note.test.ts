// rules.md is longer than one print of a shell command shows (50,211 characters on 2026-10-13), and every brief
// begins by telling its agent to read it. Five runs of that day read part of it. Since rules-md-over-one-tool-read
// a note stands between its first paragraph and its first section, where a print that was cut still has it: how
// the file is read whole, the command that lists its sections, the command that prints one, and the sections
// every agent reads, by their titles.
// Held here: where the note stands; that its two commands, run as written, print what it says; that each section
// it names is one the file has; that it names no section by a line number.
//
//   bun test --timeout=30000 ./tests/tools/rules-md-reading-note.test.ts
// RULES=<file> reads that file in place of rules.md (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dir, "../..");
const PATH = ".claude/skills/brain-maintenance/rules.md";
const file = process.env.RULES ? resolve(process.env.RULES) : join(root, PATH);
const rules = readFileSync(file, "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");

const titles = rules.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
// What stands before the first section, without the title: the paragraphs a cut print still has.
const head = rules.slice(0, rules.indexOf("\n## "));
const paragraphs = head.split(/\n\n+/).filter((p) => !p.startsWith("# "));
const note = paragraphs.find((p) => p.startsWith("**How to read this file.**")) ?? "";
// The `…` spans of the note that are a command, as an agent copies them, with the path of the note put for this file.
const command = (start: string): string => [...note.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).find((s) => s.startsWith(start)) ?? "";
const sh = (c: string) => spawnSync("sh", ["-c", c.replaceAll(PATH, `'${file}'`)], { cwd: root, encoding: "utf8" });

test("the note is the second paragraph, before the first section and in the first 2,000 characters", () => {
  expect(paragraphs.length).toBe(2);
  expect(paragraphs[0].startsWith("Read `philosophy.md` first")).toBe(true);
  expect(paragraphs[1]).toBe(note);
  expect(note.length).toBeGreaterThan(0);
  expect(rules.indexOf(note) + note.length).toBeLessThanOrEqual(2000);
});

test("the grep of the note, run as written, lists the sections, and the note's count is theirs", () => {
  const c = command("grep -n ");
  expect(c).toBe(`grep -n '^## ' ${PATH}`);
  const out = sh(c);
  expect(out.status).toBe(0);
  const lines = out.stdout.trim().split("\n");
  expect(lines.map((l) => l.replace(/^\d+:## /, ""))).toEqual(titles);
  expect(flat(note)).toContain(`lists its ${titles.length} sections`);
});

test("the sed of the note, with the two numbers the grep gives for a section, prints that section and no other", () => {
  const c = command("sed -n ");
  expect(c).toBe(`sed -n '<from>,<to>p' ${PATH}`);
  const at = sh(command("grep -n ")).stdout.trim().split("\n").map((l) => Number(l.split(":")[0]));
  const total = rules.split("\n").length;
  for (const i of [0, 1, titles.length - 1]) {
    const to = i + 1 < at.length ? at[i + 1] - 1 : total;
    const out = sh(c.replace("<from>", String(at[i])).replace("<to>", String(to)));
    expect(out.status).toBe(0);
    expect(out.stdout.startsWith(`## ${titles[i]}\n`)).toBe(true);
    expect(out.stdout.split("\n").filter((l) => l.startsWith("## ")).length).toBe(1);
  }
});

test("each section the note names is a section of the file, and the four every agent reads are named", () => {
  const sentence = flat(note).match(/Every agent reads ([^.]+)\./)?.[1] ?? "";
  const named = [...sentence.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  expect(named).toEqual(["What an issue is", "Never", "Always", "Which token"]);
  expect(named.filter((t) => !titles.includes(t))).toEqual([]);
});

test("the note names no section by a line number, and says what a cut print looks like", () => {
  expect(/\blines? \d/.test(flat(note))).toBe(false);
  expect(flat(note)).toContain("a preview of its first 2 KB");
  expect(flat(note)).toContain("with its middle left out");
  expect(flat(note)).toContain("The file tool (Read) gave it whole");
});

test("no rule was touched: the first paragraph and the first section stand as they did", () => {
  expect(flat(paragraphs[0])).toContain("A change to it is filed as an issue labeled `major`");
  expect(rules).toContain("\n\n## What an issue is\n\nAn issue is a description of work.");
});
