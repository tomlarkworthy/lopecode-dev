/**
 * Unit tests for the ladder's paired mode and cost axis — tools/robocoop-5/eval/ladder.mjs and the
 * `discordantPairTest` helper in tools/robocoop-eval/stats.mjs (plan/rqgm-and-robocoop-5.md, U4).
 *
 * Three properties are load-bearing:
 *
 * 1. The sign test is EXACT. Our discordant counts are tens (τ's July-vs-August comparison has 25),
 *    where a normal approximation is a guess. b=11,c=14 is pinned at the value the real comparison
 *    produced, and the hand-checkable cases (b=c=0 → 1; b=5,c=0 → 2·½⁵) pin the tails.
 * 2. Pairing EXCLUDES unmatched tasks. A task only one arm ran is not evidence about a difference
 *    between the arms; silently counting it as a fail would manufacture discordant pairs.
 * 3. Token totals are never estimated. A sidecar trajectory is only charged when it is provably the
 *    row's own attempt, and a run with no usage anywhere reports nothing rather than a guess —
 *    pointing `--trajectories` at the agent gate once charged the raw baseline 14.5M agent tokens.
 *
 * Zero model calls, self-contained fixtures.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { discordantPairTest } from "../../tools/robocoop-eval/stats.mjs";
import {
  passOf, keyOf, keyFieldOf, indexRows, pairUp,
  normalizeUsage, attemptCharged, tokensOf, trajUsage,
} from "../../tools/robocoop-5/eval/ladder.mjs";

// --- exact sign test ---------------------------------------------------------------------------

describe("discordantPairTest", () => {
  it("is 1 when there are no discordant pairs", () => {
    assert.equal(discordantPairTest(0, 0), 1);
  });

  it("2·½^n on a one-sided split (b=5, c=0)", () => {
    assert.equal(discordantPairTest(5, 0), 0.0625); // 2 · C(5,0) · ½⁵
    assert.equal(discordantPairTest(0, 5), 0.0625); // symmetric in its arguments
  });

  it("pins the τ July-vs-2026-08-16 comparison at b=11, c=14", () => {
    // n = 25, min = 11: P = 2·Σ_{i≤11} C(25,i)·½²⁵ = 2 · 11576916/33554432.
    const expected = (2 * 11576916) / 33554432;
    assert.ok(Math.abs(discordantPairTest(11, 14) - expected) < 1e-12);
    assert.equal(discordantPairTest(11, 14).toFixed(4), "0.6900");
    assert.equal(discordantPairTest(14, 11), discordantPairTest(11, 14));
  });

  it("clamps the near-even case to 1 instead of exceeding it", () => {
    assert.equal(discordantPairTest(1, 1), 1);   // 2·(¼+½) would be 1.5
    assert.equal(discordantPairTest(3, 3), 1);
    assert.ok(discordantPairTest(2, 1) <= 1);
  });

  it("crosses 0.05 where the exact binomial says it does", () => {
    assert.ok(discordantPairTest(0, 6) < 0.05);   // 2·½⁶ = 0.03125
    assert.ok(discordantPairTest(0, 5) > 0.05);   // 2·½⁵ = 0.0625 — five straight flips is not enough
  });

  it("a single discordant pair is never significant", () => {
    assert.equal(discordantPairTest(1, 0), 1);
  });
});

// The 1,7 case above is the boundary worth writing out: 2·(C(8,0)+C(8,1))/2⁸ = 18/256 = 0.0703.
describe("discordantPairTest boundary arithmetic", () => {
  it("b=1,c=7 is 0.0703125 (above 0.05)", () => {
    assert.equal(discordantPairTest(1, 7), 18 / 256);
    assert.ok(discordantPairTest(1, 7) > 0.05);
  });
  it("b=1,c=8 is 0.0390625 (below 0.05)", () => {
    assert.equal(discordantPairTest(1, 8), 20 / 512);
  });
});

// --- pass / key extraction ---------------------------------------------------------------------

describe("passOf", () => {
  it("τ rows grade on reward === 1", () => {
    assert.equal(passOf({ idx: 3, reward: 1 }), true);
    assert.equal(passOf({ idx: 3, reward: 0 }), false);
    assert.equal(passOf({ idx: 3, reward: 0.5 }), false); // partial credit is not a pass
  });

  it("polyglot rows take the best attempt reached: pass2 ?? pass1 ?? pass", () => {
    assert.equal(passOf({ slug: "a", pass1: false, pass2: true }), true);
    assert.equal(passOf({ slug: "a", pass1: true, pass2: false }), false); // pass2 wins when present
    assert.equal(passOf({ slug: "a", pass1: true }), true);
    assert.equal(passOf({ slug: "a", pass: true }), true);
    assert.equal(passOf({ slug: "a" }), false);
  });

  it("reward takes precedence even if a pass field is somehow present", () => {
    assert.equal(passOf({ idx: 1, reward: 0, pass1: true }), false);
  });
});

describe("keyOf / keyFieldOf", () => {
  it("slug keys polyglot, idx keys τ, name keys HumanEval", () => {
    assert.equal(keyOf({ slug: "word-search" }), "word-search");
    assert.equal(keyOf({ idx: 0 }), "0"); // idx 0 must not be lost to falsiness
    assert.equal(keyOf({ name: "HumanEval_0_has_close_elements" }), "HumanEval_0_has_close_elements");
    assert.equal(keyOf({ nothing: true }), null);
    assert.equal(keyOf(null), null);
  });

  it("detects the key field from the first row that has one", () => {
    assert.equal(keyFieldOf([{ slug: "a" }]), "slug");
    assert.equal(keyFieldOf([{ idx: 0 }]), "idx");
    assert.equal(keyFieldOf([{ name: "a" }]), "name");
    assert.equal(keyFieldOf([{}, { idx: 7 }]), "idx");
    assert.equal(keyFieldOf([]), null);
  });
});

describe("indexRows", () => {
  it("collapses a re-rolled task to its last row and counts the collapse", () => {
    const { map, duplicates } = indexRows([
      { slug: "a", pass2: false },
      { slug: "b", pass2: true },
      { slug: "a", pass2: true }, // clean re-roll after an infra-polluted first roll
    ]);
    assert.equal(duplicates, 1);
    assert.equal(map.size, 2);
    assert.equal(map.get("a"), true);
  });

  it("drops rows with no key", () => {
    const { map } = indexRows([{ pass2: true }, { slug: "a", pass2: true }]);
    assert.equal(map.size, 1);
  });
});

// --- pairing -----------------------------------------------------------------------------------

describe("pairUp", () => {
  const A = [
    { slug: "both-pass", pass2: true },
    { slug: "both-fail", pass2: false },
    { slug: "a-only-pass", pass2: true },
    { slug: "b-only-pass", pass2: false },
  ];
  const B = [
    { slug: "both-pass", pass2: true },
    { slug: "both-fail", pass2: false },
    { slug: "a-only-pass", pass2: false },
    { slug: "b-only-pass", pass2: true },
  ];

  it("counts the 2x2 table on slug-keyed rows", () => {
    const r = pairUp(A, B);
    assert.equal(r.keyField, "slug");
    assert.deepEqual(
      { n: r.n, bothPass: r.bothPass, bothFail: r.bothFail, aOnly: r.aOnly, bOnly: r.bOnly },
      { n: 4, bothPass: 1, bothFail: 1, aOnly: 1, bOnly: 1 },
    );
    assert.equal(r.aPass, 2);
    assert.equal(r.bPass, 2);
    assert.equal(r.discordant, 2);
    assert.equal(r.p, 1); // b = c = 1
  });

  it("pairs idx-keyed τ rows across merged shards", () => {
    const shard0 = [{ idx: 0, reward: 1 }, { idx: 1, reward: 0 }];
    const shard1 = [{ idx: 2, reward: 1 }];
    const r = pairUp([...shard0, ...shard1], [{ idx: 0, reward: 1 }, { idx: 1, reward: 1 }, { idx: 2, reward: 0 }]);
    assert.equal(r.keyField, "idx");
    assert.equal(r.n, 3);
    assert.equal(r.bothPass, 1);
    assert.equal(r.aOnly, 1);
    assert.equal(r.bOnly, 1);
  });

  it("EXCLUDES tasks only one side ran — they are not discordant pairs", () => {
    const r = pairUp(
      [{ slug: "shared", pass2: true }, { slug: "a-extra", pass2: true }],
      [{ slug: "shared", pass2: true }, { slug: "b-extra", pass2: false }],
    );
    assert.equal(r.n, 1);
    assert.equal(r.onlyInA, 1);
    assert.equal(r.onlyInB, 1);
    assert.equal(r.aOnly, 0);
    assert.equal(r.bOnly, 0);
    assert.equal(r.aPass, 1);
    assert.equal(r.bPass, 1);
  });

  it("reports a one-sided sweep as significant", () => {
    const mk = (pass) => Array.from({ length: 6 }, (_, i) => ({ slug: "t" + i, pass2: pass }));
    const r = pairUp(mk(true), mk(false));
    assert.equal(r.aOnly, 6);
    assert.equal(r.bOnly, 0);
    assert.ok(r.p < 0.05);
  });

  it("carries the re-roll counts through", () => {
    const r = pairUp([{ slug: "a", pass2: false }, { slug: "a", pass2: true }], [{ slug: "a", pass2: true }]);
    assert.equal(r.duplicatesA, 1);
    assert.equal(r.duplicatesB, 0);
    assert.equal(r.n, 1);
    assert.equal(r.bothPass, 1);
  });

  it("pins the HumanEval arms comparison shape on name-keyed rows", () => {
    // The real run: 146 both-pass, 2 both-fail, 4 baseline-only, 9 agent-only → P = 0.2668.
    const mk = (n, prefix, aPass, bPass) => Array.from({ length: n }, (_, i) => [
      { name: prefix + i, pass: aPass }, { name: prefix + i, pass: bPass },
    ]);
    const cells = [...mk(146, "bp", true, true), ...mk(2, "bf", false, false),
      ...mk(4, "ao", true, false), ...mk(9, "bo", false, true)];
    const r = pairUp(cells.map(([a]) => a), cells.map(([, b]) => b));
    assert.equal(r.keyField, "name");
    assert.equal(r.n, 161);
    assert.equal(r.aPass, 150);
    assert.equal(r.bPass, 155);
    assert.equal(r.p.toFixed(4), "0.2668");
  });

  it("two empty sides are a well-formed empty table, not a crash", () => {
    const r = pairUp([], []);
    assert.equal(r.n, 0);
    assert.equal(r.p, 1);
    assert.equal(r.keyField, null);
  });
});

// --- tokens ------------------------------------------------------------------------------------

const USAGE = { calls: 10, promptTokens: 1000, completionTokens: 100, cachedTokens: 900, costUSD: 0.01 };

describe("normalizeUsage", () => {
  it("reads the driver's shape", () => {
    assert.deepEqual(normalizeUsage(USAGE), { input: 1000, output: 100, calls: 10, cached: 900, costUSD: 0.01 });
  });

  it("accepts the OpenAI-style aliases", () => {
    assert.equal(normalizeUsage({ prompt_tokens: 5, completion_tokens: 2 }).input, 5);
    assert.equal(normalizeUsage({ inputTokens: 5, outputTokens: 2 }).output, 2);
  });

  it("is null when there are no token counts at all", () => {
    assert.equal(normalizeUsage(null), null);
    assert.equal(normalizeUsage({}), null);
    assert.equal(normalizeUsage({ calls: 3, costUSD: 0.4 }), null); // a cost is not a token count
  });
});

describe("attemptCharged", () => {
  it("always charges attempt 1", () => {
    assert.equal(attemptCharged({ slug: "a" }, 1), true);
  });

  it("charges attempt 2 only when attempt 1 failed — best score first reached", () => {
    assert.equal(attemptCharged({ slug: "a", pass1: true, pass2: true }, 2), false);
    assert.equal(attemptCharged({ slug: "a", pass1: false, pass2: true }, 2), true);
    assert.equal(attemptCharged({ slug: "a", pass1: false, pass2: false }, 2), true);
    assert.equal(attemptCharged({ idx: 3, reward: 1 }, 2), false); // no attempt protocol at all
  });
});

describe("tokensOf", () => {
  it("blends in + 5·out and averages over charged tasks", () => {
    const doc = { results: [
      { idx: 0, reward: 1, usage: { promptTokens: 100, completionTokens: 10 } },
      { idx: 1, reward: 0, usage: { promptTokens: 300, completionTokens: 20 } },
    ] };
    const t = tokensOf(doc);
    assert.equal(t.input, 400);
    assert.equal(t.output, 30);
    assert.equal(t.blended, 400 + 5 * 30);
    assert.equal(t.charged, 2);
    assert.equal(t.blendedPerTask, 275);
    assert.equal(t.missing, 0);
    assert.equal(t.source, "rows");
    assert.equal(t.costUSD, null); // no costUSD recorded → not invented
  });

  it("charges attempt 2 only for the tasks that ran it", () => {
    const doc = { results: [
      { slug: "first-try", pass1: true, pass2: true, usage1: { promptTokens: 100, completionTokens: 10 }, usage2: { promptTokens: 999999, completionTokens: 999999 } },
      { slug: "repaired", pass1: false, pass2: true, usage1: { promptTokens: 200, completionTokens: 20 }, usage2: { promptTokens: 300, completionTokens: 30 } },
    ] };
    const t = tokensOf(doc);
    assert.equal(t.input, 100 + 200 + 300);   // the stale attempt-2 blob is NOT charged
    assert.equal(t.output, 10 + 20 + 30);
    assert.equal(t.blended, 600 + 5 * 60);
  });

  it("sums calls, cached tokens and provider cost when present", () => {
    const t = tokensOf({ results: [{ idx: 0, reward: 1, usage: USAGE }, { idx: 1, reward: 1, usage: USAGE }] });
    assert.equal(t.calls, 20);
    assert.equal(t.cached, 1800);
    assert.ok(Math.abs(t.costUSD - 0.02) < 1e-12);
  });

  it("returns null — 'not recorded' — when no row has usage", () => {
    assert.equal(tokensOf({ results: [{ idx: 0, reward: 1 }, { idx: 1, reward: 0 }] }), null);
    assert.equal(tokensOf({ results: [] }), null);
    assert.equal(tokensOf({}), null);
  });

  it("counts rows it could not charge instead of dropping them silently", () => {
    const t = tokensOf({ results: [
      { idx: 0, reward: 1, usage: { promptTokens: 100, completionTokens: 10 } },
      { idx: 1, reward: 0 },
      { idx: 2, reward: 0 },
    ] });
    assert.equal(t.tasks, 3);
    assert.equal(t.charged, 1);
    assert.equal(t.missing, 2);
    assert.equal(t.blendedPerTask, 150); // the mean is over CHARGED tasks, never over all of them
  });
});

describe("trajUsage sidecar identity check", () => {
  const fake = (byPath) => (p) => byPath[p] ?? null;
  const row = { slug: "word-search", pass1: false, pass2: true, candidate1: "AAA", candidate2: "BBB" };
  const files = {
    "d/word-search-1.json": { candidate: "AAA", usage: { promptTokens: 10, completionTokens: 1 } },
    "d/word-search-2.json": { candidate: "BBB", usage: { promptTokens: 20, completionTokens: 2 } },
  };

  it("accepts a trajectory whose candidate is byte-identical to the row's", () => {
    assert.deepEqual(trajUsage("d", row, 1, fake(files)), { promptTokens: 10, completionTokens: 1 });
    assert.deepEqual(trajUsage("d", row, 2, fake(files)), { promptTokens: 20, completionTokens: 2 });
  });

  it("REJECTS a same-slug trajectory from a different run", () => {
    const other = { "d/word-search-1.json": { candidate: "SOMEONE ELSE'S CODE", usage: { promptTokens: 999, completionTokens: 999 } } };
    assert.equal(trajUsage("d", row, 1, fake(other)), null);
  });

  it("rejects when the row has no candidate to check against", () => {
    assert.equal(trajUsage("d", { slug: "word-search", candidate1: null }, 1, fake(files)), null);
  });

  it("is null when the sidecar file is absent", () => {
    assert.equal(trajUsage("d", row, 1, fake({})), null);
  });
});
