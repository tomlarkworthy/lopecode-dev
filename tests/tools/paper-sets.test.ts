// tools/cloud-brain/knowledge-eval/paper-sets.ts: the question sets as the plan has them, and how a rank is scored.
// No case calls a Brain.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { parseSets, rankOf, score, held, armsOf, PLAN } from "../../tools/cloud-brain/knowledge-eval/paper-sets.ts";

const root = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const DOCS_PLAN = join(root, "plan/cloud-brain-docs-summarised-for-search.md"), TOOL = join(root, "tools/cloud-brain/knowledge-eval/paper-sets.ts");

test("the plan's two sets: ten questions each, of the same ten papers in the same order", () => {
  const { A, B } = parseSets(readFileSync(PLAN, "utf8"));
  expect(A.length).toBe(10);
  expect(B.length).toBe(10);
  expect(A.map((x) => x.want)).toEqual(B.map((x) => x.want));
  expect(new Set(A.map((x) => x.want)).size).toBe(10);
  expect(A[0]).toEqual({ want: "arxiv:2305.11738", was: 1, q: "verify a model's first answer with external tools and feed the critique back, with an oracle variant that fixes only the wrong samples" });
  expect(B[7].want).toBe("arxiv:2607.14159");
  expect(B[7].was).toBe(5);
});

test("the ranks the plan wrote down score as the plan's table has them", () => {
  const { A, B } = parseSets(readFileSync(PLAN, "utf8"));
  expect(score(A.map((x) => x.was))).toMatchObject({ n: 10, mrr: 0.95, first: 9, in3: 10, in10: 10, lowest: 2 });
  expect(score(B.map((x) => x.was))).toMatchObject({ n: 10, mrr: 0.753, first: 6, in3: 9, in10: 10, lowest: 5 });
});

test("parseSets refuses a plan without the sets, and a line that is not a question", () => {
  expect(() => parseSets("# no sets")).toThrow("The question sets");
  expect(() => parseSets("## The question sets\n```\narxiv:1 one\n```\n```\narxiv:1 1 q\n```\n")).toThrow("not a question line");
  expect(() => parseSets("## The question sets\n```\narxiv:1 1 q\n```\n")).toThrow("not 2");
});

test("a rank is the place from 1, null when the wanted id is not answered; a null counts 0 in the MRR", () => {
  expect(rankOf(["a", "b", "c"], "c")).toBe(3);
  expect(rankOf(["a"], "z")).toBe(null);
  expect(rankOf([], "z")).toBe(null);
  expect(score([1, null])).toEqual({ n: 2, mrr: 0.5, first: 1, in3: 1, in10: 1, notFound: 1, lowest: null });
  expect(score([4, 11]).in3).toBe(0);
  expect(score([4, 11]).in10).toBe(1);
  expect(score([]).mrr).toBe(null);
});

test("held: a question's numbers, read as the number rule reads them, against a summary", () => {
  expect(held("had 91 violations, a 28.2% task-level rate, and 48", "91 violations (28.2%) and 48 of them.")).toEqual({ numbers: ["91", "28.2%", "48"], held: ["91", "28.2%", "48"] });
  expect(held("a 28.2% rate", "28.2 of them").held).toEqual([]);
  expect(held("1,000 runs", "1000 runs").held).toEqual(["1000"]);
  expect(held("no number here", "12").numbers).toEqual([]);
});

// sd-3-pilot-ten: --plan FILE --kind doc, the sets K and L of the docs' plan.
test("sd-3: the docs' plan has two sets of ten questions, of the same ten docs in the same order, and its ranks by meaning score as it says", () => {
  const { A: K, B: L } = parseSets(readFileSync(DOCS_PLAN, "utf8"));
  expect(K.length).toBe(10);
  expect(L.length).toBe(10);
  expect(K.map((x) => x.want)).toEqual(L.map((x) => x.want));
  expect(new Set(K.map((x) => x.want)).size).toBe(10);
  expect(K.every((x) => x.want.startsWith("doc:"))).toBe(true);
  expect(K[0].want).toBe("doc:vendoring-npm-dependencies");
  expect(L[9]).toMatchObject({ want: "doc:cloud-brain-locks-held-in-the-cluster", was: 6 });
  // "(0.656, 0.517 and 0.594 at 20:43)": set L by words is the first and is not in the blocks; these are the other two.
  // A rank written 0 is "not among the 20" and counts 0, as a null does.
  expect(score(L.map((x) => x.was || null)).mrr).toBe(0.517);
  expect(score(K.map((x) => x.was || null)).mrr).toBe(0.594);
});

test("sd-3: a doc's arms are both sets by words (kind=doc) and by meaning; a paper's are the three they were", () => {
  const sets = parseSets(readFileSync(DOCS_PLAN, "utf8"));
  expect(armsOf(sets, "doc").map(([name, qs, more]) => [name, qs === sets.A ? "first" : "second", more])).toEqual([
    ["K by words", "first", "kind=doc"], ["K by meaning", "first", "semantic=true"], ["L by words", "second", "kind=doc"], ["L by meaning", "second", "semantic=true"]]);
  expect(armsOf(sets, "paper").map(([name, , more]) => [name, more])).toEqual([["A by meaning", "semantic=true"], ["A by words", "kind=paper"], ["B by meaning", "semantic=true"]]);
});

test("sd-3: --kind takes paper or doc, --held is not a doc's, and a plan that is not there is said: each before any call", () => {
  const run = (...a: string[]) => spawnSync("bun", [TOOL, ...a], { encoding: "utf8", env: { ...process.env, BRAIN_BASE: "", BRAIN_STATE_DIR: "/nonexistent" } });
  const bad = run("--kind", "module");
  expect(bad.status).toBe(2);
  expect(bad.stderr).toContain("--kind paper | doc");
  const held = run("--kind", "doc", "--held");
  expect(held.status).toBe(2);
  expect(held.stderr).toContain("not with --kind doc");
  expect(run("--plan", "/nonexistent/plan.md", "--kind", "doc").status).not.toBe(0);
  // With the docs' plan and no BRAIN_BASE it reads the sets and stops before the first search.
  const none = run("--plan", DOCS_PLAN, "--kind", "doc");
  expect(none.status).not.toBe(0);
  expect(none.stderr).toContain("BRAIN_BASE");
}, 60000);
