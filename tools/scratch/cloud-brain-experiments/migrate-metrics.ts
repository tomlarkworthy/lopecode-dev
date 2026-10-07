// One-off, 2026-10-06: copy cb4's metrics batches out of the shared kv table into brain-x-metrics' own tables.
import { readFileSync } from "node:fs";
const token = readFileSync("tools/scratch/cloud-brain-experiments/.cf-token", "utf8").trim();
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const api = async (path: string, body: any) => {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + (st.account || st.accountId) + path, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  const j: any = await r.json();
  if (!j.success) throw new Error(r.status + " " + JSON.stringify(j.errors).slice(0, 300));
  return j.result;
};
const dbs = await api("/d1/database?per_page=100", null);
const id = (name: string) => dbs.find((d: any) => d.name === name).uuid;
const q = async (db: string, sql: string, params: any[] = []) => (await api("/d1/database/" + id(db) + "/query", { sql, params }))[0];
const old = (await q("cb4-sql", "SELECT k, v FROM kv WHERE t = 'brain-x-metrics' AND k >= 'b/' AND k < 'b0'")).results;
const text = readFileSync("tools/cloud-brain/brain-metrics.ojs", "utf8");
const lit = (name: string) => { const s = text.indexOf("  " + name + ":"); return text.slice(text.indexOf('"', s) + 1, text.indexOf('"\n', s) > 0 && text.indexOf('",\n', s) > 0 ? Math.min(text.indexOf('",\n', s), text.indexOf('"\n', s)) : text.indexOf('",\n', s)); };
const count = lit("count"), fault = lit("fault");
let buckets = 0, faults = 0, calls = 0;
for (const row of old)
  for (const b of JSON.parse(row.v)) {
    const t = Math.floor(b.from / 60000) * 60000;
    for (const x of b.buckets) { await q("cb4-x-metrics", count, [t, x.worker, x.version || "", x.method, x.caller, x.status, x.n, x.ms, x.max]); buckets++; calls += x.n; }
    for (const x of b.errors || []) { await q("cb4-x-metrics", fault, [x.t, x.worker, x.version || "", x.method, x.caller, x.status, x.ms]); faults++; }
  }
console.log({ keys: old.length, buckets, calls, faults });
