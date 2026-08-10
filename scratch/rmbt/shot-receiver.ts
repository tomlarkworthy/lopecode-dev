// Catch calibration shots out of a live page before they are lost. The frames
// only exist in the tab's memory — a reload destroys them — and they are ~1.5MB
// of luma each, far too big to hand back through an eval_code return value. So
// the page POSTs each one here and it lands on disk as a raw .gray plus a .json
// sidecar, the same pair the hexcase fixtures use.
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve("scratch/rmbt/calshots");
mkdirSync(DIR, { recursive: true });

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (url.pathname === "/shot" && req.method === "POST") {
      const name = (url.searchParams.get("name") ?? "shot").replace(/[^a-z0-9._-]+/gi, "_");
      const w = Number(url.searchParams.get("w")), h = Number(url.searchParams.get("h"));
      const buf = new Uint8Array(await req.arrayBuffer());
      if (buf.length !== w * h) {
        return new Response(JSON.stringify({ ok: false, why: `expected ${w * h} bytes, got ${buf.length}` }), { status: 400, headers: cors });
      }
      writeFileSync(resolve(DIR, name + ".gray"), buf);
      writeFileSync(resolve(DIR, name + ".json"), JSON.stringify({ name, w, h, bytes: buf.length, savedAt: new Date().toISOString() }, null, 1));
      console.log(`saved ${name} ${w}x${h} ${buf.length} bytes`);
      return new Response(JSON.stringify({ ok: true, name, bytes: buf.length }), { headers: cors });
    }
    if (url.pathname === "/list") {
      return new Response(JSON.stringify(readdirSync(DIR)), { headers: cors });
    }
    return new Response("ok", { headers: cors });
  },
});

console.log(`RECEIVER http://127.0.0.1:${server.port}  ->  ${DIR}`);
