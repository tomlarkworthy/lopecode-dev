// Shared OpenRouter client for the tau harness: SSE streaming (the sandbox egress proxy kills
// idle connections ~200s), tool_call delta reassembly, retry/backoff on transient errors.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of [join(here, "..", "..", "..", "robocoop-4", ".env"), join(here, "..", "..", "..", "..", ".env")]) {
    try {
      const m = /^OPENROUTER_API_KEY=(.*)$/m.exec(readFileSync(f, "utf8"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  throw new Error("OPENROUTER_API_KEY not found");
}

const key = loadKey();

export async function chat(messages, { model, tools, max_tokens = 16000, timeoutMs = 600000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 1000));
    try {
      const body = { model, messages, max_tokens, stream: true };
      if (tools) body.tools = tools;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", content = "", sawChunk = false, finish = null;
      const toolSlots = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const choice = j.choices?.[0];
            const delta = choice?.delta;
            if (choice?.finish_reason) finish = choice.finish_reason;
            if (delta?.content) { content += delta.content; sawChunk = true; }
            if (delta?.reasoning != null) sawChunk = true;
            for (const tc of delta?.tool_calls || []) {
              sawChunk = true;
              const i = tc.index ?? 0;
              toolSlots[i] ||= { id: "", type: "function", function: { name: "", arguments: "" } };
              if (tc.id) toolSlots[i].id = tc.id;
              if (tc.function?.name) toolSlots[i].function.name += tc.function.name;
              if (tc.function?.arguments) toolSlots[i].function.arguments += tc.function.arguments;
            }
          } catch {}
        }
      }
      if (!sawChunk) throw new Error("empty streamed completion");
      const tool_calls = toolSlots.filter(Boolean);
      if (!content && !tool_calls.length) throw new Error("no content and no tool calls");
      return { content: content || null, tool_calls: tool_calls.length ? tool_calls : null, finish_reason: finish };
    } catch (e) {
      lastErr = e;
      if (/AbortError|TimeoutError/.test(String(e?.name))) break; // overall deadline: don't burn retries
    }
  }
  throw lastErr;
}
