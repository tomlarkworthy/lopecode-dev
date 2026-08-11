// Local translator: Anthropic Messages API  ->  OpenRouter (OpenAI chat/completions) -> MiMo.
// Claude Code (guest) speaks native Anthropic; OpenRouter's native Anthropic skin only serves
// first-party Anthropic models, and this key only serves MiMo, so we translate here.
// The guest reaches us via the notebook's toy proxy -> main-thread fetch -> http://127.0.0.1:8787.
import http from "node:http";
import fs from "node:fs";

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENROUTER_MODEL || "xiaomi/mimo-v2.5-pro";
const KEY = fs.readFileSync(new URL("./or-key.txt", import.meta.url), "utf8").trim();
const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Private-Network": "true",
};
const log = (...a) => console.error("[xlate]", ...a);

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
}

// ---- Anthropic request -> OpenAI request ----
function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

function toOpenAIMessages(body) {
  const msgs = [];
  if (body.system) {
    const sys = typeof body.system === "string" ? body.system : textOf(body.system);
    if (sys) msgs.push({ role: "system", content: sys });
  }
  for (const m of body.messages || []) {
    if (typeof m.content === "string") {
      msgs.push({ role: m.role, content: m.content });
      continue;
    }
    const blocks = Array.isArray(m.content) ? m.content : [];
    if (m.role === "assistant") {
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
      const toolUses = blocks.filter((b) => b.type === "tool_use");
      const om = { role: "assistant", content: text || null };
      if (toolUses.length) {
        om.tool_calls = toolUses.map((t) => ({
          id: t.id,
          type: "function",
          function: { name: t.name, arguments: JSON.stringify(t.input || {}) },
        }));
      }
      msgs.push(om);
    } else {
      // user: split tool_result blocks into OpenAI tool messages; keep text as a user message
      const toolResults = blocks.filter((b) => b.type === "tool_result");
      const others = blocks.filter((b) => b.type !== "tool_result");
      for (const tr of toolResults) {
        let c = tr.content;
        if (Array.isArray(c)) c = c.map((x) => (x.type === "text" ? x.text : JSON.stringify(x))).join("");
        msgs.push({ role: "tool", tool_call_id: tr.tool_use_id, content: String(c ?? "") });
      }
      if (others.length) {
        const txt = others.filter((b) => b.type === "text").map((b) => b.text).join("");
        if (txt) msgs.push({ role: "user", content: txt });
      }
    }
  }
  return msgs;
}

function toOpenAIRequest(body) {
  const req = {
    model: MODEL,
    messages: toOpenAIMessages(body),
    stream: false,
  };
  if (body.max_tokens) req.max_tokens = body.max_tokens;
  if (body.temperature != null) req.temperature = body.temperature;
  if (body.top_p != null) req.top_p = body.top_p;
  if (Array.isArray(body.stop_sequences) && body.stop_sequences.length) req.stop = body.stop_sequences;
  if (Array.isArray(body.tools) && body.tools.length) {
    req.tools = body.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description || "", parameters: t.input_schema || { type: "object" } },
    }));
  }
  if (body.tool_choice) {
    const tc = body.tool_choice;
    if (tc.type === "auto") req.tool_choice = "auto";
    else if (tc.type === "any") req.tool_choice = "required";
    else if (tc.type === "tool" && tc.name) req.tool_choice = { type: "function", function: { name: tc.name } };
  }
  return req;
}

// ---- OpenAI response -> Anthropic SSE ----
const FINISH = { stop: "end_turn", length: "max_tokens", tool_calls: "tool_use", content_filter: "end_turn" };

function buildSSE(oai, model) {
  const choice = (oai.choices && oai.choices[0]) || {};
  const msg = choice.message || {};
  const id = "msg_" + (oai.id || "x").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  const blocks = [];
  if (msg.content) blocks.push({ type: "text", text: String(msg.content) });
  for (const tc of msg.tool_calls || []) {
    let input = {};
    try { input = JSON.parse(tc.function.arguments || "{}"); } catch { input = {}; }
    blocks.push({ type: "tool_use", id: tc.id || ("toolu_" + Math.floor(input.__n || 0)), name: tc.function.name, input });
  }
  if (!blocks.length) blocks.push({ type: "text", text: "" });
  const usage = oai.usage || {};
  const inTok = usage.prompt_tokens || 0;
  const outTok = usage.completion_tokens || 0;
  const stopReason = FINISH[choice.finish_reason] || "end_turn";

  const ev = [];
  const push = (event, data) => ev.push(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  push("message_start", {
    type: "message_start",
    message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: inTok, output_tokens: 0 } },
  });
  blocks.forEach((blk, i) => {
    if (blk.type === "text") {
      push("content_block_start", { type: "content_block_start", index: i, content_block: { type: "text", text: "" } });
      push("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "text_delta", text: blk.text } });
    } else {
      push("content_block_start", { type: "content_block_start", index: i, content_block: { type: "tool_use", id: blk.id, name: blk.name, input: {} } });
      push("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: JSON.stringify(blk.input) } });
    }
    push("content_block_stop", { type: "content_block_stop", index: i });
  });
  push("message_delta", { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: outTok } });
  push("message_stop", { type: "message_stop" });
  return ev.join("");
}

function estimateTokens(body) {
  let chars = (typeof body.system === "string" ? body.system : textOf(body.system || "")).length;
  for (const m of body.messages || []) chars += textOf(m.content).length;
  return Math.max(1, Math.ceil(chars / 4));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const url = req.url.split("?")[0];
  log(req.method, url);

  if (url.endsWith("/count_tokens")) {
    let body = {};
    try { body = JSON.parse(await readBody(req)); } catch {}
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ input_tokens: estimateTokens(body) }));
  }

  if (url.endsWith("/v1/messages") && req.method === "POST") {
    const raw = await readBody(req);
    let body = {};
    try { body = JSON.parse(raw); } catch (e) {
      log("BAD JSON clen=" + (req.headers["content-length"]||"?") + " gotBytes=" + Buffer.byteLength(raw) + " gotChars=" + raw.length + " head=" + JSON.stringify(raw.slice(0, 120)) + " tail=" + JSON.stringify(raw.slice(-120)));
      res.writeHead(400, { ...CORS, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "bad json" } }));
    }
    const oaiReq = toOpenAIRequest(body);
    log("-> MiMo", oaiReq.messages.length, "msgs", (oaiReq.tools || []).length, "tools");
    try {
      const up = await fetch(UPSTREAM, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + KEY,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost/claude-emu",
          "X-Title": "claude-emu",
        },
        body: JSON.stringify(oaiReq),
      });
      const txt = await up.text();
      if (!up.ok) {
        log("upstream", up.status, txt.slice(0, 300));
        res.writeHead(up.status, { ...CORS, "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "upstream " + up.status + ": " + txt.slice(0, 500) } }));
      }
      let oai;
      try { oai = JSON.parse(txt); } catch { oai = {}; }
      log("<- MiMo finish=", oai.choices?.[0]?.finish_reason, "usage=", JSON.stringify(oai.usage || {}));
      const sse = buildSSE(oai, body.model || MODEL);
      res.writeHead(200, { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      return res.end(sse);
    } catch (e) {
      log("fetch error", e.message);
      res.writeHead(502, { ...CORS, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: e.message } }));
    }
  }

  res.writeHead(404, { ...CORS, "Content-Type": "application/json" });
  res.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: url } }));
});

server.listen(PORT, "127.0.0.1", () => log(`translator on 127.0.0.1:${PORT} -> ${MODEL}`));
