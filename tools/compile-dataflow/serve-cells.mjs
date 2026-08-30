// Read per request, not once at startup: a server left running across a `make-cells.mjs` re-run
// otherwise serves the previous build, and the notebook shows a fix that was never pushed.
import { readFileSync } from "node:fs";
const url = new URL("./cells.json", import.meta.url);
Bun.serve({ port: 8791, hostname: "127.0.0.1", fetch: () =>
  new Response(readFileSync(url, "utf8"), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } }) });
console.log("serving cells.json on http://127.0.0.1:8791");
