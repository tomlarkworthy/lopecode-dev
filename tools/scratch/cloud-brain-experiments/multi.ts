import { readFileSync } from "node:fs";
const token = readFileSync("tools/scratch/cloud-brain-experiments/.cf-token", "utf8").trim();
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const api = async (path: string, body?: any) => { const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + (st.account || st.accountId) + path, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: body && JSON.stringify(body) }); return r.json() as any; };
const db = (await api("/d1/database?per_page=100")).result.find((d: any) => d.name === "cb4-x-metrics").uuid;
for (const [sql, params] of [["SELECT 1 AS a; SELECT 2 AS b", []], ["EXPLAIN SELECT 1 AS a; SELECT 2 AS b", []], ["SELECT ?1 AS a; SELECT 2 AS b", [5]], ["EXPLAIN SELECT 1; INSERT INTO probe_log VALUES ('multi', 1)", []], ["SELECT COUNT(*) AS n FROM probe_log WHERE k = 'multi'", []], ["DELETE FROM probe_log WHERE k = 'multi'", []]] as any) {
  const j = await api("/d1/database/" + db + "/query", { sql, params });
  console.log(sql.padEnd(58), j.success ? "results " + j.result.length + ": " + JSON.stringify(j.result.map((r: any) => r.results.length > 3 ? r.results.length + " rows" : r.results)).slice(0, 120) : "ERROR " + JSON.stringify(j.errors).slice(0, 110));
}
