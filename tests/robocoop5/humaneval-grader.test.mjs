/**
 * Pins the humaneval grader's whole-program-first semantics (fidelity fix H1) and its 5s
 * per-program timeout (H3).
 *
 * Official MultiPL-E grades ONE program: prompt + completion + '\n' + tests, run under node with
 * subprocess timeout=5. Our grader used to brace-extract just the target function out of a raw
 * candidate, which silently deleted top-level `require()` calls and helper declarations the
 * solution depended on — three correct baseline solutions (string_to_md5, make_palindrome,
 * minPath) failed on that alone. Raw text is now run whole first; extraction survives only as a
 * fallback after the whole program has failed.
 *
 * The agent arm is unaffected: a /src module (`export default function define`) is not runnable
 * JS, so module candidates still go to the define() emulator first.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  gradeCandidate,
  wholeProgram,
  fnNameOf,
  extractBalanced,
  HUMANEVAL_TIMEOUT_MS,
} from "../../tools/robocoop-5/eval/humaneval/grade.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HUMANEVAL = join(HERE, "..", "..", "tools", "robocoop-5", "eval", "humaneval");

// A MultiPL-E-shaped test block: asserts, exits non-zero on failure.
const TESTS = `const assert = require('node:assert');
assert.deepEqual(target("ab"), "abab");
`;

describe("humaneval grader — whole-program first", () => {
  it("a raw candidate with a top-level require + helper passes (extraction would delete both)", () => {
    const candidate = `const { Buffer } = require('node:buffer');
function twice(s) { return s + s; }
function target(s) { return twice(Buffer.from(s, 'utf8').toString('utf8')); }
`;
    // The dependencies really do live outside the function body: extraction alone loses them.
    const extracted = extractBalanced(candidate, candidate.indexOf("function target"));
    assert.ok(!/require\(/.test(extracted) && !/function twice/.test(extracted));

    const g = gradeCandidate(candidate, TESTS, { fnName: "target" });
    assert.equal(g.pass, true);
    assert.equal(g.via, "whole-program", "raw text must be graded whole, MultiPL-E style");
  });

  it("builds the official program shape: candidate, newline, tests", () => {
    assert.equal(wholeProgram("CODE", "TESTS"), "CODE\nTESTS\n");
  });

  it("falls back to extraction when the whole program fails", () => {
    // Top-level junk after the function: the whole program throws before the tests run, but the
    // function itself is correct, so the brace-extracted fallback must still rescue it.
    const candidate = `function target(s) { return s + s; }
missingHelperNeverDefined();
`;
    // Sanity: run whole, it throws before reaching the tests.
    assert.match(String(gradeCandidate(candidate, "", { fnName: null }).error), /missingHelperNeverDefined/);
    const g = gradeCandidate(candidate, TESTS, { fnName: "target" });
    assert.equal(g.pass, true);
    assert.equal(g.via, "extracted");
  });

  it("reports the faithful (primary) attempt's error when every path fails", () => {
    const candidate = `function target(s) { return "wrong"; }\n`;
    const g = gradeCandidate(candidate, TESTS, { fnName: "target" });
    assert.equal(g.pass, false);
    assert.equal(g.via, "whole-program");
    assert.match(String(g.error), /Assertion|assert/i);
  });

  it("grades a raw candidate whole even when no function name is known", () => {
    const g = gradeCandidate("globalThis.target = (s) => s + s;\n", TESTS, { fnName: null });
    assert.equal(g.pass, true);
    assert.equal(g.via, "whole-program");
  });
});

describe("humaneval grader — 5s timeout", () => {
  it("defaults to MultiPL-E's 5s subprocess timeout", () => {
    assert.equal(HUMANEVAL_TIMEOUT_MS, 5000);
  });

  it("kills an infinite loop at the 5s budget rather than hanging", () => {
    const candidate = `function target(s) { while (true) {} }\n`;
    const started = Date.now();
    const g = gradeCandidate(candidate, TESTS, { fnName: "target" });
    const elapsed = Date.now() - started;
    assert.equal(g.pass, false);
    // whole-program then the extracted fallback: two 5s budgets, never the old 15s-per-program.
    assert.ok(elapsed >= 4000, `returned too fast (${elapsed}ms) — was the program actually run?`);
    assert.ok(elapsed < 15000, `took ${elapsed}ms — the 5s timeout is not being applied`);
    assert.match(String(g.error), /killed/);
  });
});

describe("humaneval grader — agent arm unchanged", () => {
  it("a /src module candidate still goes to the define() emulator", () => {
    const candidate = `const _target = function target(){return(
function target(s) { return s + s; }
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("target")).define("target", [], _target);
  return main;
}
`;
    const g = gradeCandidate(candidate, TESTS, { fnName: "target" });
    assert.equal(g.pass, true);
    assert.equal(g.via, "emulator");
  });
});

describe("humaneval grader — the real rescued candidates", () => {
  const problems = JSON.parse(readFileSync(join(HUMANEVAL, "humaneval-js.json"), "utf8"));
  const stored = JSON.parse(readFileSync(join(HUMANEVAL, "results", "baseline-full.json"), "utf8"));
  const byName = new Map(problems.map((p) => [p.name, p]));

  // Recorded FAIL under the extract-only grader; correct under the official whole-program rule.
  for (const slug of [
    "HumanEval_162_string_to_md5",
    "HumanEval_10_make_palindrome",
    "HumanEval_129_minPath",
  ]) {
    it(`${slug} — stored baseline candidate passes whole-program`, () => {
      const rec = stored.results.find((r) => r.name === slug);
      const p = byName.get(slug);
      assert.ok(rec && typeof rec.candidate === "string" && p, "fixture missing from stored results");
      assert.equal(rec.pass, false, "premise: this was recorded as a FAIL");
      const g = gradeCandidate(rec.candidate, p.tests, { fnName: fnNameOf(p.prompt) });
      assert.equal(g.pass, true, `expected a rescue, got: ${g.error}`);
      assert.equal(g.via, "whole-program");
    });
  }
});
