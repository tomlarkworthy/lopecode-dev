// 24 h on cb4: which query parameter names are stored beside log lines, by route. Counts only, no values.
import { api, account, query, save } from "./lib.ts";
const a = await account(); const now = Date.now(), from = now - 86400000;
const scope = { kind: "group", filterCombination: "or", filters: [{ key: "$workers.scriptName", operation: "eq", type: "string", value: "cb4" }, { key: "$workers.scriptName", operation: "starts_with", type: "string", value: "cb4-" }] };
const k = await api(`/accounts/${a}/workers/observability/telemetry/keys`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ timeframe: { from, to: now }, datasets: ["cloudflare-workers"], filters: [scope], limit: 1000 }) });
const keys = (k.result || []).map((x: any) => x.key).filter((x: string) => x.startsWith("$workers.event."));
console.log("keys status", k.status, JSON.stringify(k.errors || ""), "\n" + keys.join("\n"));
const out: any = {};
for (const key of keys.filter((x: string) => x.includes(".search."))) {
  const r = await query(a, { queryId: "s", timeframe: { from, to: now }, view: "calculations", parameters: { datasets: ["cloudflare-workers"], filters: [scope, { key, operation: "exists", type: "string" }], calculations: [{ operator: "count" }], groupBys: [{ type: "string", value: "$workers.scriptName" }, { type: "string", value: "$metadata.trigger" }], limit: 20 } });
  const rows = (r.result?.calculations?.[0]?.aggregates || []).map((g: any) => [g.groups?.map((x: any) => x.value).join(" "), g.value ?? g.count]);
  out[key] = rows; console.log(key.replace("$workers.event.request.search.", ""), r.status, JSON.stringify(rows).slice(0, 400), r.ok ? "" : JSON.stringify(r.errors).slice(0, 200));
}
save("stored24h", out);
