// Deploys or deletes cbx-logprobe: one bare Worker outside the Brain with Workers Logs and traces on.
//   bun probe.ts up | down | settings
// /a  logs an object, calls itself over a service binding at /b with a header, logs again
// /b  logs an object with the header it got, and console.error; ?throw=1 throws
import { api, account, save } from "./lib.ts";
const NAME = "cbx-logprobe";
const a = await account();
const S = `/accounts/${a}/workers/scripts/${NAME}`;
const cmd = process.argv[2];
if (cmd === "down") { const r = await api(S + "?force=true", { method: "DELETE" }); console.log("deleted", r.status, JSON.stringify(r.errors || "")); process.exit(0); }
if (cmd === "settings") { const r = await api(S + "/script-settings"); console.log(JSON.stringify(r.result?.observability, null, 1)); process.exit(0); }
const code = `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ray = request.headers.get("cf-ray"), tp = request.headers.get("traceparent"), trace = request.headers.get("x-probe-trace") || crypto.randomUUID();
    if (url.pathname === "/a") {
      console.log({ at: "a.start", trace, ray, traceparent: tp, caller: "owner", method: "probe.a", n: 1, nested: { k: "v", deep: { z: 9 } } });
      const r = await env.SELF.fetch("https://self/b" + url.search, { headers: { "x-probe-trace": trace } });
      const inner = await r.json().catch(() => ({}));
      console.log(JSON.stringify({ at: "a.end", trace, status: r.status, ms: 12.5 }));
      console.log("plain text line", trace, { extra: true });
      return Response.json({ trace, ray, traceparent: tp, inner });
    }
    if (url.pathname === "/b") {
      console.log({ at: "b", trace, ray, traceparent: tp, cfRayIn: ray });
      console.error({ at: "b.error", trace, error: "RuleRefused", status: 403 });
      if (url.searchParams.get("throw")) throw new Error("probe threw " + trace);
      if (url.searchParams.get("big")) console.log({ at: "b.big", trace, blob: "x".repeat(Number(url.searchParams.get("big"))) });
      return Response.json({ ray, traceparent: tp, headers: [...request.headers.keys()] });
    }
    return new Response("ok");
  }
};`;
const obs = cmd === "up-min" ? { enabled: true } : cmd === "up-noinv" ? { enabled: true, logs: { enabled: true, invocation_logs: false } } : { enabled: true, head_sampling_rate: 1, logs: { enabled: true, invocation_logs: true, head_sampling_rate: 1 }, traces: { enabled: true, head_sampling_rate: 1 } };
const meta = { main_module: "worker.js", compatibility_date: "2026-10-01", bindings: [{ type: "service", name: "SELF", service: NAME }], observability: obs };
const up = async (m: any) => { const f = new FormData(); f.append("metadata", new Blob([JSON.stringify(m)], { type: "application/json" })); f.append("worker.js", new Blob([code], { type: "application/javascript+module" }), "worker.js"); return api(S, { method: "PUT", body: f }); };
let r = await up({ ...meta, bindings: [] });
console.log("upload 1 (no binding)", r.status, JSON.stringify(r.errors || ""), "observability echoed:", JSON.stringify(r.result?.observability ?? null));
r = await up(meta);
console.log("upload 2 (self binding)", r.status, JSON.stringify(r.errors || ""), JSON.stringify(r.result?.observability ?? null));
save("upload", r.result);
const sd = await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true, previews_enabled: false }) });
console.log("subdomain", sd.status, JSON.stringify(sd.result || sd.errors));
const sub = (await api(`/accounts/${a}/workers/subdomain`)).result.subdomain;
console.log("url", `https://${NAME}.${sub}.workers.dev`);
