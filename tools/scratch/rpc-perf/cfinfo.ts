// Read-only account facts for the RPC performance record. Prints no secret.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
const api = async (path: string) => {
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, { headers: { authorization: "Bearer " + token } });
  const j: any = await r.json().catch(() => ({}));
  return j.success === false || !r.ok ? { error: r.status + " " + JSON.stringify(j.errors || {}).slice(0, 200) } : j.result;
};
const account = (await api("/accounts"))[0].id;
const sub: any = await api(`/accounts/${account}/subscriptions`);
console.log("subscriptions:", Array.isArray(sub) ? sub.map((s: any) => `${s.rate_plan?.id}/${s.rate_plan?.public_name} ${s.state} ${(s.component_values||[]).map((c:any)=>c.name).join(",")}`).join(" | ") : JSON.stringify(sub));
const std: any = await api(`/accounts/${account}/workers/account-settings`);
console.log("account-settings:", JSON.stringify(std));
const scripts: any = await api(`/accounts/${account}/workers/scripts`);
for (const s of scripts.filter((s: any) => /^(cb4|brain|cbx)/.test(s.id))) console.log(" ", s.id.padEnd(22), "usage", s.usage_model, "compat", s.compatibility_date, (s.compatibility_flags || []).join(","), "placement", JSON.stringify(s.placement || {}), "modified", s.modified_on);
const d1: any = await api(`/accounts/${account}/d1/database`);
for (const d of d1) { const full: any = await api(`/accounts/${account}/d1/database/${d.uuid}`); console.log("d1", d.name, "region", full.running_in_region, "primary", full.primary_location_hint ?? "", "size", full.file_size, "tables", full.num_tables, "replication", JSON.stringify(full.read_replication || null)); }
const ns: any = await api(`/accounts/${account}/workers/durable_objects/namespaces`);
for (const n of ns) { const objs: any = await api(`/accounts/${account}/workers/durable_objects/namespaces/${n.id}/objects`); console.log("do namespace", n.name, "script", n.script, "class", n.class, "sqlite", n.use_sqlite, "objects", Array.isArray(objs) ? objs.length : JSON.stringify(objs)); }
