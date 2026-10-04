// The system prompt's text is pinned (spec R15): sections may move between cells, the bytes may not.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { engine, hold } from "./lib/engine.mjs";

describe("system prompt", () => {
  it("systemPrompt is byte-identical to the text recorded before it was split (2026-10-04)", async () => {
    const e = await engine({});
    const text = await hold(e.eng, "systemPrompt");
    assert.equal(typeof text, "string");
    assert.equal(text.length, PINNED.length);
    assert.equal(createHash("sha256").update(text).digest("hex"), PINNED.sha256);
  });
});
const PINNED = { length: 20668, sha256: "7272bf13ca1e9277b20d24cb8b6287042a7a5fdac437b31e5ea435c8ab34e70a" };
