// The helper of the test routine. A paired tab imports http://127.0.0.1:47814/run.js (run-tests.js) and posts each
// emitted service here; it is written to .emitted/, which git ignores.
//   bun tools/cloud-brain/test-receiver.ts
const OUT = import.meta.dir + "/.emitted";
Bun.serve({ hostname: "127.0.0.1", port: 47814, async fetch(req) {
  const h = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
  const name = new URL(req.url).pathname.slice(1).replace(/[^a-z0-9.-]/gi, "_");
  // One-time hand-off of the scratch owner cookie to the QA page: the path is random and works once.
  if (req.method === "GET" && name.startsWith("once-")) { const f = Bun.file(OUT + "/" + name); if (!(await f.exists())) return new Response("", { status: 404, headers: h }); const v = await f.text(); await Bun.write(OUT + "/" + name, ""); require("node:fs").unlinkSync(OUT + "/" + name); return new Response(v, { headers: h }); }
  if (req.method === "GET" && name === "run.js") { const f = Bun.file(import.meta.dir + "/run-tests.js"); return (await f.exists()) ? new Response(f, { headers: { ...h, "content-type": name.endsWith(".js") ? "text/javascript" : "application/octet-stream" } }) : new Response("", { status: 404, headers: h }); }
  if (req.method !== "POST") return new Response("", { headers: h });
  await Bun.write(OUT + "/" + name, await req.text());
  return new Response("ok", { headers: h });
} });
