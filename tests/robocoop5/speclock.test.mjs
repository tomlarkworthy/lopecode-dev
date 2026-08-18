/**
 * Unit tests for `specGateCheck` — the spec-lock veto in @tomlarkworthy/robocoop-5-tools.
 *
 * spec-lock gates `task_complete` on the spec scorecard: while any example from /src/@user/spec.js
 * fails, the completion is rejected and the model is told which ones. The escape hatch is a
 * SPEC-WAIVER line in the summary, for the case where the specification itself is contradictory —
 * without it a genuinely impossible task would livelock the turn.
 *
 * The pure function is tested directly against the real module (imported headlessly through the
 * Observable runtime, no browser, no model calls), so the veto text and its trigger conditions are
 * pinned to what the engine actually calls.
 *
 * Spec-lock is NOT deployed: the source under test is the experimental copy in
 * tools/robocoop-5/experimental/speclock-modules/, not the declared canonical (see the README
 * there for why the score is unproven).
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { importNotebookModule } from "../../tools/notebook-import.ts";

let specGateCheck, rc5_specGate;

before(async () => {
  const m = await importNotebookModule(
    fileURLToPath(
      new URL("../../tools/robocoop-5/experimental/speclock-modules/robocoop-5-tools.js", import.meta.url),
    ),
  );
  specGateCheck = await m.value("specGateCheck");
  rc5_specGate = await m.value("rc5_specGate");
});

const red = {
  total: 3,
  passing: ["obtuse"],
  failing: [{ name: "acute", got: '"OBTUSE"' }, { name: "answer", err: "timeout 2000ms" }],
  ungrounded: [],
};
const green = { total: 3, passing: ["a", "b", "c"], failing: [], ungrounded: [] };

describe("specGateCheck", () => {
  it("vetoes a completion while examples fail, and names them", () => {
    const veto = specGateCheck(red, "all done, shipped it");
    assert.match(veto, /^REJECTED: the spec scorecard reports 2\/3 examples FAILING/);
    assert.match(veto, /acute/);
    assert.match(veto, /answer/);
    assert.match(veto, /\/src\/@user\/solution\.js/);
    assert.match(veto, /\/src\/@user\/spec\.js/);
    assert.match(veto, /SPEC-WAIVER/);
  });

  it("names at most 6 failing examples", () => {
    const many = { total: 9, passing: [], failing: "abcdefgh".split("").map((n) => ({ name: n })), ungrounded: [] };
    const veto = specGateCheck(many, null);
    assert.match(veto, /\(a, b, c, d, e, f, …\)/);
    assert.ok(!veto.includes(" g,"), "7th example must not be listed");
  });

  it("passes a green scorecard", () => {
    assert.equal(specGateCheck(green, "done"), null);
  });

  it("passes when no scorecard exists (no spec module in play)", () => {
    assert.equal(specGateCheck(null, "done"), null);
    assert.equal(specGateCheck(undefined, null), null);
  });

  it("passes when the summary carries a SPEC-WAIVER", () => {
    assert.equal(specGateCheck(red, "SPEC-WAIVER: acute — the spec contradicts itself here"), null);
    assert.equal(specGateCheck(red, "done\nSPEC-WAIVER: answer — example expects 42 and 43"), null);
  });

  it("still vetoes when the summary merely mentions a waiver without the marker", () => {
    assert.match(specGateCheck(red, "I waive the spec check"), /^REJECTED/);
  });

  it("tolerates a null summary (the model completed with no summary text)", () => {
    assert.match(specGateCheck(red, null), /^REJECTED/);
  });
});

/**
 * The polyglot runner's attempt-2 seeding. v1 re-seeded only /instructions.md, /stub.js and the
 * attempt-1 solution, so the executable spec was destroyed exactly at the repair step. Attempt 2 is
 * now WARM by default (attempt 1's conversation is resumed), which makes the seeds attempt 1's END
 * file state — the resumed conversation refers to files the agent wrote. The runner is an entry
 * script (importing it launches a browser), so its functions are lifted out of the source and
 * exercised directly.
 */
describe("polyglot runner attempt-2 spec carry", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../../tools/robocoop-5/eval/polyglot/run-agent.mjs", import.meta.url)),
    "utf8",
  );
  const SPEC_PATH = "/src/@user/spec.js";
  const SOL_PATH = "/src/@user/solution.js";

  it("defines SPEC_PATH as the snapshotFiles key for @user/spec", () => {
    assert.match(src, /const SPEC_PATH = "\/src\/@user\/spec\.js";/);
  });

  it("carries the attempt-1 spec file into the attempt-2 seeds", () => {
    assert.match(src, /const spec1 = snap1\.files\?\.\[SPEC_PATH\];/);
    assert.match(src, /seeds2\[SPEC_PATH\] = spec1;/);
    // …and only when attempt 1 actually produced one (control arm never writes a spec).
    assert.match(src, /typeof spec1 === "string" && spec1\.trim\(\)/);
  });

  const warmSeeds = (() => {
    const i = src.indexOf("function warmSeeds(");
    const j = src.indexOf("\nfunction question2(", i);
    assert.ok(i > 0 && j > i, "warmSeeds not found in runner source");
    return new Function(src.slice(i, j) + "\nreturn warmSeeds;")();
  })();

  it("warm attempt 2 re-seeds the agent's own files and nothing else", () => {
    const seeds1 = { "/instructions.md": "spec text", "/stub.js": "skeleton" };
    const out = warmSeeds(seeds1, {
      files: {
        "/instructions.md": "spec text",
        "/notes.md": "scratch the agent wrote",
        [SOL_PATH]: "SOLUTION",
        [SPEC_PATH]: "SPEC",
        "/src/@tomlarkworthy/robocoop-5.js": "CORE MODULE — must not be re-applied",
        "/notebook/@user/solution.js": "export mirror of the same module",
      },
    });
    assert.deepEqual(
      Object.keys(out).sort(),
      ["/instructions.md", "/notes.md", SOL_PATH, SPEC_PATH, "/stub.js"].sort(),
    );
    assert.equal(out[SOL_PATH], "SOLUTION");
    assert.equal(out["/stub.js"], "skeleton", "a seed the agent never touched survives");
  });

  it("resumes attempt 1's whole conversation unless --cold-repair", () => {
    assert.match(src, /const coldRepair = args\.includes\("--cold-repair"\)/);
    assert.match(src, /const resume = !coldRepair && conv1\.length \? prefixAt\(conv1, Infinity\) : null/);
    // …and the warm path drops the notes tail: the full conversation is already in context.
    assert.match(src, /question2\(p, g1\.output, resume \? null : summarizeAttempt1\(snap1\), rec\.specCarried\)/);
  });

  const question2 = (() => {
    const i = src.indexOf("function question2(");
    const j = src.indexOf("\nfunction gradeFromSnapshot(", i);
    assert.ok(i > 0 && j > i, "question2 not found in runner source");
    return new Function("SOL_PATH", "SPEC_PATH", src.slice(i, j) + "\nreturn question2;")(SOL_PATH, SPEC_PATH);
  })();

  const p = { slug: "transpose" };

  it("tells attempt 2 to reconcile the spec against the tests when the spec was carried", () => {
    const q = question2(p, "Expected: [] Received: undefined", null, true);
    assert.match(q, /Your executable spec module \/src\/@user\/spec\.js is preserved/);
    assert.match(q, /FIRST reconcile it against the failing test output/);
    assert.match(q, /the TESTS are the ground truth/);
    assert.match(q, /correct the spec examples to match the tests/);
    assert.match(q, /until the scorecard is green/);
  });

  it("says nothing about a spec when none was carried", () => {
    const q = question2(p, "Expected: [] Received: undefined", null, false);
    assert.ok(!q.includes("spec.js"), "control arm must not be told about a spec module");
    assert.match(q, /Diagnose and fix \/src\/@user\/solution\.js/);
  });
});

describe("rc5_specGate", () => {
  it("is a plain mutable holder starting empty", () => {
    assert.deepEqual(rc5_specGate, { scorecard: null });
    rc5_specGate.scorecard = green;
    assert.equal(rc5_specGate.scorecard, green);
    rc5_specGate.scorecard = null;
  });
});
