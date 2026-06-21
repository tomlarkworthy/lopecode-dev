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
  defaultModel = DEFAULT_MODEL
} = {}) {
  if (typeof fetch !== "function") {
    throw new Error("createOpenRouterClient: no fetch available (pass {fetch})");
  }

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
      messages,
      stream: false, // deterministic; no SSE parser in the hot path (streaming seam: lift this + parse response.body)
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
