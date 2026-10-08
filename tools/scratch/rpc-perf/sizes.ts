// Script size and Cloudflare's startup time for each cb4 Worker, read-only.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
const get = async (path: string) => { const r = await fetch("https://api.cloudflare.com/client/v4" + path, { headers: { authorization: "Bearer " + token } }); return r; };
const account = ((await (await get("/accounts")).json()) as any).result[0].id;
const scripts = ((await (await get(`/accounts/${account}/workers/scripts`)).json()) as any).result.filter((s: any) => /^(cb4|cbx-perf)/.test(s.id));
for (const s of scripts.sort((a: any, b: any) => a.id.localeCompare(b.id))) {
  const vs: any = await (await get(`/accounts/${account}/workers/scripts/${s.id}/versions?per_page=1`)).json();
  const v = vs.result?.items?.[0];
  const d: any = v ? await (await get(`/accounts/${account}/workers/scripts/${s.id}/versions/${v.id}`)).json() : null;
  const body = await (await get(`/accounts/${account}/workers/scripts/${s.id}/content/v2`)).arrayBuffer();
  const text = new TextDecoder().decode(body);
  const parts = [...text.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
  console.log(s.id.padEnd(16), "upload", String(body.byteLength).padStart(8), "bytes", "startup_ms", String(d?.result?.startup_time_ms ?? s.startup_time_ms ?? "?").padStart(4), "parts", parts.join(","), "| cel", /lib\/cel\.js/.test(text) ? "yes" : "no", "hono", /lib\/hono/.test(text) ? "yes" : "no", "quickjs", /quickjs/.test(parts.join()) ? "yes" : "no");
}
