// OpenRouter chat-completions client. DOM-free, pluggable fetch/key, non-streaming.
// Wire facts and interface per DESIGN.md § "OpenRouter client interface".

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

const envApiKey = () =>
  typeof process !== "undefined" && process.env
    ? process.env.OPENROUTER_API_KEY
    : undefined;

export function createOpenRouterClient({
  apiKey = envApiKey(),
  fetch = globalThis.fetch,
  baseUrl = DEFAULT_BASE_URL,
  referer,
  title,
  defaultModel = DEFAULT_MODEL,
  cacheModels   // optional Set<modelId> needing explicit cache_control; auto-detected from /models if omitted
} = {}) {
  if (typeof fetch !== "function") {
    throw new Error("createOpenRouterClient: no fetch available (pass {fetch})");
  }

  // Mirror of robocoop-4-core: only providers OpenRouter prices a cache READ for (Anthropic/Qwen/Gemini)
  // take explicit cache_control; others cache automatically. Auto-detected once, non-blocking.
  let cacheableIds = cacheModels instanceof Set ? cacheModels : null;
  if (!cacheableIds) {
    Promise.resolve()
      .then(() => fetch(`${baseUrl}/models`))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => { if (j && Array.isArray(j.data)) cacheableIds = new Set(j.data.filter((m) => m && m.pricing && "input_cache_read" in m.pricing).map((m) => m.id)); })
      .catch(() => {});
  }
  const supportsCacheControl = (model) => (cacheableIds ? cacheableIds.has(model) : /anthropic|claude|qwen/i.test(model || ""));
  const withCacheBreakpoints = (messages, model) => {
    if (!Array.isArray(messages) || !messages.length || !supportsCacheControl(model)) return messages;
    const mark = (msg) => {
      if (!msg) return msg;
      if (typeof msg.content === "string") return { ...msg, content: [{ type: "text", text: msg.content, cache_control: { type: "ephemeral" } }] };
      if (Array.isArray(msg.content) && msg.content.length) {
        const c = msg.content.slice();
        c[c.length - 1] = { ...c[c.length - 1], cache_control: { type: "ephemeral" } };
        return { ...msg, content: c };
      }
      return msg;
    };
    const out = messages.slice();
    if (out[0] && out[0].role === "system") out[0] = mark(out[0]);
    const last = out.length - 1;
    if (last > 0) out[last] = mark(out[last]);
    return out;
  };

  const headers = () => {
    const h = { "Content-Type": "application/json" };
    const key = String(apiKey ?? "").trim();
    if (key) h.Authorization = `Bearer ${key}`;
    if (referer) h["HTTP-Referer"] = referer; // attribution; never empty-string headers
    if (title) h["X-Title"] = title;
    return h;
  };

  async function chat({
    model = defaultModel,
    messages,
    tools,
    tool_choice = "auto",
    temperature,
    max_tokens,
    signal
  } = {}) {
    const body = {
      model,
      messages: withCacheBreakpoints(messages, model),
      stream: false, // deterministic; no SSE parser in the hot path (streaming seam: lift this + parse response.body)
      usage: { include: true }, // return token counts + USD cost (and prompt_tokens_details.cached_tokens)
      ...(tools && tools.length ? { tools, tool_choice } : {}),
      ...(temperature != null ? { temperature } : {}),
      ...(max_tokens != null ? { max_tokens } : {})
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error("OpenRouter " + res.status + ": " + text);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("OpenRouter: no choices in response: " + JSON.stringify(data));
    }
    // message returned VERBATIM incl any tool_calls (function.arguments stays a JSON STRING).
    return { message: choice.message, finish_reason: choice.finish_reason, raw: data };
  }

  return { chat };
}

// Dev pass-through: appends {request, response} to a sink for one-time fixture capture.
export function recordClient(realClient, sink) {
  if (!Array.isArray(sink)) throw new Error("recordClient: sink must be an array");
  return {
    async chat(request) {
      const response = await realClient.chat(request);
      sink.push({ request, response });
      return response;
    }
  };
}
