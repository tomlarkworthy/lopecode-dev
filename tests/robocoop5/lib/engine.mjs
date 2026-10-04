// The real engine, tools and core cells, headless, against a scripted client. Shared by the robocoop5 tests.
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { importNotebookModule } from "../../../tools/notebook-import.ts";

const mod = (n) => fileURLToPath(new URL(`../../../modules/@tomlarkworthy/robocoop-5${n}.js`, import.meta.url));
// plugin-registry's contract, in memory: add returns remove, get yields the set on every change
export const memoryPlugins = () => {
  const sets = new Map(), subs = new Map();
  const notify = (n) => { for (const f of subs.get(n) ?? []) f(); };
  return {
    add(n, v) { if (!sets.has(n)) sets.set(n, new Set()); sets.get(n).add(v); notify(n); return () => { sets.get(n)?.delete(v); notify(n); }; },
    get(n) {
      let wake = null, dirty = true, live = true;
      const f = () => { dirty = true; wake?.(); };
      if (!subs.has(n)) subs.set(n, new Set()); subs.get(n).add(f);
      return { async next() { while (live && !dirty) await new Promise((r) => (wake = r)); dirty = false; return live ? { done: false, value: [...(sets.get(n) ?? [])] } : { done: true }; },
        return() { live = false; subs.get(n).delete(f); wake?.(); return { done: true }; } };
    },
  };
};
const has = (m, n) => m.module._scope.has(n);
// module.value() observes a cell only until it resolves, and then its `invalidation` fires: a setup cell would
// unregister what it registered. hold() keeps the cell observed for the life of the test.
export const hold = (m, name) => new Promise((fulfilled, rejected) => m.module.variable({ fulfilled, rejected }).define(null, [name], (x) => x));
const take = async (m, names) => { const o = {}; for (const n of names) if (has(m, n)) o[n] = await hold(m, n); return o; };

// script: replies in order; an entry may be a function of the request (to throw, or to look at it)
export async function engine({ script = [], monitors = [], tools = [], overrides = {} } = {}) {
  globalThis.window ??= { localStorage: { getItem: () => null } };
  const core = await importNotebookModule(mod("-core"));
  const reg = await importNotebookModule(mod("-tools"), { overrides: { plugins: memoryPlugins() } });
  const fromCore = await take(core, ["createAgentSession", "composeContext", "zeroToolCallGate", "addressesUser", "runHook", "truncate", "defineTool", "composeFooter",
    "hook_turnEnd", "hook_beforeStep", "hook_beforeTool", "hook_afterTool", "hook_context"]);
  const fromTools = await take(reg, ["createWatchBus", "createAskBus", "createMonitorBus", "rc5_watchBuses", "specGateCheck", "rc5_specGate",
    "registerRule", "unregisterRule", "rulesView", "registerMonitor", "unregisterMonitor", "registerContext", "unregisterContext"]);
  let i = 0;
  const requests = [];
  const client = { chat: async (req) => { requests.push(req); const e = script[Math.min(i++, script.length - 1)]; return typeof e === "function" ? e(req) : e; } };
  const all = { client, ...fromCore, ...fromTools,
    reasoningToggle: { value: false }, contextToggle: { value: false }, modelView: { value: "m" }, promptView: { value: "sys" },
    toolsView: { value: tools }, monitorsView: { value: monitors }, contextView: { value: [] }, sessionRules: [], ...overrides };
  // redefine throws on a name the module does not have, and the engine's imports change across the refactor
  const src = readFileSync(mod("-engine"), "utf8");
  const eng = await importNotebookModule(mod("-engine"), { overrides: Object.fromEntries(Object.entries(all).filter(([n]) => src.includes(`"${n}"`))) });
  return { makeSession: await hold(eng, "makeSession"), rewind: (s) => { i = 0; if (s) script = s; }, tools: fromTools, core: fromCore, eng, requests };
}
let n = 0;
export const call = (name, args = {}) => ({ message: { role: "assistant", content: null, tool_calls: [{ id: "c" + n++, function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) } }] }, finish_reason: "tool_calls" });
export const calls = (...cs) => ({ message: { role: "assistant", content: null, tool_calls: cs.map(([name, args = {}]) => ({ id: "c" + n++, function: { name, arguments: JSON.stringify(args) } })) }, finish_reason: "tool_calls" });
export const say = (content, finish_reason = "stop") => ({ message: { role: "assistant", content }, finish_reason });
export const done = (summary) => call("task_complete", { summary });
export const ping = { id: "ping", description: "ping", parameters: { type: "object", properties: {} }, execute: async () => ({ output: "pong" }) };
