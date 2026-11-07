import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { authorityOf, sameDoc } from "../../tools/atproto-publish-lexicons.ts";

test("the authority of an NSID is its segments but the last, reversed", () => {
  expect(authorityOf("com.lopecode.module")).toBe("lopecode.com");
  expect(authorityOf("com.lopecode.bundle.version")).toBe("bundle.lopecode.com");
});

test("a record's value equals its file whatever the key order and $type", () => {
  const doc = JSON.parse(readFileSync(new URL("../../lopecode/lexicons/com.lopecode.module.json", import.meta.url), "utf8"));
  const value = { $type: "com.atproto.lexicon.schema", defs: doc.defs, id: doc.id, lexicon: 1, description: doc.description };
  expect(sameDoc(value, doc)).toBe(true);
  expect(sameDoc({ ...value, defs: { ...doc.defs, extra: {} } }, doc)).toBe(false);
});

test("the published module schema has no by and a plain-string encoding", () => {
  const doc = JSON.parse(readFileSync(new URL("../../lopecode/lexicons/com.lopecode.module.json", import.meta.url), "utf8"));
  expect(doc.defs.main.record.properties.by).toBeUndefined();
  expect(doc.defs.main.record.required).not.toContain("by");
  expect(doc.defs.fileEntry.properties.encoding).toEqual({ type: "string", description: expect.any(String) });
});
