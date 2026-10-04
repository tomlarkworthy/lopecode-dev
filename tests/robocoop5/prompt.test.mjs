// The system prompt's text is pinned (spec R15): sections may move between cells, the bytes may not.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { engine, hold, say } from "./lib/engine.mjs";

describe("system prompt", () => {
  it("systemPrompt is byte-identical to the text recorded before it was split (2026-10-04)", async () => {
    const e = await engine({});
    const text = await hold(e.eng, "systemPrompt");
    assert.equal(typeof text, "string");
    assert.equal(text.length, PINNED.length);
    assert.equal(createHash("sha256").update(text).digest("hex"), PINNED.sha256);
  });
  const first = async (promptView, register) => {
    const e = await engine({ script: [say("hi")], overrides: { promptView } });
    const s = e.makeSession({});
    if (register) e.tools.registerRule({ id: "extra", hook: "prompt", order: 70, check: () => "EXTRA SECTION" });
    await s.send("go");
    return { system: e.requests[0].messages[0].content, base: await hold(e.eng, "systemPrompt") };
  };
  it("a prompt rule registered after the session was built is in the next request, at its order", async () => {
    const { system, base } = await first({ value: "D", composed: "D", wiki: "" }, true);
    assert.ok(system.startsWith(base + "\n\nEXTRA SECTION\n\n"), system.slice(base.length - 20, base.length + 60));
  });
  it("text typed into the settings textarea replaces the composed prompt", async () => {
    const { system } = await first({ value: "typed by the user", composed: "D", wiki: "" }, true);
    assert.ok(system.startsWith("typed by the user"), system.slice(0, 60));
    assert.ok(!system.includes("EXTRA SECTION"));
  });
});
const PINNED = { length: 20668, sha256: "7272bf13ca1e9277b20d24cb8b6287042a7a5fdac437b31e5ea435c8ab34e70a" };
