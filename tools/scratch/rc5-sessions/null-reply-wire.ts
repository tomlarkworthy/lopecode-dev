// A reasoning-only reply (content null, no tool call) must not be re-sent: providers 400 the request
// (Tom's session 2026-09-27: "OpenRouter 400: Provider returned error" after a 53k-char reasoning step).
import { importNotebookModule } from "../../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/robocoop-5-core.js");
const createAgentSession = await m.value("createAgentSession");
const sent: any[][] = [];
const client = { chat: async ({ messages }: any) => {
  sent.push(messages.map((x: any) => ({ role: x.role, content: x.content, calls: x.tool_calls?.length ?? 0 })));
  if (sent.length === 1) return { message: { role: "assistant", content: null }, finish_reason: "length" };
  return { message: { role: "assistant", content: "done" }, finish_reason: "stop" };
} };
const s = createAgentSession({ client, model: "x", toolsProvider: () => [], completeToolName: "task_complete", stallNudgeLimit: 2 });
await s.send("hi");
const bad = sent.slice(1).flat().filter(x => x.role === "assistant" && x.content == null && !x.calls);
console.log("requests", sent.length, "null assistant messages re-sent:", bad.length, "| transcript keeps it:", s.messages.some((x: any) => x.role === "assistant" && x.content == null));
