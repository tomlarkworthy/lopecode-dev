/**
 * Unit tests for the criterion stamp — tools/robocoop-eval/stamp.mjs (plan/rqgm-and-robocoop-5.md,
 * U2).
 *
 * The stamp exists to make one specific failure impossible: pooling scores measured under
 * different utility functions. July's polyglot 0.776 was measured under a problems.json whose
 * word-search export contract was empty, the current 0.796 under the fixed one, and nothing in
 * either file recorded the difference. So the load-bearing property is that a one-byte change to
 * the problem set moves the stamp — pinned here against the REAL problems.json with a temp copy,
 * zero model calls.
 *
 * Also pinned: the module-block scan (attribute order varies between exporter versions — current
 * exports write `id` before `type`), the exclusion of `model` (already a top-level result field),
 * and purity (no timestamp, so two calls on unchanged inputs are byte-identical and the ladder can
 * compare stamps with a plain equality check).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { criterionStamp, coreModuleHashesFromHtml, fileHash, sha12 } from "../../tools/robocoop-eval/stamp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const POLYGLOT = join(repo, "tools", "robocoop-5", "eval", "polyglot");
const PROBLEMS = join(POLYGLOT, "problems.json");
const RUNNER = join(POLYGLOT, "run-agent.mjs");

// Two blocks in the current exporter's attribute order (id first), one in the documented order,
// one non-core module, and one executable script that must be ignored.
const BLOCKS = [
  `<script>window.lopecode = {};</script>`,
  `<script id="@tomlarkworthy/robocoop-5-core"\n  type="text/plain"\n  data-mime="application/javascript"\n>CORE BODY</script>`,
  `<script id="@tomlarkworthy/robocoop-5" type="text/plain" data-mime="application/javascript">ROOT BODY</script>`,
  `<script type="text/plain" id="@tomlarkworthy/robocoop-5-tools" data-mime="application/javascript">TOOLS BODY</script>`,
  `<script type="text/plain" id="@tomlarkworthy/lopepage" data-mime="application/javascript">OTHER BODY</script>`,
];
const HTML = "<!doctype html>\n" + BLOCKS.join("\n") + "\n";

describe("sha12 / fileHash", () => {
  it("is sha256 truncated to 12 hex chars", () => {
    const h = sha12("abc");
    assert.match(h, /^[0-9a-f]{12}$/);
    assert.equal(h, "ba7816bf8f01");
  });

  it("returns null for a file that cannot be read", () => {
    assert.equal(fileHash(join(here, "no-such-file-9d3f.json")), null);
  });
});

describe("coreModuleHashesFromHtml", () => {
  it("hashes every robocoop-5 module block regardless of attribute order", () => {
    const m = coreModuleHashesFromHtml(HTML);
    assert.deepEqual(Object.keys(m), [
      "@tomlarkworthy/robocoop-5",
      "@tomlarkworthy/robocoop-5-core",
      "@tomlarkworthy/robocoop-5-tools",
    ]);
    assert.equal(m["@tomlarkworthy/robocoop-5-core"], sha12("CORE BODY"));
  });

  it("ignores non-core modules and executable scripts", () => {
    const m = coreModuleHashesFromHtml(HTML);
    assert.equal(m["@tomlarkworthy/lopepage"], undefined);
    assert.equal(Object.values(m).includes(sha12("window.lopecode = {};")), false);
  });

  it("keys are sorted, so the stamp is byte-stable across export orderings", () => {
    const reordered = "<!doctype html>\n" + [...BLOCKS].reverse().join("\n") + "\n";
    assert.deepEqual(
      Object.keys(coreModuleHashesFromHtml(reordered)),
      Object.keys(coreModuleHashesFromHtml(HTML)),
    );
  });

  it("moving one byte inside a block moves that block's hash only", () => {
    const a = coreModuleHashesFromHtml(HTML);
    const b = coreModuleHashesFromHtml(HTML.replace("CORE BODY", "CORE BODY."));
    assert.notEqual(a["@tomlarkworthy/robocoop-5-core"], b["@tomlarkworthy/robocoop-5-core"]);
    assert.equal(a["@tomlarkworthy/robocoop-5"], b["@tomlarkworthy/robocoop-5"]);
  });

  it("returns an empty map for HTML with no core blocks", () => {
    assert.deepEqual(coreModuleHashesFromHtml("<html><body>nothing</body></html>"), {});
  });
});

describe("criterionStamp shape", () => {
  it("carries extras verbatim and resolves runnerPath to runnerHash", () => {
    const s = criterionStamp({
      notebookPath: null,
      extra: { runnerPath: RUNNER, problemsJsonHash: "deadbeefcafe", graderHash: "0123456789ab" },
    });
    assert.equal(s.problemsJsonHash, "deadbeefcafe");
    assert.equal(s.graderHash, "0123456789ab");
    assert.equal(s.runnerHash, fileHash(RUNNER));
    assert.equal(s.runnerPath, undefined); // consumed, never echoed
    assert.equal(s.stampVersion, 1);
  });

  it("does not record the model — runners already write it top-level", () => {
    const s = criterionStamp({ notebookPath: null, extra: { runnerPath: RUNNER } });
    assert.equal("model" in s, false);
  });

  it("does not throw on a missing notebook; coreModuleHashes is null", () => {
    const s = criterionStamp({ notebookPath: join(here, "no-such-notebook.html"), extra: {} });
    assert.equal(s.coreModuleHashes, null);
    assert.equal(s.runnerHash, null);
  });

  it("is pure — repeated calls on unchanged inputs are byte-identical", () => {
    const mk = () => criterionStamp({ notebookPath: null, extra: { runnerPath: RUNNER, problemsJsonHash: fileHash(PROBLEMS) } });
    assert.equal(JSON.stringify(mk()), JSON.stringify(mk()));
  });
});

// The U2 verification, run without any model calls: the July criterion and the current criterion
// differ on problems.json, and the stamp is what makes that visible. The real regeneration changed
// the word-search export contract; one byte is the minimal version of the same event.
describe("a one-byte problems.json change moves the stamp", () => {
  it("problemsJsonHash differs between the original and a mutated copy", () => {
    const tmp = join(here, ".tmp-stamp");
    const copy = join(tmp, "problems.json");
    try {
      mkdirSync(tmp, { recursive: true });
      const original = readFileSync(PROBLEMS, "utf8");
      writeFileSync(copy, original.replace("[", "[ ")); // one byte, semantically inert JSON
      const before = criterionStamp({ notebookPath: null, extra: { runnerPath: RUNNER, problemsJsonHash: fileHash(PROBLEMS) } });
      const after = criterionStamp({ notebookPath: null, extra: { runnerPath: RUNNER, problemsJsonHash: fileHash(copy) } });
      assert.equal(typeof before.problemsJsonHash, "string");
      assert.notEqual(before.problemsJsonHash, after.problemsJsonHash);
      assert.equal(before.runnerHash, after.runnerHash); // only the changed input moves
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
