// Probe, 2026-10-07: full EXPLAIN rows from D1 for a list of statements; writes fixtures. Nothing but setup is executed.
import { readFileSync, writeFileSync } from "node:fs";
const token = readFileSync("tools/scratch/cloud-brain-experiments/.cf-token", "utf8").trim();
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const api = async (path: string, body?: any) => {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + (st.account || st.accountId) + path, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  const j: any = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors).slice(0, 200));
  return j.result;
};
const db = (await api("/d1/database?per_page=100")).find((d: any) => d.name === process.argv[2]).uuid;
export const q = async (sql: string, params: any[] = []) => (await api("/d1/database/" + db + "/query", { sql, params }))[0].results;
const spec = JSON.parse(readFileSync(process.argv[3], "utf8"));
for (const s of spec.setup || []) await q(s).catch((e) => console.log("setup:", s.slice(0, 50), e.message.slice(0, 80)));
const master = (await q("SELECT name, tbl_name, rootpage, type FROM sqlite_master")).filter((m: any) => !m.name.startsWith("_cf"));
const out: any = { master, plans: {} };
const seen = new Set<string>();
for (const [sql, params] of spec.statements) {
  try {
    const ops = await q("EXPLAIN " + sql, params || []);
    out.plans[sql] = ops.map((o: any) => [o.opcode, o.p1, o.p2, o.p3, o.p5]);
    ops.forEach((o: any) => seen.add(o.opcode));
    console.log(sql.slice(0, 80).padEnd(81), ops.length, "ops", ops.filter((o: any) => /^(Open(Read|Write)|ReopenIdx|Clear|Destroy|Program|CreateBtree)$/.test(o.opcode)).map((o: any) => o.opcode + "(" + [o.p1, o.p2, o.p3, o.p5].join(",") + ")").join(" "));
  } catch (e: any) { out.plans[sql] = { error: e.message.slice(0, 120) }; console.log(sql.slice(0, 80).padEnd(81), "ERROR", e.message.slice(0, 90)); }
}
for (const s of spec.teardown || []) await q(s).catch((e) => console.log("teardown:", s.slice(0, 50), e.message.slice(0, 80)));
writeFileSync(process.argv[4], JSON.stringify(out));
console.log("opcodes seen:", [...seen].sort().join(" "));
console.log("master:", master.map((m: any) => m.name + "@" + m.rootpage + (m.type !== "table" ? "(" + m.type + " of " + m.tbl_name + ")" : "")).join(" "));
