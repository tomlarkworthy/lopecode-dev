// Static file server + mock Anthropic /v1/messages endpoint, on 127.0.0.1.
// Serves the browser-native harness and package/cli.js, and answers the SDK's
// message request with a canned assistant reply (SSE or JSON) so no real API
// key is spent. Every inbound API request is logged to prove the round-trip.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoScratch = join(here, ".."); // tools/scratch/claude-emu
const PORT = Number(process.env.PORT || 8791);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".map": "application/json", ".wasm": "application/wasm" };

const MOCK_TEXT = "Hello from the browser-native Claude Code round-trip.";

globalThis.__apiHits = [];

function sse(res, events) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive" });
  for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  res.end();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  // ---- Real upstream proxy (set UPSTREAM to the translator, e.g. http://127.0.0.1:8787) ----
  if (path.startsWith("/v1/") && process.env.UPSTREAM) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    try { const p = JSON.parse(raw.toString("utf8")); console.log(`\n>>> API ${req.method} ${path} -> UPSTREAM (model=${p?.model} stream=${p?.stream} msgs=${p?.messages?.length})`); } catch {}
    __apiHits.push({ method: req.method, path, upstream: true });
    const up = await fetch(process.env.UPSTREAM + path + url.search, {
      method: req.method,
      headers: { "content-type": "application/json", "anthropic-beta": req.headers["anthropic-beta"] || "" },
      body: req.method === "GET" ? undefined : raw,
    });
    res.writeHead(up.status, { "content-type": up.headers.get("content-type") || "application/json" });
    res.end(Buffer.from(await up.arrayBuffer()));
    return;
  }

  // ---- Mock Anthropic API ----
  if (path.startsWith("/v1/")) {
    let body = "";
    for await (const chunk of req) body += chunk;
    let parsed = null; try { parsed = JSON.parse(body); } catch {}
    const hit = { method: req.method, path, model: parsed?.model, stream: parsed?.stream, messages: parsed?.messages, system: parsed?.system ? "(present)" : undefined, headers: { auth: req.headers["authorization"] ? "(bearer)" : undefined, xkey: req.headers["x-api-key"] ? "(x-api-key)" : undefined, beta: req.headers["anthropic-beta"] } };
    __apiHits.push(hit);
    console.log(`\n>>> API ${req.method} ${path}\n${JSON.stringify(hit, null, 2)}`);

    if (path.includes("count_tokens")) { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ input_tokens: 8 })); return; }

    const id = "msg_mock_" + Date.now();
    const model = parsed?.model || "claude-mock";
    if (parsed?.stream) {
      sse(res, [
        ["message_start", { type: "message_start", message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 8, output_tokens: 0 } } }],
        ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
        ["ping", { type: "ping" }],
        ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: MOCK_TEXT } }],
        ["content_block_stop", { type: "content_block_stop", index: 0 }],
        ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 12 } }],
        ["message_stop", { type: "message_stop" }],
      ]);
    } else {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id, type: "message", role: "assistant", model, content: [{ type: "text", text: MOCK_TEXT }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 8, output_tokens: 12 } }));
    }
    return;
  }

  // ---- Static files ----
  let rel = decodeURIComponent(path === "/" ? "/index.html" : path);
  // /package/... served from repoScratch; everything else from here.
  let filePath = rel.startsWith("/package/") ? join(repoScratch, rel) : join(here, rel);
  filePath = normalize(filePath);
  try {
    let data = await readFile(filePath);
    if (rel.endsWith("/cli.js")) {
      // Strip the "#!/usr/bin/env node" shebang so it parses as a module.
      let s = data.toString("utf8");
      if (s.startsWith("#!")) s = "//" + s.slice(2);
      data = Buffer.from(s, "utf8");
    }
    res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end("not found: " + rel);
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`server on http://127.0.0.1:${PORT}`));
