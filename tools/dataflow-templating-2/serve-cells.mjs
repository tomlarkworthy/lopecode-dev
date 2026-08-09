// Serves generated scripts to the notebook page over loopback, and accepts a POSTed export back,
// so multi-MB payloads never travel through an MCP tool call and no Downloads folder is involved.
import { readFileSync, writeFileSync } from "node:fs";
const ALLOW = new Set(["inject.js", "gestures.js", "cells.json"]);
Bun.serve({ port: 8792, hostname: "127.0.0.1", maxRequestBodySize: 64 * 1024 * 1024,
  async fetch(req) {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*",
                   "access-control-allow-methods": "GET,POST,OPTIONS" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const name = new URL(req.url).pathname.replace(/^\//, "") || "inject.js";
    if (req.method === "POST") {
      const body = await req.text();
      const tag = (new URL(req.url).searchParams.get("as") || "out").replace(/[^\w-]/g, "");
      const out = new URL(`./export-${tag}.local.html`, import.meta.url).pathname;
      writeFileSync(out, body);
      console.log(`wrote ${body.length} bytes -> ${out}`);
      return new Response(JSON.stringify({ ok: true, bytes: body.length }),
        { headers: { ...cors, "content-type": "application/json" } });
    }
    if (!ALLOW.has(name)) return new Response("not allowed", { status: 404 });
    return new Response(readFileSync(new URL("./" + name, import.meta.url), "utf8"),
      { headers: { ...cors, "content-type": "text/plain" } });
  } });
console.log("serving on http://127.0.0.1:8792");
