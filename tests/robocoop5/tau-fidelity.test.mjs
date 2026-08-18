/**
 * Pins the τ-bench port fidelity rules that live in tools/robocoop-5/eval/tau/retail-env.mjs and
 * drive both runners (run-baseline.mjs, run-agent.mjs). Each rule is quoted from the vendored
 * official implementation under tools/robocoop-5/eval/tau-src/:
 *
 *   T1  envs/retail/env.py  `self.terminate_tools = ["transfer_to_human_agents"]`, and
 *       envs/base.py:108    `if action.name in self.terminate_tools: done = True`
 *       — the episode ENDS at the transfer and is graded there. Our port used to keep looping, so
 *       an agent that transferred and then did the work scored the work. Replaying the stored rolls
 *       under the corrected rule moves baseline 91->89, the yield-fix agent 91->88 and the
 *       principles gate 88->87 (tools/robocoop-5/eval/tau/replay-fidelity.mjs).
 *   T9  envs/base.py:150    calculate_reward scans EVERY respond action for the required outputs,
 *       not just the last of each turn. An rc5 turn emits many assistant messages; only the final
 *       one was collected, so an output stated mid-turn was scored as missing.
 *   T3  agents/tool_calling_agent.py `solve(..., max_num_steps: int = 30)` — the official episode
 *       budget, counted in LLM calls across the whole episode (opt-in here, --official-budget).
 *   T2  envs/base.py:114    reward is computed wherever the episode stops, so every stopping
 *       condition is a legitimate ending and gets a recorded label.
 *
 * The grading assertions fold REAL retail tools over the REAL dataset rather than a stubbed diff:
 * a fixture that hand-writes the post-cancellation order would pass even if terminate-on-transfer
 * graded the wrong snapshot.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TERMINATE_TOOLS, isTerminateTool, OFFICIAL_MAX_STEPS, END_REASONS,
  assistantTexts, assistantTextsBefore, budgetExhausted, classifyEnd,
  loadData, invokeTool, grade, stateDelta,
} from "../../tools/robocoop-5/eval/tau/retail-env.mjs";

// ---- fixtures -------------------------------------------------------------------------------
const PENDING_ORDER = "#W5918442"; // sofia_rossi_8776, status "pending"
const CANCEL = { tool: "cancel_pending_order", kwargs: { order_id: PENDING_ORDER, reason: "no longer needed" } };
const TRANSFER = { tool: "transfer_to_human_agents", kwargs: { summary: "escalating" } };

/** The oracle delta a task with this one ground-truth action would carry, folded by the real tools. */
function oracleDelta(actions) {
  const initial = loadData(), data = loadData();
  for (const a of actions) invokeTool(data, a.tool, a.kwargs);
  return stateDelta(initial, data);
}

/**
 * Replay a synthetic episode the way the runners now do: fold tool entries into the DB, collect
 * assistant text, and (when terminating) freeze BOTH the state and the outputs corpus at the first
 * terminate tool. `entries` is [{tool,kwargs} | {text}].
 */
function replayEpisode(task, entries, { terminateOnTransfer }) {
  const initial = loadData(), data = loadData();
  const texts = [];
  let frozen = null, frozenTexts = null;
  for (const e of entries) {
    if (e.tool) {
      invokeTool(data, e.tool, e.kwargs || {});
      if (terminateOnTransfer && isTerminateTool(e.tool) && !frozen) {
        frozen = structuredClone(data);
        frozenTexts = texts.slice();
      }
    } else if (typeof e.text === "string") texts.push(e.text);
  }
  return grade(task, initial, frozen ?? data, frozenTexts ?? texts);
}

const CANCEL_TASK = { outputs: [], oracle_delta: oracleDelta([CANCEL]) };

// ---- T1 -------------------------------------------------------------------------------------
describe("T1 terminate-on-transfer", () => {
  it("declares exactly the official retail terminate tool", () => {
    assert.deepEqual(TERMINATE_TOOLS, ["transfer_to_human_agents"]);
    assert.equal(isTerminateTool("transfer_to_human_agents"), true);
    assert.equal(isTerminateTool("cancel_pending_order"), false);
    assert.equal(isTerminateTool(undefined), false);
  });

  it("the fixture episode passes when the episode is allowed to run past the transfer", () => {
    const episode = [TRANSFER, CANCEL, { text: "done" }];
    assert.equal(replayEpisode(CANCEL_TASK, episode, { terminateOnTransfer: false }).reward, 1);
  });

  it("grades the state frozen AT the transfer, so post-transfer work does not count", () => {
    const episode = [TRANSFER, CANCEL, { text: "done" }];
    const g = replayEpisode(CANCEL_TASK, episode, { terminateOnTransfer: true });
    assert.equal(g.reward, 0);
    assert.equal(g.r_actions, false);
    assert.deepEqual(g.delta, {}); // nothing had happened yet when the agent escalated
  });

  it("work completed BEFORE the transfer still counts", () => {
    const episode = [CANCEL, { text: "cancelled, escalating" }, TRANSFER];
    assert.equal(replayEpisode(CANCEL_TASK, episode, { terminateOnTransfer: true }).reward, 1);
  });

  it("a required output first stated after the transfer is missing", () => {
    const task = { outputs: ["42"], oracle_delta: oracleDelta([CANCEL]) };
    const before = replayEpisode(task, [CANCEL, { text: "the total is 42" }, TRANSFER], { terminateOnTransfer: true });
    const after = replayEpisode(task, [CANCEL, TRANSFER, { text: "the total is 42" }], { terminateOnTransfer: true });
    assert.equal(before.r_outputs, true);
    assert.equal(after.r_outputs, false);
    assert.deepEqual(after.missing, ["42"]);
    assert.equal(after.reward, 0);
  });

  it("terminating can only remove work, never rescue a failure", () => {
    const wrong = { outputs: [], oracle_delta: oracleDelta([CANCEL]) };
    // the agent cancels the WRONG order and then transfers: zero either way
    const bad = [{ tool: "cancel_pending_order", kwargs: { order_id: "#W2974929", reason: "no longer needed" } }, TRANSFER];
    assert.equal(replayEpisode(wrong, bad, { terminateOnTransfer: false }).reward, 0);
    assert.equal(replayEpisode(wrong, bad, { terminateOnTransfer: true }).reward, 0);
  });
});

// ---- T9 -------------------------------------------------------------------------------------
describe("T9 outputs corpus over every assistant message", () => {
  const conversation = [
    { role: "system", content: "wiki" },
    { role: "user", content: "hi" },
    { role: "assistant", content: "Your refund is 154.62", tool_calls: [{ function: { name: "get_order_details" } }] },
    { role: "tool", content: "{...}" },
    { role: "assistant", content: "   " },
    { role: "assistant", content: null, tool_calls: [{ function: { name: "cancel_pending_order" } }] },
    { role: "assistant", content: "All set." },
  ];

  it("collects every non-empty assistant text in order, and nothing else", () => {
    assert.deepEqual(assistantTexts(conversation), ["Your refund is 154.62", "All set."]);
    assert.deepEqual(assistantTexts([]), []);
    assert.deepEqual(assistantTexts(undefined), []);
  });

  it("a required output stated mid-turn counts — the turn-final reply alone would miss it", () => {
    const task = { outputs: ["154.62"], oracle_delta: {} };
    const initial = loadData();
    const turnFinalOnly = grade(task, initial, loadData(), ["All set."]);
    const allText = grade(task, initial, loadData(), assistantTexts(conversation));
    assert.equal(turnFinalOnly.r_outputs, false);
    assert.equal(allText.r_outputs, true);
    assert.equal(allText.reward, 1);
  });

  it("cuts the corpus at the first terminate call, in either message shape", () => {
    const wire = [
      { role: "assistant", content: "before" },
      { role: "assistant", content: "same message as the call", tool_calls: [{ function: { name: "transfer_to_human_agents" } }] },
      { role: "assistant", content: "after" },
    ];
    const flattened = wire.map((m) => ({ role: m.role, content: m.content, tools: (m.tool_calls || []).map((t) => t.function.name) }));
    assert.deepEqual(assistantTextsBefore(wire), ["before"]);
    assert.deepEqual(assistantTextsBefore(flattened), ["before"]);
    // no terminate call: the whole turn is in scope
    assert.deepEqual(assistantTextsBefore([{ role: "assistant", content: "a" }, { role: "assistant", content: "b" }]), ["a", "b"]);
    // and the cut tool set is a parameter, not a hard-coded name
    assert.deepEqual(assistantTextsBefore(flattened, ["nothing_matches"]), ["before", "same message as the call", "after"]);
  });
});

// ---- T3 -------------------------------------------------------------------------------------
describe("T3 official step budget", () => {
  it("pins the official cap and its boundary", () => {
    assert.equal(OFFICIAL_MAX_STEPS, 30);
    assert.equal(budgetExhausted(29), false);
    assert.equal(budgetExhausted(30), true);
    assert.equal(budgetExhausted(31), true);
    assert.equal(budgetExhausted(0), false);
    assert.equal(budgetExhausted(undefined), false);
    assert.equal(budgetExhausted(5, 5), true);
  });

  it("counts LLM calls across turns, not per turn, and ends the episode when they run out", () => {
    const drive = (perTurn, capped) => {
      let total = 0, turns = 0, ended = null;
      for (const steps of perTurn) {
        total += steps;
        turns++;
        if (capped && budgetExhausted(total)) { ended = "exhausted"; break; }
      }
      return { total, turns, ended };
    };
    // 12 + 11 = 23 is under the cap; the third turn crosses it
    assert.deepEqual(drive([12, 11, 9, 6], true), { total: 32, turns: 3, ended: "exhausted" });
    // uncapped (the default arm) runs every turn — no single turn would have tripped it either
    assert.deepEqual(drive([12, 11, 9, 6], false), { total: 38, turns: 4, ended: null });
  });
});

// ---- T2 -------------------------------------------------------------------------------------
describe("T2 endReason classification", () => {
  it("labels every ending, defaulting to exhaustion", () => {
    assert.equal(classifyEnd({ stopped: true }), "stop");
    assert.equal(classifyEnd({ transferred: true }), "transfer");
    assert.equal(classifyEnd({ deadline: true }), "deadline");
    assert.equal(classifyEnd({ error: true }), "error");
    assert.equal(classifyEnd({}), "exhausted");
    assert.equal(classifyEnd(), "exhausted");
  });

  it("resolves simultaneous conditions by precedence: error > transfer > stop > deadline", () => {
    assert.equal(classifyEnd({ error: true, transferred: true, stopped: true, deadline: true }), "error");
    assert.equal(classifyEnd({ transferred: true, stopped: true, deadline: true }), "transfer");
    assert.equal(classifyEnd({ stopped: true, deadline: true }), "stop");
  });

  it("only ever returns a declared reason", () => {
    const cases = [{}, { stopped: true }, { transferred: true }, { deadline: true }, { error: true }];
    for (const c of cases) assert.ok(END_REASONS.includes(classifyEnd(c)), JSON.stringify(c));
    assert.deepEqual([...END_REASONS].sort(), ["deadline", "error", "exhausted", "stop", "transfer"]);
  });
});
