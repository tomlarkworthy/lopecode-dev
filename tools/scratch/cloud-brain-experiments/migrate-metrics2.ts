// One-off, 2026-10-07: copy cb4's metrics rows from the Worker's own database (cb4-x-metrics) into the table
// database behind brain-db (cb4-db), tables metrics_calls and metrics_faults. The old database is left as it is.
import { readFileSync } from "node:fs";
const token = readFileSync("tools/scratch/cloud-brain-experiments/.cf-token", "utf8").trim();
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const api = async (path: string, body?: any) => {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + (st.account || st.accountId) + path, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  const j: any = await r.json();
  if (!j.success) throw new Error(r.status + " " + JSON.stringify(j.errors).slice(0, 300));
  return j.result;
};
const dbs = await api("/d1/database?per_page=100");
console.log("databases:", dbs.filter((d: any) => d.name.startsWith("cb4")).map((d: any) => d.name).join(", "));
const q = async (db: string, sql: string, params: any[] = []) => (await api("/d1/database/" + dbs.find((d: any) => d.name === db).uuid + "/query", { sql, params }))[0];
const count = async (db: string, calls: string, faults: string) => ({ ...(await q(db, `SELECT COUNT(*) AS rows, COALESCE(SUM(n), 0) AS calls FROM ${calls}`)).results[0], faults: (await q(db, `SELECT COUNT(*) AS n FROM ${faults}`)).results[0].n });
const old = await count("cb4-x-metrics", "calls", "faults"), before = await count("cb4-db", "metrics_calls", "metrics_faults");
console.log("old", JSON.stringify(old), "new before", JSON.stringify(before));
if (process.argv[2] === "--copy") {
  const calls = (await q("cb4-x-metrics", "SELECT * FROM calls")).results, faults = (await q("cb4-x-metrics", "SELECT * FROM faults")).results;
  const up = "INSERT INTO metrics_calls (t, worker, version, method, caller, status, n, ms, max) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT (t, worker, version, method, caller, status) DO UPDATE SET n = n + excluded.n, ms = ms + excluded.ms, max = MAX(max, excluded.max)";
  for (const r of calls) await q("cb4-db", up, [r.t, r.worker, r.version, r.method, r.caller, r.status, r.n, r.ms, r.max]);
  for (const r of faults) await q("cb4-db", "INSERT INTO metrics_faults (t, worker, version, method, caller, status, ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", [r.t, r.worker, r.version, r.method, r.caller, r.status, r.ms]);
  console.log("copied", calls.length, "rows,", calls.reduce((a: number, r: any) => a + r.n, 0), "calls,", faults.length, "faults");
  console.log("new after", JSON.stringify(await count("cb4-db", "metrics_calls", "metrics_faults")));
}
console.log("tables in cb4-db:", (await q("cb4-db", "SELECT name, type FROM sqlite_master")).results.filter((m: any) => !m.name.startsWith("_cf")).map((m: any) => m.name + ":" + m.type).join(" "));
