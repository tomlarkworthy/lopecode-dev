#!/usr/bin/env bun
// End-to-end check of claude-runner.ts against the REAL robocoop-5 core loop (createOpenRouterClient +
// createAgentSession from the module working copy), no browser.
//
//   bun tools/robocoop-5/claude-runner.ts --token spike &
//   bun tools/robocoop-5/claude-runner-e2e.ts [--base http://127.0.0.1:8765/v1] [--token spike] [--model claude-haiku-4-5]
import { importNotebookModule } from "../notebook-import.ts";

const arg = (n: string, d: string) => { const i = process.argv.indexOf("--" + n); return i >= 0 ? process.argv[i + 1] : d; };
const base = arg("base", "http://127.0.0.1:8765/v1");
const token = arg("token", "spike");
const model = arg("model", "claude-haiku-4-5");

const core = await importNotebookModule(new URL("../../modules/@tomlarkworthy/robocoop-5-core.js", import.meta.url).pathname);
const { createOpenRouterClient, createAgentSession, defineTool } = await core.values(["createOpenRouterClient", "createAgentSession", "defineTool"]);

const health = async () => (await (await fetch(base.replace(/\/v1$/, "") + "/health")).json()).stats;
const NOTES: Record<string, string> = { alpha: "The number is 41.", beta: "The number is 17." };
const calls: string[] = [];
const tools = [
  defineTool({
    id: "read_note",
    description: "Read a note by name.",
    parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    execute: async ({ name }: { name: string }) => { calls.push(name); return { output: NOTES[name] ?? "no such note" }; },
  }),
];
const makeSession = () => createAgentSession({
  client: createOpenRouterClient({ baseUrl: base, apiKey: token, defaultModel: model }),
  tools,
  systemPrompt: "You are an agent inside a notebook. Be terse. Use tools to read notes; never guess their content.",
  model,
  completeToolName: "task_complete",
  stallNudgeLimit: 2,
});

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) failed++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const lastText = (r: any) => [...r.messages].reverse().find((m: any) => m.role === "assistant" && m.content)?.content ?? "";
const before = await health();

console.log("turn 1: two tool reads, then a sum");
const s = makeSession();
let r = await s.send("Read the notes 'alpha' and 'beta' and tell me the sum of the two numbers.");
check("both notes read by the caller's own tools", calls.includes("alpha") && calls.includes("beta"), calls.join(","));
check("answer is 58", /58/.test(lastText(r)), JSON.stringify(lastText(r)).slice(0, 120));
check("finished by task_complete", r.finishReason === "completed", `${r.finishReason} in ${r.steps} steps`);

console.log("turn 2: recall across turns, same SDK session");
const n = calls.length;
r = await s.send("Without calling read_note again: what was the number in alpha?");
check("answer is 41", /41/.test(lastText(r)), JSON.stringify(lastText(r)).slice(0, 120));
check("no further note reads", calls.length === n);
let st = await health();
check("one conversation, no rebuild", st.started - before.started === 1 && st.rebuilt === before.rebuilt, JSON.stringify(st));

console.log("turn 3: steer mid-generation");
const p = s.send("Write a 400-word essay about tide pools, then finish.");
await new Promise((res) => setTimeout(res, 2500));
s.steer("Stop the essay. Reply with just the word PINEAPPLE and finish.");
r = await p;
check("steer message was obeyed", /PINEAPPLE/.test(lastText(r)), JSON.stringify(lastText(r)).slice(0, 120));
st = await health();
check("the in-flight step was interrupted", st.interrupts > before.interrupts, JSON.stringify(st));

console.log("turn 4: a history the runner has not seen (edited branch) is rebuilt from text");
const s2 = makeSession();
for (const m of s.messages) s2.messages.push(JSON.parse(JSON.stringify(m)));
const firstUser = s2.messages.find((m: any) => m.role === "user");
firstUser.content += " (edited)";
r = await s2.send("Without calling read_note again: what was the number in beta?");
check("answer is 17", /17/.test(lastText(r)), JSON.stringify(lastText(r)).slice(0, 120));
st = await health();
check("rebuilt once", st.rebuilt - before.rebuilt === 1, JSON.stringify(st));

console.log(`usage (session 1): ${JSON.stringify(s.usage)}`);
console.log(failed ? `${failed} check(s) FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
