// Local receiver for hexRig captures, so laboriously-collected frames leave the
// browser the moment they exist instead of dying with the tab.
//
// The rig stores each case's `gray` buffer -- the exact bytes the detector was
// handed. Those are what get written here, raw, with a sidecar JSON of the
// frozen labels and capture settings. No image codec is involved in either
// direction, so a restored case is bit-identical to the captured one.
//
//   bun scratch/rmbt/case-receiver.ts                 serve on 127.0.0.1:8787
//   bun scratch/rmbt/case-receiver.ts --import f.json import a downloaded bundle
//
// The import path exists for capturing on a phone. A phone cannot reach this
// process: getUserMedia needs a secure context, so the notebook has to be on
// https, and an https page may not POST to http://<lan-ip>. Either put an https
// tunnel in front of this server and paste that URL into the rig's sink box, or
// use the rig's "download bundle" button and import the file here.
import { mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const DIR = resolve("data/hexcases");
mkdirSync(DIR, { recursive: true });
const PORT = Number(process.env.PORT ?? 8787);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);

// Two devices, or one device reloaded, both start their case counter at 0. That
// used to overwrite four frames here before anyone noticed. Names are tagged per
// boot now, but this process is the last thing standing between a capture and
// the disk, so it refuses to clobber a case that is already there and different.
function writeCase(name: string, ext: string, buf: Buffer): string {
  let file = name + ext;
  for (let k = 2; existsSync(resolve(DIR, file)); k++) {
    if (readFileSync(resolve(DIR, file)).equals(buf)) return file; // same bytes: idempotent
    file = `${name}-${k}${ext}`;
  }
  writeFileSync(resolve(DIR, file), buf);
  return file;
}

// --import: unpack a "download bundle" file (format hexrig-cases-1) into the
// same on-disk shape the POST path produces, so replay-cases.ts cannot tell
// which route a case arrived by.
const importAt = process.argv.indexOf("--import");
if (importAt !== -1) {
  const path = process.argv[importAt + 1];
  if (!path) {
    console.error("--import needs a file");
    process.exit(1);
  }
  // A bundle downloaded from a build that predates per-boot naming carries bare
  // hexcase-NN names, which collide with whatever is already here. --prefix
  // renames the whole import so the two sets stay distinguishable by device.
  const prefixAt = process.argv.indexOf("--prefix");
  const prefix = prefixAt === -1 ? "" : safe(process.argv[prefixAt + 1] ?? "") + "-";
  const bundle = JSON.parse(readFileSync(path, "utf8"));
  if (bundle.format !== "hexrig-cases-1")
    throw new Error(`unexpected bundle format ${JSON.stringify(bundle.format)}`);
  let n = 0;
  for (const c of bundle.cases ?? []) {
    const { grayGzipB64, ...meta } = c;
    if (!grayGzipB64) {
      console.warn(`  skip ${c.name}: no pixels (labels-only download?)`);
      continue;
    }
    const gray = gunzipSync(Buffer.from(grayGzipB64, "base64"));
    if (gray.length !== meta.w * meta.h)
      throw new Error(`${meta.name}: ${gray.length} bytes for a ${meta.w}x${meta.h} frame`);
    const g = writeCase(prefix + safe(meta.name), ".gray", gray);
    const stem = g.replace(/\.gray$/, "");
    // The sidecar's own name has to follow the file, or a renamed import shows
    // up in replay-cases under the name it collided with -- two rows, one label.
    meta.name = stem;
    writeCase(stem, ".json", Buffer.from(JSON.stringify(meta, null, 1)));
    console.log(`  ${g}  ${meta.w}x${meta.h}  ${gray.length.toLocaleString()}B`);
    n++;
  }
  console.log(`imported ${n} case(s) -> ${DIR}`);
  process.exit(0);
}

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
      const wrote = writeCase(name, kind === "gray" ? ".gray" : ".json", buf);
      console.log(`${new Date().toISOString()}  ${kind.padEnd(4)} ${wrote}  ${buf.length.toLocaleString()} bytes`);
      return new Response(JSON.stringify({ ok: true, wrote, bytes: buf.length }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    return new Response("not found", { status: 404, headers: cors });
  },
});
console.log(`case receiver on http://127.0.0.1:${PORT}  ->  ${DIR}`);
