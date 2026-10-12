// tools/cloud-brain/cut.ts: a text over its bound is cut, and the cut says how much is shown, how long the whole is
// and the flag that prints all. Issue ac-1-local-tools-mark-a-cut, task 1 of plan/cloud-brain-answers-cut-and-not-said.md.
//
//   bun test ./tests/tools/cut.test.ts          # from the repo root, with the ./
// The tools that use it are held in tab-tests.test.ts and verify-run.test.ts.
import { test, expect } from "bun:test";
import { cut } from "../../tools/cloud-brain/cut.ts";

test("a text at its bound or under it is as it was", () => {
  expect(cut("", 5)).toBe("");
  expect(cut("abcd", 5)).toBe("abcd");
  expect(cut("abcde", 5)).toBe("abcde");
});

test("a text one character over is cut at the bound, and the mark has both lengths and the flag", () => {
  expect(cut("abcdeF", 5)).toBe("abcde… (cut: 5 of 6 characters; --whole prints all)");
  expect(cut("m".repeat(400) + "X", 400)).toBe("m".repeat(400) + "… (cut: 400 of 401 characters; --whole prints all)");
  expect(cut("abcdeF", 0)).toBe("… (cut: 0 of 6 characters; --whole prints all)");
});

test("whole: the text as it was, whatever its length", () => {
  expect(cut("abcdeF", 5, true)).toBe("abcdeF");
  expect(cut("m".repeat(5000), 400, true)).toBe("m".repeat(5000));
  expect(cut("abcdeF", 5, false)).toBe(cut("abcdeF", 5));
});
