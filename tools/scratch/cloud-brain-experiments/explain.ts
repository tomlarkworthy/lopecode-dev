// Probe, 2026-10-07: what EXPLAIN on D1 says a statement opens. Nothing is executed.
import { readFileSync } from "node:fs";
const token = readFileSync("tools/scratch/cloud-brain-experiments/.cf-token", "utf8").trim();
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const api = async (path: string, body?: any) => {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + (st.account || st.accountId) + path, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  const j: any = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors).slice(0, 200));
  return j.result;
};
const db = (await api("/d1/database?per_page=100")).find((d: any) => d.name === process.argv[2]).uuid;
const q = async (sql: string) => (await api("/d1/database/" + db + "/query", { sql }))[0].results;
const master = await q("SELECT name, tbl_name, rootpage, type FROM sqlite_master");
const byRoot = new Map(master.map((m: any) => [m.rootpage, m]));
const OPEN: Record<string, string> = { OpenRead: "r", OpenWrite: "w", ReopenIdx: "r" };
for (const sql of process.argv.slice(3)) {
  const t = performance.now();
  try {
    const ops = await q("EXPLAIN " + sql);
    const ms = Math.round(performance.now() - t);
    const use = new Map<string, string>();
    const other = new Set<string>();
    for (const o of ops) {
      if (OPEN[o.opcode]) { const m: any = o.p2 === 1 ? { tbl_name: "sqlite_master" } : byRoot.get(o.p2); const n = (o.p3 ? "db" + o.p3 + "." : "") + (m ? m.tbl_name : "root" + o.p2); use.set(n, use.get(n) === "w" ? "w" : OPEN[o.opcode]); }
      else if (/^(Open|Clear|Destroy|Create|Drop|ParseSchema|VOpen|VUpdate|Program|SetCookie|Vacuum|Attach)/.test(o.opcode)) other.add(o.opcode + (/(Clear|Destroy)/.test(o.opcode) ? ":" + ((byRoot.get(o.p1) as any)?.tbl_name ?? "root" + o.p1) : ""));
    }
    console.log(sql.slice(0, 74).padEnd(75), "|", [...use].map(([n, m]) => m + ":" + n).join(" ").padEnd(34), "|", [...other].join(" "), "|", ops.length, "ops", ms, "ms");
  } catch (e: any) { console.log(sql.slice(0, 74).padEnd(75), "| ERROR", e.message.slice(0, 80)); }
}
