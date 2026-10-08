// The sibling endpoints and the other views. Saves raw answers.
import { api, account, query, save } from "./lib.ts";
const a = await account();
const to = Date.now(), from = to - 40 * 60000, tf = { from, to };
const svc = { key: "$metadata.service", operation: "eq", type: "string", value: "cbx-logprobe" };
const show = (name: string, r: any, pick: (x: any) => any) => { save(name, { status: r.status, errors: r.errors, result: r.result }); console.log("\n==", name, r.status, r.ok ? JSON.stringify(pick(r.result)).replace(/[0-9a-f]{32}/g, "<id>").slice(0, 900) : JSON.stringify(r.errors).slice(0, 300)); };
const P = (path: string, body: any) => api(`/accounts/${a}/workers/observability/telemetry/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
show("keys", await P("keys", { timeframe: tf, datasets: ["cloudflare-workers"], filters: [svc], limit: 500 }), (x) => ({ n: x.length, sample: x.slice(0, 400).map((k: any) => k.key).filter((k: string) => !/\.cf\.|headers/.test(k)) }));
show("values", await P("values", { timeframe: tf, datasets: ["cloudflare-workers"], key: "at", type: "string", filters: [svc], limit: 20 }), (x) => x);
show("calc", await query(a, { queryId: "probe-calc", timeframe: tf, view: "calculations", parameters: { datasets: ["cloudflare-workers"], filters: [svc], calculations: [{ operator: "count" }, { operator: "p90", key: "$workers.wallTimeMs", keyType: "number" }], groupBys: [{ type: "string", value: "$metadata.trigger" }, { type: "string", value: "$workers.outcome" }] } }), (x) => x.calculations?.map((c: any) => c.aggregates?.map((g: any) => ({ g: g.groups, v: g.value, c: g.count }))));
show("needle", await query(a, { queryId: "probe-needle", timeframe: tf, view: "events", limit: 5, parameters: { datasets: ["cloudflare-workers"], filters: [svc, { key: "error", operation: "eq", type: "string", value: "RuleRefused" }, { key: "status", operation: "gte", type: "number", value: 400 }], needle: { value: "b.error" } } }), (x) => ({ count: x.events?.count, first: x.events?.events?.[0]?.source }));
show("invocations", await query(a, { queryId: "probe-inv", timeframe: tf, view: "invocations", limit: 3, parameters: { datasets: ["cloudflare-workers"], filters: [svc] } }), (x) => ({ keys: Object.keys(x), n: Object.keys(x.invocations || {}).length, first: Object.entries(x.invocations || {})[0]?.[1] && (Object.entries(x.invocations)[0][1] as any[]).map((e) => e.$metadata.type + ":" + (e.source.at || e.source.message || "").slice(0, 30)) }));
show("traces", await query(a, { queryId: "probe-traces", timeframe: tf, view: "traces", limit: 3, parameters: { datasets: ["cloudflare-workers"], filters: [svc] } }), (x) => ({ keys: Object.keys(x), traces: JSON.stringify(x.traces ?? x.events ?? null).slice(0, 700) }));
const ev = (await query(a, { queryId: "probe-ray", timeframe: tf, view: "events", limit: 1, parameters: { datasets: ["cloudflare-workers"], filters: [svc, { key: "$metadata.trigger", operation: "eq", type: "string", value: "GET /a" }] } })).result?.events?.events?.[0];
if (ev) {
  const byRay = await query(a, { queryId: "probe-byray", timeframe: tf, view: "events", limit: 20, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$metadata.rayId", operation: "eq", type: "string", value: ev.$metadata.rayId }] } });
  const tid = byRay.result?.events?.events?.[0]?.$metadata.traceId;
  const byTrace = await query(a, { queryId: "probe-bytrace", timeframe: tf, view: "events", limit: 50, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$metadata.traceId", operation: "eq", type: "string", value: tid }] } });
  show("bytrace", byTrace, (x) => ({ byRay: byRay.result?.events?.count, byTrace: x.events?.count, lines: x.events?.events?.map((e: any) => e.$metadata.trigger + " " + e.$metadata.type + " " + (e.source.at || e.source.message || "").slice(0, 40)) }));
}
show("list-queries", await api(`/accounts/${a}/workers/observability/queries`), (x) => x);
show("destinations", await api(`/accounts/${a}/workers/observability/destinations`), (x) => x);
