// tools/cloud-brain/knowledge-eval/paper-sets.ts: the question sets as the plan has them, and how a rank is scored.
// No case calls a Brain.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { parseSets, rankOf, score, held, PLAN } from "../../tools/cloud-brain/knowledge-eval/paper-sets.ts";

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
