// What the model is told when a turn stops: every nudge, retry and completion gate, through the real
// makeSession. The texts are a fixture recorded before the rules became cells (spec step 8); a difference
// means the wire changed.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { engine, specLock, call, calls, say, done, ping } from "./lib/engine.mjs";

const FIXTURE = new URL("./turn-end.fixture.json", import.meta.url);
const long = "The notebook has three modules. " + "Each holds cells that compute a value from the ones above it. ".repeat(9);
const mark = (key, value) => ({ id: "mark", description: "mark", parameters: { type: "object", properties: {} }, execute: async (a, ctx) => { ctx.sessionState[key] = value(); return { output: "marked" }; } });
const shot = { id: "shot", description: "shot", parameters: { type: "object", properties: {} }, execute: async (a, ctx) => { ctx.attachImage("data:image/png;base64,AAAA"); return { output: "attached" }; } };
const noImages = (req) => { if (JSON.stringify(req.messages).includes("image_url")) throw new Error("No endpoints found that support image input"); return done("Looked at it."); };

export const SCENARIOS = {
  stall: { script: [say("I will do it."), say("Doing it now."), say("Still going.")] },
  cut_off: { script: [say("thinking", "length"), call("ping"), done("pinged")] },
  restated: { script: [say(long), say(long + " So that is the layout.")] },
  malformed: { script: [{ message: { role: "assistant", content: null }, finish_reason: "error" }, call("ping"), done("pinged")] },
  truncated_call: { script: [call("ping", "{\"a\": \"unterminat"), call("ping"), done("pinged")] },
  batched_completion: { script: [calls(["ping"], ["task_complete", { summary: "All done." }]), done("pinged")] },
  zero_tool_calls: { script: [done("Built the module."), done("Built the module.")] },
  zero_tool_calls_question: { script: [done("Which module do you mean?")] },
  unwritten: { tools: [ping, mark("unwritten", () => new Map([["/src/@user/a.js", "REFUSED"]]))], script: [call("mark"), done("Wrote a."), done("It was not written.")] },
  untried: { tools: [ping, { ...ping, id: "try_control" }, mark("untried", () => new Map([["@user/a", ["rate", "years"]]]))], script: [call("mark"), done("Built it."), done("Built it.")] },
  images_dropped: { tools: [ping, shot], script: [call("shot"), noImages, noImages] },
  agent_guard: { opts: { completeGuard: (info) => info.toolCallsThisTurn < 2 ? "AGENT: ping twice first" : null }, script: [call("ping"), done("one"), call("ping"), done("two")] },
  spec_scorecard: { scorecard: { failing: [{ name: "adds wrongly" }], total: 2 }, script: [call("ping"), done("Spec written."), done("Spec written.")] },
  spec_waiver: { scorecard: { failing: [{ name: "adds wrongly" }], total: 2 }, script: [call("ping"), done("SPEC-WAIVER: adds wrongly — the spec contradicts itself")] },
};

export async function run(name, engineOpts = {}) {
  const s = SCENARIOS[name];
  const e = await engine({ script: s.script, tools: s.tools ?? [ping], ...engineOpts });
  // the two spec-lock scenarios need the plugin; no other scenario has it, as the shipped notebook has not
  if (s.scorecard) (await specLock(e)).gate.scorecard = s.scorecard;
  const session = e.makeSession(s.opts ?? {});
  const r = await session.send("go");
  // every message the loop itself wrote: system messages after the prompt, and tool results
  const told = session.messages.slice(1).filter((m) => m.role === "system" || m.role === "tool").map((m) => m.role + ": " + m.content);
  return { finishReason: r.finishReason, steps: r.steps, told };
}

describe("turn end", () => {
  const record = process.env.RECORD === "1" || !existsSync(FIXTURE);
  const fixture = record ? {} : JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const name of Object.keys(SCENARIOS))
    it(name, async () => {
      const got = await run(name);
      if (record) { fixture[name] = got; writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + "\n"); return; }
      assert.deepEqual(got, fixture[name]);
    });
});
