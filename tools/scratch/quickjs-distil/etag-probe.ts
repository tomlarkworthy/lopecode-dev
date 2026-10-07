// Probe: which response headers survive workers.dev. Deployed over the scratch Worker cb-distil-spike.
import { raw, account } from "../../cloud-brain/.emitted/cf.ts";
const code = `export default { fetch(request) {
  const k = new URL(request.url).pathname.slice(1);
  const big = "<html>" + "x".repeat(5000) + "</html>";
  const h = { "content-type": "text/html; charset=utf-8", "x-kind": k };
  if (k === "strong") h.etag = '"abc"';
  if (k === "weak") h.etag = 'W/"abc"';
  if (k === "nocache") { h.etag = '"abc"'; h["cache-control"] = "no-cache"; }
  if (k === "notransform") { h.etag = '"abc"'; h["cache-control"] = "no-cache, no-transform"; }
  if (k === "nosniff") { h.etag = '"abc"'; h["x-content-type-options"] = "nosniff"; }
  if (k === "hex") h.etag = '"62941f890bb1bc22928429b6d5a9dc3ed6acce0090d5944bc54e63b527d31fb7"';
  if (k === "append") { const r = new Response(big, { headers: { ...h, etag: '"abc"' } }); r.headers.append("x-brain-served-by", "a@b"); return r; }
  return new Response(big, { headers: h });
} }`;
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify({ main_module: "worker.js", compatibility_date: "2026-10-01" })], { type: "application/json" }));
form.append("worker.js", new File([code], "worker.js", { type: "application/javascript+module" }));
const put = await raw(`/accounts/${account}/workers/scripts/cb-distil-spike`, { method: "PUT", body: form });
console.log("put", put.status, put.ok);
