// Local receiver for hexRig captures, so laboriously-collected frames leave the
// browser the moment they exist instead of dying with the tab.
//
// The rig stores each case's `gray` buffer -- the exact bytes the detector was
// handed. Those are what get written here, raw, with a sidecar JSON of the
// frozen labels and capture settings. No image codec is involved in either
// direction, so a restored case is bit-identical to the captured one.
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve("data/hexcases");
mkdirSync(DIR, { recursive: true });
const PORT = Number(process.env.PORT ?? 8787);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/" || url.pathname === "/health") {
      const files = readdirSync(DIR);
      return new Response(JSON.stringify({ ok: true, dir: DIR, files: files.length }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const m = url.pathname.match(/^\/(gray|meta)\/(.+)$/);
    if (req.method === "POST" && m) {
      const [, kind, rawName] = m;
      const name = safe(decodeURIComponent(rawName));
      const buf = Buffer.from(await req.arrayBuffer());
      const ext = kind === "gray" ? ".gray" : ".json";
      writeFileSync(resolve(DIR, name + ext), buf);
      console.log(`${new Date().toISOString()}  ${kind.padEnd(4)} ${name}${ext}  ${buf.length.toLocaleString()} bytes`);
      return new Response(JSON.stringify({ ok: true, wrote: name + ext, bytes: buf.length }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    return new Response("not found", { status: 404, headers: cors });
  },
});
console.log(`case receiver on http://127.0.0.1:${PORT}  ->  ${DIR}`);
