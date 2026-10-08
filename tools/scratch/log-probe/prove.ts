// Live check of logs on cb4, 2026-10-08. Prints no secret. Steps: bun prove.ts <step>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { api, account } from "./lib.ts";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
const B = `https://cb4.${st.subdomain}.workers.dev`, X = "/xrpc/com.lopecode.brain.";
const notes = resolve(import.meta.dir, "results/prove.json");
const kept: any = existsSync(notes) ? JSON.parse(readFileSync(notes, "utf8")) : {};
const keep = (k: string, v: any) => { kept[k] = v; writeFileSync(notes, JSON.stringify(kept, null, 1)); };
export const call = async (path: string, { owner = true, body, method }: any = {}) => {
  const t = Date.now();
  const r = await fetch(B + (path.startsWith("/") ? path : X + path), { method: method || (body === undefined ? "GET" : "POST"), headers: { ...(owner ? { authorization: "Bearer " + st.session } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let data: any = text; try { data = JSON.parse(text); } catch {}
  return { status: r.status, ray: r.headers.get("cf-ray"), price: r.headers.get("x-brain-price"), data, at: t };
};
const F = (key: string, operation: string, value: any, type = "string") => ({ key, operation, type, value });
export const q = async (filters: any[], { minutes = 60, worker = "", limit = 200, needle = "" } = {}) => {
  const now = Date.now();
  const r = await call("logs.query" + (worker ? "?worker=" + worker : ""), { body: { queryId: "prove", timeframe: { from: now - minutes * 60000, to: now + 60000 }, view: "events", limit, parameters: { filters, ...(needle ? { needle: { value: needle } } : {}) } } });
  if (r.status !== 200) return { status: r.status, data: r.data, lines: [] as any[] };
  const lines = (r.data.result?.events?.events || []).map((e: any) => ({ t: e.timestamp, script: e.$workers?.scriptName, level: e.$metadata?.level, trace: e.$metadata?.traceId, rayId: e.$metadata?.rayId, type: e.$metadata?.type, ...(typeof e.source === "object" ? e.source : { message: e.source }) })).sort((a: any, b: any) => a.t - b.t);
  return { status: 200, lines, count: r.data.result?.events?.count };
};
const byRay = (ray: string) => [{ kind: "group", filterCombination: "or", filters: [F("ray", "eq", ray.split("-")[0]), F("$metadata.rayId", "eq", ray.split("-")[0])] }];
const until = async (ray: string, at: number) => { for (let i = 0; i < 60; i++) { const r = await q(byRay(ray), { minutes: 10 }); if (r.lines.length) return { seconds: Math.round((Date.now() - at) / 1000), ...r }; await new Promise((r) => setTimeout(r, 3000)); } return { seconds: -1, lines: [] as any[] }; };
const show = (l: any) => { const { t, trace, rayId, type, ...rest } = l; return new Date(t).toISOString().slice(11, 23) + " " + JSON.stringify({ ...rest, trace: trace && trace.slice(0, 8) }); };
const step = process.argv[2];
if (step === "settings") {
  const a = await account();
  const list = (await api(`/accounts/${a}/workers/scripts`)).result.map((s: any) => s.id).filter((n: string) => n === "cb4" || n.startsWith("cb4-")).sort();
  for (const n of list) { const s = (await api(`/accounts/${a}/workers/scripts/${n}/settings`)).result; console.log(n.padEnd(22), JSON.stringify(s.observability)); }
} else if (step === "calls") {
  // 1. a refusal by rule; 2. a 402; 3. a throw
  const refused = await call("logs.query", { owner: false, body: {} }); keep("refused", refused); console.log("refused", refused.status, refused.ray, JSON.stringify(refused.data));
  const before = (await call("quota.list")).data.accounts.find((a: any) => a.who === "owner"); console.log("owner allowance before", JSON.stringify(before));
  console.log("lower", (await call("quota.put", { body: { who: "owner", daily: 0.0001 } })).status);
  const broke = await call("browser.extend?seconds=60", { body: {} }); keep("broke", broke); console.log("402", broke.status, broke.ray, JSON.stringify(broke.data).slice(0, 200));
  console.log("restore", JSON.stringify((await call("quota.put", { body: { who: "owner", daily: before.set ? before.daily : null } })).data));
  const thrown = await call("logcheck.throw", { body: {} }); keep("thrown", thrown); console.log("throw", thrown.status, thrown.ray, JSON.stringify(thrown.data));
} else if (step === "browser") {
  const ext = await call("browser.extend?seconds=60&browser=logs", { body: {} }); keep("extend", ext); console.log("extend", ext.status, ext.ray, ext.price, JSON.stringify(ext.data).slice(0, 160));
  const run = await call("browser.run?browser=logs", { body: { url: "https://example.com/", browser: "logs" } }); keep("run", run); console.log("run", run.status, run.ray, JSON.stringify(run.data).slice(0, 200));
} else if (step === "wait") {
  const c = kept[process.argv[3]]; const r = await until(c.ray, c.at); console.log("readable after", r.seconds, "s"); for (const l of r.lines) console.log(show(l));
} else if (step === "ray") {
  const c = kept[process.argv[3]] || { ray: process.argv[3] };
  const first = await q(byRay(c.ray), { minutes: 120 }); const traces = [...new Set(first.lines.map((l: any) => l.trace))];
  console.log("ray", c.ray, "lines", first.lines.length, "traces", traces.map((t: any) => t.slice(0, 8)));
  for (const t of traces) { const all = await q([F("$metadata.traceId", "eq", t)], { minutes: 120 }); for (const l of all.lines) console.log(show(l)); }
} else if (step === "q") {
  const r = await q(JSON.parse(process.argv[3] || "[]"), { minutes: Number(process.argv[4] || 60), worker: process.argv[5] || "", needle: process.argv[6] || "" }); console.log(r.status, r.count, r.lines.length); if (r.status !== 200) console.log(JSON.stringify(r.data).slice(0, 400)); for (const l of r.lines.slice(-Number(process.argv[7] || 40))) console.log(show(l));
} else if (step === "own") {
  const now = Date.now(), body = { queryId: "own", timeframe: { from: now - 3600000, to: now }, view: "events", limit: 5, parameters: { filters: [] } };
  for (const m of ["own", "other"]) { const r = await call("logcheck." + m, { body }); console.log(m, r.status, r.ray, r.status === 200 ? "scripts: " + JSON.stringify([...new Set((r.data.result?.events?.events || []).map((e: any) => e.$workers?.scriptName))]) + " n=" + (r.data.result?.events?.events || []).length : JSON.stringify(r.data)); }
} else if (step === "count") {
  const now = Date.now(), from = Number(process.argv[3]);
  const r = await call("logs.query", { body: { queryId: "count", timeframe: { from, to: now }, view: "calculations", parameters: { calculations: [{ operator: "count" }], groupBys: [{ type: "string", value: "$workers.scriptName" }] } } });
  console.log(r.status, JSON.stringify(r.data.result?.calculations ?? r.data).slice(0, 3000)); console.log("minutes", (now - from) / 60000);
}
if (step === "timing") {
  for (let i = 0; i < 3; i++) { const c = await call("logcheck.throw", { body: {} }); const t0 = Date.now(); let n = 0, s = -1; for (let k = 0; k < 120; k++) { const r = await q(byRay(c.ray!), { minutes: 10 }); if (r.lines.length) { n = r.lines.length; s = (Date.now() - c.at) / 1000; break; } await new Promise((r) => setTimeout(r, 1000)); } console.log("call", c.ray, "first readable after", s.toFixed(1), "s, lines", n); }
}
if (step === "volume") {
  const from = Date.UTC(2026, 9, 8, 18, 57, 0), now = Date.now();
  const ask = async (groupBy: string, filters: any[] = []) => (await call("logs.query", { body: { queryId: "vol", timeframe: { from, to: now }, view: "calculations", parameters: { filters, calculations: [{ operator: "count" }], groupBys: [{ type: "string", value: groupBy }] } } })).data.result?.calculations?.[0]?.aggregates?.map((a: any) => [a.groupKey, a.count]).sort((a: any, b: any) => b[1] - a[1]);
  const scripts = await ask("$workers.scriptName"), methods = await ask("method", [F("at", "eq", "call")]);
  const total = scripts.reduce((n: number, s: any) => n + s[1], 0), min = (now - from) / 60000;
  console.log("minutes", min.toFixed(1), "events", total, "per day", Math.round(total / min * 1440), "per 30 days", Math.round(total / min * 1440 * 30));
  console.log(JSON.stringify(scripts)); console.log(JSON.stringify(methods.slice(0, 14)));
  const mine = methods.filter((m: any) => /^(logs\.|logcheck\.)/.test(m[0])).reduce((n: number, m: any) => n + m[1], 0);
  console.log("without this check's own logs.* and logcheck.* calls:", total - mine, "per 30 days", Math.round((total - mine) / min * 1440 * 30));
}
