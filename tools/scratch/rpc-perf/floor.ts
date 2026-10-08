// Deploys or deletes cbx-perf-floor: a bare Worker outside the Brain, the floor for the RPC performance record.
//   bun floor.ts up | down
// /            "ok"
// /echo        POST, ?mode=buffer|stream|none: counts the body
// /bytes?n=    n random bytes
// /r2/NAME     only with the admin header, only under perf-scratch/ in the Brain's bucket: PUT ?n= makes n bytes, GET streams, DELETE
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
const api = async (path: string, init: RequestInit = {}) => {
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, { ...init, headers: { authorization: "Bearer " + token, ...(init.headers || {}) } });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`${init.method || "GET"} ${path.replace(/[0-9a-f]{32}/, "<account>")} ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.result;
};
const NAME = "cbx-perf-floor";
const account = (await api("/accounts"))[0].id;
const S = `/accounts/${account}/workers/scripts/${NAME}`;
if (process.argv[2] === "down") {
  await api(S + "?force=true", { method: "DELETE" });
  console.log("deleted", NAME);
  process.exit(0);
}
const adminFile = resolve(import.meta.dir, ".floor-admin");
if (!existsSync(adminFile)) writeFileSync(adminFile, [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join(""));
const admin = readFileSync(adminFile, "utf8").trim();
const bucket = (await api(`/accounts/${account}/workers/scripts/cb4-x-static/settings`)).bindings.find((b: any) => b.type === "r2_bucket").bucket_name;
const code = `
let n = 0, born = 0;
export default {
  async fetch(request, env) {
    const url = new URL(request.url), q = url.searchParams;
    if (!born) born = Date.now();
    n++;
    const tag = { "x-perf": "floor;n=" + n + ";age=" + (Date.now() - born) };
    if (url.pathname === "/") return new Response("ok", { headers: tag });
    if (url.pathname === "/echo") {
      const mode = q.get("mode") || "buffer", t = Date.now();
      let bytes = 0;
      if (mode === "buffer") bytes = (await request.arrayBuffer()).byteLength;
      else if (mode === "stream") { const rd = request.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; bytes += value.length; } }
      return Response.json({ bytes, mode, ms: Date.now() - t }, { headers: tag });
    }
    const random = (bytes) => {
      const chunk = crypto.getRandomValues(new Uint8Array(65536));
      let left = bytes;
      return new ReadableStream({ pull(c) { if (left <= 0) return c.close(); const k = Math.min(left, chunk.length); c.enqueue(k === chunk.length ? chunk : chunk.subarray(0, k)); left -= k; } });
    };
    if (url.pathname === "/bytes") return new Response(random(Number(q.get("n") || 0)), { headers: { ...tag, "content-type": "application/octet-stream" } });
    if (url.pathname.startsWith("/r2/")) {
      if (request.headers.get("x-perf-admin") !== env.ADMIN) return new Response("not found", { status: 404 });
      const key = "perf-scratch/" + url.pathname.slice(4).replace(/[^a-z0-9.-]/g, "");
      if (request.method === "PUT") {
        const size = Math.min(Number(q.get("n") || 0), 50 * 1024 * 1024);
        const { readable, writable } = new FixedLengthStream(size);
        const piped = random(size).pipeTo(writable);
        await env.BLOBS.put(key, readable);
        await piped;
        return Response.json({ key, size }, { headers: tag });
      }
      if (request.method === "DELETE") return (await env.BLOBS.delete(key), Response.json({ deleted: key }, { headers: tag }));
      const o = await env.BLOBS.get(key);
      return o ? new Response(o.body, { headers: { ...tag, "content-type": "application/octet-stream", "content-length": String(o.size) } }) : new Response("not found", { status: 404, headers: tag });
    }
    return new Response("not found", { status: 404, headers: tag });
  }
};
`;
const metadata = { main_module: "worker.js", compatibility_date: "2026-10-01", bindings: [{ type: "secret_text", name: "ADMIN", text: admin }, { type: "r2_bucket", name: "BLOBS", bucket_name: bucket }] };
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.append("worker.js", new File([code], "worker.js", { type: "application/javascript+module" }));
const t = performance.now();
const up: any = await api(S, { method: "PUT", body: form });
await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
const sub = (await api(`/accounts/${account}/workers/subdomain`)).subdomain;
console.log(`uploaded ${NAME} in ${Math.round(performance.now() - t)} ms, startup_time_ms ${up.startup_time_ms}, bucket bound: ${bucket ? "yes" : "no"}`);
console.log(`https://${NAME}.${sub}.workers.dev`);
