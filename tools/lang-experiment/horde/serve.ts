// bun horde/serve.ts [port] : serves horde/proto with COOP/COEP so SharedArrayBuffer exists (the sab arm only)
import { join, normalize } from "node:path";
const root = join(import.meta.dir, "proto");
const port = +(process.argv[2] || 8765);
Bun.serve({ port, fetch(req) {
  const p = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^\/+/, "");
  const f = Bun.file(join(root, p || "index.html"));
  return new Response(f, { headers: { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp", "Cache-Control": "no-store" } });
} });
console.log(`http://localhost:${port}/`);
