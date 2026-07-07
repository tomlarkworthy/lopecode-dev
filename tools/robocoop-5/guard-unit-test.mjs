// Unit test for the completeGuard veto in robocoop-5-core.
// Mock client: step 1 answers with a bare task_complete (fabricated completion), step 2 calls a real
// tool, step 3 completes again. Expected: first completion VETOED (REJECTED tool result), tool runs,
// second completion accepted. Also: a turn where the model insists (task_complete twice, no tools)
// ends on the SECOND call (guard is once-per-turn — no livelock).
import { importNotebookModule } from "../notebook-import.ts";

const m = await importNotebookModule(new URL("../../modules/@tomlarkworthy/robocoop-5-core.js", import.meta.url).pathname);
const createAgentSession = await m.value("createAgentSession");

function scriptedClient(script) {
  let i = 0;
  return { async chat() { return script[Math.min(i++, script.length - 1)]; } };
}
const complete = (s) => ({ message: { role: "assistant", content: null, tool_calls: [{ id: "c" + Math.floor(Math.random()*1e6), function: { name: "task_complete", arguments: JSON.stringify({ summary: s }) } }] }, finish_reason: "tool_calls" });
const callTool = () => ({ message: { role: "assistant", content: null, tool_calls: [{ id: "t" + Math.floor(Math.random()*1e6), function: { name: "ping", arguments: "{}" } }] }, finish_reason: "tool_calls" });

let pings = 0;
const tools = [{ id: "ping", description: "ping", parameters: { type: "object", properties: {} }, execute: async () => { pings++; return { output: "pong" }; } }];
const guard = ({ toolCallsThisTurn }) => toolCallsThisTurn === 0 ? "REJECTED: no tool calls yet" : null;

// Scenario A: fabricate → veto → work → complete
{
  const s = createAgentSession({ client: scriptedClient([complete("did it (lie)"), callTool(), complete("done for real")]),
    tools, model: "mock", completeToolName: "task_complete", completeGuard: guard });
  const r = await s.send("build something");
  const toolMsgs = s.messages.filter((x) => x.role === "tool").map((x) => x.content);
  const vetoed = toolMsgs.some((c) => String(c).startsWith("REJECTED"));
  console.log("A: veto fired:", vetoed, "| tool ran:", pings === 1, "| finished:", r.finishReason === "completed" || r.completed === true || JSON.stringify(r).includes("done for real"));
  if (!vetoed || pings !== 1) { console.log("A FAIL", JSON.stringify(r).slice(0,200)); process.exit(1); }
}
// Scenario B: model insists — second task_complete accepted, turn ends (no livelock). The loop pushes
// the accepted summary as a final assistant TEXT message; the scripted third step (callTool) must
// never be requested, so exactly 2 chat calls and B contributes no pings.
{
  let chats = 0;
  const script = [complete("nope 1"), complete("nope 2"), callTool()];
  const s = createAgentSession({ client: { async chat() { return script[Math.min(chats++, script.length - 1)]; } },
    tools, model: "mock", completeToolName: "task_complete", completeGuard: guard });
  await s.send("build something");
  const last = s.messages[s.messages.length - 1];
  const accepted = chats === 2 && pings === 1 && last.role === "assistant" && last.content === "nope 2";
  console.log("B: insisted completion accepted on 2nd call:", accepted, "(chat calls:", chats + ", summary echoed:", JSON.stringify(last.content) + ")");
  if (!accepted) { console.log("B FAIL"); process.exit(1); }
}
console.log("GUARD UNIT TEST: PASS");
