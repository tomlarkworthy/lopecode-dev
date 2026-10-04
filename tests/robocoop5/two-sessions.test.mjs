// test_two_sessions_isolated (spec R18): two agents built by the real makeSession, on one page, each see
// a monitor's verdict. The real engine, tools and core cells run headless against a scripted client.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { importNotebookModule } from "../../tools/notebook-import.ts";

const mod = (n) => fileURLToPath(new URL(`../../modules/@tomlarkworthy/robocoop-5${n}.js`, import.meta.url));
const call = (name, args = {}) => ({ message: { role: "assistant", content: null, tool_calls: [{ id: "c" + Math.random(), function: { name, arguments: JSON.stringify(args) } }] }, finish_reason: "tool_calls" });

export async function engine({ script, monitors = [], tools = [] }) {
  const core = await importNotebookModule(mod("-core"));
  const reg = await importNotebookModule(mod("-tools"), { overrides: { plugins: { add: () => () => {}, get: () => (async function* () {})() } } });
  const fromTools = {};
  for (const n of ["createWatchBus", "createAskBus", "createMonitorBus", "rc5_watchBuses", "specGateCheck", "rc5_specGate"])
    if ([...reg.module._scope.keys()].includes(n)) fromTools[n] = await reg.value(n);
  let i = 0;
  const eng = await importNotebookModule(mod("-engine"), { overrides: {
    client: { chat: async () => script[Math.min(i++, script.length - 1)] },
    createAgentSession: await core.value("createAgentSession"), composeContext: await core.value("composeContext"), zeroToolCallGate: await core.value("zeroToolCallGate"),
    reasoningToggle: { value: false }, contextToggle: { value: false }, modelView: { value: "m" }, promptView: { value: "sys" },
    toolsView: { value: tools }, monitorsView: { value: monitors }, contextView: { value: [] }, ...fromTools,
  } });
  return { makeSession: await eng.value("makeSession"), rewind: () => { i = 0; }, tools: fromTools };
}
export const ping = { id: "ping", description: "ping", parameters: { type: "object", properties: {} }, execute: async () => ({ output: "pong" }) };
export const turn = [call("ping"), call("ping"), call("task_complete", { summary: "done" })];
const notices = (s) => s.messages.filter((m) => m.role === "system" && /\[monitor:/.test(m.content)).map((m) => m.content);

describe("test_two_sessions_isolated", () => {
  it("a monitor verdict reaches each session, not only the first to drain", async () => {
    globalThis.window ??= { localStorage: { getItem: () => null } };
    const { makeSession, rewind } = await engine({ script: turn, tools: [ping], monitors: [{ id: "t", check: () => "red" }] });
    const a = makeSession(), b = makeSession();
    await a.send("go"); rewind(); await b.send("go");
    assert.equal(notices(a).length, 1, "session a: " + JSON.stringify(notices(a)));
    assert.equal(notices(b).length, 1, "session b: " + JSON.stringify(notices(b)));
  });
  it("the page lists each live session's watch bus, and drops it on dispose", async () => {
    const { makeSession, tools } = await engine({ script: turn, tools: [ping] });
    const a = makeSession(), b = makeSession();
    assert.deepEqual([...tools.rc5_watchBuses], [a.watchBus, b.watchBus]);
    a.dispose();
    assert.deepEqual([...tools.rc5_watchBuses], [b.watchBus]);
  });
});
