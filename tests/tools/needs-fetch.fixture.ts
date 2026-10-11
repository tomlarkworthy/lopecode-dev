// Run by needs.test.ts after atproto-publish.test.ts, in one `bun test`: what fetch is by then.
import { test, expect } from "bun:test";

test("fetch is a function", () => {
  console.log(`fetch after: ${typeof globalThis.fetch}`);
  expect(typeof globalThis.fetch).toBe("function");
});
