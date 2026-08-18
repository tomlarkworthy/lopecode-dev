/**
 * Unit tests for the pure functions in tools/robocoop-5/eval/polyglot/attribute.mjs —
 * assistantIndices, prefixAt, filesAt (what a probe sees) and jeffreysInterval,
 * labelFromProbes (what the probes are allowed to conclude).
 *
 * These three decide what a counterfactual probe sees: the conversation prefix injected
 * into a fresh session and the virtual file state it starts from. A silent off-by-one in
 * the cut, or a fold that diverges from the srctools executor's edit rules, produces
 * attribution labels that look plausible but describe a run that never happened — so the
 * boundaries (k=0, mid, k>=K) and every executor rejection path are pinned here.
 *
 * The fold is checked against modules/@tomlarkworthy/robocoop-5-srctools.js `edit_file`:
 * reject when the file is missing, when old_string === new_string, when old_string is
 * absent, and when it matches more than once without replace_all.
 *
 * Importing the module must stay side-effect-free — the CLI body is behind an isMain
 * check, and this file importing it at all is the regression test for that.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assistantIndices, prefixAt, filesAt,
  jeffreysInterval, regularizedIncompleteBeta, probeStats, labelFromProbes,
} from "../../tools/robocoop-5/eval/polyglot/attribute.mjs";

const call = (name, args) => ({ id: "c1", type: "function", function: { name, arguments: args } });
const write = (file_path, content) => call("write_file", JSON.stringify({ file_path, content }));
const edit = (a) => call("edit_file", JSON.stringify(a));

// system, user, a0(write), tool, a1(edit), tool, a2(no tools)
const conv = [
  { role: "system", content: "loop prompt" },
  { role: "user", content: "solve it" },
  { role: "assistant", content: "writing", tool_calls: [write("/src/@user/solution.js", "hello world")] },
  { role: "tool", tool_call_id: "c1", content: "Wrote /src/@user/solution.js" },
  { role: "assistant", content: "fixing", tool_calls: [edit({ file_path: "/src/@user/solution.js", old_string: "world", new_string: "there" })] },
  { role: "tool", tool_call_id: "c1", content: "Edited /src/@user/solution.js (1 replacement)" },
  { role: "assistant", content: "done" },
];

describe("assistantIndices", () => {
  it("returns the positions of assistant messages in order", () => {
    assert.deepEqual(assistantIndices(conv), [2, 4, 6]);
  });

  it("is empty for a conversation with no assistant turns", () => {
    assert.deepEqual(assistantIndices([{ role: "system", content: "s" }, { role: "user", content: "u" }]), []);
  });

  it("is empty for an empty conversation", () => {
    assert.deepEqual(assistantIndices([]), []);
  });
});

describe("prefixAt", () => {
  it("k=0 cuts before the first assistant message and strips the leading system", () => {
    assert.deepEqual(prefixAt(conv, 0), [{ role: "user", content: "solve it" }]);
  });

  it("mid k cuts before the k-th assistant message, keeping tool results", () => {
    const pre = prefixAt(conv, 1);
    assert.equal(pre.length, 3); // user, a0, tool  (system stripped)
    assert.deepEqual(pre.map((m) => m.role), ["user", "assistant", "tool"]);
    assert.equal(pre.at(-1).content, "Wrote /src/@user/solution.js");
  });

  it("k = K-1 keeps everything up to the last assistant message", () => {
    assert.deepEqual(prefixAt(conv, 2).map((m) => m.role), ["user", "assistant", "tool", "assistant", "tool"]);
  });

  it("k = K returns the whole conversation minus the leading system", () => {
    assert.deepEqual(prefixAt(conv, 3), conv.slice(1));
  });

  it("k > K is clamped to the whole conversation", () => {
    assert.deepEqual(prefixAt(conv, 99), conv.slice(1));
  });

  it("keeps a system message that is not at index 0", () => {
    const c = [
      { role: "user", content: "u" },
      { role: "system", content: "mid-conversation nudge" },
      { role: "assistant", content: "a" },
    ];
    assert.deepEqual(prefixAt(c, 0), c.slice(0, 2));
  });

  it("strips only one leading system message", () => {
    const c = [
      { role: "system", content: "s1" },
      { role: "system", content: "s2" },
      { role: "assistant", content: "a" },
    ];
    assert.deepEqual(prefixAt(c, 0), [{ role: "system", content: "s2" }]);
  });

  it("with no assistant messages returns the whole conversation minus the leading system", () => {
    const c = [{ role: "system", content: "s" }, { role: "user", content: "u" }];
    assert.deepEqual(prefixAt(c, 0), [{ role: "user", content: "u" }]);
  });

  it("returns [] for an empty conversation", () => {
    assert.deepEqual(prefixAt([], 0), []);
  });

  it("does not mutate the conversation", () => {
    const snapshot = JSON.stringify(conv);
    prefixAt(conv, 1);
    assert.equal(JSON.stringify(conv), snapshot);
  });
});

describe("filesAt", () => {
  const seeds = { "/content/readme.md": "seed" };

  it("k=0 is the seeds alone", () => {
    assert.deepEqual(filesAt(conv, seeds, 0), { "/content/readme.md": "seed" });
  });

  it("applies write_file from the prefix", () => {
    assert.deepEqual(filesAt(conv, seeds, 1), {
      "/content/readme.md": "seed",
      "/src/@user/solution.js": "hello world",
    });
  });

  it("sequences a write then an edit", () => {
    assert.equal(filesAt(conv, seeds, 2)["/src/@user/solution.js"], "hello there");
  });

  it("k >= K folds the whole conversation", () => {
    assert.equal(filesAt(conv, seeds, 3)["/src/@user/solution.js"], "hello there");
    assert.equal(filesAt(conv, seeds, 99)["/src/@user/solution.js"], "hello there");
  });

  it("does not mutate the seeds object", () => {
    const s = { "/a.txt": "one" };
    const out = filesAt(conv, s, 99);
    assert.deepEqual(s, { "/a.txt": "one" });
    assert.notEqual(out, s);
  });

  it("a later write_file overwrites an earlier one", () => {
    const c = [
      { role: "assistant", tool_calls: [write("/a.txt", "first")] },
      { role: "assistant", tool_calls: [write("/a.txt", "second")] },
    ];
    assert.equal(filesAt(c, {}, 9)["/a.txt"], "second");
    assert.equal(filesAt(c, {}, 1)["/a.txt"], "first");
  });

  it("stringifies non-string write_file content", () => {
    const c = [{ role: "assistant", tool_calls: [write("/a.txt", 42)] }];
    assert.equal(filesAt(c, {}, 9)["/a.txt"], "42");
  });

  it("applies multiple tool_calls within one assistant message, in order", () => {
    const c = [{
      role: "assistant",
      tool_calls: [
        write("/a.txt", "aaa"),
        edit({ file_path: "/a.txt", old_string: "aaa", new_string: "bbb" }),
      ],
    }];
    assert.equal(filesAt(c, {}, 9)["/a.txt"], "bbb");
  });

  it("edits a seeded file", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/a.txt", old_string: "one", new_string: "two" })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "two" });
  });

  // ── executor rejection paths: state must be unchanged ────────────────────
  it("edit_file on a missing file is a no-op", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/missing.txt", old_string: "a", new_string: "b" })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "one" });
  });

  it("edit_file with old_string absent is a no-op", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/a.txt", old_string: "zzz", new_string: "b" })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "one" });
  });

  it("edit_file with a non-unique old_string and no replace_all is a no-op", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/a.txt", old_string: "x", new_string: "y" })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "x-x-x" }, 9), { "/a.txt": "x-x-x" });
  });

  it("replace_all replaces every occurrence", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/a.txt", old_string: "x", new_string: "y", replace_all: true })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "x-x-x" }, 9), { "/a.txt": "y-y-y" });
  });

  it("replace_all on a single occurrence still replaces it", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/a.txt", old_string: "one", new_string: "two", replace_all: true })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "two" });
  });

  it("edit_file with old_string === new_string is a no-op", () => {
    const c = [{ role: "assistant", tool_calls: [edit({ file_path: "/a.txt", old_string: "one", new_string: "one" })] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "one" });
  });

  it("a rejected edit does not block later calls", () => {
    const c = [{
      role: "assistant",
      tool_calls: [
        edit({ file_path: "/a.txt", old_string: "zzz", new_string: "b" }),
        edit({ file_path: "/a.txt", old_string: "one", new_string: "two" }),
      ],
    }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "two" });
  });

  // ── argument shapes ──────────────────────────────────────────────────────
  it("accepts arguments already parsed into an object", () => {
    const c = [{
      role: "assistant",
      tool_calls: [{ function: { name: "write_file", arguments: { file_path: "/a.txt", content: "obj" } } }],
    }];
    assert.equal(filesAt(c, {}, 9)["/a.txt"], "obj");
  });

  it("skips a call whose string arguments are malformed JSON", () => {
    const c = [
      { role: "assistant", tool_calls: [{ function: { name: "write_file", arguments: "{not json" } }] },
      { role: "assistant", tool_calls: [write("/b.txt", "ok")] },
    ];
    assert.deepEqual(filesAt(c, {}, 9), { "/b.txt": "ok" });
  });

  it("skips a call with no arguments at all", () => {
    const c = [{ role: "assistant", tool_calls: [{ function: { name: "write_file" } }] }];
    assert.deepEqual(filesAt(c, {}, 9), {});
  });

  it("skips write_file with a non-string file_path", () => {
    const c = [{ role: "assistant", tool_calls: [{ function: { name: "write_file", arguments: { file_path: 7, content: "x" } } }] }];
    assert.deepEqual(filesAt(c, {}, 9), {});
  });

  it("ignores tool calls with other names", () => {
    const c = [{ role: "assistant", tool_calls: [call("grep", JSON.stringify({ pattern: "x" }))] }];
    assert.deepEqual(filesAt(c, { "/a.txt": "one" }, 9), { "/a.txt": "one" });
  });

  // ── message-level filtering ──────────────────────────────────────────────
  it("ignores tool_calls carried by non-assistant roles", () => {
    const c = [
      { role: "user", content: "u", tool_calls: [write("/user.txt", "nope")] },
      { role: "tool", tool_call_id: "c1", content: "t", tool_calls: [write("/tool.txt", "nope")] },
      { role: "system", content: "s", tool_calls: [write("/sys.txt", "nope")] },
    ];
    assert.deepEqual(filesAt(c, {}, 9), {});
  });

  it("ignores assistant messages with no tool_calls", () => {
    assert.deepEqual(filesAt([{ role: "assistant", content: "thinking" }], {}, 9), {});
  });

  it("ignores a non-array tool_calls field", () => {
    assert.deepEqual(filesAt([{ role: "assistant", tool_calls: null }], {}, 9), {});
  });

  it("the cut is exclusive of the k-th assistant message's own writes", () => {
    const c = [
      { role: "assistant", tool_calls: [write("/a.txt", "from step 0")] },
      { role: "assistant", tool_calls: [write("/a.txt", "from step 1")] },
    ];
    assert.deepEqual(filesAt(c, {}, 0), {});
    assert.equal(filesAt(c, {}, 1)["/a.txt"], "from step 0");
  });
});

/**
 * Credible-band labelling (plan/rqgm-and-robocoop-5.md §U1). The reference upper bounds below are
 * the ones the plan computed independently (python3, continued-fraction incomplete beta); the
 * 39/49 → [0.668, 0.890] anchor from §U4 pins the two-sided case against the same source. The
 * plan's prose quotes 0.29 as the 3/3 lower bound — that is the Clopper-Pearson value
 * (0.025^(1/3) = 0.292); the Jeffreys lower bound for 3/3 is 0.464. The conclusion it was quoted
 * for is unchanged: 0.464 < 0.5, so three passes are not enough to assert `variance`.
 */
const close = (actual, expected, tol = 0.01, what = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} not within ${tol} of ${expected}`);

describe("regularizedIncompleteBeta", () => {
  it("Beta(1,1) is uniform: I_x(1,1) = x", () => {
    for (const x of [0.1, 0.25, 0.5, 0.9]) close(regularizedIncompleteBeta(x, 1, 1), x, 1e-9, `x=${x}`);
  });

  it("matches a known value: I_0.3(2,3) = 0.3483", () => {
    close(regularizedIncompleteBeta(0.3, 2, 3), 0.3483, 1e-6);
  });

  it("is 0 at x=0 and 1 at x=1", () => {
    assert.equal(regularizedIncompleteBeta(0, 2.5, 0.5), 0);
    assert.equal(regularizedIncompleteBeta(1, 2.5, 0.5), 1);
  });

  it("is monotone increasing in x", () => {
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const v = regularizedIncompleteBeta(x, 3.5, 2.5);
      assert.ok(v >= prev, `not monotone at x=${x}`);
      prev = v;
    }
  });
});

describe("jeffreysInterval", () => {
  it("0/3 → upper 0.536: three failures are compatible with a 54% pass rate", () => {
    const { lower, upper } = jeffreysInterval(0, 3);
    assert.equal(lower, 0);
    close(upper, 0.536, 0.01, "0/3 upper");
  });

  it("0/10 → upper 0.217", () => close(jeffreysInterval(0, 10).upper, 0.217, 0.01, "0/10 upper"));

  it("0/30 → upper 0.080", () => close(jeffreysInterval(0, 30).upper, 0.080, 0.01, "0/30 upper"));

  it("3/3 → lower 0.464, below a 0.5 threshold", () => {
    const { lower, upper } = jeffreysInterval(3, 0);
    close(lower, 0.464, 0.01, "3/3 lower");
    assert.ok(lower < 0.5);
    assert.equal(upper, 1);
  });

  it("10/10 → lower 0.783, above a 0.5 threshold", () => {
    const { lower } = jeffreysInterval(10, 0);
    close(lower, 0.783, 0.01, "10/10 lower");
    assert.ok(lower >= 0.5);
  });

  it("reproduces the ladder anchor 39/49 → [0.668, 0.890]", () => {
    const { lower, upper } = jeffreysInterval(39, 10);
    close(lower, 0.668, 0.01, "39/49 lower");
    close(upper, 0.890, 0.01, "39/49 upper");
  });

  it("is symmetric under swapping successes and failures", () => {
    const a = jeffreysInterval(2, 7), b = jeffreysInterval(7, 2);
    close(a.lower, 1 - b.upper, 1e-9);
    close(a.upper, 1 - b.lower, 1e-9);
  });

  it("with no data at all is the whole [0,1]", () => {
    assert.deepEqual(jeffreysInterval(0, 0), { lower: 0, upper: 1 });
  });

  it("tightens as samples accumulate", () => {
    const uppers = [3, 10, 30, 100].map((n) => jeffreysInterval(0, n).upper);
    for (let i = 1; i < uppers.length; i++) assert.ok(uppers[i] < uppers[i - 1]);
  });

  it("a higher confidence level widens the band", () => {
    assert.ok(jeffreysInterval(0, 10, 0.99).upper > jeffreysInterval(0, 10, 0.95).upper);
    assert.ok(jeffreysInterval(5, 5, 0.99).lower < jeffreysInterval(5, 5, 0.95).lower);
  });

  it("brackets the point estimate", () => {
    for (const [s, f] of [[1, 2], [5, 5], [7, 3], [1, 9]]) {
      const { lower, upper } = jeffreysInterval(s, f);
      const p = s / (s + f);
      assert.ok(lower <= p && p <= upper, `${s}/${s + f}`);
    }
  });
});

// probes as attribute.mjs records them: {k, samples:[{pass, infra}], p}
const mk = (k, passes, fails, infra = 0) => {
  const samples = [
    ...Array.from({ length: passes }, () => ({ pass: true })),
    ...Array.from({ length: fails }, () => ({ pass: false })),
    ...Array.from({ length: infra }, () => ({ pass: false, infra: true })),
  ];
  const n = passes + fails;
  return { k, samples, p: n ? passes / n : 0 };
};

describe("probeStats", () => {
  it("counts passes and failures from the samples", () => {
    const s = probeStats(mk(0, 2, 8));
    assert.equal(s.n, 10);
    assert.equal(s.successes, 2);
    assert.equal(s.failures, 8);
  });

  it("excludes infra losses from the counts and the band", () => {
    const withInfra = probeStats(mk(0, 0, 3, 4));
    const without = probeStats(mk(0, 0, 3));
    assert.equal(withInfra.n, 3);
    assert.deepEqual([withInfra.lower, withInfra.upper], [without.lower, without.upper]);
  });

  it("an all-infra probe carries no information", () => {
    const s = probeStats(mk(0, 0, 0, 3));
    assert.equal(s.n, 0);
    assert.deepEqual([s.lower, s.upper], [0, 1]);
  });
});

describe("labelFromProbes", () => {
  const thr = 0.5;

  it("0/3 is undetermined, not model-ceiling — the U1 defect", () => {
    const v = labelFromProbes([mk(0, 0, 3)], thr, { K: 9, maxProbes: 6 });
    assert.equal(v.label, "undetermined");
    assert.deepEqual(v.needsSamples, [0]);
    assert.equal(v.decisionStep, null);
  });

  it("0/10 is model-ceiling: the upper bound closes below the threshold", () => {
    const v = labelFromProbes([mk(0, 0, 10)], thr, { K: 9, maxProbes: 6 });
    assert.equal(v.label, "model-ceiling");
    assert.deepEqual(v.needsSamples, []);
    assert.equal(v.decisionStep, null);
  });

  it("0/30 is model-ceiling", () => {
    assert.equal(labelFromProbes([mk(0, 0, 30)], thr, { K: 9 }).label, "model-ceiling");
  });

  it("1/3 is undetermined", () => {
    assert.equal(labelFromProbes([mk(0, 1, 2)], thr, { K: 9, maxProbes: 6 }).label, "undetermined");
  });

  it("the threshold moves the model-ceiling boundary", () => {
    // 0/3 upper is 0.536 — below a 0.6 threshold, above a 0.5 one.
    assert.equal(labelFromProbes([mk(0, 0, 3)], 0.6, { K: 9 }).label, "model-ceiling");
    assert.equal(labelFromProbes([mk(0, 0, 3)], 0.5, { K: 9 }).label, "undetermined");
  });

  it("infra losses do not turn an undetermined probe into model-ceiling", () => {
    const v = labelFromProbes([mk(0, 0, 3, 7)], thr, { K: 9, maxProbes: 6 });
    assert.equal(v.label, "undetermined");
  });

  it("3/3 with no collapse is undetermined, not variance", () => {
    const v = labelFromProbes([mk(0, 3, 0)], thr, { K: 1, maxProbes: 6 });
    assert.equal(v.label, "undetermined");
    assert.deepEqual(v.needsSamples, [0]);
  });

  it("10/10 with no collapse is variance", () => {
    const v = labelFromProbes([mk(0, 10, 0)], thr, { K: 1, maxProbes: 6 });
    assert.equal(v.label, "variance");
    assert.deepEqual(v.needsSamples, []);
    assert.equal(v.decisionStep, 1);
  });

  it("variance needs the DEEPEST probe's lower bound, not just p(0)'s", () => {
    const v = labelFromProbes([mk(0, 10, 0), mk(1, 3, 0)], thr, { K: 2, maxProbes: 6 });
    assert.equal(v.label, "undetermined");
    assert.deepEqual(v.needsSamples, [1]);
  });

  it("both probes strong through K-1 is variance", () => {
    const v = labelFromProbes([mk(0, 10, 0), mk(1, 10, 0)], thr, { K: 2, maxProbes: 6 });
    assert.equal(v.label, "variance");
  });

  it("strategic@k when the pre-collapse lower and collapse upper both clear", () => {
    const v = labelFromProbes([mk(0, 10, 0), mk(1, 0, 10)], thr, { K: 2, maxProbes: 6 });
    assert.equal(v.label, "strategic@0");
    assert.equal(v.decisionStep, 1);
    assert.deepEqual(v.needsSamples, []);
  });

  it("a 3-sample collapse probe downgrades strategic@k to undetermined@k", () => {
    const v = labelFromProbes([mk(0, 10, 0), mk(1, 0, 3)], thr, { K: 2, maxProbes: 6 });
    assert.equal(v.label, "undetermined@0");
    assert.deepEqual(v.needsSamples, [1]);
    assert.equal(v.decisionStep, 1);
  });

  it("a weak pre-collapse probe downgrades strategic@k too", () => {
    const v = labelFromProbes([mk(0, 3, 0), mk(1, 0, 10)], thr, { K: 2, maxProbes: 6 });
    assert.equal(v.label, "undetermined@0");
    assert.deepEqual(v.needsSamples, [0]);
  });

  it("keeps the ~coarse suffix when the budget closes the bracket early", () => {
    const v = labelFromProbes([mk(0, 10, 0), mk(4, 0, 10)], thr, { K: 8, maxProbes: 2 });
    assert.equal(v.label, "strategic@3~coarse(lo=0)");
    assert.equal(v.decisionStep, 4);
  });

  it("bisects to the collapse step exactly as the CLI does", () => {
    // K=8: mid 4 passes → lo=4; mid 6 fails → hi=6; mid 5 passes → lo=5. Collapse at 5.
    const probes = [mk(0, 10, 0), mk(4, 10, 0), mk(6, 0, 10), mk(5, 10, 0)];
    const v = labelFromProbes(probes, thr, { K: 8, maxProbes: 6 });
    assert.equal(v.label, "strategic@5");
    assert.equal(v.decisionStep, 6);
  });

  it("a gap in the recorded probes is undetermined, naming the missing cut", () => {
    const v = labelFromProbes([mk(0, 10, 0)], thr, { K: 8, maxProbes: 6 });
    assert.equal(v.label, "undetermined");
    assert.deepEqual(v.needsSamples, [4]);
  });

  it("no probe at k=0 is undetermined", () => {
    const v = labelFromProbes([mk(5, 0, 3)], thr, { K: 9, maxProbes: 6 });
    assert.equal(v.label, "undetermined");
    assert.deepEqual(v.needsSamples, [0]);
  });

  it("an empty probe list is undetermined", () => {
    assert.equal(labelFromProbes([], thr, { K: 9 }).label, "undetermined");
  });

  it("returns one band per probe, sorted by k", () => {
    const v = labelFromProbes([mk(4, 0, 10), mk(0, 10, 0)], thr, { K: 8, maxProbes: 2 });
    assert.deepEqual(v.bounds.map((b) => b.k), [0, 4]);
    close(v.bounds[1].upper, 0.217, 0.01);
    assert.equal(v.bounds[0].successes, 10);
  });

  it("infers K from the probes when it is not supplied", () => {
    const v = labelFromProbes([mk(0, 10, 0)], thr);
    assert.equal(v.label, "variance"); // K defaults to 1, so there is nothing left to bisect
  });

  it("does not mutate the probes it is given", () => {
    const probes = [mk(0, 10, 0), mk(1, 0, 10)];
    const snapshot = JSON.stringify(probes);
    labelFromProbes(probes, thr, { K: 2, maxProbes: 6 });
    assert.equal(JSON.stringify(probes), snapshot);
  });
});
