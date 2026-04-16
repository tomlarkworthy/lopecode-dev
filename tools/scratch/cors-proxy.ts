#!/usr/bin/env bun
// Simple CORS proxy for TinyEMU networking
const PORT = 54760;
Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/proxy") {
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, User-Agent",
          "Access-Control-Max-Age": "86400",
        }});
      }
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return new Response("missing url", { status: 400 });
      try {
        const resp = await fetch(targetUrl, {
          method: req.method,
          headers: { "Accept": req.headers.get("accept") || "*/*" },
        });
        const body = await resp.arrayBuffer();
        return new Response(body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": resp.headers.get("content-type") || "application/octet-stream",
          },
        });
      } catch (e: any) {
        return new Response(e.message, { status: 502, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }
    return new Response("not found", { status: 404 });
  },
});
console.log("CORS proxy running on http://127.0.0.1:" + PORT);
