// Serves the generated injector to the notebook page over loopback, so a 13KB payload never has to
// travel through an MCP tool call. Reads on each request so a regenerate is picked up immediately.
import { readFileSync } from "node:fs";
Bun.serve({ port: 8792, hostname: "127.0.0.1", fetch(req) {
  const name = new URL(req.url).pathname === "/cells.json" ? "cells.json" : "inject.js";
  return new Response(readFileSync(new URL("./" + name, import.meta.url), "utf8"), {
    headers: { "content-type": "text/plain", "access-control-allow-origin": "*" } });
} });
console.log("serving inject.js on http://127.0.0.1:8792");
