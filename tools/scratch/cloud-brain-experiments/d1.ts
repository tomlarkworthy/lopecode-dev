import { readFileSync } from "node:fs";
const token = readFileSync("tools/scratch/cloud-brain-experiments/.cf-token", "utf8").trim();
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const account = st.account || st.accountId;
const api = async (path: string, init: any = {}) => {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + account + path, { ...init, headers: { authorization: "Bearer " + token, "content-type": "application/json" } });
  const j: any = await r.json();
  if (!j.success) throw new Error(r.status + " " + JSON.stringify(j.errors).slice(0, 300));
  return j.result;
};
const dbs = (await api("/d1/database?per_page=100")).filter((d: any) => d.name.startsWith("cb4"));
console.log(dbs.map((d: any) => d.name).join(", "));
const q = async (name: string, sql: string) => (await api("/d1/database/" + dbs.find((d: any) => d.name === name).uuid + "/query", { method: "POST", body: JSON.stringify({ sql }) }))[0];
for (const sql of process.argv.slice(3)) { const r = await q(process.argv[2], sql); console.log(sql.slice(0, 90), "->", JSON.stringify(r.results).slice(0, 500), "changes", r.meta.changes); }
