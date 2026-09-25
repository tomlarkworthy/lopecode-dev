// Faithful replay of a stalled second request: the captured df35 body shape (capture-body.mjs req-2:
// tools, tool_choice, max_tokens 32000, stream, usage) carrying a trajectory's conversation prefix,
// with the engine's cache_control marking applied (system[0] + last message -> content-part arrays).
//   node tbs/replay-faithful.mjs <variant,...>   (variants below; all run in parallel)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { here } from "./tasks.mjs";
import { loadKey } from "./keyload.mjs";

const cap = JSON.parse(readFileSync(join(here, "results/capture-flash/req-2.json"), "utf8"));
const traj = (w) => JSON.parse(readFileSync(join(here, `trajectories/walk-20260924${w}-variable-star-vetting/variable-star-vetting-1.json`), "utf8")).conversation;
const al = traj("al").slice(0, 7); // sys x3, user, assistant(read_file, eval_js), tool, tool = al's request 2
const aj = traj("aj").slice(0, 8); // through step-1 tool results = aj's request 2 (136 s gap)

const mark = (m) => typeof m.content === "string"
  ? { ...m, content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] } : m;
const engineMark = (ms) => { const o = ms.map((m) => (m.role === "assistant" && m.content === "" ? { ...m, content: null } : m)); o[0] = mark(o[0]); o[o.length - 1] = mark(o[o.length - 1]); return o; };
const base = (messages, extra = {}) => ({ model: "xiaomi/mimo-v2.6-flash", messages, stream: true, usage: { include: true }, tools: cap.tools, tool_choice: "auto", max_tokens: 32000, ...extra });

const V = {
  "flash-a": () => base(engineMark(al)),
  "flash-b": () => base(engineMark(al)),
  "flash-nocache": () => base(al.map((m) => (m.role === "assistant" && m.content === "" ? { ...m, content: null } : m))),
  "flash-notools": () => { const b = base(engineMark(al)); delete b.tools; delete b.tool_choice; return b; },
  "flash-max200": () => base(engineMark(al), { max_tokens: 200 }),
  "flash-reason-off": () => base(engineMark(al), { reasoning: { enabled: false } }),
  "flash-effort-low": () => base(engineMark(al), { reasoning: { effort: "low" } }),
  "flash-aj": () => base(engineMark(aj)),
  "pro26": () => base(engineMark(al), { model: "xiaomi/mimo-v2.6-pro" }),
  "pro25": () => base(engineMark(al), { model: "xiaomi/mimo-v2.5-pro" }),
};

async function run(name) {
  const body = V[name]();
  const t0 = Date.now();
  const r = { name, model: body.model, ttftMs: null, lastChunkMs: null, keepalives: 0, reasoningChars: 0, contentChars: 0, toolCalls: [], finish: null, native: null, provider: null, usage: null, error: null, reasoningHead: "", reasoningTail: "", content: "" };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 600000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + loadKey() }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + (await res.text()).slice(0, 300));
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let reasoning = "";
    const tcs = [];
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (line.startsWith(":")) { r.keepalives++; continue; }
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        let j; try { j = JSON.parse(line.slice(6)); } catch { continue; }
        if (j.provider) r.provider = j.provider;
        if (j.usage) r.usage = j.usage;
        if (j.error) r.error = JSON.stringify(j.error).slice(0, 300);
        const c = j.choices && j.choices[0]; if (!c) continue;
        const d = c.delta || {};
        const got = (d.reasoning || "") + (d.content || "") + (d.tool_calls ? "x" : "");
        if (got) { const now = Date.now() - t0; if (r.ttftMs == null) r.ttftMs = now; else r.maxGapMs = Math.max(r.maxGapMs || 0, now - r.lastChunkMs); r.lastChunkMs = now; }
        if (d.reasoning) { reasoning += d.reasoning; r.reasoningChars = reasoning.length; r.reasoningTail = reasoning.slice(-160); }
        if (d.content) r.content += d.content;
        for (const tc of d.tool_calls || []) { const i = tc.index ?? 0; tcs[i] = tcs[i] || { name: "", args: 0 }; if (tc.function?.name) tcs[i].name += tc.function.name; if (tc.function?.arguments) tcs[i].args += tc.function.arguments.length; }
        if (c.finish_reason) r.finish = c.finish_reason; if (c.native_finish_reason) r.native = c.native_finish_reason;
      }
    }
    r.reasoningChars = reasoning.length; r.contentChars = r.content.length; r.toolCalls = tcs.filter(Boolean);
    r.reasoningHead = reasoning.slice(0, 160); r.reasoningTail = reasoning.slice(-160);
    r.reasoningFull = reasoning;
  } catch (e) { r.error = (ctrl.signal.aborted ? "TIMEOUT 600s " : "") + String(e.message || e).slice(0, 300); }
  clearTimeout(to);
  r.totalMs = Date.now() - t0;
  const u = r.usage || {};
  console.log(`${name}: ttft=${r.ttftMs} last=${r.lastChunkMs} total=${r.totalMs} ka=${r.keepalives} maxGap=${r.maxGapMs} reas=${r.reasoningChars} cont=${r.contentChars} tools=${r.toolCalls.map((t) => t.name).join("+")} finish=${r.finish}/${r.native} prov=${r.provider} comp=${u.completion_tokens} rtok=${u.completion_tokens_details?.reasoning_tokens} cost=${u.cost} err=${r.error}`);
  return r;
}

const names = (process.argv[2] || "flash-a").split(",");
const out = await Promise.all(names.map(run));
mkdirSync(join(here, "results/replay-faithful"), { recursive: true });
writeFileSync(join(here, "results/replay-faithful", `${Date.now()}.json`), JSON.stringify(out, null, 1));
console.log("total cost", out.reduce((s, r) => s + (r.usage?.cost || 0), 0));
