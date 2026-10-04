// The loop (createAgentSession, robocoop-5-core) takes what it asks the outside for as `hooks` (spec R7):
// prompt, context, beforeStep, turnEnd. The older option names stay as aliases.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { engine, say } from "./lib/engine.mjs";

let createAgentSession;
before(async () => { createAgentSession = (await engine({})).core.createAgentSession; });
const run = async (opts) => {
  const requests = [];
  const s = createAgentSession({ client: { chat: async (req) => { requests.push(JSON.parse(JSON.stringify(req.messages))); return say("hello"); } }, tools: [], model: "m", ...opts });
  await s.send("go");
  return requests[0].map((m) => m.role + ": " + m.content);
};
const NEW = { hooks: { prompt: () => "SYS", context: ({ scope }) => scope.toUpperCase(), beforeStep: () => ["NOTICE"] } };
const OLD = { systemPromptProvider: () => "SYS", contextProvider: ({ scope }) => scope.toUpperCase(), noticesProvider: () => ["NOTICE"] };

describe("loop hooks", () => {
  it("hooks.prompt, hooks.context and hooks.beforeStep reach the request", async () => {
    const got = await run(NEW);
    assert.ok(got[0].startsWith("system: SYS\n"), got[0].slice(0, 40));
    assert.deepEqual(got.slice(1), ["system: SESSION", "system: TURN", "user: go", "system: Watch updates (live values changed since your last step):\nNOTICE"]);
  });
  it("the older option names give the same request", async () => assert.deepEqual(await run(OLD), await run(NEW)));
});
