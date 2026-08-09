import { readFileSync } from "node:fs";
const body = readFileSync(new URL("./cells.json", import.meta.url), "utf8");
Bun.serve({ port: 8791, hostname: "127.0.0.1", fetch: () =>
  new Response(body, { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } }) });
console.log("serving cells.json on http://127.0.0.1:8791");
