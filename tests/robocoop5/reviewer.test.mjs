/**
 * Unit tests for the U3 reviewer anchor — tools/robocoop-5/eval/polyglot/reviewer-corpus.mjs
 * (corpus assembly) and reviewer-measure.mjs (verdict parsing, agreement stats).
 * Zero model calls: both files guard their CLI body behind isMain, so importing them is inert.
 *
 * What is load-bearing here, and why:
 *  - The split is BY SLUG. Rows for one slug share a spec and near-identical patches, so a
 *    row-level split would let the reviewer see the answer to a held-out row during selection.
 *  - Dedup is on (slug, patch) bytes, and a pair carrying BOTH verdicts is a grader disagreement,
 *    not a duplicate — a row whose truth is contested cannot score a reviewer, so it is dropped
 *    and reported.
 *  - Verdict parsing prefers an explicit `VERDICT:` line over the first bare PASS/FAIL token,
 *    because spec-check's per-check lines each carry a PASS/FAIL of their own. First-token parsing
 *    reads check 1 as the verdict; the smoke run showed exactly that.
 *  - Unparseable output is a disagreement, never a dropped row; infra failures ARE dropped, because
 *    an API error is not evidence about a reviewer.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rowFromTrajectory, rowFromContinuation, candidateFromConversation, parseContName,
  dedupRows, splitBySlug, countRows, SOL_PATH,
} from "../../tools/robocoop-5/eval/polyglot/reviewer-corpus.mjs";
import {
  parseVerdict, buildUserMessage, truncate, subsample, agreementStats, firstLine,
  PROMPTS, QUALITY_PASS_AT, SPEC_LIMIT, PATCH_LIMIT,
} from "../../tools/robocoop-5/eval/polyglot/reviewer-measure.mjs";

const traj = (over = {}) => ({ slug: "two-fer", attempt: 1, pass: true, candidate: "export const x = 1;", ...over });

describe("row extraction from a trajectory", () => {
  it("maps candidate + pass onto patch + verdict", () => {
    const r = rowFromTrajectory(traj(), { source: "trajectories-gate", file: "a.json" });
    assert.deepEqual(r, {
      slug: "two-fer", source: "trajectories-gate", file: "a.json", attempt: 1,
      patch: "export const x = 1;", verdict: "pass",
    });
  });

  it("pass:false becomes verdict fail", () => {
    assert.equal(rowFromTrajectory(traj({ pass: false })).verdict, "fail");
  });

  it("drops an attempt with no candidate, an empty candidate, or no boolean pass", () => {
    assert.equal(rowFromTrajectory(traj({ candidate: undefined })), null);
    assert.equal(rowFromTrajectory(traj({ candidate: "   " })), null);
    assert.equal(rowFromTrajectory(traj({ pass: null })), null);
    assert.equal(rowFromTrajectory(traj({ pass: "true" })), null); // a string is not a verdict
    assert.equal(rowFromTrajectory(traj({ slug: undefined })), null);
    assert.equal(rowFromTrajectory(null), null);
  });
});

describe("candidate reconstruction from a continuation conversation", () => {
  const call = (name, args) => ({ id: "x", type: "function", function: { name, arguments: JSON.stringify(args) } });

  it("replays write_file then edit_file on the solution path", () => {
    const conv = [
      { role: "assistant", tool_calls: [call("read_file", { file_path: "/instructions.md" })] },
      { role: "assistant", tool_calls: [call("write_file", { file_path: SOL_PATH, content: "const a = 1;\nconst b = 2;\n" })] },
      { role: "assistant", tool_calls: [call("edit_file", { file_path: SOL_PATH, old_string: "const b = 2;", new_string: "const b = 3;" })] },
    ];
    assert.equal(candidateFromConversation(conv), "const a = 1;\nconst b = 3;\n");
  });

  it("ignores writes to other files and unparseable arguments", () => {
    const conv = [
      { role: "assistant", tool_calls: [call("write_file", { file_path: "/notes.md", content: "hi" })] },
      { role: "assistant", tool_calls: [{ type: "function", function: { name: "write_file", arguments: "{not json" } }] },
    ];
    assert.equal(candidateFromConversation(conv), null);
  });

  it("a later write_file replaces the whole file", () => {
    const conv = [
      { role: "assistant", tool_calls: [call("write_file", { file_path: SOL_PATH, content: "first" })] },
      { role: "assistant", tool_calls: [call("write_file", { file_path: SOL_PATH, content: "second" })] },
    ];
    assert.equal(candidateFromConversation(conv), "second");
  });

  it("an edit whose old_string is absent leaves the text alone", () => {
    const conv = [
      { role: "assistant", tool_calls: [call("write_file", { file_path: SOL_PATH, content: "abc" })] },
      { role: "assistant", tool_calls: [call("edit_file", { file_path: SOL_PATH, old_string: "zzz", new_string: "q" })] },
    ];
    assert.equal(candidateFromConversation(conv), "abc");
  });

  it("handles an empty or missing conversation", () => {
    assert.equal(candidateFromConversation([]), null);
    assert.equal(candidateFromConversation(undefined), null);
  });

  it("rowFromContinuation carries k/sampleIdx and the graded verdict", () => {
    const cont = {
      k: 5, sampleIdx: 0, pass: false,
      conversation: [{ role: "assistant", tool_calls: [call("write_file", { file_path: SOL_PATH, content: "code" })] }],
    };
    const r = rowFromContinuation(cont, { slug: "go-counting", attempt: 1, file: "c.json" });
    assert.equal(r.slug, "go-counting");
    assert.equal(r.source, "attribution");
    assert.equal(r.verdict, "fail");
    assert.equal(r.patch, "code");
    assert.equal(r.k, 5);
    assert.equal(r.sampleIdx, 0);
  });

  it("a continuation with no recoverable candidate yields no row", () => {
    assert.equal(rowFromContinuation({ pass: true, conversation: [] }, { slug: "s" }), null);
    assert.equal(rowFromContinuation({ conversation: [] }, { slug: "s" }), null);
  });
});

describe("continuation filename parsing", () => {
  it("reads slug, attempt, k and sample index", () => {
    assert.deepEqual(parseContName("go-counting-1-k5s0.cont.json"),
      { slug: "go-counting", attempt: 1, k: 5, sampleIdx: 0 });
  });
  it("keeps hyphenated slugs intact", () => {
    assert.equal(parseContName("simple-linked-list-2-k12s3.cont.json").slug, "simple-linked-list");
    assert.equal(parseContName("simple-linked-list-2-k12s3.cont.json").attempt, 2);
  });
  it("rejects a plain probe result file", () => {
    assert.equal(parseContName("go-counting-1.json"), null);
    assert.equal(parseContName("SWEEP.md"), null);
  });
});

describe("dedup", () => {
  const R = (slug, patch, verdict, file) => ({ slug, patch, verdict, file, source: "s" });

  it("collapses byte-identical (slug, patch) pairs and counts the drops", () => {
    const out = dedupRows([R("a", "x", "pass", "1"), R("a", "x", "pass", "2"), R("a", "y", "pass", "3")]);
    assert.equal(out.rows.length, 2);
    assert.equal(out.duplicatesDropped, 1);
    assert.equal(out.conflicts.length, 0);
  });

  it("does not merge the same patch under different slugs", () => {
    const out = dedupRows([R("a", "x", "pass", "1"), R("b", "x", "pass", "2")]);
    assert.equal(out.rows.length, 2);
    assert.equal(out.duplicatesDropped, 0);
  });

  it("a one-byte difference is not a duplicate", () => {
    const out = dedupRows([R("a", "x", "pass", "1"), R("a", "x ", "pass", "2")]);
    assert.equal(out.rows.length, 2);
  });

  it("drops a contested pair entirely and reports it", () => {
    const out = dedupRows([R("a", "x", "pass", "1"), R("a", "x", "fail", "2"), R("b", "y", "fail", "3")]);
    assert.deepEqual(out.rows.map((r) => r.slug), ["b"]);
    assert.equal(out.duplicatesDropped, 2);
    assert.equal(out.conflicts.length, 1);
    assert.deepEqual(out.conflicts[0].verdicts.sort(), ["fail", "pass"]);
  });

  it("keeps the first row of a group, so order is deterministic", () => {
    const out = dedupRows([R("a", "x", "pass", "first"), R("a", "x", "pass", "second")]);
    assert.equal(out.rows[0].file, "first");
  });
});

describe("split by slug", () => {
  it("sorts then alternates: even index train, odd index heldout", () => {
    const { train, heldout } = splitBySlug(["c", "a", "d", "b"]);
    assert.deepEqual(train, ["a", "c"]);
    assert.deepEqual(heldout, ["b", "d"]);
  });

  it("is deterministic under input order and duplicates", () => {
    const a = splitBySlug(["b", "a", "c", "a"]);
    const b = splitBySlug(["a", "c", "b", "b"]);
    assert.deepEqual(a, b);
  });

  it("the two sides never intersect and together cover every slug", () => {
    const slugs = ["k", "j", "m", "a", "z", "q", "b"];
    const { train, heldout } = splitBySlug(slugs);
    assert.equal(train.filter((s) => heldout.includes(s)).length, 0);
    assert.deepEqual([...train, ...heldout].sort(), [...slugs].sort());
  });

  it("no slug can appear on both sides even with many rows per slug", () => {
    const rows = [];
    for (const s of ["a", "b", "c"]) for (let i = 0; i < 4; i++) rows.push({ slug: s, patch: "p" + i, verdict: "pass", source: "s" });
    const { train, heldout } = splitBySlug(rows.map((r) => r.slug));
    const trainSet = new Set(train), heldSet = new Set(heldout);
    for (const r of rows) assert.notEqual(trainSet.has(r.slug), heldSet.has(r.slug));
  });
});

describe("countRows", () => {
  it("tallies totals, per-source pass/fail and distinct sorted slugs", () => {
    const c = countRows([
      { slug: "b", source: "gate", verdict: "pass", patch: "" },
      { slug: "a", source: "gate", verdict: "fail", patch: "" },
      { slug: "a", source: "attribution", verdict: "fail", patch: "" },
    ]);
    assert.equal(c.total, 3);
    assert.equal(c.pass, 1);
    assert.equal(c.fail, 2);
    assert.deepEqual(c.slugs, ["a", "b"]);
    assert.deepEqual(c.bySource.gate, { total: 2, pass: 1, fail: 1 });
    assert.equal(c.bySource.attribution.total, 1);
  });
});

describe("verdict parsing — binary prompts", () => {
  it("reads a leading single-word answer", () => {
    assert.deepEqual(parseVerdict("PASS. The code handles every example."), { verdict: "pass", score: null });
    assert.deepEqual(parseVerdict("FAIL — the default export is missing."), { verdict: "fail", score: null });
  });

  it("is case insensitive", () => {
    assert.equal(parseVerdict("Fail, the signature is wrong").verdict, "fail");
  });

  it("an explicit VERDICT line beats an earlier per-check token", () => {
    const checklist = "1. Export contract: PASS\n2. Examples: PASS\n3. Signatures: FAIL\nVERDICT: FAIL";
    assert.equal(parseVerdict(checklist).verdict, "fail");
  });

  it("the last VERDICT line wins when the model restates its conclusion", () => {
    assert.equal(parseVerdict("VERDICT: FAIL\n\nOn reflection, VERDICT: PASS").verdict, "pass");
  });

  it("tolerates markdown and punctuation around the verdict", () => {
    assert.equal(parseVerdict("**VERDICT: PASS**").verdict, "pass");
    assert.equal(parseVerdict("VERDICT — FAIL").verdict, "fail");
  });

  it("does not match FAIL inside a longer word", () => {
    assert.equal(parseVerdict("There is no failure mode here.").verdict, null);
    assert.equal(parseVerdict("passing every test").verdict, null);
  });

  it("unparseable and empty output return null, not a guess", () => {
    assert.deepEqual(parseVerdict("I need more context."), { verdict: null, score: null });
    assert.deepEqual(parseVerdict(""), { verdict: null, score: null });
    assert.deepEqual(parseVerdict(null), { verdict: null, score: null });
  });
});

describe("verdict parsing — score prompt", () => {
  it("reads SCORE: n and maps at the threshold", () => {
    assert.deepEqual(parseVerdict("SCORE: 7\nSolid.", "score"), { verdict: "pass", score: 7 });
    assert.deepEqual(parseVerdict("SCORE: 3\nBroken.", "score"), { verdict: "fail", score: 3 });
  });

  it("the boundary is inclusive at QUALITY_PASS_AT", () => {
    assert.equal(QUALITY_PASS_AT, 6);
    assert.equal(parseVerdict("SCORE: 6", "score").verdict, "pass");
    assert.equal(parseVerdict("SCORE: 5.9", "score").verdict, "fail");
  });

  it("falls back to an n/10 form and then a leading number", () => {
    assert.deepEqual(parseVerdict("I would give this 8/10 overall.", "score"), { verdict: "pass", score: 8 });
    assert.deepEqual(parseVerdict("4 — the export contract is wrong.", "score"), { verdict: "fail", score: 4 });
  });

  it("rejects an out-of-range or absent score", () => {
    assert.deepEqual(parseVerdict("SCORE: 42", "score"), { verdict: null, score: null });
    assert.deepEqual(parseVerdict("This code is fine.", "score"), { verdict: null, score: null });
  });

  it("score mode ignores a bare PASS token — the score is the verdict", () => {
    assert.deepEqual(parseVerdict("PASS, looks good", "score"), { verdict: null, score: null });
  });
});

describe("prompt assembly", () => {
  it("truncate reports whether it cut", () => {
    assert.deepEqual(truncate("abcdef", 3), { text: "abc", truncated: true });
    assert.deepEqual(truncate("ab", 3), { text: "ab", truncated: false });
  });

  it("marks spec and patch truncation independently", () => {
    const m = buildUserMessage("x".repeat(SPEC_LIMIT + 1), "y");
    assert.equal(m.specTruncated, true);
    assert.equal(m.patchTruncated, false);
    assert.match(m.content, /specification truncated/);

    const m2 = buildUserMessage("x", "y".repeat(PATCH_LIMIT + 1));
    assert.equal(m2.specTruncated, false);
    assert.equal(m2.patchTruncated, true);
    assert.match(m2.content, /solution truncated/);
  });

  it("carries both the spec and the patch verbatim when short", () => {
    const m = buildUserMessage("SPEC BODY", "PATCH BODY");
    assert.match(m.content, /SPEC BODY/);
    assert.match(m.content, /PATCH BODY/);
    assert.equal(m.specTruncated, false);
  });

  it("the three candidate prompts are named, moded and short", () => {
    assert.deepEqual(PROMPTS.map((p) => p.name), ["predict-tests", "spec-check", "code-quality"]);
    assert.deepEqual(PROMPTS.map((p) => p.mode), ["binary", "binary", "score"]);
    for (const p of PROMPTS) assert.ok(p.system.split(/\s+/).length < 200, `${p.name} under 200 words`);
  });

  it("firstLine skips blank leading lines", () => {
    assert.equal(firstLine("\n\n  PASS. ok\nmore"), "PASS. ok");
    assert.equal(firstLine(""), "");
  });
});

describe("deterministic subsample", () => {
  const rows = [
    { slug: "b", source: "gate", file: "1" },
    { slug: "a", source: "gate", file: "2" },
    { slug: "a", source: "attribution", file: "3" },
  ];
  it("sorts by slug then source", () => {
    assert.deepEqual(subsample(rows).map((r) => r.file), ["3", "2", "1"]);
  });
  it("takes the first cap rows and is stable under input order", () => {
    assert.deepEqual(subsample(rows, 2).map((r) => r.file), ["3", "2"]);
    assert.deepEqual(subsample([...rows].reverse(), 2).map((r) => r.file), ["3", "2"]);
  });
  it("a cap at or above the row count changes nothing but the order", () => {
    assert.equal(subsample(rows, 99).length, 3);
    assert.equal(subsample(rows, null).length, 3);
  });
});

describe("agreement stats", () => {
  const rec = (truth, predicted, over = {}) => ({ truth, predicted, infra: false, ...over });

  it("computes accuracy, sensitivity, specificity and base rate", () => {
    const s = agreementStats([
      rec("fail", "fail"), rec("fail", "fail"), rec("fail", "pass"),
      rec("pass", "pass"), rec("pass", "fail"),
    ]);
    assert.equal(s.n, 5);
    assert.equal(s.agree, 3);
    assert.equal(s.accuracy, 3 / 5);
    assert.equal(s.failN, 3);
    assert.equal(s.sensitivity, 2 / 3);
    assert.equal(s.passN, 2);
    assert.equal(s.specificity, 1 / 2);
    assert.equal(s.baseRate, 2 / 5);
  });

  it("bands come from stats.mjs and bracket the point estimate", () => {
    const s = agreementStats([rec("pass", "pass"), rec("pass", "pass"), rec("fail", "fail")]);
    assert.ok(s.accuracyBand[0] <= s.accuracy && s.accuracy <= s.accuracyBand[1]);
    assert.equal(s.accuracyBand[1], 1); // no failures observed → upper bound 1
  });

  it("an unparseable prediction counts as a disagreement, not a dropped row", () => {
    const s = agreementStats([rec("pass", null), rec("pass", "pass")]);
    assert.equal(s.n, 2);
    assert.equal(s.agree, 1);
    assert.equal(s.unparseable, 1);
  });

  it("infra records are excluded from every count", () => {
    const s = agreementStats([rec("pass", "pass"), rec("fail", null, { infra: true })]);
    assert.equal(s.n, 1);
    assert.equal(s.infra, 1);
    assert.equal(s.accuracy, 1);
    assert.equal(s.failN, 0);
    assert.equal(s.sensitivity, null);
  });

  it("an always-PASS reviewer scores exactly the base rate with zero fail-sensitivity", () => {
    const s = agreementStats([rec("pass", "pass"), rec("fail", "pass"), rec("fail", "pass"), rec("fail", "pass")]);
    assert.equal(s.accuracy, s.baseRate);
    assert.equal(s.sensitivity, 0);
    assert.equal(s.predictedPassRate, 1);
  });

  it("the majority baseline is the better constant reviewer, not the pass rate", () => {
    // 3 fails, 1 pass: always-FAIL scores 0.75, always-PASS only 0.25.
    const s = agreementStats([rec("pass", "pass"), rec("fail", "fail"), rec("fail", "fail"), rec("fail", "fail")]);
    assert.equal(s.baseRate, 0.25);
    assert.equal(s.alwaysPassAccuracy, 0.25);
    assert.equal(s.alwaysFailAccuracy, 0.75);
    assert.equal(s.majorityBaseline, 0.75);
    assert.equal(s.majorityLabel, "always-FAIL");
  });

  it("the majority label flips when passes dominate", () => {
    const s = agreementStats([rec("pass", "pass"), rec("pass", "pass"), rec("fail", "fail")]);
    assert.equal(s.majorityLabel, "always-PASS");
    assert.equal(s.majorityBaseline, 2 / 3);
  });

  it("both constant reviewers score Youden J = 0 — the statistic they cannot fake", () => {
    const rows = [rec("pass", null), rec("fail", null), rec("fail", null)];
    const allPass = agreementStats(rows.map((r) => ({ ...r, predicted: "pass" })));
    const allFail = agreementStats(rows.map((r) => ({ ...r, predicted: "fail" })));
    assert.equal(allPass.youdenJ, 0);
    assert.equal(allFail.youdenJ, 0);
  });

  it("a perfect reviewer scores J = 1, an inverted one J = -1", () => {
    const truth = [rec("pass"), rec("pass"), rec("fail"), rec("fail")];
    const perfect = agreementStats(truth.map((r) => ({ ...r, predicted: r.truth })));
    const inverted = agreementStats(truth.map((r) => ({ ...r, predicted: r.truth === "pass" ? "fail" : "pass" })));
    assert.equal(perfect.youdenJ, 1);
    assert.equal(inverted.youdenJ, -1);
  });

  it("J is null when one class is absent — it needs both arms", () => {
    assert.equal(agreementStats([rec("pass", "pass")]).youdenJ, null);
  });

  it("sums token usage and reports blended = input + 5×output", () => {
    const s = agreementStats([
      rec("pass", "pass", { usage: { promptTokens: 100, completionTokens: 10, costUSD: 0.001 } }),
      rec("fail", "fail", { usage: { promptTokens: 200, completionTokens: 20, costUSD: 0.002 } }),
    ]);
    assert.equal(s.usage.promptTokens, 300);
    assert.equal(s.usage.completionTokens, 30);
    assert.equal(s.usage.blendedTokens, 300 + 5 * 30);
    assert.ok(Math.abs(s.usage.costUSD - 0.003) < 1e-12);
  });

  it("an empty record set yields nulls, not NaN", () => {
    const s = agreementStats([]);
    assert.equal(s.n, 0);
    assert.equal(s.accuracy, null);
    assert.equal(s.baseRate, null);
  });
});
