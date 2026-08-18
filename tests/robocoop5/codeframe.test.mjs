/**
 * Retry-channel fidelity (aider benchmark/benchmark.py): the failure output handed back to the model
 * on attempt 2 is jest's, which prints a CODE FRAME — the verbatim spec lines around the failing
 * assertion, the failing one marked `>`. Our specs run under __testlib.cjs, not jest, so the frame is
 * produced by the harness; these tests pin that it is present, that the framed text is the REAL spec
 * source (not the rewritten __spec.cjs), and that the channel is no longer truncated.
 *
 * Grading spawns node and copies the exercise dir, so these are slower than a pure unit test (~2s).
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeSolution, stripAnsi } from "../../tools/robocoop-5/eval/polyglot/grade.mjs";

const ESC = String.fromCharCode(27);

const here = dirname(fileURLToPath(import.meta.url));
const POLY = join(here, "..", "..", "tools", "robocoop-5", "eval", "polyglot");
const EXERCISES = join(POLY, "..", "polyglot-src", "javascript", "exercises", "practice");
const problems = JSON.parse(readFileSync(join(POLY, "problems.json"), "utf8"));
const transpose = problems.find((p) => p.slug === "transpose");

// A candidate that compiles and fails: identity instead of a transpose.
const BAD = "export const transpose = (input) => input;\n";

const dirs = [];
after(() => { for (const d of dirs) if (d) try { rmSync(d, { recursive: true, force: true }); } catch {} });

describe("failure output code frames", () => {
  const g = gradeSolution(transpose, BAD, { mode: "esm" });
  dirs.push(g.dir);

  it("a wrong solution fails", () => {
    assert.equal(g.pass, false);
    assert.match(g.output, /^FAIL: /m);
  });

  it("prints a jest-style frame line marked `>` with the failing spec line", () => {
    const frameLine = g.output.split("\n").find((l) => /^\s*>\s*\d+ \|/.test(l));
    assert.ok(frameLine, "no `> N | …` frame line in:\n" + g.output.slice(0, 2000));
    const m = /^\s*>\s*(\d+) \|(?: (.*))?$/.exec(frameLine);
    assert.ok(m, "frame line not in jest gutter format: " + JSON.stringify(frameLine));
    const specLines = readFileSync(join(EXERCISES, transpose.slug, transpose.testFile), "utf8").split("\n");
    assert.equal(m[2] ?? "", specLines[Number(m[1]) - 1], "framed text is not the verbatim spec source line");
  });

  it("frames carry context lines around the failure", () => {
    const lines = g.output.split("\n");
    const i = lines.findIndex((l) => /^\s*>\s*\d+ \|/.test(l));
    const context = lines.slice(Math.max(0, i - 3), i + 4).filter((l) => /^\s*[>]?\s*\d+ \|/.test(l));
    assert.ok(context.length >= 3, "expected ±3 lines of context, got " + context.length);
  });

  it("does not truncate at the old 6000-char cap", () => {
    assert.notEqual(g.output.length, 6000);
    assert.ok(g.output.includes("Tests: "), "the summary line must survive (output was cut)");
  });

  // jest's `expect` colours its diffs unconditionally (verified: escapes are emitted even when stdout
  // is a pipe and CI=true). To a model those bytes are cost with no signal, so the channel is stripped.
  it("carries no ANSI escapes", () => {
    assert.ok(!g.output.includes(ESC), "SGR escapes reached the retry channel");
    assert.doesNotMatch(g.output, /\[\d+(;\d+)*m/);
  });

  it("keeps the diff body the escapes were colouring", () => {
    assert.match(g.output, /- Expected/);
    assert.match(g.output, /\+ Received/);
    assert.match(g.output, /^\s*[-+]\s+"/m, "diff +/- value lines must survive");
  });
});

describe("stripAnsi", () => {
  it("removes SGR sequences", () => {
    assert.equal(stripAnsi(`${ESC}[31mred${ESC}[39m`), "red");
    assert.equal(stripAnsi(`${ESC}[1m${ESC}[2mx${ESC}[22m${ESC}[22m`), "x");
  });

  it("leaves a code frame intact", () => {
    const frame = ["  10 |     const expected = ['A', '1'];", "> 11 |     expect(t(i)).toEqual(e);", "     |              ^"].join("\n");
    assert.equal(stripAnsi(`${ESC}[90m` + frame + `${ESC}[39m`), frame);
    assert.equal(stripAnsi(frame), frame);
  });

  it("leaves diff markers and ordinary bracket text intact", () => {
    assert.equal(stripAnsi("- Expected  - 2\n+ Received  + 1"), "- Expected  - 2\n+ Received  + 1");
    assert.equal(stripAnsi("arr[0m1] and a[1] index"), "arr[0m1] and a[1] index");
  });

  it("is idempotent", () => {
    const once = stripAnsi(`${ESC}[31m- Expected${ESC}[39m\n> 11 | expect(x).toEqual(y);`);
    assert.equal(stripAnsi(once), once);
  });
});
